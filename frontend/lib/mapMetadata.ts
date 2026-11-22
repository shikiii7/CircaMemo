export type MapMetadataTemporalType =
  | "overview"
  | "snapshot"
  | "range"
  | "unknown";

type MapMetadataCommon = {
  readonly id: string;
  readonly map_name: string;
  readonly period: string;
  readonly file_name: string;
  readonly layer_name: string;
  readonly tile_url: string;
  readonly tile_scheme: "xyz" | "tms";
  readonly default_opacity: number;
  readonly active: boolean;
};

export type TargetMapMetadata = MapMetadataCommon & {
  readonly temporal_type: MapMetadataTemporalType;
  readonly year: number | null;
  readonly year_start: number | null;
  readonly year_end: number | null;
  readonly period_id: string | null;
};

export type LegacyMapMetadata = MapMetadataCommon & {
  readonly year: number;
  readonly year_start: number;
  readonly year_end: number;
  readonly file_path: string;
};

export type MapMetadata = TargetMapMetadata | LegacyMapMetadata;

const COMMON_FIELDS = [
  "id",
  "map_name",
  "period",
  "year",
  "year_start",
  "year_end",
  "file_name",
  "layer_name",
  "tile_url",
  "tile_scheme",
  "default_opacity",
  "active",
] as const;
const TARGET_ONLY_FIELDS = ["temporal_type", "period_id"] as const;
const LEGACY_ONLY_FIELDS = ["file_path"] as const;
const TARGET_FIELDS = [...COMMON_FIELDS, ...TARGET_ONLY_FIELDS] as const;
const LEGACY_FIELDS = [...COMMON_FIELDS, ...LEGACY_ONLY_FIELDS] as const;
const TARGET_FIELD_SET = new Set<string>(TARGET_FIELDS);
const LEGACY_FIELD_SET = new Set<string>(LEGACY_FIELDS);
const COMMON_STRING_FIELDS = [
  "id",
  "map_name",
  "period",
  "file_name",
  "layer_name",
  "tile_url",
] as const;
const YEAR_FIELDS = ["year", "year_start", "year_end"] as const;
const TEMPORAL_TYPES = new Set<string>([
  "overview",
  "snapshot",
  "range",
  "unknown",
]);

export class MapMetadataDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapMetadataDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeEntry(index: number, value: Record<string, unknown>): string {
  const id = typeof value.id === "string" && value.id.trim() ? ` (${value.id})` : "";
  return `Map metadata entry at index ${index}${id}`;
}

function hasOwn(value: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function hasEveryField(
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.every((field) => hasOwn(value, field));
}

function assertExactFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  fieldSet: ReadonlySet<string>,
  index: number,
): void {
  const label = describeEntry(index, value);

  for (const field of fields) {
    if (!hasOwn(value, field)) {
      throw new MapMetadataDataError(`${label} is missing field "${field}".`);
    }
  }

  const unexpectedField = Object.keys(value).find((field) => !fieldSet.has(field));
  if (unexpectedField) {
    throw new MapMetadataDataError(
      `${label} contains unexpected field "${unexpectedField}".`,
    );
  }
}

function assertCommonFields(value: Record<string, unknown>, index: number): void {
  const label = describeEntry(index, value);

  for (const field of COMMON_STRING_FIELDS) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new MapMetadataDataError(
        `${label} field "${field}" must be a non-empty string.`,
      );
    }
  }

  if (value.tile_scheme !== "xyz" && value.tile_scheme !== "tms") {
    throw new MapMetadataDataError(
      `${label} field "tile_scheme" must be "xyz" or "tms".`,
    );
  }

  if (
    typeof value.default_opacity !== "number" ||
    !Number.isFinite(value.default_opacity) ||
    value.default_opacity < 0 ||
    value.default_opacity > 1
  ) {
    throw new MapMetadataDataError(
      `${label} field "default_opacity" must be a finite number from 0 to 1.`,
    );
  }

  if (typeof value.active !== "boolean") {
    throw new MapMetadataDataError(`${label} field "active" must be a boolean.`);
  }
}

function isValidYear(value: unknown): value is number {
  return Number.isSafeInteger(value) && value !== 0;
}

