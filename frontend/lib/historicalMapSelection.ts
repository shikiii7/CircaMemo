import {
  type MapMetadata,
  type TargetMapMetadata,
} from "./mapMetadata";
import type { TemporalSelection } from "./temporal";

export const DEFAULT_HISTORICAL_MAP_ID = "c1_zqhtdcbq";

export type HistoricalMapPoint = {
  readonly id: string;
  readonly mapName: string;
  readonly year: number;
  readonly periodId: string;
};

function isTargetMapMetadata(
  metadata: MapMetadata,
): metadata is TargetMapMetadata {
  return "temporal_type" in metadata;
}

export function getHistoricalMapById(
  metadata: readonly MapMetadata[],
  id: string | null,
): MapMetadata | undefined {
  if (id === null) return undefined;
  return metadata.find((candidate) => candidate.active && candidate.id === id);
}

export function getOverviewHistoricalMap(
  metadata: readonly MapMetadata[],
): MapMetadata | undefined {
  return (
    metadata.find(
      (candidate) =>
        candidate.active &&
        isTargetMapMetadata(candidate) &&
        candidate.temporal_type === "overview",
    ) ?? getHistoricalMapById(metadata, DEFAULT_HISTORICAL_MAP_ID)
  );
}

/**
 * Derives one independently selectable point per active snapshot map. Sorting is
 * deterministic for display only; map selection always uses the stable map ID.
 */
export function getHistoricalMapPoints(
  metadata: readonly MapMetadata[],
): HistoricalMapPoint[] {
  return metadata
    .flatMap((candidate) => {
      if (
        !candidate.active ||
        !isTargetMapMetadata(candidate) ||
        candidate.temporal_type !== "snapshot" ||
        candidate.year === null
      ) {
        return [];
      }

      return [{
        id: candidate.id,
        mapName: candidate.map_name,
        year: candidate.year,
        periodId: candidate.period_id ?? "unassigned",
      }];
    })
    .sort(
      (left, right) =>
        left.year - right.year ||
        left.mapName.localeCompare(right.mapName, "zh-CN") ||
        left.id.localeCompare(right.id),
    );
}

/** Ordinary temporal operations invalidate a concrete map; unlimited selects overview. */
export function getHistoricalMapIdForTemporalSelection(
  selection: Readonly<TemporalSelection>,
  overviewMapId: string | null,
): string | null {
  return selection.mode === "unlimited" ? overviewMapId : null;
}