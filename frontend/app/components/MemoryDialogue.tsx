"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./MemoryDialogue.module.css";

type DialogueFact = { id: string; text: string };
type DialogueSource = { id: string; url: string; publisher: string };

type MemoryDialogueData = {
  version: 1;
  heritage: { pid: string; relationNote: string };
  facts: DialogueFact[];
  sources: DialogueSource[];
};

type SimulationParticipant = {
  id: string;
  name: string;
  avatar: string;
  side: "left" | "right";
};

type SimulationMessage = {
  id: string;
  participantId: string;
  text: string;
  time: string;
  likes: number;
  highlights?: string[];
  replyTo?: { name: string; text: string };
  delayMs?: number;
};

type DialogueSimulation = {
  version: 1;
  pid: string;
  dayLabel: string;
  initialCount: number;
  participants: SimulationParticipant[];
  messages: SimulationMessage[];
};

type Props = { file: string };

function simulationFile(file: string) {
  return file.replace(/\.json$/i, ".simulation.json");
}

function deterministicDelay(message: SimulationMessage) {
  if (message.delayMs) return message.delayMs;
  const value = [...message.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return 900 + (value % 650);
}

export function renderHighlightedText(text: string, highlights: string[] = []) {
  const terms = [...new Set(highlights.filter((term) => text.includes(term)))].sort(
    (left, right) => right.length - left.length,
  );
  if (terms.length === 0) return text;

  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escapedTerms.join("|")})`, "g");

  return text.split(matcher).map((part, index) =>
    terms.includes(part) ? (
      <strong key={`${part}-${index}`} className={styles.highlight}>
        {part}
      </strong>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}

export default function MemoryDialogue({ file }: Props) {
  const [base, setBase] = useState<MemoryDialogueData | null>(null);
  const [simulation, setSimulation] = useState<DialogueSimulation | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingParticipantId, setTypingParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const shouldFollowRef = useRef(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDialogue() {
      try {
        setLoading(true);
        setError(null);
        setBase(null);
        setSimulation(null);
        setVisibleCount(0);
        setTypingParticipantId(null);

        const [baseResponse, simulationResponse] = await Promise.all([
          fetch(file, { signal: controller.signal }),
          fetch(simulationFile(file), { signal: controller.signal }),
        ]);
        const [nextBase, nextSimulation] = (await Promise.all([
          baseResponse.json(),
          simulationResponse.json(),
        ])) as [MemoryDialogueData, DialogueSimulation];

        if (
          !baseResponse.ok ||
          !simulationResponse.ok ||
          nextBase.version !== 1 ||
          nextSimulation.version !== 1 ||
          nextBase.heritage.pid !== nextSimulation.pid ||
          !Array.isArray(nextSimulation.messages) ||
          !Array.isArray(nextSimulation.participants) ||
          nextSimulation.messages.some(
            (message) => !Number.isInteger(message.likes) || message.likes < 0,
          )
        ) {
          throw new Error("Invalid simulated dialogue response");
        }

        setBase(nextBase);
        setSimulation(nextSimulation);
        setVisibleCount(Math.min(nextSimulation.initialCount, nextSimulation.messages.length));
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Failed to load simulated memory dialogue:", loadError);
        setError("讨论暂时无法加载");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDialogue();
    return () => controller.abort();
  }, [file]);

  const participants = useMemo(
    () => new Map(simulation?.participants.map((participant) => [participant.id, participant]) ?? []),
    [simulation],
  );

  useEffect(() => {
    if (!simulation || visibleCount >= simulation.messages.length) {
      return;
    }

    const nextMessage = simulation.messages[visibleCount];
    const delay = deterministicDelay(nextMessage);
    const typingTimer = window.setTimeout(
      () => setTypingParticipantId(nextMessage.participantId),
      Math.min(420, Math.round(delay * 0.35)),
    );
    const revealTimer = window.setTimeout(() => {
      setTypingParticipantId(null);
      setVisibleCount((count) => count + 1);
    }, delay);

    return () => {
      window.clearTimeout(typingTimer);
      window.clearTimeout(revealTimer);
    };
  }, [simulation, visibleCount]);

  useEffect(() => {
    if (!shouldFollowRef.current) return;
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTo({ top: stream.scrollHeight, behavior: visibleCount > 2 ? "smooth" : "auto" });
  }, [typingParticipantId, visibleCount]);

  function handleScroll() {
    const stream = streamRef.current;
    if (!stream) return;
    shouldFollowRef.current = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 90;
  }

  if (loading) {
    return (
      <div className={styles.state}>
        <span className={styles.loadingPulse} aria-hidden="true" />
        正在进入讨论群…
      </div>
    );
  }

  if (error || !base || !simulation) {
    return <div className={`${styles.state} ${styles.error}`}>{error}</div>;
  }

  const visibleMessages = simulation.messages.slice(0, visibleCount);
  const typingParticipant = typingParticipantId
    ? participants.get(typingParticipantId)
    : undefined;

  return (
    <div className={styles.dialogue} data-memory-dialogue={base.heritage.pid}>
      <div className={styles.liveBar} aria-label="模拟群聊正在播放">
        <span className={styles.liveDot} aria-hidden="true" />
        <span>群聊进行中</span>
        <span className={styles.liveCount}>{visibleCount}/{simulation.messages.length}</span>
      </div>

      <div
        className={styles.chatStream}
        ref={streamRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className={styles.dayDivider}>{simulation.dayLabel}</div>

        {base.heritage.pid === "P246" && (
          <div className={styles.relationMessage}>
            <span aria-hidden="true">⌖</span>
            {base.heritage.relationNote}
          </div>
        )}

        {base.facts.length > 0 && (
          <details className={styles.groupNotice}>
            <summary>群公告 · 遗址背景</summary>
            <ul>
              {base.facts.map((fact) => <li key={fact.id}>{fact.text}</li>)}
            </ul>
            <div className={styles.sources}>
              {base.sources.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                  {source.publisher}
                </a>
              ))}
            </div>
          </details>
        )}

        {visibleMessages.map((message) => {
          const participant = participants.get(message.participantId);
          if (!participant) return null;

          return (
            <article
              key={message.id}
              className={`${styles.messageRow} ${styles[participant.side]}`}
              data-message-id={message.id}
            >
              <Image
                className={styles.avatar}
                src={participant.avatar}
                alt={`${participant.name}的头像`}
                width={42}
                height={42}
                draggable={false}
                unoptimized
              />
              <div className={styles.messageContent}>
                <div className={styles.userLine}>
                  <span>{participant.name}</span>
                  <time>{message.time}</time>
                </div>
                <div className={styles.bubble}>
                  {message.replyTo && (
                    <div className={styles.replyQuote}>
                      <span>{message.replyTo.name}</span>
                      {message.replyTo.text}
                    </div>
                  )}
                  <div>{renderHighlightedText(message.text, message.highlights)}</div>
                </div>
                <div className={styles.likeLine} aria-label={`${message.likes} 个赞`}>
                  <span className={styles.heart} aria-hidden="true">❤</span>
                  <span>{message.likes}</span>
                </div>
              </div>
            </article>
          );
        })}

        {typingParticipant && (
          <div
            className={`${styles.messageRow} ${styles.typingRow} ${styles[typingParticipant.side]}`}
            aria-label={`${typingParticipant.name}正在输入`}
          >
            <Image
              className={styles.avatar}
              src={typingParticipant.avatar}
              alt=""
              width={42}
              height={42}
              draggable={false}
              unoptimized
            />
            <div className={styles.messageContent}>
              <div className={styles.userLine}>{typingParticipant.name}</div>
              <div className={`${styles.bubble} ${styles.typingBubble}`} aria-hidden="true">
                <i /><i /><i />
              </div>
            </div>
          </div>
        )}

        {visibleCount === simulation.messages.length && (
          <div className={styles.caughtUp}>已看到最新讨论</div>
        )}
      </div>
    </div>
  );
}