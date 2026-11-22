import {
  matchesTemporalSelection,
} from "./heritageTemporal";
import type {
  TemporalIntervalInput,
  TemporalSelection,
} from "./temporal";

export type HistoricAreaTemporalProperties = Readonly<
  Record<string, unknown> & {
    readonly time_start: number | null;
    readonly time_end: number | null;
  }
>;

export type HistoricAreaPolygonMetadata = {
  readonly featureId: string;
  readonly interval: Readonly<TemporalIntervalInput>;
};

export type HistoricAreaFeatureWithPaths<Path> = {
  readonly properties: HistoricAreaTemporalProperties;
  readonly polygonPaths: readonly Path[];
};

export type HistoricAreaPolygonDescriptor<Path> = {
  readonly path: Path;
  readonly properties: HistoricAreaTemporalProperties;
  readonly metadata: HistoricAreaPolygonMetadata;
};

export type HistoricAreaFilterState = {
  readonly areasVisible: boolean;
  readonly temporalSelection: Readonly<TemporalSelection>;
};

function getHistoricAreaFeatureId(
  properties: HistoricAreaTemporalProperties,
  featureIndex: number,
): string {
  const candidate = properties.objectid ?? properties.id;
  if (
    (typeof candidate === "string" && candidate.length > 0) ||
    (typeof candidate === "number" && Number.isFinite(candidate))
  ) {
    return `historic-area:${candidate}`;
  }

  return `historic-area:feature-${featureIndex}`;
}

/**
 * Expands feature paths without mutating API properties. Empty paths produce no
 * descriptor, and every path from one feature shares the same metadata object.
 */
export function createHistoricAreaPolygonDescriptors<Path>(
  features: readonly HistoricAreaFeatureWithPaths<Path>[],
  isEmptyPath: (path: Path) => boolean,
): HistoricAreaPolygonDescriptor<Path>[] {
  const descriptors: HistoricAreaPolygonDescriptor<Path>[] = [];

  features.forEach((feature, featureIndex) => {
    const metadata: HistoricAreaPolygonMetadata = {
      featureId: getHistoricAreaFeatureId(feature.properties, featureIndex),
      interval: {
        startYear: feature.properties.time_start,
        endYear: feature.properties.time_end,
      },
    };

    for (const path of feature.polygonPaths) {
      if (isEmptyPath(path)) continue;
      descriptors.push({
        path,
        properties: feature.properties,
        metadata,
      });
    }
  });

  return descriptors;
}

export function isHistoricAreaVisible(
  metadata: Readonly<HistoricAreaPolygonMetadata>,
  state: Readonly<HistoricAreaFilterState>,
): boolean {
  return (
    state.areasVisible &&
    matchesTemporalSelection(state.temporalSelection, metadata.interval)
  );
}

export function shouldCloseHistoricAreaInfoWindow(
  selectedMetadata: Readonly<HistoricAreaPolygonMetadata> | null,
  state: Readonly<HistoricAreaFilterState>,
): boolean {
  return selectedMetadata !== null && !isHistoricAreaVisible(selectedMetadata, state);
}