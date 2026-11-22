"use client";

import Image from "next/image";
import { getCoverImageUrl } from "@/lib/image";
import { useEffect, useRef, useState } from "react";

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

type Props = {
  heritage: HeritageCardData;
  onClose: () => void;
  // 动态定位：若传入则在点击位置附近显示，否则回退到右上角
  position?: { left: number; top: number } | null;
  // 定位参照容器（地图容器）的尺寸，用于夹取；缺省时回退到视窗尺寸
  bounds?: { width: number; height: number } | null;
  // 遗产点的容器像素坐标，用于绘制卡片与点位之间的淡连线
  anchor?: { left: number; top: number } | null;
};

export default function HeritageCard({
  heritage,
  onClose,
  position,
  bounds,
  anchor,
}: Props) {
  const fallbackImage = getCoverImageUrl(null);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const requestedImageSrc = heritage.image || fallbackImage;
  const imageSrc =
    failedImageSrc === requestedImageSrc ? fallbackImage : requestedImageSrc;

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState({ width: 340, height: 420 });
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [introExpanded, setIntroExpanded] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  // 动态计算位置：优先使用传入的点击位置，默认右上角
  const cardWidth = 340;
  const margin = 16;

  const boundsWidth =
    bounds?.width ?? (typeof window !== "undefined" ? window.innerWidth : 900);
  const boundsHeight =
    bounds?.height ?? (typeof window !== "undefined" ? window.innerHeight : 600);

  // 实测卡片尺寸（heritage 变化后重新测量）
  useEffect(() => {
    if (cardRef.current) {
      setCardSize({
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
      });
    }
  }, [heritage]);

  // 点击新遗产点时重置拖动偏移。
  // 采用 React 官方推荐的“渲染期调整状态”模式（props 变化 → 重置派生状态），
  // 避免在 effect 内同步 setState 造成级联渲染（react-hooks/set-state-in-effect）。
  const [prevPosition, setPrevPosition] = useState(position);
  if (prevPosition !== position) {
    setPrevPosition(position);
    setDragDelta({ x: 0, y: 0 });
  }

  const heritageIdentity = heritage.pid ?? heritage.name;
  const [prevHeritageIdentity, setPrevHeritageIdentity] = useState(heritageIdentity);
  if (prevHeritageIdentity !== heritageIdentity) {
    setPrevHeritageIdentity(heritageIdentity);
    setIntroExpanded(false);
  }

  const hasLongIntro = heritage.description.length > 90;
  const displayedIntro =
    hasLongIntro && !introExpanded
      ? `${heritage.description.slice(0, 90)}...`
      : heritage.description;

  // 基础位置（未拖动时），统一换算为 left/top 以便叠加拖动偏移
  const baseLeft = position
    ? Math.min(
        Math.max(position.left + 20, margin),
        Math.max(boundsWidth - cardWidth - margin, margin),
      )
    : Math.max(boundsWidth - cardWidth - 24, margin);
  const baseTop = position
    ? Math.min(
        Math.max(position.top - 40, 60),
        Math.max(boundsHeight - cardSize.height - margin, margin),
      )
    : 60;

  // 应用拖动偏移并夹取在边界内
  const left = Math.min(
    Math.max(baseLeft + dragDelta.x, margin),
    Math.max(boundsWidth - cardWidth - margin, margin),
  );
  const top = Math.min(
    Math.max(baseTop + dragDelta.y, margin),
    Math.max(boundsHeight - cardSize.height - margin, margin),
  );

  // 拖动：document 级 move/up 监听（仅 dragging 时挂载）
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const start = dragRef.current;
      if (!start) return;
      setDragDelta({
        x: start.baseX + (e.clientX - start.startX),
        y: start.baseY + (e.clientY - start.startY),
      });
    };
    const onUp = () => setDragging(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // 封面图作为拖动把手
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: dragDelta.x,
      baseY: dragDelta.y,
    };
    setDragging(true);
  };

  // 点击卡片外部空白处关闭；位移 >6px 视为地图拖动，不关闭
  useEffect(() => {
    let downX = 0;
    let downY = 0;

    const onDown = (e: MouseEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      if (cardRef.current?.contains(e.target as Node)) return;
      onClose();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onClose]);

  // 连线端点：anchor → 卡片矩形最近边界点
  let line: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (anchor) {
    const endX = Math.min(Math.max(anchor.left, left), left + cardWidth);
    const endY = Math.min(Math.max(anchor.top, top), top + cardSize.height);
    line = { x1: anchor.left, y1: anchor.top, x2: endX, y2: endY };
  }

  return (
    <>
      {/* 卡片与遗产点之间的淡连线 */}
      {anchor && line && (
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 34,
          }}
        >
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(194, 93, 69, 0.58)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <circle
            cx={line.x1}
            cy={line.y1}
            r={3.5}
            fill="rgba(194, 93, 69, 0.68)"
            stroke="#fffaf0"
            strokeWidth={1.5}
          />
        </svg>
      )}

      <div
        ref={cardRef}
        style={{
          position: "absolute",
          left,
          top,
          width: cardWidth,
          background: "rgba(255, 253, 247, 0.98)",
          borderRadius: 14,
          boxShadow: "0 10px 34px rgba(40, 57, 48, 0.18)",
          // 高于时间轴 / 图层控件（20）和底图选择器（30），确保窄屏下卡片可操作；
          // 仍低于 Navbar（40）和 MemoryAlbumPanel（50）。
          zIndex: 35,
          overflow: "hidden",
          border: "1px solid var(--color-border-soft)",
        }}
      >
        {/* 封面图（拖动把手） */}
        <div
          onMouseDown={handleDragStart}
          style={{
            width: "100%",
            height: 160,
            overflow: "hidden",
            position: "relative",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          <Image
            src={imageSrc}
            alt={heritage.name}
            fill
            sizes="340px"
            draggable={false}
            style={{
              objectFit: "cover",
            }}
            onError={() => setFailedImageSrc(requestedImageSrc)}
            unoptimized
          />

          {/* 右上角关闭按钮 */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            aria-label="关闭"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(23, 59, 49, 0.68)",
              color: "#fffaf0",
              fontSize: 16,
              lineHeight: "28px",
              textAlign: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* 内容区域 */}
        <div style={{ padding: "14px 16px 16px" }}>
          {/* 名称 */}
          <h3
            style={{
              margin: "0 0 4px",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--foreground)",
              lineHeight: 1.3,
            }}
          >
            {heritage.name}
          </h3>

          {/* 类型 */}
          <p style={{ margin: "0 0 4px", color: "var(--color-blue)", fontSize: 13 }}>
            {heritage.category}
          </p>

          {/* 时代 | 区县 */}
          <p style={{ margin: "0 0 4px", color: "var(--color-umber)", fontSize: 12 }}>
            {heritage.period}
            {heritage.district ? ` ｜ ${heritage.district}` : ""}
          </p>

          {/* 所属区域 */}
          {heritage.area_name && (
            <p style={{ margin: "0 0 4px", color: "#484949", fontSize: 12 }}>
              所属区域：{heritage.area_name}
            </p>
          )}

          {/* 保护级别 */}
          <p style={{ margin: "0 0 8px", color: "#694020", fontSize: 12 }}>
            {heritage.level}
          </p>

          {/* 简介 */}
          <div
            onWheel={(event) => event.stopPropagation()}
            style={{
              margin: "0 0 10px",
              maxHeight: introExpanded ? 220 : "none",
              overflowY: introExpanded ? "auto" : "visible",
              paddingRight: introExpanded ? 6 : 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#394c44",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {displayedIntro || "暂无简介"}
            </p>

            {hasLongIntro && (
              <button
                type="button"
                aria-expanded={introExpanded}
                onClick={() => setIntroExpanded((expanded) => !expanded)}
                style={{
                  marginTop: 6,
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  color: "var(--color-blue)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {introExpanded ? "收起" : "展开全文"}
              </button>
            )}
          </div>

          {/* 地址 */}
          {heritage.address && (
            <p style={{ margin: "0 0 12px", color: "rgba(122, 128, 124, 0.72)", fontSize: 11 }}>
              地址：{heritage.address}
            </p>
          )}
        </div>
      </div>
    </>
  );
}