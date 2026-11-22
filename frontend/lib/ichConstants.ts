// 非遗类型颜色映射（用于跨市连线着色）。

export const ICH_COLOR_MAP: Record<string, string> = {
  "传统技艺": "#1D4ED8",
  "民俗": "#0891B2",
  "传统戏剧": "#6D28D9",
  "传统音乐": "#0369A1",
  "传统美术": "#A78BFA",
  "传统舞蹈": "#0D9488",
  "民间文学": "#4338CA",
  "曲艺": "#22D3EE",
  "传统医药": "#047857",
  "传统体育、游艺与杂技": "#7C3AED",
};

export function getIchCategoryColor(category: string | null): string {
  if (!category) return "#999999";
  return ICH_COLOR_MAP[category] ?? "#999999";
}

/** hex -> rgba 字符串，用于设置透明度 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 按非遗类型取 rgba 颜色。
 * @param alpha 透明度 0-1
 */
export function getIchCategoryColorAlpha(
  category: string | null,
  alpha: number,
): string {
  return hexToRgba(getIchCategoryColor(category), alpha);
}
