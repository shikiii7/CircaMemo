"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import HeritageCard from "./HeritageCard";
import MemoryPanel from "./MemoryPanel";
import MemoryAlbumPanel from "./MemoryAlbumPanel";
import LayerControl from "./LayerControl";
import TimelineBar from "./TimelineBar";
import MapStyleSelector from "./MapStyleSelector";
import styles from "./AMap.module.css";
import MapLegend from "./MapLegend";
import WordCloudLayer from "./WordCloudLayer";
import {
  createDiscussionMarkerHtml,
  createMemoryAlbumMarkerHtml,
  MEMORY_CONTEXT_MARKER_OFFSET_Y,
} from "./memoryContextMarker";
import { getCoverImageUrl } from "@/lib/image";
import { getIchCategoryColor, getIchCategoryColorAlpha } from "@/lib/ichConstants";
import {
  type MemoryAlbumIndexEntry,
  parseMemoryAlbumIndex,
} from "@/lib/memoryAlbum";
import {
  convertPath,
  tileXYToBboxEPSG3857ForGcj,
  wgs84ToGcj02,
} from "@/lib/geo";
import {
  isMapSearchItem,
  MAP_SEARCH_SELECT_EVENT,
  type MapSearchItem,
} from "@/lib/mapSearch";
import {
  decideSearchTemporalSelection,
  formatSearchTemporalValue,
  formatTemporalSelection,
} from "@/lib/mapSearchTemporal";
import { createHeritageMarkerHtml } from "@/lib/heritageIcons";
import {
  parseMapMetadata,
  type MapMetadata,
} from "@/lib/mapMetadata";
import {
  getHistoricalMapById,
  getHistoricalMapIdForTemporalSelection,
  getHistoricalMapPoints,
  getOverviewHistoricalMap,
  type HistoricalMapPoint,
} from "@/lib/historicalMapSelection";
import { createNationalHeritageMarkerHtml } from "@/lib/nationalHeritageTypes";
import { type TemporalSelection } from "@/lib/temporal";
import {
  createHeritageMarkerMetadata,
  getHeritageMarkerVisibility,
  getVisibleHeritageSources,
  isHeritageAccessoryVisible,
  shouldClearSelectedHeritage,
  type HeritageFilterState,
  type HeritageMarkerMetadata,
} from "@/lib/heritageTemporal";
import {
  createHistoricAreaPolygonDescriptors,
  isHistoricAreaVisible,
  shouldCloseHistoricAreaInfoWindow,
  type HistoricAreaFilterState,
  type HistoricAreaPolygonMetadata,
  type HistoricAreaTemporalProperties,
} from "@/lib/historicAreaTemporal";
import {
  expandNationalHeritageViewport,
  getNationalHeritageGroupSummaries,
  getNationalHeritageVisibleIndexes,
  type NationalHeritageFilterState,
  type NationalHeritageMarkerMetadata,
  type NationalHeritageViewport,
} from "@/lib/nationalHeritageTemporal";

type HeritagePointApi = {
  id: number;
  pid: string | null;
  point_name: string;
  protection_level: string | null;
  heritage_type: string | null;
  era: string | null;
  batch: number | null;
  district: string | null;
  cover_image_key: string | null;
  image_source: string | null;
  intro: string | null;
  reference: string | null;
  open_status: string | null;
  official_platform: string | null;
  address: string | null;
  area_name: string | null;
  lng: number;
  lat: number;
  readonly time_start: number | null;
  readonly time_end: number | null;
};

type HeritageCardData = {
  pid: string | null;
  name: string;
  level: string;
  category: string;
  period: string;
  batch: number | null;
  district: string;
  image: string;
  image_source: string | null;
  description: string;
  reference: string | null;
  open_status: string | null;
  official_platform: string | null;
  address: string;
  area_name?: string | null;
};

type NationalHeritagePointApi = {
  id: string | number;
  name: string | null;
  period: string | null;
  type: string | null;
  batch: string | number | null;
  intro?: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  lng: number;
  lat: number;
  readonly time_start: number | null;
  readonly time_end: number | null;
};

type IchPointApi = {
  id: number;
  name: string | null;
  category: string | null;
  cover_image_key: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  lng: number;
  lat: number;
};

type FangMingrenPointApi = {
  id: string | number;
  name: string | null;
  dynasty: string | null;
  time_birth: number | null;
  time_pass: number | null;
  intro: string | null;
  fang_name: string | null;
  fang_id: string | null;
  pid: string | null;
  district: string | null;
  lng: number;
  lat: number;
};

type FeatureProperties = Record<string, unknown>;

type AMapPixel = {
  getX?: () => number;
  getY?: () => number;
  x?: number;
  y?: number;
};

type AMapOverlay = {
  show: () => void;
  hide: () => void;
};

type AMapTileLayer = AMapOverlay & {
  setOpacity?: (opacity: number) => void;
  setOptions?: (options: { opacity: number }) => void;
};

type AMapEventTarget = AMapOverlay & {
  on: (eventName: "click", handler: (event: AMapClickEvent) => void) => void;
  setOptions?: (options: Record<string, unknown>) => void;
  setContent?: (content: string) => void;
};

type HeritageAccessoryMarker = {
  readonly pid: string;
  readonly marker: AMapEventTarget;
  readonly metadata: HeritageMarkerMetadata;
};

type AMapClickEvent = {
  lnglat: unknown;
};

type AMapLatLng = { getLng: () => number; getLat: () => number };

type AMapBounds = {
  getSouthWest: () => AMapLatLng;
  getNorthEast: () => AMapLatLng;
};

type AMapInstance = {
  add: (overlays: unknown | unknown[]) => void;
  remove: (overlays: unknown | unknown[]) => void;
  addControl: (control: unknown) => void;
  destroy: () => void;
  getBounds: () => AMapBounds | null;
  getZoom: () => number;
  lngLatToContainer: (position: [number, number]) => AMapPixel;
  on: (eventName: string, handler: (...args: unknown[]) => void) => void;
  setMapStyle: (style: string) => void;
  setZoomAndCenter: (zoom: number, center: [number, number]) => void;
};

type AMapInfoWindow = {
  setContent: (content: string) => void;
  open: (map: AMapInstance, position: unknown) => void;
  close: () => void;
};

type AMapLibrary = {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AMapInstance;
  Scale: new () => unknown;
  ToolBar: new () => unknown;
  Pixel: new (x: number, y: number) => AMapPixel;
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow;
  TileLayer: new (options: Record<string, unknown>) => AMapTileLayer;
  Polygon: new (options: Record<string, unknown>) => AMapEventTarget;
  Marker: new (options: Record<string, unknown>) => AMapEventTarget;
  Polyline: new (options: Record<string, unknown>) => AMapEventTarget;
  LngLat: new (lng: number, lat: number) => AMapLatLng;
};

const INITIAL_HIST_MAP_OPACITY = 0.6;
function buildGeoServerWmsTileUrl(
  tileUrl: string,
  x: number,
  y: number,
  z: number,
): string {
  const url = new URL(tileUrl);
  // 高德瓦片网格为 GCJ-02 偏移的 Web Mercator，GeoServer 数据为 WGS84：
  // bbox 需反算为真实 WGS84 范围（lib/geo.ts），否则历史地图与底图偏移数百米。
  const bbox = tileXYToBboxEPSG3857ForGcj(x, y, z);

  url.searchParams.set("bbox", bbox);
  url.searchParams.set("transparent", "true");
  url.searchParams.set("format", "image/png");
  url.searchParams.set("bgcolor", "0xFFFFFF");

  return `/api/geoserver-wms?${url.searchParams.toString()}`;
}

function setTileLayerOpacity(layer: AMapTileLayer, opacity: number) {
  if (typeof layer.setOpacity === "function") {
    layer.setOpacity(opacity);
    return;
  }

  if (typeof layer.setOptions === "function") {
    layer.setOptions({ opacity });
  }
}

type GeoJsonGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "MultiPolygon";
      coordinates: number[][][][];
    };

type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties?: FeatureProperties;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type SharedInfoWindowSelection =
  | {
      readonly source: "historic-area";
      readonly metadata: HistoricAreaPolygonMetadata;
    }
  | {
      readonly source: "national-heritage";
      readonly markerIndex: number;
    }
  | { readonly source: "mingren" }
  | { readonly source: "other" }
  | null;

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

