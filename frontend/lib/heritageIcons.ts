export type HeritageIconDefinition = {
  type: string;
  label: string;
  color: string;
  iconSrc: string;
};

export const HERITAGE_TYPE_ICONS: readonly HeritageIconDefinition[] = [
  {
    type: "古建筑",
    label: "古建筑",
    color: "#b8543e",
    iconSrc: "/icons/heritage/ancient-building.svg",
  },
  {
    type: "古文化遗址",
    label: "古文化遗址",
    color: "#a67c52",
    iconSrc: "/icons/heritage/archaeological-site.svg",
  },
  {
    type: "古墓葬",
    label: "古墓葬",
    color: "#76644d",
    iconSrc: "/icons/heritage/ancient-tomb.svg",
  },
  {
    type: "石窟及石刻",
    label: "石窟及石刻",
    color: "#2d4a3e",
    iconSrc: "/icons/heritage/grotto-stone-carving.svg",
  },
  {
    type: "近现代建筑",
    label: "近现代建筑",
    color: "#4a7a8c",
    iconSrc: "/icons/heritage/modern-building.svg",
  },
  {
    type: "近现代重要史迹及代表性建筑",
    label: "近现代重要史迹及代表性建筑",
    color: "#7c4f5c",
    iconSrc: "/icons/heritage/modern-historic-site.svg",
  },
  {
    type: "其他",
    label: "其他",
    color: "#c9a227",
    iconSrc: "/icons/heritage/other-heritage.svg",
  },
] as const;

const DEFAULT_HERITAGE_ICON = HERITAGE_TYPE_ICONS[HERITAGE_TYPE_ICONS.length - 1];
const HERITAGE_ICON_BY_TYPE = new Map(
  HERITAGE_TYPE_ICONS.map((definition) => [definition.type, definition]),
);

export function getHeritageIcon(
  heritageType: string | null | undefined,
): HeritageIconDefinition {
  const normalizedType = heritageType?.trim();
  return (normalizedType && HERITAGE_ICON_BY_TYPE.get(normalizedType)) || DEFAULT_HERITAGE_ICON;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createHeritageMarkerHtml(
  heritageType: string | null | undefined,
  pid?: string | null,
  size = 24,
): string {
  const icon = getHeritageIcon(heritageType);
  const pidAttribute = pid
    ? ` data-heritage-pid="${escapeHtmlAttribute(pid)}"`
    : "";

  return `
    <div${pidAttribute} role="img" aria-label="${escapeHtmlAttribute(icon.label)}文保点" style="
      width: ${size}px;
      height: ${size}px;
      display: block;
      filter: drop-shadow(0 2px 3px rgba(25, 38, 31, 0.34));
    ">
      <img src="${icon.iconSrc}" alt="" aria-hidden="true" draggable="false" style="
        width: 100%;
        height: 100%;
        display: block;
      " />
    </div>
  `;
}