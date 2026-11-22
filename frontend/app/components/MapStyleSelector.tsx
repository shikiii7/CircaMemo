"use client";

import { useState } from "react";

type MapStyle = {
  id: string;
  label: string;
  thumbnail: string;
};

const MAP_STYLES: MapStyle[] = [
  { id: "amap://styles/whitesmoke", label: "远山黛", thumbnail: "whitesmoke" },
  { id: "amap://styles/dark", label: "幻影黑", thumbnail: "dark" },
  { id: "amap://styles/normal", label: "标准", thumbnail: "normal" },
];

type Props = {
  currentStyle: string;
  onStyleChange: (style: string) => void;
};

/* ---------- 缩略图：从实际高德底图截取 ---------- */

function MapThumbnail({ styleId }: { styleId: string }) {
  const style = MAP_STYLES.find((s) => s.id === styleId);
  const thumb = style?.thumbnail ?? "normal";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/basemap-thumbs/${thumb}.png`}
      alt={style?.label ?? ""}
      width={48}
      height={32}
      style={{
        borderRadius: 4,
        border: "1px solid rgba(0,0,0,0.12)",
        display: "block",
        objectFit: "cover",
      }}
    />
  );
}

export default function MapStyleSelector({ currentStyle, onStyleChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const current = MAP_STYLES.find((s) => s.id === currentStyle) || MAP_STYLES[0];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 80,
        // 高于 TimelineBar（zIndex 20）：向左展开的选项会越过时间轴右缘，
        // 需保证选项在其上方可点。
        zIndex: 30,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* 展开后的选项列表（排在当前按钮左侧，实现向左展开） */}
      {expanded && (
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "var(--color-paper-translucent)",
            backdropFilter: "blur(6px)",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 6px 20px var(--color-shadow)",
            border: "1px solid var(--color-border)",
          }}
        >
          {MAP_STYLES.filter((s) => s.id !== currentStyle).map((style) => (
            <button
              key={style.id}
              onClick={() => {
                onStyleChange(style.id);
                setExpanded(false);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: 6,
                border: "1px solid var(--color-border-soft)",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.72)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {/* 缩略图：迷你地图示意 */}
              <MapThumbnail styleId={style.id} />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--foreground)",
                  whiteSpace: "nowrap",
                }}
              >
                {style.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 当前选中项（始终显示） */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: 6,
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "var(--color-paper-translucent)",
          backdropFilter: "blur(6px)",
          cursor: "pointer",
          boxShadow: "0 4px 14px var(--color-shadow)",
        }}
      >
        <MapThumbnail styleId={current.id} />
        <span
          style={{
            fontSize: 11,
            color: "var(--foreground)",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {current.label}
        </span>
      </button>
    </div>
  );
}