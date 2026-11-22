import { isIntegerYear } from "./temporal";

export type TemporalAxisSegmentConfig = {
  readonly id: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly weight: number;
  readonly minWidth: number;
};

export type TemporalAxisLayoutSegment = TemporalAxisSegmentConfig & {
  readonly startPosition: number;
  readonly endPosition: number;
  readonly width: number;
  readonly yearCount: number;
};

export type TemporalAxisLayout = {
  readonly width: number;
  readonly startYear: number;
  readonly endYear: number;
  readonly segments: readonly TemporalAxisLayoutSegment[];
};

function toHistoricalOrdinal(year: number): number {
  return year > 0 ? year - 1 : year;
}

function getYearCount(startYear: number, endYear: number): number {
  return toHistoricalOrdinal(endYear) - toHistoricalOrdinal(startYear) + 1;
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite positive number.`);
  }
}

/**
 * Validates a chronological, gap-free list of semantic-axis segments.
 * Historical years are consecutive across the BCE/CE boundary: -1 is followed by 1.
 */
export function validateTemporalAxisConfig(
  segments: readonly TemporalAxisSegmentConfig[],
): void {
  if (segments.length === 0) {
    throw new RangeError("Temporal axis must contain at least one segment.");
  }

  const ids = new Set<string>();
  let previousEndOrdinal: number | null = null;

  for (const [index, segment] of segments.entries()) {
    const label = `Temporal axis segment at index ${index}`;

    if (segment.id.trim().length === 0) {
      throw new RangeError(`${label} must have a non-empty id.`);
    }
    if (ids.has(segment.id)) {
      throw new RangeError(`Temporal axis segment id "${segment.id}" is duplicated.`);
    }
    ids.add(segment.id);

    if (!isIntegerYear(segment.startYear) || !isIntegerYear(segment.endYear)) {
      throw new RangeError(`${label} boundaries must be non-zero safe integer years.`);
    }

    const startOrdinal = toHistoricalOrdinal(segment.startYear);
    const endOrdinal = toHistoricalOrdinal(segment.endYear);
    if (startOrdinal > endOrdinal) {
      throw new RangeError(`${label} startYear must not be after endYear.`);
    }

    const yearCount = endOrdinal - startOrdinal + 1;
    if (!Number.isSafeInteger(yearCount) || yearCount <= 0) {
      throw new RangeError(`${label} spans too many years for exact integer mapping.`);
    }

    if (previousEndOrdinal !== null) {
      const expectedStartOrdinal = previousEndOrdinal + 1;
      if (startOrdinal < expectedStartOrdinal) {
        throw new RangeError(`${label} overlaps or is out of chronological order.`);
      }
      if (startOrdinal > expectedStartOrdinal) {
        throw new RangeError(`${label} leaves an undeclared gap after the previous segment.`);
      }
    }

    assertFinitePositive(segment.weight, `${label} weight`);
    assertFinitePositive(segment.minWidth, `${label} minWidth`);
    previousEndOrdinal = endOrdinal;
  }
}

function allocateSegmentWidths(
  segments: readonly TemporalAxisSegmentConfig[],
  totalWidth: number,
): number[] {
  const minimumWidthSum = segments.reduce(
    (sum, segment) => sum + segment.minWidth,
    0,
  );
  if (!Number.isFinite(minimumWidthSum) || totalWidth < minimumWidthSum) {
    throw new RangeError(
      "Temporal axis width must be at least the sum of all segment minWidth values.",
    );
  }

  const widths = Array<number>(segments.length).fill(0);
  let remainingIndices = segments.map((_, index) => index);
  let remainingWidth = totalWidth;
  let remainingWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);

  while (remainingIndices.length > 0) {
    const constrainedIndices = remainingIndices.filter((index) => {
      const proportionalWidth =
        (remainingWidth * segments[index].weight) / remainingWeight;
      return proportionalWidth < segments[index].minWidth;
    });

    if (constrainedIndices.length === 0) {
      for (const index of remainingIndices) {
        widths[index] =
          (remainingWidth * segments[index].weight) / remainingWeight;
      }
      break;
    }

    const constrained = new Set(constrainedIndices);
    for (const index of constrainedIndices) {
      widths[index] = segments[index].minWidth;
      remainingWidth -= segments[index].minWidth;
      remainingWeight -= segments[index].weight;
    }
    remainingIndices = remainingIndices.filter((index) => !constrained.has(index));
  }

  const allocatedWidth = widths.reduce((sum, width) => sum + width, 0);
  widths[widths.length - 1] += totalWidth - allocatedWidth;
  return widths;
}

/**
 * Creates a deterministic layout in the caller's coordinate unit (normally CSS pixels).
 * Segment weights determine proportional widths unless a minWidth constraint binds.
 */
export function createTemporalAxisLayout(
  segments: readonly TemporalAxisSegmentConfig[],
  totalWidth: number,
): TemporalAxisLayout {
  validateTemporalAxisConfig(segments);
  assertFinitePositive(totalWidth, "Temporal axis width");

  const widths = allocateSegmentWidths(segments, totalWidth);
  let currentPosition = 0;
  const layoutSegments = segments.map((segment, index) => {
    const startPosition = currentPosition;
    const endPosition =
      index === segments.length - 1
        ? totalWidth
        : startPosition + widths[index];
    currentPosition = endPosition;

    return {
      id: segment.id,
      startYear: segment.startYear,
      endYear: segment.endYear,
      weight: segment.weight,
      minWidth: segment.minWidth,
      startPosition,
      endPosition,
      width: endPosition - startPosition,
      yearCount: getYearCount(segment.startYear, segment.endYear),
    };
  });

  return {
    width: totalWidth,
    startYear: segments[0].startYear,
    endYear: segments[segments.length - 1].endYear,
    segments: layoutSegments,
  };
}

function findSegmentForYear(
  layout: Readonly<TemporalAxisLayout>,
  year: number,
): TemporalAxisLayoutSegment | undefined {
  const ordinal = toHistoricalOrdinal(year);
  return layout.segments.find(
    (segment) =>
      ordinal >= toHistoricalOrdinal(segment.startYear) &&
      ordinal <= toHistoricalOrdinal(segment.endYear),
  );
}

/** Maps an in-range historical integer year to the center of its visual year cell. */
export function yearToPosition(
  layout: Readonly<TemporalAxisLayout>,
  year: number,
): number {
  if (!isIntegerYear(year)) {
    throw new RangeError("Year must be a non-zero safe integer.");
  }

  const segment = findSegmentForYear(layout, year);
  if (!segment) {
    throw new RangeError("Year is outside the temporal axis range.");
  }

  const yearIndex =
    toHistoricalOrdinal(year) - toHistoricalOrdinal(segment.startYear);
  const position =
    segment.startPosition +
    ((yearIndex + 0.5) / segment.yearCount) * segment.width;
  return Math.min(layout.width, Math.max(0, position));
}

/**
 * Maps a coordinate to the integer year cell containing it.
 * Finite out-of-range positions are clamped; a cell-boundary tie selects the later year.
 */
export function positionToYear(
  layout: Readonly<TemporalAxisLayout>,
  position: number,
): number {
  if (!Number.isFinite(position)) {
    throw new RangeError("Temporal axis position must be finite.");
  }

  const clampedPosition = Math.min(layout.width, Math.max(0, position));
  const segment =
    layout.segments.find(
      (candidate, index) =>
        clampedPosition < candidate.endPosition ||
        index === layout.segments.length - 1,
    ) ?? layout.segments[layout.segments.length - 1];

  const relativePosition = clampedPosition - segment.startPosition;
  const rawYearIndex = Math.floor(
    (relativePosition / segment.width) * segment.yearCount,
  );
  const yearIndex = Math.min(
    segment.yearCount - 1,
    Math.max(0, rawYearIndex),
  );
  const ordinal = toHistoricalOrdinal(segment.startYear) + yearIndex;
  return ordinal >= 0 ? ordinal + 1 : ordinal;
}
