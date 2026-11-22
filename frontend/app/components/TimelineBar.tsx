"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { formatYear, type TemporalSelection } from "@/lib/temporal";
import type { HistoricalMapPoint } from "@/lib/historicalMapSelection";
import {
  createTemporalAxisLayout,
  positionToYear,
  yearToPosition,
} from "@/lib/temporalAxis";
import {
  TIMELINE_AXIS_WIDTH,
  TIMELINE_END_YEAR,
  TIMELINE_PERIODS,
  TIMELINE_START_YEAR,
  TIMELINE_TICKS,
  getTimelinePeriodForYear,
} from "@/lib/timelinePeriods";
import styles from "./TimelineBar.module.css";

export type TimelineBarProps = {
  selection: TemporalSelection;
  onSelectionChange: (selection: TemporalSelection) => void;
  historicalMaps?: readonly HistoricalMapPoint[];
  selectedHistoricalMapId?: string | null;
  onHistoricalMapSelect?: (map: HistoricalMapPoint) => void;
};

const AXIS_LAYOUT = createTemporalAxisLayout(TIMELINE_PERIODS, TIMELINE_AXIS_WIDTH);

type PositionedHistoricalMapPoint = {
  readonly map: HistoricalMapPoint;
  readonly left: number;
};

function positionHistoricalMapPoints(
  maps: readonly HistoricalMapPoint[],
): PositionedHistoricalMapPoint[] {
  return maps
    .map((map) => ({ map, left: yearToPosition(AXIS_LAYOUT, map.year) }))
    .sort((left, right) => left.left - right.left || left.map.id.localeCompare(right.map.id));
}

function moveHistoricalYear(year: number, delta: number): number {
  let next = year;
  const direction = Math.sign(delta);
  for (let step = 0; step < Math.abs(delta); step += 1) {
    next += direction;
    if (next === 0) next += direction;
  }
  return Math.min(TIMELINE_END_YEAR, Math.max(TIMELINE_START_YEAR, next));
}

function getSelectionText(selection: TemporalSelection): string {
  if (selection.mode === "unlimited") return "不限 · 浏览全部年代";
  if (selection.mode === "range") {
    return `${selection.label} · ${formatYear(selection.startYear)}—${formatYear(selection.endYear)}`;
  }
  const period = getTimelinePeriodForYear(selection.year);
  return `${formatYear(selection.year)}${period ? ` · ${period.label}` : ""}`;
}

