"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gcj02ToWgs84, wgs84ToGcj02 } from "@/lib/geo";
import type { HeritageOption } from "@/lib/heritageOption";
import { findNearestHeritagePoint, formatDistance } from "@/lib/heritageMapPicker";
import styles from "./account.module.css";

/** 点击地图空白处时，最多吸附到 800 米内的文保点。 */
const NEAREST_RADIUS_METERS = 800;
const XI_AN_CENTER: [number, number] = [108.9398, 34.3416];

type AmapLngLat = { getLng(): number; getLat(): number };

type AmapMarkerInstance = {
  on(event: "click", handler: () => void): void;
  setContent(content: string): void;
  setzIndex(zIndex: number): void;
  setMap(map: AmapMapInstance | null): void;
};

type AmapMapInstance = {
  on(event: "click", handler: (event: { lnglat: AmapLngLat }) => void): void;
  add(targets: unknown): void;
  remove(targets: unknown): void;
  setCenter(position: [number, number]): void;
  setZoom(zoom: number): void;
  setZoomAndCenter?(zoom: number, center: [number, number]): void;
  resize?(): void;
  getZoom(): number;
  destroy(): void;
};

function focusPoint(map: AmapMapInstance, position: [number, number], zoom: number) {
  if (typeof map.setZoomAndCenter === "function") {
    // 一次性设置缩放与中心，避免先 setCenter 再 setZoom 造成的视图偏移。
    map.setZoomAndCenter(zoom, position);
    return;
  }
  map.setZoom(zoom);
  map.setCenter(position);
}

type AmapLibrary = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AmapMapInstance;
  Marker: new (options: Record<string, unknown>) => AmapMarkerInstance;
  Pixel: new (x: number, y: number) => unknown;
};

type MarkerEntry = {
  option: HeritageOption;
  marker: AmapMarkerInstance;
};

function markerHtml(active: boolean): string {
  return `<span class="${active ? `${styles.mapDot} ${styles.mapDotActive}` : styles.mapDot}"></span>`;
}

