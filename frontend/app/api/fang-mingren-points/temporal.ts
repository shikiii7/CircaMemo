const ROUTE = "/api/fang-mingren-points" as const;
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_INTEGER = BigInt(Number.MIN_SAFE_INTEGER);
const STRICT_DECIMAL_INTEGER = /^-?(?:0|[1-9]\d*)$/;

export type MingrenTemporalField =
  | "time_birth"
  | "time_pass"
  | "time_birth/time_pass";

export type MingrenTemporalIssueReason =
  | "invalid_type"
  | "invalid_integer_string"
  | "non_finite"
  | "not_integer"
  | "unsafe_integer"
  | "zero"
  | "pass_without_birth"
  | "reversed_lifespan";

export type MingrenTemporalIssue = {
  readonly type: "temporal_data_issue";
  readonly route: typeof ROUTE;
  readonly record_id: string | number | null;
  readonly field: MingrenTemporalField;
  readonly reason: MingrenTemporalIssueReason;
};

type MingrenTemporalInput = {
  readonly time_birth: unknown;
  readonly time_pass: unknown;
};

type BoundaryConversion = {
  readonly value: number | null;
  readonly reason?: MingrenTemporalIssueReason;
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
  field: MingrenTemporalField,
  reason: MingrenTemporalIssueReason,
): MingrenTemporalIssue {
  return {
    type: "temporal_data_issue",
    route: ROUTE,
    record_id: recordId,
    field,
    reason,
  };
}

export function convertMingrenTemporalFields(
  input: Readonly<MingrenTemporalInput>,
  recordId: unknown,
): {
  readonly fields: {
    readonly time_birth: number | null;
    readonly time_pass: number | null;
  };
  readonly issues: readonly MingrenTemporalIssue[];
} {
  const normalizedRecordId = normalizeRecordId(recordId);
  const birth = convertBoundary(input.time_birth);
  const pass = convertBoundary(input.time_pass);
  const issues: MingrenTemporalIssue[] = [];

  if (birth.reason) {
    issues.push(createIssue(normalizedRecordId, "time_birth", birth.reason));
  }
  if (pass.reason) {
    issues.push(createIssue(normalizedRecordId, "time_pass", pass.reason));
  }

  if (input.time_birth === null && pass.value !== null) {
    issues.push(createIssue(normalizedRecordId, "time_birth", "pass_without_birth"));
  } else if (birth.value !== null && pass.value !== null && birth.value > pass.value) {
    issues.push(
      createIssue(
        normalizedRecordId,
        "time_birth/time_pass",
        "reversed_lifespan",
      ),
    );
  }

  return {
    fields: {
      time_birth: birth.value,
      time_pass: pass.value,
    },
    issues,
  };
}