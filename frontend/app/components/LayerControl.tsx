"use client";

import { useState } from "react";
import OpacitySlider from "./OpacitySlider";
import styles from "./LayerControl.module.css";

type Props = {
  pointsVisible: boolean;
  areasVisible: boolean;
  fangVisible: boolean;
  mingrenVisible: boolean;
  histMapVisible: boolean;
  nhVisible: boolean;
  nmhVisible: boolean;
  bndProvinceVisible: boolean;
  bndCityVisible: boolean;
  bndDistrictVisible: boolean;
  wordCloudVisible: boolean;
  publicDialogueVisible: boolean;
  memoryAlbumVisible: boolean;
  histMapOpacity: number;
  onTogglePoints: (v: boolean) => void;
  onToggleAreas: (v: boolean) => void;
  onToggleFang: (v: boolean) => void;
  onToggleMingren: (v: boolean) => void;
  onToggleHistMap: (v: boolean) => void;
  onToggleNh: (v: boolean) => void;
  onToggleNmh: (v: boolean) => void;
  onToggleBndProvince: (v: boolean) => void;
  onToggleBndCity: (v: boolean) => void;
  onToggleBndDistrict: (v: boolean) => void;
  onToggleWordCloud: (v: boolean) => void;
  onTogglePublicDialogue: (v: boolean) => void;
  onToggleMemoryAlbum: (v: boolean) => void;
  onHistMapOpacity: (v: number) => void;
};

type LayerRowProps = {
  color: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function LayerRow({ color, label, checked, onChange }: LayerRowProps) {
  return (
    <label
      className={styles.layerRow}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          opacity: checked ? 1 : 0.35,
        }}
      />
      <span
        style={{
          fontSize: 13,
          color: checked ? "var(--foreground)" : "rgba(23, 59, 49, 0.52)",
          flex: 1,
        }}
      >
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: "pointer", margin: 0 }}
      />
    </label>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--color-blue)",
        letterSpacing: "0.05em",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

const dividerStyle = {
  borderTop: "1px solid var(--color-border-soft)",
  margin: "8px 0",
};

const layerListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
} as const;