function assertLegacyEntry(
  value: Record<string, unknown>,
  index: number,
): asserts value is LegacyMapMetadata {
  assertExactFields(value, LEGACY_FIELDS, LEGACY_FIELD_SET, index);
  assertCommonFields(value, index);
  const label = describeEntry(index, value);

  if (typeof value.file_path !== "string" || value.file_path.trim().length === 0) {
    throw new MapMetadataDataError(
      `${label} field "file_path" must be a non-empty string.`,
    );
  }

  for (const field of YEAR_FIELDS) {
    if (!isValidYear(value[field])) {
      throw new MapMetadataDataError(
        `${label} field "${field}" must be a non-zero safe integer.`,
      );
    }
  }

  if ((value.year_start as number) > (value.year_end as number)) {
    throw new MapMetadataDataError(
      `${label} field "year_start" must not be after "year_end".`,
    );
  }
}

function assertNullableYear(
  value: Record<string, unknown>,
  field: (typeof YEAR_FIELDS)[number],
  label: string,
): void {
  if (value[field] !== null && !isValidYear(value[field])) {
    throw new MapMetadataDataError(
      `${label} field "${field}" must be null or a non-zero safe integer.`,
    );
  }
}

function assertTargetTemporalFields(
  value: Record<string, unknown>,
  index: number,
): void {
  const label = describeEntry(index, value);

  if (
    typeof value.temporal_type !== "string" ||
    !TEMPORAL_TYPES.has(value.temporal_type)
  ) {
    throw new MapMetadataDataError(
      `${label} field "temporal_type" must be "overview", "snapshot", "range", or "unknown".`,
    );
  }

  if (
    value.period_id !== null &&
    (typeof value.period_id !== "string" || value.period_id.trim().length === 0)
  ) {
    throw new MapMetadataDataError(
      `${label} field "period_id" must be null or a non-empty string.`,
    );
  }

  for (const field of YEAR_FIELDS) {
    assertNullableYear(value, field, label);
  }

  const { temporal_type, year, year_start, year_end } = value;
  if (temporal_type === "overview" || temporal_type === "unknown") {
    if (year !== null || year_start !== null || year_end !== null) {
      throw new MapMetadataDataError(
        `${label} with temporal_type "${temporal_type}" must have null year, year_start, and year_end.`,
      );
    }
    return;
  }

  if (temporal_type === "snapshot") {
    if (!isValidYear(year) || year_start !== year || year_end !== year) {
      throw new MapMetadataDataError(
        `${label} with temporal_type "snapshot" must have the same non-zero safe integer for year, year_start, and year_end.`,
      );
    }
    return;
  }

  if (
    year !== null ||
    !isValidYear(year_start) ||
    !isValidYear(year_end) ||
    year_start > year_end
  ) {
    throw new MapMetadataDataError(
      `${label} with temporal_type "range" must have null year and an ordered non-zero safe integer year_start/year_end range.`,
    );
  }
}

function assertTargetEntry(
  value: Record<string, unknown>,
  index: number,
): asserts value is TargetMapMetadata {
  assertExactFields(value, TARGET_FIELDS, TARGET_FIELD_SET, index);
  assertCommonFields(value, index);
  assertTargetTemporalFields(value, index);
}

function assertEntry(
  value: unknown,
  index: number,
): asserts value is MapMetadata {
  if (!isRecord(value)) {
    throw new MapMetadataDataError(
      `Map metadata entry at index ${index} must be an object.`,
    );
  }

  const hasCompleteTargetShape = hasEveryField(value, TARGET_FIELDS);
  const hasCompleteLegacyShape = hasEveryField(value, LEGACY_FIELDS);

  if (hasCompleteTargetShape) {
    assertTargetEntry(value, index);
    return;
  }
  if (hasCompleteLegacyShape) {
    assertLegacyEntry(value, index);
    return;
  }

  const label = describeEntry(index, value);
  throw new MapMetadataDataError(
    `${label} must match the complete target or legacy shape; mixed or incomplete shapes are not allowed.`,
  );
}

/**
 * Validates either the strict 14-field target contract or the strict 13-field
 * legacy contract without normalizing, filtering, reordering, or modifying data.
 */
export function parseMapMetadata(value: unknown): MapMetadata[] {
  if (!Array.isArray(value)) {
    throw new MapMetadataDataError("Map metadata must be an array.");
  }
  if (value.length === 0) {
    throw new MapMetadataDataError("Map metadata must contain at least one entry.");
  }

  const ids = new Set<string>();
  for (const [index, entry] of value.entries()) {
    assertEntry(entry, index);
    if (ids.has(entry.id)) {
      throw new MapMetadataDataError(
        `Map metadata id "${entry.id}" is duplicated.`,
      );
    }
    ids.add(entry.id);
  }

  return value;
}