"use client";

import { useEffect, useRef, useState } from "react";
import { wgs84ToGcj02 } from "@/lib/geo";

type KeywordItem = { word: string; weight: number };
type HeritageKeywords = Record<
  string,
  {
    name: string;
    keywords: KeywordItem[];
    source: "public_impression" | "topic_fallback" | "none";
  }
>;
type PopularityRecord = { name: string; rank: number; score: number };
type PopularityData = { records: PopularityRecord[] };
type Point = { point_name: string; lng: number; lat: number };
type Props = { points: Point[]; visible: boolean; map: unknown; amapLib: unknown };
type DisplayTier = {
  key: string;
  maxPoints: number | null;
  onlyWithSignal: boolean;
  wordCount: 3 | 4 | 5;
};
type StickerColor = { background: string; foreground: string };

const DISPLAY_TIERS: DisplayTier[] = [
  { key: "top-8", maxPoints: 8, onlyWithSignal: true, wordCount: 3 },
  { key: "top-16", maxPoints: 16, onlyWithSignal: true, wordCount: 3 },
  { key: "top-32", maxPoints: 32, onlyWithSignal: true, wordCount: 3 },
  { key: "top-64", maxPoints: 64, onlyWithSignal: true, wordCount: 4 },
  { key: "all-signals", maxPoints: null, onlyWithSignal: true, wordCount: 4 },
  { key: "all-keywords", maxPoints: null, onlyWithSignal: false, wordCount: 5 },
];

const STICKER_COLORS: StickerColor[] = [
  { background: "#1557e8", foreground: "#ffffff" },
  { background: "#ec3d98", foreground: "#ffffff" },
  { background: "#ffc52f", foreground: "#161616" },
  { background: "#55b66f", foreground: "#102516" },
  { background: "#6541d8", foreground: "#ffffff" },
  { background: "#111111", foreground: "#ffffff" },
  { background: "#ff6a38", foreground: "#17110e" },
];