function getTextProperty(
  properties: FeatureProperties,
  key: string,
  fallback = "",
): string {
  const value = properties[key];
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function createMarkerHtml(
  color: string,
  size = 18,
  pid?: string | null,
  plain = false,
  noShadow = false,
  borderColor = "#fff",
): string {
  const border = plain ? "border: none;" : `border: 2px solid ${borderColor};`;
  const shadow = plain || noShadow
    ? "box-shadow: none;"
    : "box-shadow: 0 2px 8px rgba(0,0,0,0.35);";
  return `
    <div${pid ? ` data-heritage-pid="${pid}"` : ""} style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      ${border}
      ${shadow}
      box-sizing: border-box;
    "></div>
  `;
}

const DISCUSSION_MARKERS: Record<string, { label: string; groupTitle: string }> = {
  P383: { label: "大明宫讨论", groupTitle: "大明宫讨论群（模拟）" },
  P246: { label: "曲江池周边讨论", groupTitle: "曲江池周边讨论群（模拟）" },
};

function buildHeritageCardData(p: HeritagePointApi): HeritageCardData {
  return {
    pid: p.pid ?? null,
    name: p.point_name ?? "",
    level: p.protection_level ?? "",
    category: p.heritage_type ?? "",
    period: p.era ?? "",
    batch: p.batch ?? null,
    district: p.district ?? "",
    image: getCoverImageUrl(p.cover_image_key),
    image_source: p.image_source ?? null,
    description: p.intro ?? "",
    reference: p.reference ?? null,
    open_status: p.open_status ?? null,
    official_platform: p.official_platform ?? null,
    address: p.address ?? "",
    area_name: p.area_name ?? null,
  };
}

/**
 * 创建遗产点名称标签 HTML。
 * 纯文字 + 白色描边（无背景色），文字自带白色 outline 在地图上保持可读，不拦截点击。
 */
function createHeritageLabelHtml(name: string): string {
  const safeName = name
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<div style="
    font-size: 11px;
    line-height: 1.3;
    color: #173b31;
    white-space: nowrap;
    pointer-events: none;
    paint-order: stroke fill;
    -webkit-text-stroke: 1.5px #fffdf7;
    text-shadow: 0 1px 3px rgba(255,253,247,0.8);
  ">${safeName}</div>`;
}

const MINGREN_MARKER_COLOR = "#674a8c";

function createMingrenMarkerHtml(point: FangMingrenPointApi): string {
  const marker = createMarkerHtml(MINGREN_MARKER_COLOR, 14);
  if (!point.name) return marker;

  return `<div data-mingren-labeled="true" style="position:relative;width:14px;height:14px;">
    ${marker}
    <div style="position:absolute;left:18px;top:-2px;white-space:nowrap;
      color:#7b6d86;font:400 11px/1.4 sans-serif;pointer-events:none;
      paint-order:stroke fill;-webkit-text-stroke:2px #fffdf7;
      text-shadow:0 1px 3px rgba(255,253,247,0.9);">${escapeInfoHtml(point.name)}</div>
  </div>`;
}

// 非遗点分层取样阈值：zoom < NMH_TIER_CITY 视口内每省 1 个；
// NMH_TIER_CITY–NMH_TIER_ALL 每市 1 个；>= NMH_TIER_ALL 视口内全部。
// Marker 只为代表点或最终可见点创建，封面仅随可见复合标记加载。
const NMH_TIER_CITY = 7;
const NMH_TIER_ALL = 9;
const NMH_BATCH_SIZE = 2000;
const NMH_VISIBILITY_BATCH_SIZE = 200;

// 坐标转换按大批次分帧，避免高德逐帧绘制开销放大准备耗时。
const NH_BATCH_SIZE = 2000;
// 显隐操作同样分帧执行；计算始终读取 latest-state，陈旧 revision 不得继续写 Marker。
const NH_VISIBILITY_BATCH_SIZE = 400;
// 全国范围数据在 zoom 9 已显示全部视口点，但名称只在近距离显示，
// 避免城市尺度同时创建数百个文字 DOM 导致图层首次开启时阻塞绘制。
const NH_LABEL_MIN_ZOOM = 12;

function createNationalHeritageCountHtml(count: number): string {
  const size = count >= 100 ? 40 : count >= 10 ? 36 : 32;
  return `<div data-sample-count="national" style="
    width:${size}px;height:${size}px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-sizing:border-box;background:#e9823f;border:1px solid #bd5727;
    color:#4b2b14;font:600 13px/1 sans-serif;
    box-shadow:0 1px 4px rgba(45,35,25,0.2);pointer-events:none;
  ">${count}</div>`;
}

function createNationalHeritageMarkerContent(
  point: NationalHeritagePointApi,
  showName: boolean,
): string {
  const marker = createNationalHeritageMarkerHtml(point.type, 14);
  if (!showName || !point.name) return marker;

  return `<div data-national-heritage-labeled="true" style="position:relative;width:14px;height:14px;">
    ${marker}
    <div style="position:absolute;left:18px;top:-2px;white-space:nowrap;
      color:#666;font:400 11px/1.4 sans-serif;pointer-events:none;
      paint-order:stroke fill;-webkit-text-stroke:2px #fffdf7;
      text-shadow:0 1px 3px rgba(255,253,247,0.9);">${escapeInfoHtml(point.name)}</div>
  </div>`;
}

// 非遗代表性点复合标记：以坐标为原点（0×0 容器），
// 点上方封面小框 + 点右侧名称 + 原点彩色点。小框/名称不拦截点击。
function createNmhRepresentativeHtml(
  coverUrl: string,
  name: string | null,
  color: string,
): string {
  const label = name ?? "未命名";
  return `
    <div style="position:relative;width:0;height:0;">
      <img src="${coverUrl}" alt="${label}非遗封面" loading="lazy" decoding="async"
        onerror="this.style.display='none'"
        style="position:absolute;left:-36px;top:-69px;width:72px;height:54px;
        object-fit:cover;border-radius:8px;border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#f0ede6;
        box-sizing:border-box;display:block;" />
      <div style="position:absolute;left:-7px;top:-7px;width:14px;height:14px;
        border-radius:50%;background:${color};
        border:2px solid #000;box-shadow:0 2px 8px rgba(0,0,0,0.35);
        box-sizing:border-box;"></div>
      <div style="position:absolute;left:12px;top:-8px;white-space:nowrap;
        font-size:12px;line-height:16px;color:#7c4a2d;font-family:sans-serif;
        text-shadow:0 1px 0 #fff,0 -1px 0 #fff,1px 0 0 #fff,-1px 0 0 #fff,0 0 4px #fff;
        pointer-events:none;">${label}</div>
    </div>
  `;
}

type NmhMarkerMetadata = {
  readonly position: readonly [lng: number, lat: number];
  readonly province: string | null;
  readonly city: string | null;
  readonly coverUrl: string | null;
  readonly repColor: string;
  readonly dotColor: string;
};

function getNmhVisibleIndexes(
  metadata: readonly NmhMarkerMetadata[],
  visible: boolean,
  zoom: number,
  viewport: Readonly<NationalHeritageViewport> | null,
): ReadonlySet<number> {
  const selected = new Set<number>();
  if (!visible) return selected;

  const seenGroups = new Set<string>();
  for (let index = 0; index < metadata.length; index += 1) {
    const item = metadata[index];
    const [lng, lat] = item.position;
    if (
      viewport &&
      (lng < viewport.west || lng > viewport.east ||
        lat < viewport.south || lat > viewport.north)
    ) {
      continue;
    }

    if (zoom >= NMH_TIER_ALL) {
      selected.add(index);
      continue;
    }

    const groupKey = zoom >= NMH_TIER_CITY
      ? `${item.province ?? "未知"}/${item.city ?? "未知"}`
      : item.province ?? "未知";
    if (!seenGroups.has(groupKey)) {
      seenGroups.add(groupKey);
      selected.add(index);
    }
  }

  return selected;
}
const FANG_STYLE = {
  fillColor: "#e5a237",
  fillOpacity: 0.22,
  strokeColor: "#7a644d",
  strokeWeight: 1.5,
  strokeOpacity: 0.9,
} as const;

const FANG_HIGHLIGHT_STYLE = {
  fillColor: "#ff8a4c",
  fillOpacity: 0.5,
  strokeColor: "#b93624",
  strokeWeight: 3,
  strokeOpacity: 1,
} as const;

const FANG_HIGHLIGHT_DURATION_MS = 900;
const FANG_LABEL_Z_INDEX = 22;

// 图层叠放显示顺序优先级（数值越大越靠上；Marker 为 DOM 层，天然位于
// 矢量面 canvas 层之上，矢量面又位于瓦片层之上，zIndex 仅在同层内部排序）：
// 西安市文保点(100) > 名称标签(99) > 唐代名人故居(95) > 全国重点文保单位(92)
// > 国家级非遗项目(90/88) > 唐108坊标签(22) > 唐108坊(21) > 历史区域(20)
// > 历史区域标签(19) > 区县边界(18) > 市级边界(17) > 省级边界(16)
// > 历史地图(TileLayer 10)。
// 附属标记（非遗连线 45、词云 110、讨论 130、记忆 135）不参与本优先级约定。
// 行政边界（processed.a1/a2/a3_bndry_*_tiandi）：仅描边，使用低饱和度区分层级。
const BND_LEVELS = {
  province: { label: "省级边界", color: "#9a6b3f", weight: 1, zIndex: 16 },
  city: { label: "市级边界", color: "#3f8fc4", weight: 0.6, zIndex: 17 },
  district: { label: "区县边界", color: "#555552", weight: 0.35, zIndex: 18 },
} as const;

type BndLevel = keyof typeof BND_LEVELS;

type MemoryDialogueIndexEntry = {
  pid: string;
  pointName: string;
  buttonLabel: string;
  panelTitle: string;
  file: string;
};

function buildBndInfoHtml(
  properties: FeatureProperties,
  level: BndLevel,
): string {
  const name = getTextProperty(properties, "name", "未命名");
  const gb = getTextProperty(properties, "gb");

  return `
    <div style="width:220px;font-family:sans-serif;">
      <h3 style="margin:0 0 8px 0;font-size:16px;line-height:1.3;">
        ${escapeInfoHtml(name)}
      </h3>
      ${buildInfoRows([
        ["级别", BND_LEVELS[level].label],
        ["国标码", gb || null],
      ])}
    </div>
  `;
}

function getFangLabelFontSize(zoom: number): number {
  return Math.min(17, Math.max(10, Math.round(zoom) + 1));
}

function createFangLabelHtml(name: string, fontSize: number): string {
  return `<div data-fang-label="true" style="
    padding: 2px 6px;
    color: ${FANG_STYLE.fillColor};
    font-size: ${fontSize}px;
    line-height: 1.35;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    -webkit-text-stroke: 1px #fff;
    paint-order: stroke fill;
  ">${escapeInfoHtml(name)}</div>`;
}

function buildFangInfoHtml(properties: FeatureProperties): string {
  const name = getTextProperty(properties, "name", "未命名坊");
  const intro = getTextProperty(properties, "intro", "暂无简介");

  return `
    <div style="width:280px;font-family:sans-serif;">
      <h3 style="margin:0 0 6px 0;font-size:17px;line-height:1.3;color:${FANG_STYLE.fillColor};">
        ${escapeInfoHtml(name)}
      </h3>
      <p style="margin:0;color:#444;font-size:13px;line-height:1.6;">
        ${escapeInfoHtml(intro)}
      </p>
    </div>
  `;
}

function buildMingrenInfoHtml(p: FangMingrenPointApi): string {
  const years =
    p.time_birth || p.time_pass
      ? `${p.time_birth ?? "?"} – ${p.time_pass ?? "?"}`
      : null;

  return `
    <div style="width:280px;font-family:sans-serif;">
      <h3 style="margin:0 0 8px 0;font-size:16px;line-height:1.3;color:#674a8c;">
        ${escapeInfoHtml(p.name ?? "未命名")}
      </h3>
      ${buildInfoRows([
        ["朝代", p.dynasty, { labelColor: "#526d82", color: "#1f1f1f" }],
        ["生卒年", years, { labelColor: "#526d82", color: "#1f1f1f" }],
        ["所在坊", p.fang_name, { labelColor: "#526d82", color: "#1f1f1f" }],
        ["简介", p.intro, { color: "#1f1f1f" }],
      ])}
    </div>
  `;
}

function escapeInfoHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const SEARCH_LAYER_NAMES: Record<MapSearchItem["kind"], string> = {
  heritage: "西安遗产点",
  area: "历史区域",
  "national-heritage": "全国重点文保单位",
  ich: "国家级非遗项目",
  mingren: "唐代名人故居",
  fang: "唐108坊",
};

function buildSearchInfoHtml(item: MapSearchItem): string {
  return `
    <div style="width:240px;font-family:sans-serif;">
      <h3 style="margin:0 0 8px 0;font-size:17px;line-height:1.3;">
        ${escapeInfoHtml(item.name)}
      </h3>
      ${buildInfoRows([
        ["类型", item.category],
        ["时期", item.period],
        ["所在行政区", item.district],
        ["简介", item.description],
      ])}
    </div>
  `;
}

function buildInfoRows(
  rows: [string, unknown, { labelColor?: string; color?: string }?][],
): string {
  // 值统一在此转义，调用方传入原始文本即可（避免各 InfoWindow 构建器重复/遗漏转义）。
  return rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v, options]) => {
        const label = options?.labelColor
          ? `<span style="color:${options.labelColor};">${k}：</span>`
          : `${k}：`;
        return `<p style="margin:0 0 4px 0;color:${options?.color ?? "#444"};font-size:13px;line-height:1.5;">${label}${escapeInfoHtml(String(v))}</p>`;
      },
    )
    .join("");
}

function buildNhIntroHtml(intro: string): string {
  const escapedFull = escapeInfoHtml(intro);
  // 简介 ≤ 100 字：原样输出（已转义），渲染形式与既往 buildInfoRows 一致。
  if (intro.length <= 100) {
    return `<p style="margin:0 0 4px 0;color:#1f1f1f;font-size:13px;line-height:1.5;">简介：${escapedFull}</p>`;
  }

  // 超过 100 字：默认显示前 100 字 + “展开全文”，点击切换为全文（限高可滚动）并附“收起”。
  // InfoWindow 为单例（infoWindowRef），内容每次打开都整体替换，固定 id 不会冲突。
  // 截断发生在转义前（按原始字符数），显示时输出转义后的片段/全文。
  const short = `${escapeInfoHtml(intro.slice(0, 100))}...`;
  const toggleStyle = "color:#526d82;cursor:pointer;text-decoration:none;";
  return `
    <p id="nhIntroShort" style="margin:0 0 4px 0;color:#1f1f1f;font-size:13px;line-height:1.5;">
      简介：${short}
      <a href="javascript:void(0)" style="${toggleStyle}" onclick="var s=document.getElementById('nhIntroShort');var f=document.getElementById('nhIntroFull');if(s){s.style.display='none';}if(f){f.style.display='block';}return false;">展开全文</a>
    </p>
    <div id="nhIntroFull" style="display:none;margin:0 0 4px 0;color:#1f1f1f;font-size:13px;line-height:1.5;max-height:180px;overflow-y:auto;" onwheel="event.stopPropagation()">
      简介：${escapedFull}
      <a href="javascript:void(0)" style="${toggleStyle}" onclick="var f=document.getElementById('nhIntroFull');var s=document.getElementById('nhIntroShort');if(f){f.style.display='none';}if(s){s.style.display='block';}return false;">收起</a>
    </div>
  `;
}

function buildNhInfoHtml(p: NationalHeritagePointApi): string {
  const location = [p.province, p.city, p.district]
    .filter(Boolean)
    .join(" ");

  return `
    <div style="width:280px;font-family:sans-serif;">
      <h3 style="margin:0 0 8px 0;font-size:16px;line-height:1.3;">
        ${escapeInfoHtml(p.name ?? "未命名")}
      </h3>
      ${buildInfoRows([
        ["时代", p.period, { labelColor: "#526d82", color: "#1f1f1f" }],
        ["类型", p.type, { labelColor: "#526d82", color: "#1f1f1f" }],
        ["批次", p.batch ? `第${p.batch}批全国重点文物保护单位` : null, { labelColor: "#526d82", color: "#1f1f1f" }],
        ["所在地区", location || null, { labelColor: "#526d82", color: "#1f1f1f" }],
      ])}
      ${p.intro ? buildNhIntroHtml(p.intro) : ""}
    </div>
  `;
}

function buildIchInfoHtml(p: IchPointApi): string {
  const location = [p.province, p.city, p.district]
    .filter(Boolean)
    .join(" ");
  const metaLine = [
    p.category
      ? `<span style="color:${getIchCategoryColor(p.category)};">${escapeInfoHtml(p.category)}</span>`
      : null,
    location ? `<span style="color:#555;">${escapeInfoHtml(location)}</span>` : null,
  ]
    .filter((value): value is string => value !== null)
    .join('<span style="color:#888;"> | </span>');

  return `
    <div style="width:280px;font-family:sans-serif;">
      <h3 style="margin:0 0 4px 0;font-size:17px;line-height:1.3;">
        ${escapeInfoHtml(p.name ?? "未命名")}
      </h3>
      ${
        metaLine
          ? `<p style="margin:0;font-size:12px;line-height:1.5;">${metaLine}</p>`
          : ""
      }
    </div>
  `;
}

const HISTORIC_AREA_STYLE = {
  fillColor: "#6b8f71",
  fillOpacity: 0.12,
  strokeColor: "#5a7d5e",
  strokeWeight: 1.5,
  strokeOpacity: 0.75,
} as const;

const HISTORIC_AREA_HIGHLIGHT_STYLE = {
  fillColor: "#d6a53a",
  fillOpacity: 0.38,
  strokeColor: "#b35c2e",
  strokeWeight: 3,
  strokeOpacity: 1,
} as const;

const HISTORIC_AREA_HIGHLIGHT_DURATION_MS = 900;
const HISTORIC_AREA_LABEL_Z_INDEX = 19;

function createHistoricAreaLabelHtml(name: string): string {
  return `<div data-historic-area-label="true" style="
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 253, 247, 0.82);
    border: 1px solid rgba(90, 125, 94, 0.46);
    color: #315c43;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 4px rgba(23, 59, 49, 0.16);
  ">${escapeInfoHtml(name)}</div>`;
}

