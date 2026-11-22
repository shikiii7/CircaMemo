"use client";

import { useEffect, useRef } from "react";
import MemoryDialogue from "./MemoryDialogue";
import styles from "./MemoryPanel.module.css";

type Props = {
  title: string;
  file: string;
  onClose: () => void;
};

export default function MemoryPanel({ title, file, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.title}>{title}</div>

          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭公众对话"
          >
            ✕
          </button>
        </header>

        <MemoryDialogue file={file} />
      </div>
    </div>
  );
}