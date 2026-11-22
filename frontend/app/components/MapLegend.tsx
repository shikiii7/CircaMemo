"use client";

import { useState } from "react";
import { HERITAGE_TYPE_ICONS } from "@/lib/heritageIcons";
import { NATIONAL_HERITAGE_TYPES } from "@/lib/nationalHeritageTypes";
import { ICH_COLOR_MAP } from "@/lib/ichConstants";

type Props = {
  pointsVisible: boolean;
  nhVisible: boolean;
  nmhVisible: boolean;
  showHeritageLabels: boolean;
  onToggleHeritageLabels: (v: boolean) => void;
  activeProtectionLevels: Set<number>;
  onToggleProtectionLevel: (level: number) => void;
};

/**
 * 西安市文保点保护级别定义。
 * protection_level 字段格式为 "编码-等级名称"（如 "1-全国重点文物保护单位"），
 * 此处按编码 1→5 对应 国家→省→市→区县→优秀近现代建筑。
 */
const PROTECTION_LEVELS: { code: number; label: string }[] = [
  { code: 1, label: "国家级" },
  { code: 2, label: "省级" },
  { code: 3, label: "市级" },
  { code: 4, label: "区县级" },
  { code: 5, label: "优秀近现代建筑" },
];

export default function MapLegend({
  pointsVisible,
  nhVisible,
  nmhVisible,
  showHeritageLabels,
  onToggleHeritageLabels,
  activeProtectionLevels,
  onToggleProtectionLevel,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {/* 折叠/展开按钮（置于上方，内容在其下展开） */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "var(--color-paper-translucent)",
          backdropFilter: "blur(6px)",
          cursor: "pointer",
          boxShadow: "0 4px 14px var(--color-shadow)",
          fontSize: 12,
          color: "var(--foreground)",
          fontWeight: 600,
        }}
      >
        <span>图例</span>
        <span
          style={{
            fontSize: 10,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </button>

      {/* 展开后的图例内容（仅在展开且至少有一个图层勾选时渲染） */}
      {expanded && (pointsVisible || nhVisible || nmhVisible) && (
        <div
          style={{
            background: "var(--color-paper-translucent)",
            backdropFilter: "blur(6px)",
            borderRadius: 10,
            padding: "12px 14px",
            width: 252,
            maxWidth: "calc(100vw - 40px)",
            boxSizing: "border-box",
            boxShadow: "0 6px 20px var(--color-shadow)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* 西安市文保点类型（仅勾选该图层时显示） */}
          {pointsVisible && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-blue)",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                西安市文保点类型
              </div>
              {HERITAGE_TYPE_ICONS.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundImage: `url(${item.iconSrc})`,
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      flexShrink: 0,
                      filter: "drop-shadow(0 1px 2px rgba(25, 38, 31, 0.25))",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--foreground)",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* 全国文保点类型（仅勾选该图层时显示） */}
          {nhVisible && (
            <>
              {pointsVisible && (
                <div
                  style={{
                    borderTop: "1px solid var(--color-border-soft)",
                    margin: "4px 0",
                  }}
                />
              )}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-blue)",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                全国文保点类型
              </div>
              {NATIONAL_HERITAGE_TYPES.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      background: item.color,
                      border: "1.5px solid #fffdf7",
                      borderRadius: 2,
                      transform: "rotate(45deg)",
                      opacity: 0.82,
                      flexShrink: 0,
                      boxShadow: "0 1px 2px rgba(60,30,10,0.25)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--foreground)",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* 全国非遗项目类型（仅勾选该图层时显示） */}
          {nmhVisible && (
            <>
              {(pointsVisible || nhVisible) && (
                <div
                  style={{
                    borderTop: "1px solid var(--color-border-soft)",
                    margin: "4px 0",
                  }}
                />
              )}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-blue)",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                全国非遗项目类型
              </div>
              {Object.entries(ICH_COLOR_MAP).map(([category, color]) => (
                <div
                  key={category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: color,
                      border: "1.5px solid #000",
                      flexShrink: 0,
                      boxShadow: "0 1px 2px rgba(60,30,10,0.25)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--foreground)",
                      lineHeight: 1.35,
                    }}
                  >
                    {category}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* 分隔线 + 等级筛选区域（仅在文保点图层开启时显示） */}
          {pointsVisible && (
            <>
              <div
                style={{
                  borderTop: "1px solid var(--color-border-soft)",
                  margin: "4px 0",
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-blue)",
                  letterSpacing: "0.05em",
                  marginBottom: 2,
                }}
              >
                西安市文保点等级
              </div>

              {/* 第一行：遗产点名称标签图面显示开关 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onToggleHeritageLabels(!showHeritageLabels)}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--foreground)",
                    flex: 1,
                  }}
                >
                  名称
                </span>
                {/* Toggle switch */}
                <span
                  role="switch"
                  aria-checked={showHeritageLabels}
                  style={{
                    position: "relative",
                    width: 34,
                    height: 18,
                    borderRadius: 9,
                    background: showHeritageLabels
                      ? "var(--color-blue)"
                      : "rgba(151, 105, 55, 0.28)",
                    transition: "background 0.2s",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: showHeritageLabels ? 18 : 2,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#fffdf7",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      transition: "left 0.2s",
                    }}
                  />
                </span>
              </div>

              {/* 下方：文物等级筛选复选框，按 国家-省-市-区县 顺序 */}
              {PROTECTION_LEVELS.map((lvl) => (
                <label
                  key={lvl.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeProtectionLevels.has(lvl.code)}
                    onChange={() => onToggleProtectionLevel(lvl.code)}
                    style={{ cursor: "pointer", margin: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--foreground)",
                      flex: 1,
                    }}
                  >
                    {lvl.label}
                  </span>
                </label>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  );
}
