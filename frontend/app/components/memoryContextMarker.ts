export const MEMORY_CONTEXT_MARKER_OFFSET_Y = -12;

type MarkerKind = "discussion" | "memory";

const MARKER_STYLES = {
  discussion: {
    width: 46,
    height: 33,
    rotation: -3,
    front: "#f36a58",
    side: "#9f3027",
    ink: "#541d18",
    paperPath: "M4 3 Q3 3 3 7 L3 24 Q3 29 8 29 L16 29 L13 34 L22 29 L39 29 Q44 29 43 24 L43 8 Q43 3 38 4 Z",
    icon: `<path d="M10 10 Q10 7 14 7 H29 Q34 7 34 11 V18 Q34 22 30 22 H20 L15 25 L16 22 H14 Q10 22 10 18 Z"/><path d="M16 14h.1M22 14h.1M28 14h.1"/>`,
    glyph: "聊",
  },
  memory: {
    width: 44,
    height: 35,
    rotation: 2.5,
    front: "#58b8b0",
    side: "#226b68",
    ink: "#123f3d",
    paperPath: "M5 3 L38 4 Q41 4 40 8 L40 29 Q40 32 36 31 L7 32 Q3 32 4 28 L3 7 Q3 3 5 3 Z",
    icon: `<path d="M10 8h23v17H10z"/><circle cx="16" cy="13" r="2"/><path d="m11 23 7-6 4 4 3-3 7 6"/>`,
    glyph: "忆",
  },
} as const;

function createMarkerHtml(
  pidAttribute: string,
  pid: string,
  label: string,
  kind: MarkerKind,
): string {
  const style = MARKER_STYLES[kind];
  const connectorTop = style.height - 2;
  const targetY = style.height + Math.abs(MEMORY_CONTEXT_MARKER_OFFSET_Y);
  const connectorHeight = targetY - connectorTop + 8;
  const targetOffset = targetY - connectorTop;

  return `
    <div ${pidAttribute}="${pid}" data-memory-context-kind="${kind}" title="打开${label}" aria-label="打开${label}" style="
      position: relative;
      width: ${style.width}px;
      height: ${style.height}px;
      cursor: pointer;
      user-select: none;
      pointer-events: auto;
      overflow: visible;
      filter: drop-shadow(0 4px 4px rgba(23,59,49,0.25));
    ">
      <svg data-marker-sparkles aria-hidden="true" width="${style.width + 20}" height="${style.height + 18}" viewBox="0 0 ${style.width + 20} ${style.height + 18}" style="
        position: absolute;
        z-index: 2;
        top: -9px;
        left: -10px;
        overflow: visible;
        filter: drop-shadow(0 0 2px rgba(255,248,207,0.9));
        pointer-events: none;
      ">
        <g fill="#fff8cf" stroke="${style.ink}" stroke-width="0.9" stroke-linejoin="round">
          <path d="M8 1 Q9 7 15 8 Q9 9 8 15 Q7 9 1 8 Q7 7 8 1 Z">
            <animate attributeName="opacity" values="0.28;1;0.28" dur="1.45s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="rotate" values="-8 8 8;8 8 8;-8 8 8" dur="1.45s" repeatCount="indefinite" />
          </path>
          <path d="M${style.width + 13} 8 Q${style.width + 14} 12 ${style.width + 18} 13 Q${style.width + 14} 14 ${style.width + 13} 18 Q${style.width + 12} 14 ${style.width + 8} 13 Q${style.width + 12} 12 ${style.width + 13} 8 Z">
            <animate attributeName="opacity" values="0.2;0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
          </path>
        </g>
        <g fill="none" stroke="#fff8cf" stroke-width="2" stroke-linecap="round">
          <path d="M5 ${style.height + 11} 2 ${style.height + 14}" />
          <path d="M11 ${style.height + 13} 10 ${style.height + 17}" />
          <animate attributeName="opacity" values="0.18;0.82;0.18" dur="1.65s" begin="0.35s" repeatCount="indefinite" />
        </g>
      </svg>
      <svg data-marker-connector aria-hidden="true" width="26" height="${connectorHeight}" viewBox="0 0 26 ${connectorHeight}" style="
        position: absolute;
        z-index: 0;
        top: ${connectorTop}px;
        left: 50%;
        overflow: visible;
        transform: translateX(-50%);
        pointer-events: none;
      ">
        <path d="M13 0 C12 5 15 8 13 ${targetOffset}" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round" />
        <path d="M13 0 C12 5 15 8 13 ${targetOffset}" fill="none" stroke="${style.ink}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2.5 2" />
        <circle cx="13" cy="${targetOffset}" r="5" fill="rgba(255,253,247,0.72)" stroke="${style.ink}" stroke-width="2" />
        <circle cx="13" cy="${targetOffset}" r="1.8" fill="${style.front}" />
      </svg>
      <svg aria-hidden="true" width="${style.width}" height="${style.height + 5}" viewBox="0 0 ${style.width} ${style.height + 5}" style="
        position: absolute;
        z-index: 1;
        inset: 0;
        overflow: visible;
        transform: rotate(${style.rotation}deg);
        transform-origin: 50% 70%;
        pointer-events: none;
      ">
        <path d="${style.paperPath}" transform="translate(2 3)" fill="${style.side}" stroke="${style.ink}" stroke-width="2.2" stroke-linejoin="round" />
        <path d="${style.paperPath}" fill="${style.front}" stroke="#fffdf7" stroke-width="4.5" stroke-linejoin="round" />
        <path d="${style.paperPath}" fill="${style.front}" stroke="${style.ink}" stroke-width="2.1" stroke-linejoin="round" />
        <g fill="none" stroke="${style.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${style.icon}
        </g>
        <path d="M7 5 Q14 3 21 5" fill="none" stroke="rgba(255,255,255,0.68)" stroke-width="2" stroke-linecap="round" />
        <circle cx="38" cy="7" r="7" fill="#fff8df" stroke="${style.ink}" stroke-width="1.7" />
        <text x="38" y="10" text-anchor="middle" fill="${style.ink}" font-family="'KaiTi','STKaiti',serif" font-size="9" font-weight="700" letter-spacing="0">${style.glyph}</text>
      </svg>
    </div>
  `;
}

export function createDiscussionMarkerHtml(pid: string, label: string): string {
  return createMarkerHtml("data-discussion-pid", pid, label, "discussion");
}

export function createMemoryAlbumMarkerHtml(pid: string, label: string): string {
  return createMarkerHtml("data-memory-album-pid", pid, label, "memory");
}