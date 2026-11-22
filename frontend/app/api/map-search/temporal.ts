const ROUTE = "/api/map-search" as const;
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_INTEGER = BigInt(Number.MIN_SAFE_INTEGER);
const STRICT_DECIMAL_INTEGER = /^-?(?:0|[1-9]\d*)$/;

export type MapSearchTemporalField = "time_start" | "time_end" | "time_start/time_end";

export type MapSearchTemporalIssueReason =
  | "invalid_type"
  | "invalid_integer_string"
  | "non_finite"
  | "not_integer"
  | "unsafe_integer"
  | "zero"
  | "end_without_start"
  | "reversed_interval";

export type MapSearchTemporalIssue = {
  readonly type: "temporal_data_issue";
  readonly route: typeof ROUTE;
  readonly record_id: string | number | null;
  readonly field: MapSearchTemporalField;
  readonly reason: MapSearchTemporalIssueReason;
};

export type MapSearchTemporalFields = {
  readonly time_start: number | null;
  readonly time_end: number | null;
};

type MapSearchTemporalInput = {
  readonly time_start: unknown;
  readonly time_end: unknown;
};

type BoundaryConversion = {
  readonly value: number | null;
  readonly reason?: MapSearchTemporalIssueReason;
};

function convertBoundary(value: unknown): BoundaryConversion {
  if (value === null) return { value: null };

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { value: null, reason: "non_finite" };
    if (!Number.isInteger(value)) return { value: null, reason: "not_integer" };
    if (!Number.isSafeInteger(value)) return { value: null, reason: "unsafe_integer" };
    if (value === 0) return { value: null, reason: "zero" };
    return { value };
  }

  if (typeof value === "string") {
    if (!STRICT_DECIMAL_INTEGER.test(value)) {
      return { value: null, reason: "invalid_integer_string" };
    }

    const integer = BigInt(value);
    if (integer === BigInt(0)) return { value: null, reason: "zero" };
    if (integer > MAX_SAFE_INTEGER || integer < MIN_SAFE_INTEGER) {
      return { value: null, reason: "unsafe_integer" };
    }
    return { value: Number(integer) };
  }

  return { value: null, reason: "invalid_type" };
}

function normalizeRecordId(recordId: unknown): string | number | null {
  if (typeof recordId === "string") return recordId;
  if (typeof recordId === "number" && Number.isFinite(recordId)) return recordId;
  return null;
}

function createIssue(
  recordId: string | number | null,
  field: MapSearchTemporalField,
  reason: MapSearchTemporalIssueReason,
): MapSearchTemporalIssue {
  return {
    type: "temporal_data_issue",
    route: ROUTE,
    record_id: recordId,
    field,
    reason,
  };
}

export function convertMapSearchTemporalFields(
  input: Readonly<MapSearchTemporalInput>,
  recordId: unknown,
): {
  readonly fields: MapSearchTemporalFields;
  readonly issues: readonly MapSearchTemporalIssue[];
} {
  const normalizedRecordId = normalizeRecordId(recordId);
  const start = convertBoundary(input.time_start);
  const end = convertBoundary(input.time_end);
  const issues: MapSearchTemporalIssue[] = [];

  if (start.reason) issues.push(createIssue(normalizedRecordId, "time_start", start.reason));
  if (end.reason) issues.push(createIssue(normalizedRecordId, "time_end", end.reason));

  if (input.time_start === null && end.value !== null) {
    issues.push(createIssue(normalizedRecordId, "time_start", "end_without_start"));
  } else if (start.value !== null && end.value !== null && start.value > end.value) {
    issues.push(createIssue(normalizedRecordId, "time_start/time_end", "reversed_interval"));
  }

  return {
    fields: {
      time_start: start.value,
      time_end: end.value,
    },
    issues,
  };
}