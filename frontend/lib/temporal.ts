export type TemporalSelection =
  | { readonly mode: "unlimited" }
  | { readonly mode: "year"; readonly year: number }
  | {
      readonly mode: "range";
      readonly startYear: number;
      readonly endYear: number;
      readonly label: string;
      readonly periodId: string;
    };

export type TemporalIntervalInput = {
  readonly startYear: number | null;
  readonly endYear: number | null;
};

export type ClosedTemporalInterval = {
  readonly startYear: number;
  readonly endYear: number;
};

export type TemporalIntervalStatus = "valid" | "unknown" | "invalid";

/** Returns true for finite, safely represented integer years other than year zero. */
export function isIntegerYear(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value !== 0;
}

/** Validates an already closed interval without reordering either boundary. */
export function isValidClosedInterval(
  interval: Readonly<ClosedTemporalInterval>,
): boolean {
  return (
    isIntegerYear(interval.startYear) &&
    isIntegerYear(interval.endYear) &&
    interval.startYear <= interval.endYear
  );
}

/**
 * Classifies nullable source boundaries according to the shared temporal contract.
 * A missing end is valid when the start is valid; it is normalized separately.
 */
export function getTemporalIntervalStatus(
  interval: Readonly<TemporalIntervalInput>,
): TemporalIntervalStatus {
  const { startYear, endYear } = interval;

  if (startYear === null && endYear === null) return "unknown";
  if (!isIntegerYear(startYear)) return "invalid";
  if (endYear === null) return "valid";
  if (!isIntegerYear(endYear) || startYear > endYear) return "invalid";

  return "valid";
}

export function isUnknownTemporalInterval(
  interval: Readonly<TemporalIntervalInput>,
): boolean {
  return getTemporalIntervalStatus(interval) === "unknown";
}

export function isInvalidTemporalInterval(
  interval: Readonly<TemporalIntervalInput>,
): boolean {
  return getTemporalIntervalStatus(interval) === "invalid";
}

/**
 * Returns a new closed interval. A valid [S, null] input becomes [S, S].
 * Unknown and invalid inputs return null; the input object is never modified.
 */
export function normalizeTemporalInterval(
  interval: Readonly<TemporalIntervalInput>,
): ClosedTemporalInterval | null {
  if (getTemporalIntervalStatus(interval) !== "valid") return null;

  const startYear = interval.startYear;
  if (startYear === null) return null;

  return {
    startYear,
    endYear: interval.endYear ?? startYear,
  };
}

/** Tests inclusive single-year containment after read-only normalization. */
export function containsYear(
  interval: Readonly<TemporalIntervalInput>,
  year: unknown,
): boolean {
  if (!isIntegerYear(year)) return false;

  const normalized = normalizeTemporalInterval(interval);
  return (
    normalized !== null &&
    normalized.startYear <= year &&
    normalized.endYear >= year
  );
}

/** Tests whether two valid closed intervals intersect, including either boundary. */
export function intervalsIntersect(
  left: Readonly<TemporalIntervalInput>,
  right: Readonly<TemporalIntervalInput>,
): boolean {
  const normalizedLeft = normalizeTemporalInterval(left);
  const normalizedRight = normalizeTemporalInterval(right);

  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    normalizedLeft.startYear <= normalizedRight.endYear &&
    normalizedLeft.endYear >= normalizedRight.startYear
  );
}

/** Formats a historical year without exposing a negative sign or creating year zero. */
export function formatYear(year: unknown): string {
  if (!isIntegerYear(year)) {
    throw new RangeError("Year must be a non-zero safe integer.");
  }

  return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
}