export default function HeritageMapPicker({
  points,
  selectedPid,
  onPick,
  onClose,
}: {
  points: HeritageOption[];
  selectedPid: string | null;
  onPick: (option: HeritageOption) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<HeritageOption | null>(() => {
    if (!selectedPid) return null;
    return points.find((point) => point.pid === selectedPid) ?? null;
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>(
    "点击地图上的圆点选择文保点，或点击空白处自动吸附到最近的文保点。",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AmapMapInstance | null>(null);
  const entriesRef = useRef<MarkerEntry[]>([]);
  const activePidRef = useRef<string | null>(selected?.pid ?? null);
  const lastMarkerClickRef = useRef(0);
  const selectRef = useRef<(option: HeritageOption, distance?: number) => void>(() => {});

  const applySelection = useCallback(
    (option: HeritageOption, distance?: number) => {
      const previousPid = activePidRef.current;
      activePidRef.current = option.pid;

      for (const entry of entriesRef.current) {
        if (entry.option.pid === option.pid) {
          entry.marker.setContent(markerHtml(true));
          entry.marker.setzIndex(120);
        } else if (entry.option.pid === previousPid) {
          entry.marker.setContent(markerHtml(false));
          entry.marker.setzIndex(10);
        }
      }

      setSelected(option);
      setMessage(
        distance === undefined
          ? `已选择「${option.name}」，点击下方按钮确认。`
          : `已吸附到最近的文保点「${option.name}」，距离约 ${formatDistance(distance)}。`,
      );
      // 选点后不强行移动地图：用户刚点的位置就在眼前，跳转反而会丢失上下文。
    },
    [],
  );

  useEffect(() => {
    selectRef.current = applySelection;
  }, [applySelection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      const key = process.env.NEXT_PUBLIC_AMAP_KEY;
      if (!key) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("未配置高德地图 Key，请改用上方输入框搜索选择。");
        }
        return;
      }

      const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;
      if (securityCode) {
        window._AMapSecurityConfig = { securityJsCode: securityCode };
      }

      try {
        const AMapLoader = (await import("@amap/amap-jsapi-loader")).default;
        const lib = (await AMapLoader.load({
          key,
          version: "2.0",
        })) as unknown as AmapLibrary;

        if (cancelled || !containerRef.current) return;

        const map = new lib.Map(containerRef.current, {
          viewMode: "2D",
          zoom: 11,
          center: wgs84ToGcj02(XI_AN_CENTER[0], XI_AN_CENTER[1]),
        });
        mapRef.current = map;

        const entries: MarkerEntry[] = [];
        for (const option of points) {
          if (option.lng === null || option.lat === null) continue;
          if (!Number.isFinite(option.lng) || !Number.isFinite(option.lat)) continue;

          const marker = new lib.Marker({
            position: wgs84ToGcj02(option.lng, option.lat),
            content: markerHtml(option.pid === activePidRef.current),
            offset: new lib.Pixel(-5, -5),
            title: option.name,
            zIndex: option.pid === activePidRef.current ? 120 : 10,
            cursor: "pointer",
          });
          marker.on("click", () => {
            lastMarkerClickRef.current = Date.now();
            selectRef.current(option);
          });
          map.add(marker);
          entries.push({ option, marker });
        }
        entriesRef.current = entries;

        // 标记点击会同时冒泡到地图，用时间戳避免随后触发一次「吸附最近点」把选择改掉。
        map.on("click", (event) => {
          if (Date.now() - lastMarkerClickRef.current < 300) return;
          const [lng, lat] = gcj02ToWgs84(
            event.lnglat.getLng(),
            event.lnglat.getLat(),
          );
          const nearest = findNearestHeritagePoint(
            points,
            { lng, lat },
            NEAREST_RADIUS_METERS,
          );
          if (!nearest) {
            setMessage(
              `这里 ${formatDistance(NEAREST_RADIUS_METERS)}内没有文保点，请点击已有圆点选择。`,
            );
            return;
          }
          selectRef.current(nearest.point, nearest.distance);
        });

        const initial = entries.find((entry) => entry.option.pid === activePidRef.current);
        if (initial && initial.option.lng !== null && initial.option.lat !== null) {
          focusPoint(map, wgs84ToGcj02(initial.option.lng, initial.option.lat), 14);
        }

        // 弹窗内地图容器的高度在首帧后会变化，地图需要 resize() 才能拿到正确尺寸，
        // 否则 setZoomAndCenter 会按旧高度居中，选中点看起来偏离中心。
        const container = containerRef.current;
        const resize = () => {
          map.resize?.();
        };
        if (container && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(container);
        }
        requestAnimationFrame(() => {
          resize();
          if (initial && initial.option.lng !== null && initial.option.lat !== null) {
            focusPoint(map, wgs84ToGcj02(initial.option.lng, initial.option.lat), 14);
          }
          if (!cancelled) setStatus("ready");
        });
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("地图加载失败，请改用上方输入框搜索选择。");
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      const map = mapRef.current;
      entriesRef.current = [];
      mapRef.current = null;
      if (map) map.destroy();
    };
  }, [points]);

  return (
    <div
      className={styles.mapOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="在地图上选择文保点"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.mapDialog}>
        <div className={styles.mapDialogHead}>
          <div>
            <h2 className={styles.cardTitle}>在地图上选择文保点</h2>
            <p className={styles.hint}>
              共 {points.length} 处文保点，圆点为可选项。点击空白处会吸附到 800 米内最近的一处。
            </p>
          </div>
          <button
            type="button"
            className={styles.mapClose}
            onClick={onClose}
            aria-label="关闭地图选点"
          >
            ×
          </button>
        </div>

        <div className={styles.mapCanvasWrap}>
          <div className={styles.mapCanvas} ref={containerRef} />
          {status !== "ready" && (
            <div className={styles.mapCanvasState}>
              {status === "loading" ? "地图加载中…" : errorMessage}
            </div>
          )}
        </div>

        <div className={styles.mapDialogFoot}>
          <div className={styles.mapSelection}>
            {selected ? (
              <>
                <strong>{selected.name}</strong>
                <span className={styles.tag}>{selected.pid}</span>
                {selected.district && <span className={styles.tag}>{selected.district}</span>}
                {selected.category && <span className={styles.tag}>{selected.category}</span>}
              </>
            ) : (
              <span className={styles.hint}>尚未选择文保点</span>
            )}
            <span className={styles.hint}>{message}</span>
          </div>
          <div className={styles.mapActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonGhost}`}
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={!selected || status !== "ready"}
              onClick={() => {
                if (selected) onPick(selected);
              }}
            >
              使用这个文保点
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
