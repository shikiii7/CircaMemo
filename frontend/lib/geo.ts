// WGS84 (EPSG:4326) <-> GCJ-02（高德地图坐标系）转换 + 高德瓦片 bbox 工具。
//
// 背景：数据库与 API 统一以 WGS84 存储/返回空间数据；前端底图为高德地图
// （GCJ-02）。坐标仅在"显示给高德地图"这一层转换，API 数据契约保持 WGS84。
//
// 算法为国测局 GCJ-02 公开通用实现（Krasovsky 椭球参数），
// 与 coordtransform / gcoord 等开源库的 wgs84togcj02 一致。
//
// 历史地图栅格瓦片：高德瓦片网格为 GCJ-02 偏移的 Web Mercator，向 GeoServer
// （WGS84 数据）请求 WMS 时需将瓦片 bbox 反算为真实 WGS84 范围，
// 见 tileXYToBboxEPSG3857ForGcj。

const PI = Math.PI;

// Krasovsky 椭球长半轴（米）
const KRASOVSKY_A = 6378245.0;

// Krasovsky 椭球第一偏心率平方
const KRASOVSKY_EE = 0.00669342162296594323;

/**
 * 粗略判断坐标是否在中国境外。
 * GCJ-02 偏移仅在中国境内施加；境外坐标原样返回，
 * 避免对全国范围图层（全国文保 / 非遗）中的边缘点做无意义偏移。
 */
function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * PI) +
      320.0 * Math.sin((y * PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * PI) +
      300.0 * Math.sin((x / 30.0) * PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * WGS84 经纬度转 GCJ-02（高德地图坐标）。
 *
 * @param lng WGS84 经度
 * @param lat WGS84 纬度
 * @returns [gcjLng, gcjLat]；境外坐标原样返回
 */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return [lng, lat];
  }

  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);

  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - KRASOVSKY_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);

  dLat = (dLat * 180.0) / (((KRASOVSKY_A * (1 - KRASOVSKY_EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((KRASOVSKY_A / sqrtMagic) * Math.cos(radLat) * PI);

  return [lng + dLng, lat + dLat];
}

/**
 * 批量转换坐标序列（如多边形环、折线）。
 * 输入为 [lng, lat] 数组，返回同结构的 GCJ-02 坐标数组；不修改原数组。
 */
export function convertPath(coords: number[][]): number[][] {
  return coords.map((coord) => {
    const [lng, lat] = wgs84ToGcj02(coord[0], coord[1]);
    return [lng, lat];
  });
}

/**
 * GCJ-02 -> WGS84 逆变换（迭代法）。
 *
 * 求 w 使 wgs84ToGcj02(w) = g：以 g 为初值迭代 w_{n+1} = w_n + (g - f(w_n))，
 * 约 5 次收敛到 <1e-7 度（远优于瓦片对齐所需精度）。
 * 境外坐标无 GCJ 偏移，原样返回。
 */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return [lng, lat];
  }

  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }

  let wLng = lng;
  let wLat = lat;
  for (let i = 0; i < 5; i += 1) {
    const [gLng, gLat] = wgs84ToGcj02(wLng, wLat);
    wLng += lng - gLng;
    wLat += lat - gLat;
  }

  return [wLng, wLat];
}

// ===== 高德瓦片网格 -> GeoServer WMS bbox =====

// Web Mercator 半周长（米）：PI * 6378137
const ORIGIN_SHIFT = 20037508.342789244;

// Web Mercator 纬度上限（约 ±85.0511°），避免极点处 log/tan 发散
const MAX_MERCATOR_LAT = 85.05112877980659;

/** WGS84 经纬度 -> EPSG:3857 平面坐标（米）。 */
function lngLatToEpsg3857(lng: number, lat: number): [number, number] {
  const x = (lng * ORIGIN_SHIFT) / 180;
  const clampedLat = Math.min(
    Math.max(lat, -MAX_MERCATOR_LAT),
    MAX_MERCATOR_LAT,
  );
  const y =
    (Math.log(Math.tan(((90 + clampedLat) * PI) / 360)) / PI) * ORIGIN_SHIFT;
  return [x, y];
}

/**
 * 瓦片号 -> 经纬度范围。
 * 高德瓦片网格是 GCJ-02 坐标的 Web Mercator 切图，标准 slippy 反算公式
 * 得到的是 GCJ-02 经纬度（y 向下增大，上边缘为北）。
 */
function tileXYToGcjBounds(
  x: number,
  y: number,
  z: number,
): { minLng: number; minLat: number; maxLng: number; maxLat: number } {
  const n = Math.pow(2, z);
  const minLng = (x / n) * 360 - 180;
  const maxLng = ((x + 1) / n) * 360 - 180;

  const latOfRow = (row: number): number => {
    const t = PI * (1 - (2 * row) / n);
    return (Math.atan(Math.sinh(t)) * 180) / PI;
  };

  return {
    minLng,
    maxLng,
    maxLat: latOfRow(y),
    minLat: latOfRow(y + 1),
  };
}

/**
 * 高德（GCJ-02 网格）瓦片号 -> 向 GeoServer WMS 请求用的 EPSG:3857 bbox。
 *
 * 步骤：瓦片号反算 GCJ-02 经纬度范围 -> 采样 8 点（4 角 + 4 边中点）
 * 逐点 GCJ-02 -> WGS84 反算 -> 取包络（min/max，避免瓦片接缝）
 * -> 投影 EPSG:3857。
 *
 * GCJ 偏移在单瓦片内非线性，包络法残余误差约米级（街道缩放级别亚像素）。
 * 境外瓦片逆变换为恒等映射，结果与标准 Web Mercator 公式一致。
 */
export function tileXYToBboxEPSG3857ForGcj(
  x: number,
  y: number,
  z: number,
): string {
  const bounds = tileXYToGcjBounds(x, y, z);
  const midLng = (bounds.minLng + bounds.maxLng) / 2;
  const midLat = (bounds.minLat + bounds.maxLat) / 2;

  const samples: [number, number][] = [
    [bounds.minLng, bounds.minLat],
    [bounds.minLng, bounds.maxLat],
    [bounds.maxLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
    [midLng, bounds.minLat],
    [midLng, bounds.maxLat],
    [bounds.minLng, midLat],
    [bounds.maxLng, midLat],
  ];

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [gLng, gLat] of samples) {
    const [wLng, wLat] = gcj02ToWgs84(gLng, gLat);
    minLng = Math.min(minLng, wLng);
    minLat = Math.min(minLat, wLat);
    maxLng = Math.max(maxLng, wLng);
    maxLat = Math.max(maxLat, wLat);
  }

  const [minX, minY] = lngLatToEpsg3857(minLng, minLat);
  const [maxX, maxY] = lngLatToEpsg3857(maxLng, maxLat);

  return `${minX},${minY},${maxX},${maxY}`;
}
