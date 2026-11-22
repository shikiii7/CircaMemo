import {
  containsYear,
  intervalsIntersect,
  type TemporalIntervalInput,
  type TemporalSelection,
} from "./temporal";

export type HeritageMarkerMetadata = {
  readonly key: string;
  readonly protectionLevelCode: number;
  readonly interval: Readonly<TemporalIntervalInput>;
};

export type HeritageMarkerMetadataSource = {
  readonly id: number;
  readonly pid: string | null;
  readonly protection_level: string | null;
  readonly time_start: number | null;
  readonly time_end: number | null;
  readonly lng: number;
  readonly lat: number;
};

export type HeritageVisibilityInput = {
  readonly pointsVisible: boolean;
  readonly protectionLevelVisible: boolean;
  readonly temporalMatch: boolean;
  readonly showHeritageLabels: boolean;
};

export type HeritageVisibility = {
  readonly markerVisible: boolean;
  readonly labelVisible: boolean;
};

export type HeritageFilterState = {
  readonly pointsVisible: boolean;
  readonly activeProtectionLevels: ReadonlySet<number>;
  readonly showHeritageLabels: boolean;
  readonly temporalSelection: Readonly<TemporalSelection>;
};

export function matchesTemporalSelection(
  selection: Readonly<TemporalSelection>,
  interval: Readonly<TemporalIntervalInput>,
): boolean {
  if (selection.mode === "unlimited") return true;
  if (selection.mode === "year") return containsYear(interval, selection.year);

  return intervalsIntersect(interval, {
    startYear: selection.startYear,
    endYear: selection.endYear,
  });
}

export function getHeritageVisibility(
  input: Readonly<HeritageVisibilityInput>,
): HeritageVisibility {
  const markerVisible =
    input.pointsVisible && input.protectionLevelVisible && input.temporalMatch;

  return {
    markerVisible,
    labelVisible: markerVisible && input.showHeritageLabels,
  };
}

export function getHeritageMarkerVisibility(
  metadata: Readonly<HeritageMarkerMetadata>,
  state: Readonly<HeritageFilterState>,
): HeritageVisibility {
  const protectionLevelVisible =
    metadata.protectionLevelCode === -1 ||
    state.activeProtectionLevels.has(metadata.protectionLevelCode);

  return getHeritageVisibility({
    pointsVisible: state.pointsVisible,
    protectionLevelVisible,
    temporalMatch: matchesTemporalSelection(
      state.temporalSelection,
      metadata.interval,
    ),
    showHeritageLabels: state.showHeritageLabels,
  });
}

export function isHeritageAccessoryVisible(
  metadata: Readonly<HeritageMarkerMetadata>,
  state: Readonly<HeritageFilterState>,
  accessoryEnabled: boolean,
): boolean {
  return accessoryEnabled && getHeritageMarkerVisibility(metadata, state).markerVisible;
}

export function getVisibleHeritageSources<T extends HeritageMarkerMetadataSource>(
  sources: readonly T[],
  state: Readonly<HeritageFilterState>,
): T[] {
  return sources.filter((source) => {
    const metadata = createHeritageMarkerMetadata(source);
    return metadata !== null && getHeritageMarkerVisibility(metadata, state).markerVisible;
  });
}

export function shouldClearSelectedHeritage(
  selectedMetadata: Readonly<HeritageMarkerMetadata> | null,
  state: Readonly<HeritageFilterState>,
): boolean {
  return (
    selectedMetadata !== null &&
    !getHeritageMarkerVisibility(selectedMetadata, state).markerVisible
  );
}

export function parseHeritageProtectionLevelCode(
  protectionLevel: string | null | undefined,
): number {
  const trimmed = protectionLevel?.trim();
  if (!trimmed) return -1;
  const match = trimmed.match(/^(\d+)/);
  return match ? Number(match[1]) : -1;
}

export function createHeritageMarkerMetadata(
  point: Readonly<HeritageMarkerMetadataSource>,
): HeritageMarkerMetadata | null {
  if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) return null;

  return {
    key: point.pid ?? `heritage:${point.id}`,
    protectionLevelCode: parseHeritageProtectionLevelCode(point.protection_level),
    interval: {
      startYear: point.time_start,
      endYear: point.time_end,
    },
  };
}