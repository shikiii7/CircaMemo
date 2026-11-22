/**
 * 全国重点文物保护单位（processed.p1_nh）按文物类型分色配置。
 *
 * 形状统一使用菱形（diamond），与西安市文保点的 SVG 图标和非遗点的圆形
 * 形成视觉区分；色系为暖色谱（红-橙-棕-金），为未来非遗点切换冷色系预留
 * 冷暖对比空间。
 *
 * 数据来源：processed.p1_nh.type_nh 字段，实际分布（约 5198 条）：
 *   古建筑 2205 / 古遗址 1204 / 近现代重要史迹及代表性建筑 1021 /
 *   古墓葬 422 / 石窟寺及石刻 316 / 其他 30
 */

export type NationalHeritageTypeDefinition = {
  /** 数据库 type_nh 字段原始值 */
  type: string;
  /** 图例显示名称 */
  label: string;
  /** 暖色系十六进制颜色 */
  color: string;
};

export const NATIONAL_HERITAGE_TYPES: readonly NationalHeritageTypeDefinition[] = [
  {
    type: "古建筑",
    label: "古建筑",
    color: "#E63946",
  },
  {
    type: "古遗址",
    label: "古遗址",
    color: "#F9C74F",
  },
  {
    type: "近现代重要史迹及代表性建筑",
    label: "近现代重要史迹及代表性建筑",
    color: "#F472B6",
  },
  {
    type: "古墓葬",
    label: "古墓葬",
    color: "#FB923C",
  },
  {
    type: "石窟寺及石刻",
    label: "石窟寺及石刻",
    color: "#BE123C",
  },
  {
    type: "其他",
    label: "其他",
    color: "#FDA4AF",
  },
] as const;

const DEFAULT_NATIONAL_TYPE =
  NATIONAL_HERITAGE_TYPES[NATIONAL_HERITAGE_TYPES.length - 1];

const NATIONAL_TYPE_BY_NAME = new Map(
  NATIONAL_HERITAGE_TYPES.map((def) => [def.type, def]),
);

/**
 * 根据 type_nh 原始值获取类型定义，未知/空值回退到"其他"。
 */
export function getNationalHeritageType(
  typeNh: string | null | undefined,
): NationalHeritageTypeDefinition {
  const normalized = typeNh?.trim();
  return (
    (normalized && NATIONAL_TYPE_BY_NAME.get(normalized)) ||
    DEFAULT_NATIONAL_TYPE
  );
}

/**
 * 生成菱形 Marker 的 HTML 字符串。
 *
 * 菱形通过正方形 + CSS rotate(45deg) 实现，外框为暖白色描边，
 * 中心锚点对齐，与非遗圆形点明确区分。
 *
 * @param typeNh  数据库 type_nh 字段值
 * @param size    菱形边长（像素），默认 14
 * @returns       可直接作为 AMap.Marker content 的 HTML
 */
export function createNationalHeritageMarkerHtml(
  typeNh: string | null | undefined,
  size = 14,
): string {
  const def = getNationalHeritageType(typeNh);
  // rotate(45deg) 后视觉对角线 = size * sqrt(2)，用 transform-origin
  // 居中并配合 anchor:"center" 保证定位准确。
  return `<div role="img" aria-label="${def.label}文保点" style="
    width:${size}px;
    height:${size}px;
    background:${def.color};
    border:1.5px solid #fffdf7;
    border-radius:2px;
    transform:rotate(45deg);
    opacity:0.82;
    box-shadow:0 1px 4px rgba(60,30,10,0.35);
    box-sizing:border-box;
  "></div>`;
}
