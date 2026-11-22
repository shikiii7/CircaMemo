import { matchesTemporalSelection } from "./heritageTemporal";
import {
  formatYear,
  getTemporalIntervalStatus,
  normalizeTemporalInterval,
  type ClosedTemporalInterval,
  type TemporalIntervalInput,
  type TemporalSelection,
} from "./temporal";

export type SearchTemporalDecision =
  | {
      readonly kind: "keep";
      readonly status: "valid";
      readonly interval: ClosedTemporalInterval;
    }
  | {
      readonly kind: "select-year";
      readonly status: "valid";
      readonly interval: ClosedTemporalInterval;
      readonly year: number;
    }
  | {
      readonly kind: "select-unlimited";
      readonly status: "unknown";
      readonly selectionChanged: boolean;
    }
  | {
      readonly kind: "invalid";
      readonly status: "invalid";
    };

export function getSearchTemporalInterval(
  item: Readonly<{ time_start: number | null; time_end: number | null }>,
): TemporalIntervalInput {
  return { startYear: item.time_start, endYear: item.time_end };
}

export function formatSearchTemporalValue(
  item: Readonly<{ time_start: number | null; time_end: number | null }>,
): string {
  const interval = getSearchTemporalInterval(item);
  const status = getTemporalIntervalStatus(interval);
  if (status === "unknown") return "年代未详";
  if (status === "invalid") return "年代数据异常";

  const normalized = normalizeTemporalInterval(interval);
  if (!normalized) return "年代数据异常";
  if (normalized.startYear === normalized.endYear) {
    return formatYear(normalized.startYear);
  }
  return `${formatYear(normalized.startYear)}–${formatYear(normalized.endYear)}`;
}

export function formatTemporalSelection(selection: Readonly<TemporalSelection>): string {
  if (selection.mode === "unlimited") return "不限";
  if (selection.mode === "year") return formatYear(selection.year);
  return `${selection.label}（${formatYear(selection.startYear)}–${formatYear(selection.endYear)}）`;
}

export function decideSearchTemporalSelection(
  item: Readonly<{ time_start: number | null; time_end: number | null }>,
  currentSelection: Readonly<TemporalSelection>,
): SearchTemporalDecision {
  const interval = getSearchTemporalInterval(item);
  const status = getTemporalIntervalStatus(interval);

  if (status === "unknown") {
    return {
      kind: "select-unlimited",
      status,
      selectionChanged: currentSelection.mode !== "unlimited",
    };
  }
  if (status === "invalid") return { kind: "invalid", status };

  const normalized = normalizeTemporalInterval(interval);
  if (!normalized) return { kind: "invalid", status: "invalid" };
  if (matchesTemporalSelection(currentSelection, interval)) {
    return { kind: "keep", status, interval: normalized };
  }

  let year: number;
  if (currentSelection.mode === "year") {
    year =
      currentSelection.year < normalized.startYear
        ? normalized.startYear
        : normalized.endYear;
  } else if (currentSelection.mode === "range") {
    year =
      currentSelection.endYear < normalized.startYear
        ? normalized.startYear
        : normalized.endYear;
  } else {
    return { kind: "keep", status, interval: normalized };
  }

  return { kind: "select-year", status, interval: normalized, year };
}