export default function LayerControl({
  pointsVisible,
  areasVisible,
  fangVisible,
  mingrenVisible,
  histMapVisible,
  nhVisible,
  nmhVisible,
  bndProvinceVisible,
  bndCityVisible,
  bndDistrictVisible,
  wordCloudVisible,
  publicDialogueVisible,
  memoryAlbumVisible,
  histMapOpacity,
  onTogglePoints,
  onToggleAreas,
  onToggleFang,
  onToggleMingren,
  onToggleHistMap,
  onToggleNh,
  onToggleNmh,
  onToggleBndProvince,
  onToggleBndCity,
  onToggleBndDistrict,
  onToggleWordCloud,
  onTogglePublicDialogue,
  onToggleMemoryAlbum,
  onHistMapOpacity,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const collapseAfterPublicLayerOpens = (visible: boolean) => {
    if (visible && window.matchMedia("(max-width: 700px)").matches) {
      setCollapsed(true);
    }
  };

  if (collapsed) {
    return (
      <section aria-label="图层控制" className={`${styles.panel} ${styles.collapsedPanel}`}>
        <button
          type="button"
          className={styles.expandButton}
          aria-expanded="false"
          aria-label="展开图层控制"
          onClick={() => setCollapsed(false)}
        >
          图层控制
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="图层控制"
      className={styles.panel}
    >
      <div className={styles.heading}>
        图层控制
      </div>

      <div data-testid="layer-options" className={styles.options} tabIndex={0} aria-label="图层选项">
        {/* 第一块：西安数据 */}
        <SectionTitle>西安数据</SectionTitle>
        <div data-testid="xian-layer-list" style={layerListStyle}>
          <LayerRow
            color="#b8543e"
            label="西安市文保点"
            checked={pointsVisible}
            onChange={onTogglePoints}
          />
          <LayerRow
            color="#6b8f71"
            label="历史区域"
            checked={areasVisible}
            onChange={onToggleAreas}
          />
          <LayerRow
            color="#c6934c"
            label="唐108坊"
            checked={fangVisible}
            onChange={onToggleFang}
          />
          <LayerRow
            color="#4a7a8c"
            label="唐代名人故居"
            checked={mingrenVisible}
            onChange={onToggleMingren}
          />
          <LayerRow
            color="#c9a227"
            label="历史地图"
            checked={histMapVisible}
            onChange={onToggleHistMap}
          />
        </div>

        <div style={dividerStyle} />

        {/* 第二块：全国数据（默认不显示） */}
        <SectionTitle>全国数据</SectionTitle>
        <div data-testid="national-layer-list" style={layerListStyle}>
          <LayerRow
            color="#E63946"
            label="全国重点文保单位"
            checked={nhVisible}
            onChange={onToggleNh}
          />
          <LayerRow
            color="#e0592a"
            label="国家级非遗项目"
            checked={nmhVisible}
            onChange={onToggleNmh}
          />
        </div>

        <div style={dividerStyle} />

        {/* 第三块：行政边界数据（默认不显示） */}
        <SectionTitle>行政边界数据</SectionTitle>
        <div data-testid="boundary-layer-list" style={layerListStyle}>
          <LayerRow
            color="#2d4a3e"
            label="省级边界"
            checked={bndProvinceVisible}
            onChange={onToggleBndProvince}
          />
          <LayerRow
            color="#4a6b5e"
            label="市级边界"
            checked={bndCityVisible}
            onChange={onToggleBndCity}
          />
          <LayerRow
            color="#6b8f7e"
            label="区县边界"
            checked={bndDistrictVisible}
            onChange={onToggleBndDistrict}
          />
        </div>

        <div style={{ ...dividerStyle, marginBottom: 0, paddingTop: 10 }}>
          <OpacitySlider
            label="不透明"
            value={histMapOpacity}
            onChange={onHistMapOpacity}
            disabled={!histMapVisible}
          />
        </div>
      </div>

      {/* 公众评价控制固定在面板底部，不随上方图层列表滚动。 */}
      <div className={styles.publicControls}>
        <SectionTitle>公众评价</SectionTitle>
        <div className={styles.publicGrid}>
          <button
            type="button"
            aria-pressed={wordCloudVisible}
            title={wordCloudVisible ? "隐藏公众印象" : "显示公众印象"}
            onClick={() => {
              const visible = !wordCloudVisible;
              onToggleWordCloud(visible);
              collapseAfterPublicLayerOpens(visible);
            }}
            className={styles.publicButton}
            style={{
              height: 30,
              borderRadius: 7,
              border: `1px solid ${
                wordCloudVisible ? "rgba(208, 165, 42, 0.82)" : "var(--color-border-soft)"
              }`,
              background: wordCloudVisible ? "rgba(208, 165, 42, 0.2)" : "rgba(255, 255, 255, 0.32)",
              color: wordCloudVisible ? "#755a0d" : "var(--color-text-muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            印象
          </button>
          <button
            type="button"
            aria-pressed={publicDialogueVisible}
            title={publicDialogueVisible ? "隐藏公众讨论入口" : "显示公众讨论入口"}
            onClick={() => {
              const visible = !publicDialogueVisible;
              onTogglePublicDialogue(visible);
              collapseAfterPublicLayerOpens(visible);
            }}
            className={styles.publicButton}
            style={{
              height: 30,
              borderRadius: 7,
              border: `1px solid ${
                publicDialogueVisible
                  ? "rgba(194, 93, 69, 0.72)"
                  : "var(--color-border-soft)"
              }`,
              background: publicDialogueVisible ? "rgba(194, 93, 69, 0.14)" : "rgba(255, 255, 255, 0.32)",
              color: publicDialogueVisible ? "#99422f" : "var(--color-text-muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            讨论
          </button>
          <button
            type="button"
            aria-pressed={memoryAlbumVisible}
            title={memoryAlbumVisible ? "隐藏城市记忆入口" : "显示城市记忆入口"}
            onClick={() => {
              const visible = !memoryAlbumVisible;
              onToggleMemoryAlbum(visible);
              collapseAfterPublicLayerOpens(visible);
            }}
            className={styles.publicButton}
            style={{
              height: 30,
              borderRadius: 7,
              border: `1px solid ${
                memoryAlbumVisible
                  ? "rgba(53, 117, 140, 0.78)"
                  : "var(--color-border-soft)"
              }`,
              background: memoryAlbumVisible
                ? "rgba(53, 117, 140, 0.16)"
                : "rgba(255, 255, 255, 0.32)",
              color: memoryAlbumVisible ? "#28677e" : "var(--color-text-muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            记忆
          </button>
        </div>
      </div>
    </section>
  );
}