function getDisplayTier(zoom: number): DisplayTier {
  if (zoom < 10) return DISPLAY_TIERS[0];
  if (zoom < 11) return DISPLAY_TIERS[1];
  if (zoom < 12) return DISPLAY_TIERS[2];
  if (zoom < 13) return DISPLAY_TIERS[3];
  if (zoom < 14) return DISPLAY_TIERS[4];
  return DISPLAY_TIERS[5];
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getClusterSize(wordCount: number): { width: number; height: number } {
  if (wordCount <= 3) return { width: 126, height: 78 };
  if (wordCount === 4) return { width: 142, height: 92 };
  return { width: 156, height: 104 };
}

function weightToFontSize(weight: number, index: number): number {
  const weightedSize = 11 + Math.max(0, Math.min(weight, 1)) * 7;
  return Math.round(weightedSize - Math.min(index, 3) * 0.7);
}

function createStickerHtml(
  keyword: KeywordItem,
  index: number,
  pointSeed: number,
): string {
  const color = STICKER_COLORS[(pointSeed + index * 3) % STICKER_COLORS.length];
  const rotation = [-4, 2, -2, 4, 0][(pointSeed + index) % 5];
  const verticalShift = [0, 3, -2, 2, -1][(pointSeed + index * 2) % 5];
  const radii = [
    "18px 20px 17px 19px",
    "20px 14px 19px 16px",
    "15px 20px 16px 19px",
  ];
  const radius = radii[(pointSeed + index) % radii.length];
  const fontSize = weightToFontSize(keyword.weight, index);
  const fontWeight = index === 0 || keyword.weight >= 0.72 ? 800 : 700;
  const horizontalPadding = index === 0 ? 12 : 9;

  return `
    <span data-word-cloud-keyword="${escapeHtml(keyword.word)}" style="
      position:relative;display:inline-flex;align-items:center;justify-content:center;
      max-width:138px;min-height:${index === 0 ? 30 : 25}px;
      padding:${index === 0 ? 5 : 3}px ${horizontalPadding}px;
      border-radius:${radius};background:${color.background};color:${color.foreground};
      border:1.5px solid rgba(255,255,255,0.82);
      box-shadow:0 3px 0 rgba(18,18,18,0.18),0 6px 12px rgba(18,18,18,0.13);
      box-sizing:border-box;font-size:${fontSize}px;font-weight:${fontWeight};line-height:1;
      letter-spacing:-0.02em;white-space:nowrap;
      transform:translateY(${verticalShift}px) rotate(${rotation}deg);
    ">
      ${escapeHtml(keyword.word)}
      ${
        index === 0
          ? `<i style="position:absolute;right:13px;bottom:-7px;width:0;height:0;border-left:7px solid transparent;border-top:9px solid ${color.background};transform:rotate(-10deg);"></i>`
          : ""
      }
    </span>
  `;
}

function createClusterHtml(
  pointName: string,
  keywords: KeywordItem[],
  wordCount: number,
  tierKey: string,
  keywordSource: string,
  popularity: PopularityRecord | undefined,
): { html: string; height: number } {
  const words = keywords.slice(0, wordCount);
  const { width, height } = getClusterSize(words.length);
  const pointSeed = stableHash(pointName);
  const stickers = words
    .map((keyword, index) => createStickerHtml(keyword, index, pointSeed))
    .join("");

  return {
    height,
    html: `
      <div data-word-cloud-cluster="true" data-heritage-name="${escapeHtml(pointName)}"
        data-display-tier="${tierKey}" data-popularity-rank="${popularity?.rank ?? ""}"
        data-popularity-score="${popularity?.score ?? 0}" data-keyword-source="${keywordSource}" style="
          position:relative;width:${width}px;height:${height}px;display:flex;flex-wrap:wrap;
          align-content:center;align-items:center;justify-content:center;gap:3px 2px;padding:5px;
          box-sizing:border-box;overflow:visible;filter:saturate(0.96);pointer-events:none;
          font-family:'Microsoft YaHei','Noto Sans SC',sans-serif;
        ">
        ${stickers}
        <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);width:2px;height:20px;border-radius:2px;background:rgba(34,35,37,0.58);"></div>
        <div style="position:absolute;bottom:-25px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:#18191b;border:1px solid rgba(255,255,255,0.92);box-shadow:0 1px 3px rgba(0,0,0,0.28);box-sizing:border-box;"></div>
      </div>
    `,
  };
}

export default function WordCloudLayer({ points, visible, map, amapLib }: Props) {
  const markersRef = useRef<unknown[]>([]);
  const [keywordsMap, setKeywordsMap] = useState<Record<string, KeywordItem[]>>(
    {},
  );
  const [popularityMap, setPopularityMap] = useState<
    Record<string, PopularityRecord>
  >({});
  const [keywordSourceMap, setKeywordSourceMap] = useState<Record<string, string>>(
    {},
  );
  const [loaded, setLoaded] = useState(false);
  const [displayTier, setDisplayTier] = useState<DisplayTier>(() =>
    getDisplayTier(11),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [keywordsResponse, popularityResponse] = await Promise.all([
          fetch("/data/heritage_display_keywords.json"),
          fetch("/data/heritage_popularity.json"),
        ]);
        if (!keywordsResponse.ok || !popularityResponse.ok) {
          throw new Error("Keyword or popularity data request failed");
        }
        const keywordData: HeritageKeywords = await keywordsResponse.json();
        const popularityData: PopularityData = await popularityResponse.json();
        if (cancelled) return;

        const nextKeywordsMap: Record<string, KeywordItem[]> = {};
        const nextKeywordSourceMap: Record<string, string> = {};
        for (const entry of Object.values(keywordData)) {
          if (entry.keywords?.length > 0) nextKeywordsMap[entry.name] = entry.keywords;
          nextKeywordSourceMap[entry.name] = entry.source;
        }
        const nextPopularityMap: Record<string, PopularityRecord> = {};
        for (const record of popularityData.records) {
          nextPopularityMap[record.name] = record;
        }
        setKeywordsMap(nextKeywordsMap);
        setKeywordSourceMap(nextKeywordSourceMap);
        setPopularityMap(nextPopularityMap);
        setLoaded(true);
      } catch (error) {
        console.error("Failed to load heritage word-cloud data:", error);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const mapInstance = map as {
      getZoom: () => number;
      on: (event: string, handler: () => void) => void;
      off: (event: string, handler: () => void) => void;
    };
    const syncTier = () => {
      const nextTier = getDisplayTier(mapInstance.getZoom());
      setDisplayTier((currentTier) =>
        currentTier.key === nextTier.key ? currentTier : nextTier,
      );
    };
    mapInstance.on("zoomend", syncTier);
    const initialZoomFrame = window.requestAnimationFrame(syncTier);
    return () => {
      window.cancelAnimationFrame(initialZoomFrame);
      mapInstance.off("zoomend", syncTier);
    };
  }, [map]);

  useEffect(() => {
    if (!loaded || !map || !amapLib) return;
    const AMap = amapLib as {
      Marker: new (opts: Record<string, unknown>) => {
        setMap: (nextMap: unknown) => void;
      };
      Pixel: new (x: number, y: number) => unknown;
    };

    for (const marker of markersRef.current) {
      (marker as { setMap: (nextMap: unknown) => void }).setMap(null);
    }
    markersRef.current = [];
    if (!visible) return;

    const candidates = points
      .filter((point) => keywordsMap[point.point_name]?.length > 0)
      .map((point) => ({ point, popularity: popularityMap[point.point_name] }))
      .filter(
        ({ popularity }) =>
          !displayTier.onlyWithSignal || (popularity?.score ?? 0) > 0,
      )
      .sort((left, right) => {
        const scoreDifference =
          (right.popularity?.score ?? 0) - (left.popularity?.score ?? 0);
        if (scoreDifference !== 0) return scoreDifference;
        return left.point.point_name.localeCompare(right.point.point_name, "zh-CN");
      });
    const visibleCandidates =
      displayTier.maxPoints === null
        ? candidates
        : candidates.slice(0, displayTier.maxPoints);

    for (const { point, popularity } of visibleCandidates) {
      const cluster = createClusterHtml(
        point.point_name,
        keywordsMap[point.point_name],
        displayTier.wordCount,
        displayTier.key,
        keywordSourceMap[point.point_name] ?? "topic_fallback",
        popularity,
      );
      const marker = new AMap.Marker({
        position: wgs84ToGcj02(point.lng, point.lat),
        content: cluster.html,
        anchor: "center",
        offset: new AMap.Pixel(0, -(cluster.height / 2 + 25)),
        zIndex: 110,
        clickable: false,
        bubble: true,
      });
      marker.setMap(map);
      markersRef.current.push(marker);
    }

    return () => {
      for (const marker of markersRef.current) {
        (marker as { setMap: (nextMap: unknown) => void }).setMap(null);
      }
      markersRef.current = [];
    };
  }, [
    visible,
    loaded,
    points,
    keywordsMap,
    popularityMap,
    keywordSourceMap,
    map,
    amapLib,
    displayTier,
  ]);

  return null;
}