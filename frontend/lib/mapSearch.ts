export const MAP_SEARCH_SELECT_EVENT = "histmap:search-select";

export type MapSearchKind =
  | "heritage"
  | "area"
  | "national-heritage"
  | "ich"
  | "mingren"
  | "fang";

export type MapSearchItem = {
  kind: MapSearchKind;
  id: string;
  name: string;
  category: string | null;
  district: string | null;
  period: string | null;
  description: string | null;
  lng: number;
  lat: number;
  time_start: number | null;
  time_end: number | null;
};

export type MapSearchResponse = {
  success: boolean;
  count: number;
  data: MapSearchItem[];
};

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
}

function getMatchRank(item: MapSearchItem, normalizedQuery: string): number | null {
  const name = normalizeSearchText(item.name);
  const id = normalizeSearchText(item.id);
  const auxiliary = normalizeSearchText(
    item.kind === "heritage" || item.kind === "area"
      ? [item.category, item.district, item.period].filter(Boolean).join(" ")
      : "",
  );

  if (name === normalizedQuery) return 0;
  if (name.startsWith(normalizedQuery)) return 1;
  if (name.includes(normalizedQuery)) return 2;
  if (id.includes(normalizedQuery)) return 3;
  if (auxiliary.includes(normalizedQuery)) return 4;
  return null;
}

export function searchMapItems(
  items: MapSearchItem[],
  query: string,
  limit = 8,
): MapSearchItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return items
    .map((item) => ({ item, rank: getMatchRank(item, normalizedQuery) }))
    .filter(
      (entry): entry is { item: MapSearchItem; rank: number } =>
        entry.rank !== null,
    )
    .sort((left, right) => {
      const kindRank = (item: MapSearchItem) =>
        item.kind === "heritage" ? 0 : 1;
      return (
        left.rank - right.rank ||
        kindRank(left.item) - kindRank(right.item) ||
        left.item.name.localeCompare(right.item.name, "zh-CN")
      );
    })
    .slice(0, limit)
    .map(({ item }) => item);
}

export function isMapSearchItem(value: unknown): value is MapSearchItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MapSearchItem>;
  const isTemporalBoundary = (boundary: unknown) =>
    boundary === null ||
    (typeof boundary === "number" &&
      Number.isSafeInteger(boundary) &&
      boundary !== 0);
  return (
    (item.kind === "heritage" ||
      item.kind === "area" ||
      item.kind === "national-heritage" ||
      item.kind === "ich" ||
      item.kind === "mingren" ||
      item.kind === "fang") &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.lng === "number" &&
    Number.isFinite(item.lng) &&
    typeof item.lat === "number" &&
    Number.isFinite(item.lat) &&
    isTemporalBoundary(item.time_start) &&
    isTemporalBoundary(item.time_end)
  );
}