export default function TimelineBar({
  selection,
  onSelectionChange,
  historicalMaps = [],
  selectedHistoricalMapId = null,
  onHistoricalMapSelect = () => undefined,
}: TimelineBarProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const draftFrameRef = useRef<number | null>(null);
  const pendingDraftYearRef = useRef<number | null>(null);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const committedYear = selection.mode === "year" ? selection.year : null;
  const visibleYear = draftYear ?? committedYear;
  const activePeriodId =
    selection.mode === "range"
      ? selection.periodId
      : visibleYear === null
        ? null
        : getTimelinePeriodForYear(visibleYear)?.id ?? null;

  const tickPositions = useMemo(
    () => TIMELINE_TICKS.map((tick) => ({ ...tick, left: yearToPosition(AXIS_LAYOUT, tick.year) })),
    [],
  );
  const historicalMapPositions = useMemo(() => {
    return positionHistoricalMapPoints(historicalMaps);
  }, [historicalMaps]);

  useEffect(() => {
    if (visibleYear === null || draftYear !== null) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const left = yearToPosition(AXIS_LAYOUT, visibleYear);
    const targetLeft = Math.max(0, left - viewport.clientWidth / 2);
    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({
        left: targetLeft,
        behavior: "auto",
      });
    } else {
      viewport.scrollLeft = targetLeft;
    }
  }, [draftYear, visibleYear]);

  function yearFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return TIMELINE_START_YEAR;
    return positionToYear(AXIS_LAYOUT, clientX - rect.left);
  }

  function cancelDraftFrame() {
    if (draftFrameRef.current === null) return;
    window.cancelAnimationFrame(draftFrameRef.current);
    draftFrameRef.current = null;
  }

  function scheduleDraftYear(year: number) {
    pendingDraftYearRef.current = year;
    if (draftFrameRef.current !== null) return;
    draftFrameRef.current = window.requestAnimationFrame(() => {
      draftFrameRef.current = null;
      setDraftYear(pendingDraftYearRef.current);
    });
  }

  useEffect(() => () => cancelDraftFrame(), []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    scheduleDraftYear(yearFromClientX(event.clientX));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;
    scheduleDraftYear(yearFromClientX(event.clientX));
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;
    const year = yearFromClientX(event.clientX);
    cancelDraftFrame();
    pendingDraftYearRef.current = null;
    pointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraftYear(null);
    onSelectionChange({ mode: "year", year });
  }

  function cancelPointer(event: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;
    cancelDraftFrame();
    pendingDraftYearRef.current = null;
    pointerIdRef.current = null;
    setDraftYear(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const basis = committedYear ?? TIMELINE_END_YEAR;
    const direction = event.key === "ArrowLeft" || event.key === "PageDown" ? -1 : 1;
    const step = event.key === "PageUp" || event.key === "PageDown" || event.shiftKey ? 10 : 1;
    const year =
      event.key === "Home"
        ? TIMELINE_START_YEAR
        : event.key === "End"
          ? TIMELINE_END_YEAR
          : moveHistoricalYear(basis, direction * step);
    onSelectionChange({ mode: "year", year });
  }

  return (
    <section className={styles.timeline} aria-label="历史时间轴" aria-describedby="timeline-help">
      <button
        type="button"
        className={styles.unlimitedButton}
        aria-label="不限"
        aria-pressed={selection.mode === "unlimited"}
        onClick={() => onSelectionChange({ mode: "unlimited" })}
      >
        <span className={styles.unlimitedTitle}>不限</span>
        <span className={styles.unlimitedSubtitle}>全部年代</span>
      </button>

      <div className={styles.mainPanel}>
        <strong className={styles.srOnly} data-testid="timeline-status" aria-live="polite">
          {draftYear === null
            ? getSelectionText(selection)
            : getSelectionText({ mode: "year", year: draftYear })}
        </strong>
        <span id="timeline-help" className={styles.srOnly}>
          左右方向键逐年调整，Shift 加方向键或 PageUp、PageDown 每次调整十年，Home 和 End 跳至首尾。
        </span>

        <div className={styles.viewport} ref={viewportRef} data-testid="timeline-viewport">
          <div className={styles.axis} style={{ width: TIMELINE_AXIS_WIDTH }}>
            <div
              ref={trackRef}
              className={styles.yearTrack}
              data-testid="year-track"
              role="slider"
              tabIndex={0}
              aria-label="选择历史年份"
              aria-valuemin={TIMELINE_START_YEAR}
              aria-valuemax={TIMELINE_END_YEAR}
              aria-valuenow={visibleYear ?? TIMELINE_END_YEAR}
              aria-valuetext={
                visibleYear === null
                  ? "当前不限；按方向键选择年份"
                  : getSelectionText({ mode: "year", year: visibleYear })
              }
              aria-describedby="timeline-help"
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={cancelPointer}
            >
              <div className={styles.trackLine} aria-hidden="true" />
              {AXIS_LAYOUT.segments.slice(1).map((segment) => (
                <span
                  key={segment.id}
                  className={styles.axisBreak}
                  style={{ left: segment.startPosition }}
                  aria-hidden="true"
                />
              ))}
              {tickPositions.map((tick) => (
                <span key={tick.year} className={styles.tick} style={{ left: tick.left }} aria-hidden="true">
                  <span className={styles.tickMark} />
                  <span className={styles.tickLabel}>{tick.label}</span>
                </span>
              ))}
              {historicalMapPositions.map((map) => (
                <button
                  type="button"
                  key={map.map.id}
                  className={styles.mapPoint}
                  style={{
                    left: map.left,
                    transform: "translateX(-50%)",
                  }}
                  aria-label={`选择历史地图：${map.map.mapName}，${formatYear(map.map.year)}`}
                  aria-pressed={selectedHistoricalMapId === map.map.id}
                  title={`${map.map.mapName} · ${formatYear(map.map.year)}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onHistoricalMapSelect(map.map);
                  }}
                >
                  <span className={styles.mapPointMarker} aria-hidden="true" />
                </button>
              ))}
              {visibleYear !== null && (
                <span
                  className={styles.handle}
                  data-testid="year-handle"
                  style={{ left: yearToPosition(AXIS_LAYOUT, visibleYear) }}
                  aria-hidden="true"
                >
                  <span className={styles.handleLabel}>{formatYear(visibleYear)}</span>
                </span>
              )}
            </div>

            <div className={styles.periodBand} aria-label="朝代与时期">
              {AXIS_LAYOUT.segments.map((segment, index) => {
                const productPeriod = TIMELINE_PERIODS[index];
                const selected = activePeriodId === productPeriod.id;
                return (
                  <button
                    type="button"
                    key={productPeriod.id}
                    className={styles.periodButton}
                    data-period-id={productPeriod.id}
                    aria-pressed={selected}
                    title={`${productPeriod.label}：${formatYear(productPeriod.startYear)}—${formatYear(productPeriod.endYear)}`}
                    style={{
                      left: segment.startPosition,
                      width: segment.width,
                      backgroundColor: productPeriod.color,
                    }}
                    onClick={() =>
                      onSelectionChange({
                        mode: "range",
                        startYear: productPeriod.startYear,
                        endYear: productPeriod.endYear,
                        label: productPeriod.label,
                        periodId: productPeriod.id,
                      })
                    }
                  >
                    <span>{productPeriod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}