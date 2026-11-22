export type HeritagePointLike = {
  pid: string;
  name: string;
  lng: number | null;
  lat: number | null;
};

export type LngLat = { lng: number; lat: number };

const EARTH_RADIUS_M = 6371008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** 球面距离（米），使用 haversine，足够处理城市尺度选点。 */
export function distanceMeters(from: LngLat, to: LngLat): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 找到距离目标点最近的文保点。用于「点击地图空白处吸附到最近文保点」，
 * 超出 maxMeters 时返回 null，避免把市区另一端误判成用户想选的点。
 */
export function findNearestHeritagePoint<T extends HeritagePointLike>(
  points: readonly T[],
  target: LngLat,
  maxMeters: number,
): { point: T; distance: number } | null {
  let best: { point: T; distance: number } | null = null;

  for (const point of points) {
    if (point.lng === null || point.lat === null) continue;
    if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) continue;

    const distance = distanceMeters(target, { lng: point.lng, lat: point.lat });
    if (distance > maxMeters) continue;
    if (!best || distance < best.distance) {
      best = { point, distance };
    }
  }

  return best;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} 米`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}
