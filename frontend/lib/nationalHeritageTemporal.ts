import {
  getTemporalIntervalStatus,
  type TemporalIntervalInput,
  type TemporalSelection,
} from "./temporal";
import { matchesTemporalSelection } from "./heritageTemporal";

export const NATIONAL_HERITAGE_CITY_ZOOM = 7;
export const NATIONAL_HERITAGE_ALL_ZOOM = 9;

export type NationalHeritageMarkerMetadata = {
  readonly province: string | null;
  readonly city: string | null;
  readonly position: readonly [lng: number, lat: number];
  readonly interval: Readonly<TemporalIntervalInput>;
};

export type NationalHeritageViewport = {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
};

export type NationalHeritageFilterState = {
  readonly nhVisible: boolean;
  readonly temporalSelection: Readonly<TemporalSelection>;
  readonly zoom: number;
  readonly viewport: Readonly<NationalHeritageViewport> | null;
};

export type NationalHeritageGroupSummary = {
  readonly key: string;
  readonly count: number;
  readonly representativeIndex: number;
  readonly position: readonly [lng: number, lat: number];
};

export function matchesNationalHeritageTemporalSelection(
  selection: Readonly<TemporalSelection>,
  interval: Readonly<TemporalIntervalInput>,
): boolean {
  if (selection.mode === "unlimited") {
    return getTemporalIntervalStatus(interval) !== "invalid";
  }

  return matchesTemporalSelection(selection, interval);
}

export function expandNationalHeritageViewport(
  viewport: Readonly<NationalHeritageViewport>,
  ratio = 0.15,
): NationalHeritageViewport {
  const longitudePadding = (viewport.east - viewport.west) * ratio;
  const latitudePadding = (viewport.north - viewport.south) * ratio;

  return {
    west: viewport.west - longitudePadding,
    south: viewport.south - latitudePadding,
    east: viewport.east + longitudePadding,
    north: viewport.north + latitudePadding,
  };
}

export function getNationalHeritageVisibleIndexes(
  metadata: readonly Readonly<NationalHeritageMarkerMetadata>[],
  state: Readonly<NationalHeritageFilterState>,
): ReadonlySet<number> {
  const selected = new Set<number>();
  if (!state.nhVisible) return selected;

  const seenGroups = new Set<string>();

  for (let index = 0; index < metadata.length; index += 1) {
    const item = metadata[index];
    if (!matchesNationalHeritageTemporalSelection(state.temporalSelection, item.interval)) {
      continue;
    }

    const [lng, lat] = item.position;
    const viewport = state.viewport;
    if (
      viewport &&
      (lng < viewport.west ||
        lng > viewport.east ||
        lat < viewport.south ||
        lat > viewport.north)
    ) {
      continue;
    }

    if (state.zoom >= NATIONAL_HERITAGE_ALL_ZOOM) {
      selected.add(index);
      continue;
    }

    const groupKey =
      state.zoom >= NATIONAL_HERITAGE_CITY_ZOOM
        ? `${item.province ?? "未知"}/${item.city ?? "未知"}`
        : item.province ?? "未知";

    if (!seenGroups.has(groupKey)) {
      seenGroups.add(groupKey);
      selected.add(index);
    }
  }

  return selected;
}

export function getNationalHeritageGroupSummaries(
  metadata: readonly Readonly<NationalHeritageMarkerMetadata>[],
  state: Readonly<NationalHeritageFilterState>,
): readonly NationalHeritageGroupSummary[] {
  if (!state.nhVisible || state.zoom >= NATIONAL_HERITAGE_ALL_ZOOM) return [];

  const totals = new Map<string, number>();
  const groupKeyFor = (item: Readonly<NationalHeritageMarkerMetadata>) =>
    state.zoom >= NATIONAL_HERITAGE_CITY_ZOOM
      ? `${item.province ?? "未知"}/${item.city ?? "未知"}`
      : item.province ?? "未知";

  for (const item of metadata) {
    if (!matchesNationalHeritageTemporalSelection(state.temporalSelection, item.interval)) {
      continue;
    }
    const key = groupKeyFor(item);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  const groups = new Map<string, NationalHeritageGroupSummary>();
  for (let index = 0; index < metadata.length; index += 1) {
    const item = metadata[index];
    if (!matchesNationalHeritageTemporalSelection(state.temporalSelection, item.interval)) {
      continue;
    }

    const [lng, lat] = item.position;
    const viewport = state.viewport;
    if (
      viewport &&
      (lng < viewport.west || lng > viewport.east || lat < viewport.south || lat > viewport.north)
    ) {
      continue;
    }

    const key = groupKeyFor(item);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        count: totals.get(key) ?? 0,
        representativeIndex: index,
        position: item.position,
      });
    }
  }

  return [...groups.values()].filter(({ count }) => count > 1);
}