function getPolygonCentroid(path: number[][]): {
  position: [number, number];
  area: number;
} | null {
  if (path.length < 3) return null;

  let crossSum = 0;
  let centroidXSum = 0;
  let centroidYSum = 0;
  for (let index = 0; index < path.length; index += 1) {
    const current = path[index];
    const next = path[(index + 1) % path.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    crossSum += cross;
    centroidXSum += (current[0] + next[0]) * cross;
    centroidYSum += (current[1] + next[1]) * cross;
  }

  if (Math.abs(crossSum) < Number.EPSILON) {
    const coordinates = path.reduce(
      (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
      [0, 0],
    );
    return {
      position: [coordinates[0] / path.length, coordinates[1] / path.length],
      area: 0,
    };
  }

  return {
    position: [centroidXSum / (3 * crossSum), centroidYSum / (3 * crossSum)],
    area: Math.abs(crossSum / 2),
  };
}

function getHistoricAreaLabelPosition(paths: number[][][]): [number, number] | null {
  let selected: ReturnType<typeof getPolygonCentroid> = null;
  for (const path of paths) {
    const candidate = getPolygonCentroid(path);
    if (candidate && (!selected || candidate.area > selected.area)) {
      selected = candidate;
    }
  }
  return selected?.position ?? null;
}

function getLngLatTuple(value: unknown): [number, number] | null {
  if (!value || typeof value !== "object") return null;
  const lngLat = value as {
    lng?: unknown;
    lat?: unknown;
    getLng?: () => unknown;
    getLat?: () => unknown;
  };
  const lng = typeof lngLat.getLng === "function" ? lngLat.getLng() : lngLat.lng;
  const lat = typeof lngLat.getLat === "function" ? lngLat.getLat() : lngLat.lat;
  return typeof lng === "number" && typeof lat === "number" ? [lng, lat] : null;
}

function isPointInPolygon(point: [number, number], path: readonly number[][]): boolean {
  let inside = false;
  for (let currentIndex = 0, previousIndex = path.length - 1;
    currentIndex < path.length;
    previousIndex = currentIndex, currentIndex += 1) {
    const current = path[currentIndex];
    const previous = path[previousIndex];
    const crossesLatitude = (current[1] > point[1]) !== (previous[1] > point[1]);
    const intersectionLng =
      ((previous[0] - current[0]) * (point[1] - current[1])) /
        (previous[1] - current[1]) +
      current[0];
    if (crossesLatitude && point[0] < intersectionLng) inside = !inside;
  }
  return inside;
}

function buildHistoricAreaInfoHtml(properties: FeatureProperties): string {
  const name = getTextProperty(properties, "area_name", "未命名区域");
  const period = getTextProperty(properties, "period", "时期未详");
  const intro = getTextProperty(properties, "intro", "暂无简介");

  return `
    <div style="width:280px;font-family:sans-serif;">
      <h3 style="margin:0 0 6px 0;font-size:17px;line-height:1.3;">
        ${escapeInfoHtml(name)}
      </h3>
      <p style="margin:0 0 6px 0;color:#666;font-size:13px;line-height:1.5;">
        ${escapeInfoHtml(period)}
      </p>
      <p style="margin:0;color:#444;font-size:13px;line-height:1.6;">
        ${escapeInfoHtml(intro)}
      </p>
    </div>
  `;
}

function getPixelXY(pixel: AMapPixel | null): { left: number; top: number } | null {
  if (!pixel) return null;

  if (typeof pixel.getX === "function" && typeof pixel.getY === "function") {
    return {
      left: pixel.getX(),
      top: pixel.getY(),
    };
  }

  if (typeof pixel.x === "number" && typeof pixel.y === "number") {
    return {
      left: pixel.x,
      top: pixel.y,
    };
  }

  return null;
}

function polygonRingsToPath(rings: number[][][]): number[][] {
  // AMap.Polygon 第一版先用外环；洞环之后再补。
  // 数据为 WGS84，高德使用 GCJ-02，显示前统一转换。
  return convertPath(rings[0] ?? []);
}

export default function AMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapInstance | null>(null);
  const pointMarkersRef = useRef<AMapEventTarget[]>([]);
  // 遗产点名称标签 Marker（与图标 Marker 一一对应，默认隐藏）
  const heritageLabelMarkersRef = useRef<AMapEventTarget[]>([]);
  // 遗产点 protection_level 首字符编码（与 pointMarkersRef 一一对应）
  const heritageLevelCodesRef = useRef<number[]>([]);
  // 遗产点稳定标识与只读时间区间（与 pointMarkersRef 一一对应）
  const heritageMarkerMetadataRef = useRef<HeritageMarkerMetadata[]>([]);
  const selectedHeritageMarkerMetadataRef =
    useRef<HeritageMarkerMetadata | null>(null);
  const heritageFilterStateRef = useRef<HeritageFilterState>({
    pointsVisible: true,
    activeProtectionLevels: new Set([1, 2, 3, 4, 5]),
    showHeritageLabels: false,
    temporalSelection: { mode: "unlimited" },
  });
  const closeHeritageCardRef = useRef<() => void>(() => undefined);
  const applyHeritageVisibilityRef = useRef<() => void>(() => undefined);
  const suppressHeritageCardOutsideCloseRef = useRef(false);
  const discussionMarkersRef = useRef<HeritageAccessoryMarker[]>([]);
  const memoryAlbumMarkersRef = useRef<HeritageAccessoryMarker[]>([]);
  const areaPolygonsRef = useRef<AMapEventTarget[]>([]);
  const areaPolygonMetadataRef = useRef<HistoricAreaPolygonMetadata[]>([]);
  const areaLabelMarkersRef = useRef<
    Array<{
      readonly marker: AMapEventTarget;
      readonly metadata: HistoricAreaPolygonMetadata;
    }>
  >([]);
  const areaHighlightTimeoutsRef = useRef<
    Map<AMapEventTarget, ReturnType<typeof setTimeout>>
  >(new Map());
  const historicAreaFilterStateRef = useRef<HistoricAreaFilterState>({
    areasVisible: true,
    temporalSelection: { mode: "unlimited" },
  });
  const applyHistoricAreaVisibilityRef = useRef<() => void>(() => undefined);
  const infoWindowSelectionRef = useRef<SharedInfoWindowSelection>(null);
  const nhMarkersRef = useRef<Array<AMapEventTarget | null>>([]);
  const nhPointDataRef = useRef<NationalHeritagePointApi[]>([]);
  const nhLoadPromiseRef = useRef<Promise<AMapEventTarget[]> | null>(null);
  const nhMarkerMetadataRef = useRef<NationalHeritageMarkerMetadata[]>([]);
  const nationalHeritageFilterStateRef = useRef<
    Pick<NationalHeritageFilterState, "nhVisible" | "temporalSelection">
  >({
    nhVisible: false,
    temporalSelection: { mode: "unlimited" },
  });
  const applyNationalHeritageVisibilityRef = useRef<() => void>(
    () => undefined,
  );
  const nhVisibleIndexesRef = useRef<Set<number>>(new Set());
  const nhLabelIndexesRef = useRef<Set<number>>(new Set());
  const nhCountMarkersRef = useRef<AMapEventTarget[]>([]);
  const nhVisibilityRevisionRef = useRef(0);
  const nhVisibilityUpdateFrameRef = useRef<number | null>(null);
  const nhVisibilityRequestFrameRef = useRef<number | null>(null);
  const nmhMarkersRef = useRef<Array<AMapEventTarget | null>>([]);
  const nmhPointDataRef = useRef<IchPointApi[]>([]);
  const nmhMarkerMetadataRef = useRef<NmhMarkerMetadata[]>([]);
  const nmhVisibleIndexesRef = useRef<Set<number>>(new Set());
  const nmhVisibleRef = useRef(false);
  const nmhLoadPromiseRef = useRef<Promise<AMapEventTarget[]> | null>(null);
  const applyNmhVisibilityRef = useRef<() => void>(() => undefined);
  const nmhVisibilityRevisionRef = useRef(0);
  const nmhVisibilityUpdateFrameRef = useRef<number | null>(null);
  const nmhVisibilityRequestFrameRef = useRef<number | null>(null);
  // 非遗跨市连线
  const ichLinesRef = useRef<AMapEventTarget[]>([]);
  const fangPolygonsRef = useRef<AMapEventTarget[]>([]);
  const fangPolygonPropertiesRef = useRef<FeatureProperties[]>([]);
  const fangLabelMarkersRef = useRef<
    Array<{ readonly marker: AMapEventTarget; readonly name: string }>
  >([]);
  const fangHighlightTimeoutsRef = useRef<
    Map<AMapEventTarget, ReturnType<typeof setTimeout>>
  >(new Map());
  const mingrenMarkersRef = useRef<AMapEventTarget[]>([]);
  const mingrenVisibleRef = useRef(false);
  const applyMingrenVisibilityRef = useRef<() => void>(() => undefined);
  const fangLoadPromiseRef = useRef<Promise<AMapEventTarget[]> | null>(null);
  const mingrenLoadPromiseRef = useRef<Promise<AMapEventTarget[]> | null>(
    null,
  );
  const bndPolygonsRef = useRef<Record<BndLevel, AMapEventTarget[]>>({
    province: [],
    city: [],
    district: [],
  });
  const bndLoadPromiseRef = useRef<
    Partial<Record<BndLevel, Promise<AMapEventTarget[]>>>
  >({});
  const histMapLayersRef = useRef<Record<string, AMapTileLayer>>({});
  const mapMetaRef = useRef<MapMetadata[]>([]);
  const temporalSelectionRef = useRef<TemporalSelection>({ mode: "unlimited" });
  const histMapVisibleRef = useRef(false);
  const histMapVisibilityTouchedRef = useRef(false);
  const infoWindowRef = useRef<AMapInfoWindow | null>(null);
  const amapLibRef = useRef<AMapLibrary | null>(null);
  const pendingSearchRef = useRef<MapSearchItem | null>(null);

  // 按需创建历史地图图层：避免启动时一次性创建全部图层，降低 GPU / 合成负载。
  function ensureHistMapLayer(meta: MapMetadata): AMapTileLayer | null {
    const cached = histMapLayersRef.current[meta.id];
    if (cached) return cached;

    const AMapLib = amapLibRef.current;
    const map = mapRef.current;

    if (!AMapLib || !map || !meta.active || !meta.tile_url) return null;

    const tileLayer = new AMapLib.TileLayer({
      zIndex: 10,
      opacity: meta.default_opacity ?? INITIAL_HIST_MAP_OPACITY,
      getTileUrl: (x: number, y: number, z: number) => {
        return buildGeoServerWmsTileUrl(meta.tile_url, x, y, z);
      },
    });

    tileLayer.hide();
    map.add(tileLayer);
    histMapLayersRef.current[meta.id] = tileLayer;

    return tileLayer;
  }

  // 全国文保单位（processed.p1_nh，约 5,198 点）：首次勾选时才请求 API，
  // 分帧准备 metadata；Marker 仅为最终可见 index 按需构造。Promise 缓存防止
  // 并发重复加载。准备完成后注册 zoomend/moveend，按缩放级别分级显示。
  function ensureNhMarkers(): Promise<AMapEventTarget[]> {
    if (nhMarkerMetadataRef.current.length > 0) {
      return Promise.resolve(
        nhMarkersRef.current.filter((marker): marker is AMapEventTarget => marker !== null),
      );
    }
    if (nhLoadPromiseRef.current) return nhLoadPromiseRef.current;

    // 地图未就绪时不缓存结果，待图层再次勾选时重试。
    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map) return Promise.resolve([]);

    nhLoadPromiseRef.current = (async () => {
      const res = await fetch("/api/national-heritage-points");
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Invalid national heritage points response");
      }

      const points = json.data as NationalHeritagePointApi[];

      // 分帧准备 GCJ-02 坐标和 metadata；不预建 5,198 个 AMap DOM Marker。
      const validPoints: NationalHeritagePointApi[] = [];
      const metadata: NationalHeritageMarkerMetadata[] = [];
      for (let i = 0; i < points.length; i += NH_BATCH_SIZE) {
        const end = Math.min(i + NH_BATCH_SIZE, points.length);
        for (let j = i; j < end; j += 1) {
          const point = points[j];
          if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) continue;
          const gcj02 = wgs84ToGcj02(point.lng, point.lat);
          validPoints.push(point);
          metadata.push({
            province: point.province,
            city: point.city,
            position: gcj02,
            interval: {
              startYear: point.time_start,
              endYear: point.time_end,
            },
          });
        }
        if (end < points.length) {
          await new Promise<void>((resolve) => requestUiFrame(() => resolve()));
        }
      }

      nhPointDataRef.current = validPoints;
      nhMarkerMetadataRef.current = metadata;
      nhMarkersRef.current = Array<AMapEventTarget | null>(metadata.length).fill(null);
      map.on("zoomend", scheduleNationalHeritageVisibility);
      map.on("moveend", scheduleNationalHeritageVisibility);
      applyNationalHeritageVisibilityRef.current();
      return nhMarkersRef.current.filter(
        (marker): marker is AMapEventTarget => marker !== null,
      );
    })();

    return nhLoadPromiseRef.current;
  }

  // 全国文保点按缩放与视口分级显示：zoom < 7 每省 1 个，
  // 7–9 每市 1 个，>= 9 视口内全部；再与图层开关和时间条件合并。
  // 视口裁剪 + 分组取样，避免低缩放下全量显示导致密集和卡顿。
  function getNationalHeritageViewport(): NationalHeritageViewport | null {
    const map = mapRef.current;
    if (!map) return null;
    const bounds = map.getBounds();
    if (!bounds) return null;

    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    return expandNationalHeritageViewport({
      west: southWest.getLng(),
      south: southWest.getLat(),
      east: northEast.getLng(),
      north: northEast.getLat(),
    });
  }

  function requestUiFrame(callback: FrameRequestCallback): number {
    if (typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(() => callback(performance.now()), 16);
  }

  function cancelUiFrame(frame: number | null) {
    if (frame === null) return;
    if (typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(frame);
    } else {
      window.clearTimeout(frame);
    }
  }

  function updateNationalHeritageDiagnostics(
    markerCount: number,
    visibleCount: number,
    updating: boolean,
    elapsedMs?: number,
  ) {
    const container = containerRef.current;
    if (!container) return;
    container.dataset.nhMarkerCount = String(markerCount);
    container.dataset.nhVisibleCount = String(visibleCount);
    container.dataset.nhUpdating = String(updating);
    if (elapsedMs !== undefined) {
      container.dataset.nhLastUpdateMs = elapsedMs.toFixed(1);
    }
  }

  function applyNationalHeritageVisibility() {
    const map = mapRef.current;
    const markers = nhMarkersRef.current;
    const metadata = nhMarkerMetadataRef.current;
    if (!map || metadata.length === 0) return;

    cancelUiFrame(nhVisibilityRequestFrameRef.current);
    nhVisibilityRequestFrameRef.current = null;
    cancelUiFrame(nhVisibilityUpdateFrameRef.current);
    nhVisibilityUpdateFrameRef.current = null;

    const revision = nhVisibilityRevisionRef.current + 1;
    nhVisibilityRevisionRef.current = revision;
    const startedAt = performance.now();
    const filterState: NationalHeritageFilterState = {
      ...nationalHeritageFilterStateRef.current,
      zoom: map.getZoom(),
      viewport: getNationalHeritageViewport(),
    };
    const selected = getNationalHeritageVisibleIndexes(metadata, filterState);
    const groupSummaries = getNationalHeritageGroupSummaries(metadata, filterState);
    const labeledIndexes = map.getZoom() >= NH_LABEL_MIN_ZOOM
      ? new Set([...selected].filter((index) => Boolean(nhPointDataRef.current[index]?.name)))
      : new Set<number>();

    for (const index of new Set([
      ...nhLabelIndexesRef.current,
      ...labeledIndexes,
    ])) {
      if (nhLabelIndexesRef.current.has(index) === labeledIndexes.has(index)) continue;
      nhMarkersRef.current[index]?.setContent?.(
        createNationalHeritageMarkerContent(
          nhPointDataRef.current[index],
          labeledIndexes.has(index),
        ),
      );
    }
    nhLabelIndexesRef.current = labeledIndexes;

    if (nhCountMarkersRef.current.length > 0) {
      map.remove(nhCountMarkersRef.current);
    }
    nhCountMarkersRef.current = groupSummaries.map((summary) =>
      new (amapLibRef.current as AMapLibrary).Marker({
        position: summary.position,
        content: createNationalHeritageCountHtml(summary.count),
        anchor: "center",
        offset: new (amapLibRef.current as AMapLibrary).Pixel(18, -18),
        zIndex: 93,
        cursor: "default",
      }),
    );
    if (nhCountMarkersRef.current.length > 0) {
      map.add(nhCountMarkersRef.current);
    }
    const changedIndexes: number[] = [];
    const visibleIndexes = nhVisibleIndexesRef.current;

    for (let index = 0; index < metadata.length; index += 1) {
      if (selected.has(index) !== visibleIndexes.has(index)) {
        changedIndexes.push(index);
      }
    }

    updateNationalHeritageDiagnostics(
      metadata.length,
      visibleIndexes.size,
      changedIndexes.length > 0,
    );

    let offset = 0;
    const applyNextBatch = () => {
      if (revision !== nhVisibilityRevisionRef.current) return;
      const end = Math.min(offset + NH_VISIBILITY_BATCH_SIZE, changedIndexes.length);

      const toAdd: AMapEventTarget[] = [];
      const toRemove: AMapEventTarget[] = [];
      for (; offset < end; offset += 1) {
        const index = changedIndexes[offset];
        if (selected.has(index)) {
          let marker = markers[index];
          if (!marker) {
            const point = nhPointDataRef.current[index];
            const markerMetadata = metadata[index];
            marker = new (amapLibRef.current as AMapLibrary).Marker({
              position: markerMetadata.position,
              content: createNationalHeritageMarkerContent(
                point,
                labeledIndexes.has(index),
              ),
              anchor: "center",
              offset: new (amapLibRef.current as AMapLibrary).Pixel(0, 0),
              // 92：低于唐代名人故居(95)，高于非遗代表性点(90)。
              zIndex: 92,
              cursor: "pointer",
            });
            marker.on("click", async (event) => {
              infoWindowSelectionRef.current = {
                source: "national-heritage",
                markerIndex: index,
              };
              const currentPoint = nhPointDataRef.current[index];
              infoWindowRef.current?.setContent(buildNhInfoHtml(currentPoint));
              infoWindowRef.current?.open(map, event.lnglat);
              if (currentPoint.intro !== undefined) return;

              try {
                const res = await fetch(
                  `/api/national-heritage-points?id=${encodeURIComponent(String(currentPoint.id))}`,
                );
                const json = await res.json();
                if (!json.success || !json.data) {
                  throw new Error("Invalid national heritage point detail response");
                }
                const selection = infoWindowSelectionRef.current;
                if (
                  selection?.source !== "national-heritage" ||
                  selection.markerIndex !== index
                ) {
                  return;
                }
                const detailedPoint = {
                  ...currentPoint,
                  intro: json.data.intro as string | null | undefined ?? null,
                };
                nhPointDataRef.current[index] = detailedPoint;
                infoWindowRef.current?.setContent(buildNhInfoHtml(detailedPoint));
              } catch (error) {
                console.error("Failed to load national heritage point detail:", error);
              }
            });
            markers[index] = marker;
          }
          toAdd.push(marker);
          visibleIndexes.add(index);
        } else {
          const marker = markers[index];
          if (marker) {
            marker.hide();
            toRemove.push(marker);
          }
          visibleIndexes.delete(index);
        }
      }
      if (toRemove.length > 0) map.remove(toRemove);
      if (toAdd.length > 0) {
        map.add(toAdd);
        for (const marker of toAdd) marker.show();
      }

      updateNationalHeritageDiagnostics(metadata.length, visibleIndexes.size, offset < changedIndexes.length);
      if (offset < changedIndexes.length) {
        nhVisibilityUpdateFrameRef.current = requestUiFrame(applyNextBatch);
        return;
      }

      nhVisibilityUpdateFrameRef.current = null;
      updateNationalHeritageDiagnostics(
        metadata.length,
        visibleIndexes.size,
        false,
        performance.now() - startedAt,
      );
    };

    // 首批立即应用，提交有即时反馈；大规模变化的剩余操作逐帧完成。
    applyNextBatch();

    const infoWindowSelection = infoWindowSelectionRef.current;
    if (
      infoWindowSelection?.source === "national-heritage" &&
      !selected.has(infoWindowSelection.markerIndex)
    ) {
      infoWindowRef.current?.close();
      infoWindowSelectionRef.current = null;
    }
  }

  function scheduleNationalHeritageVisibility() {
    if (nhVisibilityRequestFrameRef.current !== null) return;
    nhVisibilityRequestFrameRef.current = requestUiFrame(() => {
      nhVisibilityRequestFrameRef.current = null;
      applyNationalHeritageVisibilityRef.current();
    });
  }
  applyNationalHeritageVisibilityRef.current = applyNationalHeritageVisibility;

  function applyNmhVisibility() {
    const map = mapRef.current;
    const metadata = nmhMarkerMetadataRef.current;
    if (!map || metadata.length === 0) return;

    cancelUiFrame(nmhVisibilityRequestFrameRef.current);
    nmhVisibilityRequestFrameRef.current = null;
    cancelUiFrame(nmhVisibilityUpdateFrameRef.current);
    nmhVisibilityUpdateFrameRef.current = null;

    const revision = nmhVisibilityRevisionRef.current + 1;
    nmhVisibilityRevisionRef.current = revision;
    const selected = getNmhVisibleIndexes(
      metadata,
      nmhVisibleRef.current,
      map.getZoom(),
      getNationalHeritageViewport(),
    );
    const visibleIndexes = nmhVisibleIndexesRef.current;
    const changedIndexes: number[] = [];
    for (let index = 0; index < metadata.length; index += 1) {
      if (selected.has(index) !== visibleIndexes.has(index)) {
        changedIndexes.push(index);
      }
    }

    const container = containerRef.current;
    if (container) {
      container.dataset.nmhMarkerCount = String(metadata.length);
      container.dataset.nmhVisibleCount = String(visibleIndexes.size);
    }

    let offset = 0;
    const applyNextBatch = () => {
      if (revision !== nmhVisibilityRevisionRef.current) return;
      const end = Math.min(offset + NMH_VISIBILITY_BATCH_SIZE, changedIndexes.length);
      const toAdd: AMapEventTarget[] = [];
      const toRemove: AMapEventTarget[] = [];

      for (; offset < end; offset += 1) {
        const index = changedIndexes[offset];
        const point = nmhPointDataRef.current[index];
        const item = metadata[index];
        if (selected.has(index)) {
          let marker = nmhMarkersRef.current[index];
          if (!marker) {
            const hasCover = item.coverUrl !== null;
            marker = new (amapLibRef.current as AMapLibrary).Marker({
              position: item.position,
              content: hasCover
                ? createNmhRepresentativeHtml(item.coverUrl, point.name, item.repColor)
                : createMarkerHtml(item.dotColor, 7, null, true),
              anchor: "center",
              offset: new (amapLibRef.current as AMapLibrary).Pixel(0, 0),
              zIndex: hasCover ? 90 : 88,
              cursor: "pointer",
            });
            marker.on("click", (event) => {
              infoWindowSelectionRef.current = { source: "other" };
              infoWindowRef.current?.setContent(buildIchInfoHtml(point));
              infoWindowRef.current?.open(map, event.lnglat);
            });
            nmhMarkersRef.current[index] = marker;
          }
          toAdd.push(marker);
          visibleIndexes.add(index);
        } else {
          const marker = nmhMarkersRef.current[index];
          if (marker) {
            marker.hide();
            toRemove.push(marker);
          }
          visibleIndexes.delete(index);
        }
      }

      if (toRemove.length > 0) map.remove(toRemove);
      if (toAdd.length > 0) {
        map.add(toAdd);
        for (const marker of toAdd) marker.show();
      }
      if (container) container.dataset.nmhVisibleCount = String(visibleIndexes.size);
      if (offset < changedIndexes.length) {
        nmhVisibilityUpdateFrameRef.current = requestUiFrame(applyNextBatch);
      } else {
        nmhVisibilityUpdateFrameRef.current = null;
      }
    };

    applyNextBatch();
  }

  function scheduleNmhVisibility() {
    if (nmhVisibilityRequestFrameRef.current !== null) return;
    nmhVisibilityRequestFrameRef.current = requestUiFrame(() => {
      nmhVisibilityRequestFrameRef.current = null;
      applyNmhVisibilityRef.current();
    });
  }
  applyNmhVisibilityRef.current = applyNmhVisibility;

  function ensureNmhMarkers(): Promise<AMapEventTarget[]> {
    if (nmhMarkerMetadataRef.current.length > 0) {
      return Promise.resolve(
        nmhMarkersRef.current.filter((marker): marker is AMapEventTarget => marker !== null),
      );
    }
    if (nmhLoadPromiseRef.current) return nmhLoadPromiseRef.current;

    const map = mapRef.current;
    if (!amapLibRef.current || !map) return Promise.resolve([]);

    nmhLoadPromiseRef.current = (async () => {
      const res = await fetch("/api/ich-points");
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Invalid ICH points response");
      }

      const points = json.data as IchPointApi[];
      const validPoints: IchPointApi[] = [];
      const metadata: NmhMarkerMetadata[] = [];
      for (let start = 0; start < points.length; start += NMH_BATCH_SIZE) {
        const end = Math.min(start + NMH_BATCH_SIZE, points.length);
        for (let index = start; index < end; index += 1) {
          const point = points[index];
          if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) continue;

          const coverKey = point.cover_image_key;
          const coverUrl = typeof coverKey === "string" && coverKey !== ""
            ? getCoverImageUrl(coverKey)
            : null;
          validPoints.push(point);
          metadata.push({
            position: wgs84ToGcj02(point.lng, point.lat),
            province: point.province,
            city: point.city,
            coverUrl,
            repColor: getIchCategoryColorAlpha(point.category, 0.88),
            dotColor: getIchCategoryColorAlpha(point.category, 0.22),
          });
        }
        if (end < points.length) {
          await new Promise<void>((resolve) => requestUiFrame(() => resolve()));
        }
      }

      nmhPointDataRef.current = validPoints;
      nmhMarkerMetadataRef.current = metadata;
      nmhMarkersRef.current = Array<AMapEventTarget | null>(metadata.length).fill(null);
      map.on("zoomend", scheduleNmhVisibility);
      map.on("moveend", scheduleNmhVisibility);
      applyNmhVisibilityRef.current();
      return nmhMarkersRef.current.filter(
        (marker): marker is AMapEventTarget => marker !== null,
      );
    })();

    return nmhLoadPromiseRef.current;
  }

  // 非遗跨市连线：按 name_cn 聚合同名点，在同名点之间画淡色连线。
  // 数据加载一次后缓存，仅随 nmhVisible 切换显隐。
  type IchLineData = { name: string; category: string | null; points: { lng: number; lat: number }[] };
  const ichLinesDataRef = useRef<IchLineData[]>([]);
  const ichLinesLoadRef = useRef<boolean>(false);

  function loadAndRenderIchLines() {
    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map) return;

    if (ichLinesRef.current.length > 0) {
      for (const line of ichLinesRef.current) line.show();
      return;
    }
    // 数据已加载但图形尚未创建时直接渲染。
    if (ichLinesDataRef.current.length > 0) {
      renderIchPolylines(ichLinesDataRef.current);
      return;
    }
    // 正在加载中则等 promise
    if (ichLinesLoadRef.current) return;
    ichLinesLoadRef.current = true;

    fetch("/api/ich-city-summary")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !Array.isArray(json.data)) return;
        ichLinesDataRef.current = json.data as IchLineData[];
        renderIchPolylines(ichLinesDataRef.current);
      })
      .catch((err) => console.error("Failed to load ICH lines:", err))
      .finally(() => { ichLinesLoadRef.current = false; });
  }

  function renderIchPolylines(data: IchLineData[]) {
    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map) return;

    // 清除旧连线
    for (const l of ichLinesRef.current) map.remove(l);
    ichLinesRef.current = [];

    const lines: AMapEventTarget[] = [];
    for (const item of data) {
      if (item.points.length < 2) continue;
      const path = item.points.map((pt) => {
        const [gLng, gLat] = wgs84ToGcj02(pt.lng, pt.lat);
        return new AMapLib.LngLat(gLng, gLat);
      });
      lines.push(
        new AMapLib.Polyline({
          path,
          strokeColor: getIchCategoryColor(item.category),
          strokeWeight: 1.2,
          strokeOpacity: 0.35,
          strokeStyle: "solid",
          zIndex: 45,
          cursor: "default",
        }),
      );
    }
    if (lines.length > 0) {
      map.add(lines);
      ichLinesRef.current = lines;
    }
  }

  function updateFangLabelSizes() {
    const map = mapRef.current;
    if (!map) return;
    const fontSize = getFangLabelFontSize(map.getZoom());
    for (const label of fangLabelMarkersRef.current) {
      label.marker.setContent?.(createFangLabelHtml(label.name, fontSize));
    }
  }

  // 唐 108 坊（processed.a5_tang108fang，120 个面）：首次勾选时懒加载。
  function ensureFangPolygons(): Promise<AMapEventTarget[]> {
    if (fangPolygonsRef.current.length > 0) {
      return Promise.resolve(fangPolygonsRef.current);
    }
    if (fangLoadPromiseRef.current) return fangLoadPromiseRef.current;

    // 地图未就绪时不缓存结果，待图层再次勾选时重试。
    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map) return Promise.resolve([]);

    fangLoadPromiseRef.current = (async () => {
      const res = await fetch("/api/tang-fang-areas");
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error("Invalid Tang fang areas response");
      }

      const geojson = json.data as GeoJsonFeatureCollection;
      const polygons: AMapEventTarget[] = [];
      const polygonProperties: FeatureProperties[] = [];
      const labels: Array<{
        marker: AMapEventTarget;
        name: string;
      }> = [];

      for (const feature of geojson.features ?? []) {
        const properties = feature.properties ?? {};
        const geometry = feature.geometry;

        const polygonPaths =
          geometry.type === "Polygon"
            ? [polygonRingsToPath(geometry.coordinates)]
            : geometry.coordinates.map((rings) => polygonRingsToPath(rings));
        const validPaths = polygonPaths.filter((path) => path.length > 0);
        const labelPosition = getHistoricAreaLabelPosition(validPaths);
        if (labelPosition) {
          const name = getTextProperty(properties, "name", "未命名坊");
          const marker = new AMapLib.Marker({
            position: labelPosition,
            content: createFangLabelHtml(
              name,
              getFangLabelFontSize(map.getZoom()),
            ),
            anchor: "center",
            offset: new AMapLib.Pixel(0, 0),
            zIndex: FANG_LABEL_Z_INDEX,
            cursor: "default",
          });
          labels.push({ marker, name });
        }

        for (const path of validPaths) {
          const polygon = new AMapLib.Polygon({
            path,
            ...FANG_STYLE,
            cursor: "pointer",
            zIndex: 21,
          });

          polygon.on("click", (event) => {
            const featurePolygons = fangPolygonsRef.current.filter(
              (_, index) => fangPolygonPropertiesRef.current[index] === properties,
            );
            for (const featurePolygon of featurePolygons) {
              const existingTimeout =
                fangHighlightTimeoutsRef.current.get(featurePolygon);
              if (existingTimeout !== undefined) clearTimeout(existingTimeout);
              featurePolygon.setOptions?.(FANG_HIGHLIGHT_STYLE);
              const timeout = setTimeout(() => {
                featurePolygon.setOptions?.(FANG_STYLE);
                fangHighlightTimeoutsRef.current.delete(featurePolygon);
              }, FANG_HIGHLIGHT_DURATION_MS);
              fangHighlightTimeoutsRef.current.set(featurePolygon, timeout);
            }

            infoWindowSelectionRef.current = { source: "other" };
            infoWindowRef.current?.setContent(buildFangInfoHtml(properties));
            infoWindowRef.current?.open(map, event.lnglat);
          });

          polygons.push(polygon);
          polygonProperties.push(properties);
        }
      }

      map.add(polygons);
      if (labels.length > 0) map.add(labels.map(({ marker }) => marker));
      fangPolygonsRef.current = polygons;
      fangPolygonPropertiesRef.current = polygonProperties;
      fangLabelMarkersRef.current = labels;
      map.on("zoomend", updateFangLabelSizes);
      return polygons;
    })();

    return fangLoadPromiseRef.current;
  }

  // 唐代名人故居（processed.p3_fang108_mingrenguju，40 个点）：首次勾选时懒加载。
  function ensureMingrenMarkers(): Promise<AMapEventTarget[]> {
    if (mingrenMarkersRef.current.length > 0) {
      return Promise.resolve(mingrenMarkersRef.current);
    }
    if (mingrenLoadPromiseRef.current) return mingrenLoadPromiseRef.current;

    // 地图未就绪时不缓存结果，待图层再次勾选时重试。
    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map) return Promise.resolve([]);

    mingrenLoadPromiseRef.current = (async () => {
      const res = await fetch("/api/fang-mingren-points");
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Invalid Fang mingren points response");
      }

      const points = json.data as FangMingrenPointApi[];
      const markers: AMapEventTarget[] = [];

      for (const point of points) {
        if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) {
          continue;
        }

        const marker = new AMapLib.Marker({
          // 数据为 WGS84，高德使用 GCJ-02，显示前转换。
          position: wgs84ToGcj02(point.lng, point.lat),
          content: createMingrenMarkerHtml(point),
          anchor: "center",
          offset: new AMapLib.Pixel(0, 0),
          zIndex: 95,
          cursor: "pointer",
        });
        marker.hide();

        marker.on("click", (event) => {
          infoWindowSelectionRef.current = { source: "mingren" };
          infoWindowRef.current?.setContent(buildMingrenInfoHtml(point));
          infoWindowRef.current?.open(map, event.lnglat);
        });

        markers.push(marker);
      }

      map.add(markers);
      mingrenMarkersRef.current = markers;
      applyMingrenVisibilityRef.current();
      return markers;
    })();

    return mingrenLoadPromiseRef.current;
  }

  // 行政边界（processed.a1/a2/a3_bndry_*_tiandi）：首次勾选时懒加载，
  // 仅描边不填充，避免遮挡底图与其他图层。
  function ensureBndPolygons(level: BndLevel): Promise<AMapEventTarget[]> {
    if (bndPolygonsRef.current[level].length > 0) {
      return Promise.resolve(bndPolygonsRef.current[level]);
    }
    const cached = bndLoadPromiseRef.current[level];
    if (cached) return cached;

    // 地图未就绪时不缓存结果，待图层再次勾选时重试。
    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map) return Promise.resolve([]);

    const config = BND_LEVELS[level];

    const promise = (async () => {
      const res = await fetch(`/api/boundary-areas?level=${level}`);
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(`Invalid boundary areas response: ${level}`);
      }

      const geojson = json.data as GeoJsonFeatureCollection;
      const polygons: AMapEventTarget[] = [];

      for (const feature of geojson.features ?? []) {
        const properties = feature.properties ?? {};
        const geometry = feature.geometry;

        const polygonPaths =
          geometry.type === "Polygon"
            ? [polygonRingsToPath(geometry.coordinates)]
            : geometry.coordinates.map((rings) => polygonRingsToPath(rings));

        for (const path of polygonPaths) {
          if (!path || path.length === 0) continue;

          const polygon = new AMapLib.Polygon({
            path,
            fillOpacity: 0,
            strokeColor: config.color,
            strokeWeight: config.weight,
            strokeOpacity: 0.9,
            cursor: "pointer",
            // 区县(18) > 市(17) > 省(16)，见文件顶部图层叠放优先级注释。
            zIndex: config.zIndex,
          });

          polygon.on("click", (event) => {
            infoWindowSelectionRef.current = { source: "other" };
            infoWindowRef.current?.setContent(
              buildBndInfoHtml(properties, level),
            );
            infoWindowRef.current?.open(map, event.lnglat);
          });

          polygons.push(polygon);
        }
      }

      map.add(polygons);
      bndPolygonsRef.current[level] = polygons;
      return polygons;
    })();

    bndLoadPromiseRef.current[level] = promise;
    return promise;
  }

  const [selectedHeritage, setSelectedHeritage] =
    useState<HeritageCardData | null>(null);
  const [activeDialoguePid, setActiveDialoguePid] = useState<string | null>(null);
  const [memoryAlbums, setMemoryAlbums] = useState<
    Map<string, MemoryAlbumIndexEntry>
  >(() => new Map());
  const [activeMemoryAlbum, setActiveMemoryAlbum] =
    useState<MemoryAlbumIndexEntry | null>(null);
  const [cardPosition, setCardPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  // 地图容器尺寸，供信息卡夹取位置使用（与覆盖层定位上下文一致）
  const [cardBounds, setCardBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // 当前选中遗产点的容器像素坐标（连线锚点）及其经纬度（地图移动时重投影用）
  const [anchorPos, setAnchorPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const selectedLngLatRef = useRef<[number, number] | null>(null);

  const [pointsVisible, setPointsVisible] = useState(true);
  // 遗产点名称标签图面显示开关（默认关闭，开启后在图标上方显示名称）
  const [showHeritageLabels, setShowHeritageLabels] = useState(false);
  // 文保等级筛选：默认全部启用（编码 1-5 对应 国家/省/市/区县/优秀近现代建筑）
  const [activeProtectionLevels, setActiveProtectionLevels] = useState<
    Set<number>
  >(() => new Set([1, 2, 3, 4, 5]));
  const [areasVisible, setAreasVisible] = useState(true);
  const [histMapVisible, setHistMapVisible] = useState(false);
  // 全国范围图层（processed.p1_nh / processed.p4_nmh）默认不显示。
  const [nhVisible, setNhVisible] = useState(false);
  const [nmhVisible, setNmhVisible] = useState(false);
  // 唐 108 坊 / 唐代名人故居（processed.a5_tang108fang / p3_fang108_mingrenguju）默认不显示。
  const [fangVisible, setFangVisible] = useState(false);
  const [mingrenVisible, setMingrenVisible] = useState(false);
  // 行政边界（processed.a1/a2/a3_bndry_*_tiandi）默认不显示。
  const [bndProvinceVisible, setBndProvinceVisible] = useState(false);
  const [bndCityVisible, setBndCityVisible] = useState(false);
  const [bndDistrictVisible, setBndDistrictVisible] = useState(false);
  const [histMapOpacity, setHistMapOpacity] = useState(
    INITIAL_HIST_MAP_OPACITY,
  );
  const [mapStyle, setMapStyle] = useState("amap://styles/whitesmoke");
  const [selectedHistoricalMapId, setSelectedHistoricalMapId] =
    useState<string | null>(null);
  const [historicalMapPoints, setHistoricalMapPoints] = useState<
    HistoricalMapPoint[]
  >([]);
  const [temporalSelection, setTemporalSelection] =
    useState<TemporalSelection>({ mode: "unlimited" });
  const [memoryDialogues, setMemoryDialogues] = useState<
    Map<string, MemoryDialogueIndexEntry>
  >(() => new Map());
  // 词云图层：遗产点公众印象关键词气泡
  const [wordCloudVisible, setWordCloudVisible] = useState(false);
  // 二级讨论默认关闭；开启后仅突出有讨论数据的点位。
  const [publicDialogueVisible, setPublicDialogueVisible] = useState(false);
  // 城市记忆相册默认关闭；开启后仅突出相册索引中主绑定的遗址点。
  const [memoryAlbumVisible, setMemoryAlbumVisible] = useState(false);
  const [heritagePoints, setHeritagePoints] = useState<HeritagePointApi[]>([]);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  heritageFilterStateRef.current = {
    pointsVisible,
    activeProtectionLevels,
    showHeritageLabels,
    temporalSelection,
  };
  historicAreaFilterStateRef.current = {
    areasVisible,
    temporalSelection,
  };
  nationalHeritageFilterStateRef.current = {
    nhVisible,
    temporalSelection,
  };
  nmhVisibleRef.current = nmhVisible;
  mingrenVisibleRef.current = mingrenVisible;
  temporalSelectionRef.current = temporalSelection;
  histMapVisibleRef.current = histMapVisible;

  const visibleHeritagePoints = useMemo(
    () =>
      getVisibleHeritageSources(heritagePoints, {
        pointsVisible,
        activeProtectionLevels,
        showHeritageLabels,
        temporalSelection,
      }),
    [
      activeProtectionLevels,
      heritagePoints,
      pointsVisible,
      showHeritageLabels,
      temporalSelection,
    ],
  );

  const closeHeritageCard = useCallback(() => {
    setSelectedHeritage(null);
    setCardPosition(null);
    setCardBounds(null);
    setAnchorPos(null);
    selectedLngLatRef.current = null;
    selectedHeritageMarkerMetadataRef.current = null;
  }, []);
  closeHeritageCardRef.current = closeHeritageCard;

  const handleHeritageCardClose = useCallback(() => {
    if (suppressHeritageCardOutsideCloseRef.current) {
      suppressHeritageCardOutsideCloseRef.current = false;
      return;
    }
    closeHeritageCard();
  }, [closeHeritageCard]);

  const suppressHeritageCardOutsideClose = useCallback(() => {
    suppressHeritageCardOutsideCloseRef.current = true;
  }, []);

  const resetHeritageCardOutsideCloseSuppression = useCallback(() => {
    setTimeout(() => {
      suppressHeritageCardOutsideCloseRef.current = false;
    }, 0);
  }, []);

  const handleVisibilityControlMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const isLayerOrTimelineControl = Boolean(
        target.closest('[aria-label="图层控制"], [aria-label="历史时间轴"]'),
      );
      const isHeritageLabelSwitch = Boolean(target.closest('[role="switch"]'));
      const legendLabel = target.closest("label")?.textContent?.trim();
      const isProtectionLevelControl =
        legendLabel === "国家级" ||
        legendLabel === "省级" ||
        legendLabel === "市级" ||
        legendLabel === "区县级" ||
        legendLabel === "优秀近现代建筑";

      if (
        isLayerOrTimelineControl ||
        isHeritageLabelSwitch ||
        isProtectionLevelControl
      ) {
        suppressHeritageCardOutsideClose();
      }
    },
    [suppressHeritageCardOutsideClose],
  );

  const applyHeritageVisibility = useCallback(() => {
    const markers = pointMarkersRef.current;
    const labelMarkers = heritageLabelMarkersRef.current;
    const levelCodes = heritageLevelCodesRef.current;
    const metadata = heritageMarkerMetadataRef.current;
    const state = heritageFilterStateRef.current;

    for (let i = 0; i < markers.length; i += 1) {
      const markerMetadata = metadata[i];
      const metadataAligned =
        markerMetadata !== undefined &&
        levelCodes[i] === markerMetadata.protectionLevelCode;
      const visibility = metadataAligned
        ? getHeritageMarkerVisibility(markerMetadata, state)
        : { markerVisible: false, labelVisible: false };

      if (visibility.markerVisible) markers[i].show();
      else markers[i].hide();

      const labelMarker = labelMarkers[i];
      if (labelMarker) {
        if (visibility.labelVisible) labelMarker.show();
        else labelMarker.hide();
      }
    }

    for (const accessory of discussionMarkersRef.current) {
      const visible =
        memoryDialogues.has(accessory.pid) &&
        isHeritageAccessoryVisible(
          accessory.metadata,
          state,
          publicDialogueVisible,
        );
      if (visible) accessory.marker.show();
      else accessory.marker.hide();
    }

    for (const accessory of memoryAlbumMarkersRef.current) {
      const visible = isHeritageAccessoryVisible(
        accessory.metadata,
        state,
        memoryAlbumVisible,
      );
      if (visible) accessory.marker.show();
      else accessory.marker.hide();
    }

    if (
      shouldClearSelectedHeritage(
        selectedHeritageMarkerMetadataRef.current,
        state,
      )
    ) {
      closeHeritageCard();
    }

    if (activeDialoguePid) {
      const activeDiscussion = discussionMarkersRef.current.find(
        ({ pid }) => pid === activeDialoguePid,
      );
      if (
        !activeDiscussion ||
        !memoryDialogues.has(activeDialoguePid) ||
        !isHeritageAccessoryVisible(
          activeDiscussion.metadata,
          state,
          publicDialogueVisible,
        )
      ) {
        setActiveDialoguePid(null);
      }
    }

    if (activeMemoryAlbum) {
      const activeAlbumMarker = memoryAlbumMarkersRef.current.find(
        ({ pid }) => pid === activeMemoryAlbum.primaryPid,
      );
      if (
        !activeAlbumMarker ||
        !isHeritageAccessoryVisible(
          activeAlbumMarker.metadata,
          state,
          memoryAlbumVisible,
        )
      ) {
        setActiveMemoryAlbum(null);
      }
    }
  }, [
    activeDialoguePid,
    activeMemoryAlbum,
    closeHeritageCard,
    memoryAlbumVisible,
    memoryDialogues,
    publicDialogueVisible,
  ]);
  applyHeritageVisibilityRef.current = applyHeritageVisibility;

  const applyHistoricAreaVisibility = useCallback(() => {
    const polygons = areaPolygonsRef.current;
    const metadata = areaPolygonMetadataRef.current;
    const state = historicAreaFilterStateRef.current;

    for (let i = 0; i < polygons.length; i += 1) {
      const polygonMetadata = metadata[i];
      const visible =
        polygonMetadata !== undefined &&
        isHistoricAreaVisible(polygonMetadata, state);

      if (visible) polygons[i].show();
      else polygons[i].hide();
    }

    for (const label of areaLabelMarkersRef.current) {
      if (isHistoricAreaVisible(label.metadata, state)) label.marker.show();
      else label.marker.hide();
    }

    const infoWindowSelection = infoWindowSelectionRef.current;
    if (
      infoWindowSelection?.source === "historic-area" &&
      shouldCloseHistoricAreaInfoWindow(infoWindowSelection.metadata, state)
    ) {
      infoWindowRef.current?.close();
      infoWindowSelectionRef.current = null;
    }
  }, []);
  applyHistoricAreaVisibilityRef.current = applyHistoricAreaVisibility;

  const applyMingrenVisibility = useCallback(() => {
    const visible = mingrenVisibleRef.current;

    for (const marker of mingrenMarkersRef.current) {
      if (visible) marker.show();
      else marker.hide();
    }

    if (!visible && infoWindowSelectionRef.current?.source === "mingren") {
      infoWindowRef.current?.close();
      infoWindowSelectionRef.current = null;
    }
  }, []);
  applyMingrenVisibilityRef.current = applyMingrenVisibility;

  const locateSearchResult = useCallback(
    (item: MapSearchItem): boolean => {
      const map = mapRef.current;
      const AMapLib = amapLibRef.current;
      if (!map || !AMapLib) return false;

      const point =
        item.kind === "heritage"
          ? heritagePoints.find(
              (candidate) =>
                (candidate.pid ?? `heritage:${candidate.id}`) === item.id,
            )
          : null;
      if (item.kind === "heritage" && !point) return false;

      const followsTimeline =
        item.kind === "heritage" ||
        item.kind === "area" ||
        item.kind === "national-heritage";
      const currentSelection = temporalSelectionRef.current;
      const temporalDecision = followsTimeline
        ? decideSearchTemporalSelection(item, currentSelection)
        : null;
      const feedbackParts = followsTimeline
        ? [
            `已定位“${item.name}”`,
            `对象年代：${formatSearchTemporalValue(item)}`,
          ]
        : [`已定位“${item.name}”`];
      let timeChanged = false;

      if (temporalDecision?.kind === "select-year") {
        const nextSelection: TemporalSelection = {
          mode: "year",
          year: temporalDecision.year,
        };
        temporalSelectionRef.current = nextSelection;
        setTemporalSelection(nextSelection);
        setSelectedHistoricalMapId(null);
        timeChanged = true;
        feedbackParts.push(
          `对象年代为${formatSearchTemporalValue(item)}，当前时间由${formatTemporalSelection(currentSelection)}切换到最近边界${formatTemporalSelection(nextSelection)}`,
          "原具体历史地图选择已失效，未自动选择新地图",
        );
      } else if (temporalDecision?.kind === "select-unlimited") {
        if (temporalDecision.selectionChanged) {
          const nextSelection: TemporalSelection = { mode: "unlimited" };
          const overviewMapId = getOverviewHistoricalMap(mapMetaRef.current)?.id ?? null;
          temporalSelectionRef.current = nextSelection;
          setTemporalSelection(nextSelection);
          setSelectedHistoricalMapId(overviewMapId);
          timeChanged = true;
          feedbackParts.push(
            `对象年代未详，当前时间由${formatTemporalSelection(currentSelection)}切换为不限`,
            overviewMapId ? "历史地图选择已切换为总览图" : "当前没有可用总览图",
          );
        }
      } else if (temporalDecision?.kind === "invalid") {
        feedbackParts.push(
          `该时间数据无法用于自动切换，当前时间保持${formatTemporalSelection(currentSelection)}`,
        );
      }

      const gcjPosition = wgs84ToGcj02(item.lng, item.lat);
      setActiveDialoguePid(null);
      setActiveMemoryAlbum(null);
      map.setZoomAndCenter(
        item.kind === "area" || item.kind === "fang" ? 13 : 16,
        gcjPosition,
      );

      let layerOpened = false;
      let stillRestricted = false;
      if (item.kind === "heritage" && point) {
        layerOpened = !pointsVisible;
        if (layerOpened) setPointsVisible(true);
        const metadata = createHeritageMarkerMetadata(point);
        stillRestricted = Boolean(
          metadata &&
            metadata.protectionLevelCode !== -1 &&
            !activeProtectionLevels.has(metadata.protectionLevelCode),
        );
        setSelectedHeritage(buildHeritageCardData(point));
        selectedHeritageMarkerMetadataRef.current = metadata;
        selectedLngLatRef.current = gcjPosition;

        const xy = getPixelXY(map.lngLatToContainer(gcjPosition));
        setCardPosition(xy ?? { left: 320, top: 220 });
        setAnchorPos(xy);

        const container = containerRef.current;
        setCardBounds(
          container
            ? { width: container.clientWidth, height: container.clientHeight }
            : null,
        );
        infoWindowSelectionRef.current = null;
        infoWindowRef.current?.close();
      } else {
        if (item.kind === "area") {
          layerOpened = !areasVisible;
          if (layerOpened) setAreasVisible(true);
        } else if (item.kind === "national-heritage") {
          layerOpened = !nhVisible;
          if (layerOpened) setNhVisible(true);
        } else if (item.kind === "ich") {
          layerOpened = !nmhVisible;
          if (layerOpened) setNmhVisible(true);
        } else if (item.kind === "mingren") {
          layerOpened = !mingrenVisible;
          if (layerOpened) setMingrenVisible(true);
        } else if (item.kind === "fang") {
          layerOpened = !fangVisible;
          if (layerOpened) setFangVisible(true);
        }
        closeHeritageCard();
        infoWindowSelectionRef.current = { source: "other" };
        infoWindowRef.current?.setContent(buildSearchInfoHtml(item));
        infoWindowRef.current?.open(
          map,
          new AMapLib.LngLat(gcjPosition[0], gcjPosition[1]),
        );
      }

      if (layerOpened) {
        feedbackParts.push(`已开启${SEARCH_LAYER_NAMES[item.kind]}主图层`);
      }
      if (stillRestricted) {
        feedbackParts.push("对象仍受当前文保等级筛选限制");
      }
      if (timeChanged) {
        feedbackParts.push(`历史地图图层开关保持${histMapVisibleRef.current ? "开启" : "关闭"}`);
      }

      const shouldShowFeedback =
        timeChanged || temporalDecision?.kind === "invalid" || layerOpened || stillRestricted;
      setSearchFeedback(shouldShowFeedback ? `${feedbackParts.join("；")}。` : null);
      return true;
    },
    [
      activeProtectionLevels,
      areasVisible,
      closeHeritageCard,
      fangVisible,
      heritagePoints,
      mingrenVisible,
      nhVisible,
      nmhVisible,
      pointsVisible,
    ],
  );

  useEffect(() => {
    const onMapSearchSelect = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isMapSearchItem(detail)) return;

      if (!locateSearchResult(detail)) {
        pendingSearchRef.current = detail;
      } else {
        pendingSearchRef.current = null;
      }
    };

    window.addEventListener(MAP_SEARCH_SELECT_EVENT, onMapSearchSelect);
    return () =>
      window.removeEventListener(MAP_SEARCH_SELECT_EVENT, onMapSearchSelect);
  }, [locateSearchResult]);

  useEffect(() => {
    const pending = pendingSearchRef.current;
    if (pending && locateSearchResult(pending)) {
      pendingSearchRef.current = null;
    }
  }, [heritagePoints, locateSearchResult]);

  function handleTogglePublicDialogue(visible: boolean) {
    setPublicDialogueVisible(visible);
    if (!visible) setActiveDialoguePid(null);
  }

  function handleToggleMemoryAlbum(visible: boolean) {
    setMemoryAlbumVisible(visible);
    if (!visible) setActiveMemoryAlbum(null);
  }

  function handleTemporalSelectionChange(selection: TemporalSelection) {
    const overviewMapId = getOverviewHistoricalMap(mapMetaRef.current)?.id ?? null;
    temporalSelectionRef.current = selection;
    setTemporalSelection(selection);
    setSelectedHistoricalMapId(
      getHistoricalMapIdForTemporalSelection(selection, overviewMapId),
    );
  }

  function handleHistoricalMapSelect(mapPoint: HistoricalMapPoint) {
    if (!getHistoricalMapById(mapMetaRef.current, mapPoint.id)) return;
    temporalSelectionRef.current = { mode: "year", year: mapPoint.year };
    histMapVisibleRef.current = true;
    setTemporalSelection({ mode: "year", year: mapPoint.year });
    setSelectedHistoricalMapId(mapPoint.id);
    setHistMapVisible(true);
  }

  function handleHistMapVisibilityChange(visible: boolean) {
    histMapVisibilityTouchedRef.current = true;
    histMapVisibleRef.current = visible;
    setHistMapVisible(visible);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadMemoryAlbumIndex() {
      try {
        const response = await fetch("/data/memory-albums/index.json", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Memory album index request failed: ${response.status}`);
        }
        const index = parseMemoryAlbumIndex(await response.json());
        setMemoryAlbums(
          new Map(index.albums.map((album) => [album.primaryPid, album])),
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Failed to load memory album index:", error);
        setMemoryAlbums(new Map());
      }
    }

    loadMemoryAlbumIndex();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedHeritage) return;

    const syncSelectedCardToViewport = () => {
      const map = mapRef.current;
      const container = containerRef.current;
      const selectedLngLat = selectedLngLatRef.current;

      if (container) {
        setCardBounds({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
      if (map && selectedLngLat) {
        const xy = getPixelXY(map.lngLatToContainer(selectedLngLat));
        if (xy) {
          setCardPosition(xy);
          setAnchorPos(xy);
        }
      }
    };

    window.addEventListener("resize", syncSelectedCardToViewport);
    return () => window.removeEventListener("resize", syncSelectedCardToViewport);
  }, [selectedHeritage]);

  useEffect(() => {
    let isMounted = true;
    const visibleNationalHeritageIndexes = nhVisibleIndexesRef.current;
    const visibleNmhIndexes = nmhVisibleIndexesRef.current;
    const areaHighlightTimeouts = areaHighlightTimeoutsRef.current;
    const fangHighlightTimeouts = fangHighlightTimeoutsRef.current;

    async function initAMap() {
      if (typeof window === "undefined") return;
      if (!containerRef.current || mapRef.current) return;

      const key = process.env.NEXT_PUBLIC_AMAP_KEY;
      const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

      if (!key) {
        console.error("Missing NEXT_PUBLIC_AMAP_KEY in .env.local");
        return;
      }

      if (securityCode) {
        window._AMapSecurityConfig = {
          securityJsCode: securityCode,
        };
      }

      try {
        const AMapLoader = (await import("@amap/amap-jsapi-loader")).default;

        const AMapLib = (await AMapLoader.load({
          key,
          version: "2.0",
          plugins: ["AMap.Scale", "AMap.ToolBar"],
        })) as AMapLibrary;

        if (!isMounted || !containerRef.current) return;

        const map = new AMapLib.Map(containerRef.current, {
          viewMode: "2D",
          zoom: 11,
          // 初始中心为 WGS84（西安），高德使用 GCJ-02，转换后传入。
          center: wgs84ToGcj02(108.9398, 34.3416),
          mapStyle: mapStyle,
        });

        map.addControl(new AMapLib.Scale());
        map.addControl(new AMapLib.ToolBar());

        mapRef.current = map;
        amapLibRef.current = AMapLib;
        infoWindowRef.current = new AMapLib.InfoWindow({
          offset: new AMapLib.Pixel(0, -8),
        });

        // 地图平移/缩放时，重投影选中遗产点的容器坐标，保持连线锚点跟随点位
        const updateAnchorPos = () => {
          const ll = selectedLngLatRef.current;
          if (!ll) return;
          const xy = getPixelXY(map.lngLatToContainer(ll));
          if (xy) setAnchorPos(xy);
        };
        map.on("mapmove", updateAnchorPos);
        map.on("zoomchange", updateAnchorPos);

        await loadHistoricalMaps();
        await loadHistoricAreas(AMapLib, map);
        await loadHeritagePoints(AMapLib, map);
        await loadMemoryDialogueIndex();
      } catch (error) {
        console.error("Failed to initialize AMap:", error);
      }
    }

    async function loadMemoryDialogueIndex() {
      try {
        const res = await fetch("/data/memory-dialogues/index.json");
        const json = (await res.json()) as {
          version?: number;
          dialogues?: MemoryDialogueIndexEntry[];
        };

        if (!res.ok || json.version !== 1 || !Array.isArray(json.dialogues)) {
          throw new Error("Invalid memory dialogue index");
        }

        if (!isMounted) return;

        setMemoryDialogues(
          new Map(json.dialogues.map((dialogue) => [dialogue.pid, dialogue])),
        );
      } catch (error) {
        console.warn("Failed to load memory dialogue index:", error);
      }
    }

    async function loadHistoricalMaps() {
      try {
        const metaRes = await fetch("/data/map-metadata.json");
        const metaList = parseMapMetadata(await metaRes.json());

        mapMetaRef.current = metaList;
        setHistoricalMapPoints(getHistoricalMapPoints(metaList));

        const overviewMap = getOverviewHistoricalMap(metaList);
        if (overviewMap) {
          const opacity = overviewMap.default_opacity ?? INITIAL_HIST_MAP_OPACITY;
          const selectedMapId = getHistoricalMapIdForTemporalSelection(
            temporalSelectionRef.current,
            overviewMap.id,
          );
          const initialVisibility = histMapVisibilityTouchedRef.current
            ? histMapVisibleRef.current
            : true;
          histMapVisibleRef.current = initialVisibility;
          setHistMapVisible(initialVisibility);
          setHistMapOpacity(opacity);
          setSelectedHistoricalMapId(selectedMapId);
        } else {
          setHistMapVisible(false);
          setSelectedHistoricalMapId(null);
        }
      } catch (error) {
        console.error("Failed to load historical maps:", error);
        setHistMapVisible(false);
        setSelectedHistoricalMapId(null);
        setHistoricalMapPoints([]);
      }
    }

    async function loadHistoricAreas(AMapLib: AMapLibrary, map: AMapInstance) {
      try {
        const areaRes = await fetch("/api/historic-areas");
        const areaJson = await areaRes.json();

        if (!areaJson.success || !areaJson.data) {
          throw new Error("Invalid historic areas response");
        }

        const geojson = areaJson.data as GeoJsonFeatureCollection;
        const polygons: AMapEventTarget[] = [];
        const labels: Array<{
          marker: AMapEventTarget;
          metadata: HistoricAreaPolygonMetadata;
        }> = [];
        const featuresWithPaths = (geojson.features ?? []).map((feature) => {
          const geometry = feature.geometry;
          return {
            properties: (feature.properties ?? {}) as HistoricAreaTemporalProperties,
            polygonPaths:
              geometry.type === "Polygon"
                ? [polygonRingsToPath(geometry.coordinates)]
                : geometry.coordinates.map((rings) => polygonRingsToPath(rings)),
          };
        });
        const descriptors = createHistoricAreaPolygonDescriptors(
          featuresWithPaths,
          (path) => path.length === 0,
        );

        for (const feature of featuresWithPaths) {
          const validPaths = feature.polygonPaths.filter((path) => path.length > 0);
          const position = getHistoricAreaLabelPosition(validPaths);
          const name = getTextProperty(feature.properties, "area_name", "未命名区域");
          const metadata = descriptors.find(
            (descriptor) => descriptor.properties === feature.properties,
          )?.metadata;
          if (!position || !metadata) continue;

          const marker = new AMapLib.Marker({
            position,
            content: createHistoricAreaLabelHtml(name),
            anchor: "center",
            offset: new AMapLib.Pixel(0, 0),
            zIndex: HISTORIC_AREA_LABEL_Z_INDEX,
            cursor: "default",
          });
          labels.push({ marker, metadata });
        }

        for (const { path, properties, metadata } of descriptors) {
          const polygon = new AMapLib.Polygon({
            path,
            ...HISTORIC_AREA_STYLE,
            cursor: "pointer",
            zIndex: 20,
          });

          polygon.on("click", (event) => {
            const clickPosition = getLngLatTuple(event.lnglat);
            const selectedDescriptor = clickPosition
              ? descriptors
                  .filter(
                    (descriptor) =>
                      isHistoricAreaVisible(
                        descriptor.metadata,
                        historicAreaFilterStateRef.current,
                      ) && isPointInPolygon(clickPosition, descriptor.path),
                  )
                  .reduce<typeof descriptors[number] | null>((selected, candidate) => {
                    if (!selected) return candidate;
                    const selectedArea = getPolygonCentroid(selected.path)?.area ?? Infinity;
                    const candidateArea = getPolygonCentroid(candidate.path)?.area ?? Infinity;
                    return candidateArea < selectedArea ? candidate : selected;
                  }, null)
              : null;
            const selectedProperties = selectedDescriptor?.properties ?? properties;
            const selectedMetadata = selectedDescriptor?.metadata ?? metadata;
            const featurePolygons = areaPolygonsRef.current.filter(
              (_, index) => areaPolygonMetadataRef.current[index] === selectedMetadata,
            );
            for (const featurePolygon of featurePolygons) {
              const existingTimeout =
                areaHighlightTimeoutsRef.current.get(featurePolygon);
              if (existingTimeout !== undefined) clearTimeout(existingTimeout);
              featurePolygon.setOptions?.(HISTORIC_AREA_HIGHLIGHT_STYLE);
              const timeout = setTimeout(() => {
                featurePolygon.setOptions?.(HISTORIC_AREA_STYLE);
                areaHighlightTimeoutsRef.current.delete(featurePolygon);
              }, HISTORIC_AREA_HIGHLIGHT_DURATION_MS);
              areaHighlightTimeoutsRef.current.set(featurePolygon, timeout);
            }

            infoWindowSelectionRef.current = {
              source: "historic-area",
              metadata: selectedMetadata,
            };
            infoWindowRef.current?.setContent(
              buildHistoricAreaInfoHtml(selectedProperties),
            );
            infoWindowRef.current?.open(map, event.lnglat);
          });

          polygons.push(polygon);
        }

        map.add(polygons);
        if (labels.length > 0) map.add(labels.map(({ marker }) => marker));
        areaPolygonsRef.current = polygons;
        areaPolygonMetadataRef.current = descriptors.map(
          ({ metadata }) => metadata,
        );
        areaLabelMarkersRef.current = labels;
        applyHistoricAreaVisibilityRef.current();
      } catch (error) {
        console.error("Failed to load historic areas:", error);
      }
    }

    async function loadHeritagePoints(
      AMapLib: AMapLibrary,
      map: AMapInstance,
    ) {
      try {
        const res = await fetch("/api/heritage-points");
        const json = await res.json();

        if (!json.success || !json.data) {
          throw new Error("Invalid heritage points response");
        }

        const points = json.data as HeritagePointApi[];
        setHeritagePoints(points);
        const markers: AMapEventTarget[] = [];
        const labelMarkers: AMapEventTarget[] = [];
        const levelCodes: number[] = [];
        const markerMetadata: HeritageMarkerMetadata[] = [];
        const discussionMarkers: HeritageAccessoryMarker[] = [];

        for (const point of points) {
          const metadata = createHeritageMarkerMetadata(point);
          if (!metadata) continue;

          // 数据为 WGS84，高德使用 GCJ-02，显示前转换；
          // 卡片锚点 / lngLatToContainer 复用同一 GCJ-02 坐标，保持一致。
          const gcjPosition = wgs84ToGcj02(point.lng, point.lat);

          const marker = new AMapLib.Marker({
            position: gcjPosition,
            content: createHeritageMarkerHtml(point.heritage_type, point.pid),
            anchor: "center",
            offset: new AMapLib.Pixel(0, 0),
            zIndex: 100,
            cursor: "pointer",
          });

          marker.on("click", () => {
            setActiveDialoguePid(null);
            setActiveMemoryAlbum(null);
            setSelectedHeritage(buildHeritageCardData(point));
            selectedHeritageMarkerMetadataRef.current = metadata;

            const pixel = map.lngLatToContainer(gcjPosition);
            const xy = getPixelXY(pixel);
            setCardPosition(xy ?? { left: 320, top: 220 });
            selectedLngLatRef.current = gcjPosition;
            setAnchorPos(xy);

            const container = containerRef.current;
            setCardBounds(
              container
                ? {
                    width: container.clientWidth,
                    height: container.clientHeight,
                  }
                : null,
            );

            infoWindowSelectionRef.current = null;
            infoWindowRef.current?.close();
          });

          markers.push(marker);

          // 名称标签 Marker：置于图标上方，默认隐藏，由 showHeritageLabels 控制
          const pointName = point.point_name ?? "";
          if (pointName) {
            const labelMarker = new AMapLib.Marker({
              position: gcjPosition,
              content: createHeritageLabelHtml(pointName),
              anchor: "bottom-center",
              // 标签底部在图标上方约 16px 处
              offset: new AMapLib.Pixel(0, -28),
              // 99：西安文保点属最高优先级图层，标签仅次于自身图标(100)，
              // 高于唐代名人故居(95)。
              zIndex: 99,
              cursor: "default",
            });
            labelMarker.hide();
            labelMarkers.push(labelMarker);
          } else {
            // 与 markers 数组保持一一对应，无名称时填占位
            labelMarkers.push(null as unknown as AMapEventTarget);
          }

          // 记录该点的保护等级编码，用于筛选
          levelCodes.push(metadata.protectionLevelCode);
          markerMetadata.push(metadata);

          const discussionConfig = point.pid
            ? DISCUSSION_MARKERS[point.pid]
            : undefined;
          if (point.pid && discussionConfig) {
            const discussionMarker = new AMapLib.Marker({
              position: gcjPosition,
              content: createDiscussionMarkerHtml(point.pid, discussionConfig.label),
              anchor: "bottom-center",
              // 图标底部悬在原始遗产点上方，避免覆盖原点的点击热区。
              offset: new AMapLib.Pixel(0, MEMORY_CONTEXT_MARKER_OFFSET_Y),
              zIndex: 130,
              cursor: "pointer",
            });

            discussionMarker.hide();
            discussionMarker.on("click", () => {
              setActiveMemoryAlbum(null);
              closeHeritageCardRef.current();
              setActiveDialoguePid(point.pid);
              infoWindowSelectionRef.current = null;
              infoWindowRef.current?.close();
            });
            discussionMarkers.push({
              pid: point.pid,
              marker: discussionMarker,
              metadata,
            });
          }
        }

        map.add(markers);
        const validLabelMarkers = labelMarkers.filter(
          (m): m is AMapEventTarget => m !== null,
        );
        if (validLabelMarkers.length > 0) map.add(validLabelMarkers);
        if (discussionMarkers.length > 0) {
          map.add(discussionMarkers.map(({ marker }) => marker));
        }
        pointMarkersRef.current = markers;
        heritageLabelMarkersRef.current = labelMarkers;
        heritageLevelCodesRef.current = levelCodes;
        heritageMarkerMetadataRef.current = markerMetadata;
        discussionMarkersRef.current = discussionMarkers;
        applyHeritageVisibilityRef.current();
      } catch (error) {
        console.error("Failed to load heritage points:", error);
      }
    }

    initAMap();

    return () => {
      isMounted = false;

      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }

      pointMarkersRef.current = [];
      heritageLabelMarkersRef.current = [];
      heritageLevelCodesRef.current = [];
      heritageMarkerMetadataRef.current = [];
      selectedHeritageMarkerMetadataRef.current = null;
      discussionMarkersRef.current = [];
      memoryAlbumMarkersRef.current = [];
      areaPolygonsRef.current = [];
      areaPolygonMetadataRef.current = [];
      areaLabelMarkersRef.current = [];
      for (const timeout of areaHighlightTimeouts.values()) {
        clearTimeout(timeout);
      }
      areaHighlightTimeouts.clear();
      cancelUiFrame(nhVisibilityRequestFrameRef.current);
      cancelUiFrame(nhVisibilityUpdateFrameRef.current);
      nhVisibilityRequestFrameRef.current = null;
      nhVisibilityUpdateFrameRef.current = null;
      nhVisibilityRevisionRef.current += 1;
      visibleNationalHeritageIndexes.clear();
      nhMarkersRef.current = [];
      nhPointDataRef.current = [];
      nhMarkerMetadataRef.current = [];
      cancelUiFrame(nmhVisibilityRequestFrameRef.current);
      cancelUiFrame(nmhVisibilityUpdateFrameRef.current);
      nmhVisibilityRequestFrameRef.current = null;
      nmhVisibilityUpdateFrameRef.current = null;
      nmhVisibilityRevisionRef.current += 1;
      visibleNmhIndexes.clear();
      nmhMarkersRef.current = [];
      nmhPointDataRef.current = [];
      nmhMarkerMetadataRef.current = [];
      ichLinesRef.current = [];
      nhLoadPromiseRef.current = null;
      nmhLoadPromiseRef.current = null;
      fangPolygonsRef.current = [];
      fangPolygonPropertiesRef.current = [];
      fangLabelMarkersRef.current = [];
      for (const timeout of fangHighlightTimeouts.values()) {
        clearTimeout(timeout);
      }
      fangHighlightTimeouts.clear();
      mingrenMarkersRef.current = [];
      fangLoadPromiseRef.current = null;
      mingrenLoadPromiseRef.current = null;
      bndPolygonsRef.current = { province: [], city: [], district: [] };
      bndLoadPromiseRef.current = {};
      histMapLayersRef.current = {};
      mapMetaRef.current = [];
      infoWindowRef.current = null;
      infoWindowSelectionRef.current = null;
      pendingSearchRef.current = null;
    };
  }, []);

  useEffect(() => {
    applyHeritageVisibility();
  }, [
    pointsVisible,
    activeProtectionLevels,
    showHeritageLabels,
    temporalSelection,
    applyHeritageVisibility,
  ]);

  useEffect(() => {
    if (memoryAlbumMarkersRef.current.length > 0) return;

    const AMapLib = amapLibRef.current;
    const map = mapRef.current;
    if (!AMapLib || !map || heritagePoints.length === 0 || memoryAlbums.size === 0) {
      return;
    }

    const pointsByPid = new Map(
      heritagePoints
        .filter(
          (point): point is HeritagePointApi & { pid: string } =>
            Boolean(point.pid) && Number.isFinite(point.lng) && Number.isFinite(point.lat),
        )
        .map((point) => [point.pid, point]),
    );
    const markers: HeritageAccessoryMarker[] = [];

    for (const album of memoryAlbums.values()) {
      const point = pointsByPid.get(album.primaryPid);
      if (!point) continue;

      const label = `${album.primaryName.replace(/遗址$/, "")}记忆`;
      const marker = new AMapLib.Marker({
        position: wgs84ToGcj02(point.lng, point.lat),
        content: createMemoryAlbumMarkerHtml(album.primaryPid, label),
        anchor: "bottom-center",
        // 图标底部悬在原始遗产点上方，避免覆盖原点的点击热区。
        offset: new AMapLib.Pixel(0, MEMORY_CONTEXT_MARKER_OFFSET_Y),
        zIndex: 135,
        cursor: "pointer",
      });

      marker.hide();
      marker.on("click", () => {
        setActiveDialoguePid(null);
        closeHeritageCardRef.current();
        setActiveMemoryAlbum(album);
        infoWindowSelectionRef.current = null;
        infoWindowRef.current?.close();
      });
      const metadata = createHeritageMarkerMetadata(point);
      if (!metadata) continue;
      markers.push({ pid: album.primaryPid, marker, metadata });
    }

    if (markers.length > 0) map.add(markers.map(({ marker }) => marker));
    memoryAlbumMarkersRef.current = markers;
    applyHeritageVisibilityRef.current();
  }, [heritagePoints, memoryAlbums]);

  useEffect(() => {
    applyHistoricAreaVisibility();
  }, [areasVisible, temporalSelection, applyHistoricAreaVisibility]);

  // 全国文保单位图层：首次开启时懒加载；所有显隐条件走同一 latest-state 路径。
  useEffect(() => {
    applyNationalHeritageVisibilityRef.current();
    if (!nhVisible) return;

    let cancelled = false;

    ensureNhMarkers()
      .then(() => {
        if (cancelled) return;
        applyNationalHeritageVisibilityRef.current();
      })
      .catch((error) => {
        console.error("Failed to load national heritage points:", error);
      });

    return () => {
      cancelled = true;
    };
    // ensureNhMarkers 由 refs 读取地图与 latest-state；依赖其函数身份会在每次渲染重载图层。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nhVisible, temporalSelection]);

  // 国家级非遗项目图层：仅在勾选后加载，之后按缩放和视口差分显隐。
  useEffect(() => {
    applyNmhVisibilityRef.current();
    if (!nmhVisible) {
      for (const line of ichLinesRef.current) line.hide();
      return;
    }

    let cancelled = false;
    ensureNmhMarkers()
      .then(() => {
        if (cancelled) return;
        applyNmhVisibilityRef.current();
        requestUiFrame(() => {
          if (nmhVisibleRef.current) loadAndRenderIchLines();
        });
      })
      .catch((error) => {
        console.error("Failed to load ICH points:", error);
      });

    return () => {
      cancelled = true;
    };
    // ensureNmhMarkers 由 refs 读取地图与 latest-state；依赖其函数身份会在每次渲染重载图层。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nmhVisible]);

  // 唐 108 坊图层：勾选时懒加载（首次），之后仅切换显隐。
  useEffect(() => {
    let cancelled = false;

    ensureFangPolygons()
      .then((polygons) => {
        if (cancelled) return;
        for (const polygon of polygons) {
          if (fangVisible) polygon.show();
          else polygon.hide();
        }
        for (const label of fangLabelMarkersRef.current) {
          if (fangVisible) label.marker.show();
          else label.marker.hide();
        }
      })
      .catch((error) => {
        console.error("Failed to load Tang fang areas:", error);
      });

    return () => {
      cancelled = true;
    };
    // ensureFangPolygons 由 refs 读取地图并自行缓存；依赖其函数身份会在每次渲染重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fangVisible]);

  // 唐代人物专题：首次开启时懒加载，之后仅由图层开关控制显隐。
  useEffect(() => {
    applyMingrenVisibility();
    if (!mingrenVisible) return;

    let cancelled = false;

    ensureMingrenMarkers()
      .then(() => {
        if (cancelled) return;
        applyMingrenVisibilityRef.current();
      })
      .catch((error) => {
        console.error("Failed to load Fang mingren points:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [mingrenVisible, applyMingrenVisibility]);

  // 行政边界图层（省 / 市 / 区县）：勾选时懒加载（首次），之后仅切换显隐。
  useEffect(() => {
    let cancelled = false;

    ensureBndPolygons("province")
      .then((polygons) => {
        if (cancelled) return;
        for (const polygon of polygons) {
          if (bndProvinceVisible) polygon.show();
          else polygon.hide();
        }
      })
      .catch((error) => {
        console.error("Failed to load province boundaries:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [bndProvinceVisible]);

  useEffect(() => {
    let cancelled = false;

    ensureBndPolygons("city")
      .then((polygons) => {
        if (cancelled) return;
        for (const polygon of polygons) {
          if (bndCityVisible) polygon.show();
          else polygon.hide();
        }
      })
      .catch((error) => {
        console.error("Failed to load city boundaries:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [bndCityVisible]);

  useEffect(() => {
    let cancelled = false;

    ensureBndPolygons("district")
      .then((polygons) => {
        if (cancelled) return;
        for (const polygon of polygons) {
          if (bndDistrictVisible) polygon.show();
          else polygon.hide();
        }
      })
      .catch((error) => {
        console.error("Failed to load district boundaries:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [bndDistrictVisible]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMapStyle(mapStyle);
    }
  }, [mapStyle]);

  useEffect(() => {
    const metaList = mapMetaRef.current;
    const layers = histMapLayersRef.current;

    if (metaList.length === 0) return;

    const currentMap = getHistoricalMapById(metaList, selectedHistoricalMapId);

    if (!currentMap) {
      for (const layer of Object.values(layers)) {
        layer?.hide?.();
      }
      return;
    }

    // 先隐藏已创建的其他历史图层，只保留当前具体地图。
    for (const [layerId, layer] of Object.entries(layers)) {
      if (layerId !== currentMap.id) layer?.hide?.();
    }

    if (!histMapVisible) {
      layers[currentMap.id]?.hide?.();
      return;
    }

    const currentLayer = ensureHistMapLayer(currentMap);
    if (!currentLayer) return;

    setTileLayerOpacity(currentLayer, histMapOpacity);
    currentLayer.show();
  }, [histMapVisible, histMapOpacity, selectedHistoricalMapId]);

  return (
    // 定位上下文：所有绝对定位覆盖层（图层控制 / 时间轴 / 信息卡 / 记忆面板）
    // 都以这个与地图容器等尺寸的 wrapper 为参照，
    // 与 map.lngLatToContainer() 返回的容器坐标系保持一致。
    <div
      onMouseDownCapture={handleVisibilityControlMouseDown}
      onMouseUpCapture={resetHeritageCardOutsideCloseSuppression}
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh - var(--header-h, 56px))",
      }}
    >
      {/* 地图容器建立独立层叠上下文（zIndex: 0），将 Marker（zIndex 88–135）
          约束在地图内部，避免其覆盖 zIndex 20 的 UI 控件导致控件不可点。 */}
      <div
        ref={containerRef}
        data-testid="map-container"
        style={{ position: "relative", zIndex: 0, width: "100%", height: "100%" }}
      />

      <LayerControl
        pointsVisible={pointsVisible}
        areasVisible={areasVisible}
        fangVisible={fangVisible}
        mingrenVisible={mingrenVisible}
        histMapVisible={histMapVisible}
        nhVisible={nhVisible}
        nmhVisible={nmhVisible}
        bndProvinceVisible={bndProvinceVisible}
        bndCityVisible={bndCityVisible}
        bndDistrictVisible={bndDistrictVisible}
        wordCloudVisible={wordCloudVisible}
        publicDialogueVisible={publicDialogueVisible}
        memoryAlbumVisible={memoryAlbumVisible}
        histMapOpacity={histMapOpacity}
        onTogglePoints={setPointsVisible}
        onToggleAreas={setAreasVisible}
        onToggleFang={setFangVisible}
        onToggleMingren={setMingrenVisible}
        onToggleHistMap={handleHistMapVisibilityChange}
        onToggleNh={setNhVisible}
        onToggleNmh={setNmhVisible}
        onToggleBndProvince={setBndProvinceVisible}
        onToggleBndCity={setBndCityVisible}
        onToggleBndDistrict={setBndDistrictVisible}
        onToggleWordCloud={setWordCloudVisible}
        onTogglePublicDialogue={handleTogglePublicDialogue}
        onToggleMemoryAlbum={handleToggleMemoryAlbum}
        onHistMapOpacity={setHistMapOpacity}
      />

      <MapStyleSelector
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      <MapLegend
        pointsVisible={pointsVisible}
        nhVisible={nhVisible}
        nmhVisible={nmhVisible}
        showHeritageLabels={showHeritageLabels}
        onToggleHeritageLabels={setShowHeritageLabels}
        activeProtectionLevels={activeProtectionLevels}
        onToggleProtectionLevel={(level: number) => {
          setActiveProtectionLevels((prev) => {
            const next = new Set(prev);
            if (next.has(level)) next.delete(level);
            else next.add(level);
            return next;
          });
        }}
      />
      {/* 词云图层：公众印象关键词气泡 */}
      <WordCloudLayer
        points={visibleHeritagePoints}
        visible={wordCloudVisible}
        map={mapRef.current}
        amapLib={amapLibRef.current}
      />

      {selectedHeritage && (
        <HeritageCard
          heritage={selectedHeritage}
          onClose={handleHeritageCardClose}
          position={cardPosition}
          bounds={cardBounds}
          anchor={anchorPos}
        />
      )}

      {activeMemoryAlbum && (
        <MemoryAlbumPanel
          file={activeMemoryAlbum.file}
          expectedPid={activeMemoryAlbum.primaryPid}
          onClose={() => setActiveMemoryAlbum(null)}
        />
      )}

      {publicDialogueVisible &&
        activeDialoguePid &&
        memoryDialogues.has(activeDialoguePid) && (
          <MemoryPanel
            title={
              DISCUSSION_MARKERS[activeDialoguePid]?.groupTitle ??
              memoryDialogues.get(activeDialoguePid)?.panelTitle ??
              "讨论群"
            }
            file={memoryDialogues.get(activeDialoguePid)?.file ?? ""}
            onClose={() => setActiveDialoguePid(null)}
          />
        )}

      {searchFeedback && (
        <div
          role="status"
          aria-live="polite"
          data-testid="search-feedback"
          className={styles.searchFeedback}
        >
          {searchFeedback}
        </div>
      )}

      <TimelineBar
        selection={temporalSelection}
        onSelectionChange={handleTemporalSelectionChange}
        historicalMaps={historicalMapPoints}
        selectedHistoricalMapId={selectedHistoricalMapId}
        onHistoricalMapSelect={handleHistoricalMapSelect}
      />
    </div>
  );
}
