import type { TemporalAxisSegmentConfig } from "./temporalAxis";

export type TimelinePeriod = TemporalAxisSegmentConfig & {
  readonly label: string;
  readonly color: string;
};

export type TimelineTick = {
  readonly year: number;
  readonly label: string;
};

export const TIMELINE_START_YEAR = -1700000;
export const TIMELINE_END_YEAR = 2026;
export const TIMELINE_AXIS_WIDTH = 1900;

function period(
  value: TimelinePeriod,
): Readonly<TimelinePeriod> {
  return Object.freeze(value);
}

/**
 * Product-owned first-pass semantic-axis configuration.
 * weight/minWidth only allocate visual space; the closed year intervals remain authoritative.
 */
export const TIMELINE_PERIODS: readonly Readonly<TimelinePeriod>[] = Object.freeze([
  period({ id: "paleolithic", label: "旧石器时代", startYear: -1700000, endYear: -10001, weight: 1.8, minWidth: 112, color: "#776552" }),
  period({ id: "neolithic", label: "新石器时代", startYear: -10000, endYear: -2071, weight: 1.5, minWidth: 108, color: "#8b7658" }),
  period({ id: "xia", label: "夏", startYear: -2070, endYear: -1601, weight: 0.72, minWidth: 58, color: "#96704f" }),
  period({ id: "shang", label: "商", startYear: -1600, endYear: -1047, weight: 0.78, minWidth: 58, color: "#9c6346" }),
  period({ id: "western-zhou", label: "西周", startYear: -1046, endYear: -771, weight: 0.82, minWidth: 74, color: "#a27645" }),
  period({ id: "spring-autumn", label: "春秋", startYear: -770, endYear: -476, weight: 0.86, minWidth: 74, color: "#9e8448" }),
  period({ id: "warring-states", label: "战国", startYear: -475, endYear: -222, weight: 0.86, minWidth: 70, color: "#8a854c" }),
  period({ id: "qin", label: "秦", startYear: -221, endYear: -207, weight: 0.52, minWidth: 52, color: "#5f7550" }),
  period({ id: "western-han", label: "西汉", startYear: -206, endYear: 24, weight: 0.68, minWidth: 68, color: "#4f7b5a" }),
  period({ id: "eastern-han", label: "东汉", startYear: 25, endYear: 220, weight: 0.68, minWidth: 68, color: "#477b63" }),
  period({ id: "wei-jin-southern-northern-dynasties", label: "魏晋南北朝", startYear: 221, endYear: 580, weight: 1.18, minWidth: 120, color: "#4f7c70" }),
  period({ id: "sui", label: "隋", startYear: 581, endYear: 617, weight: 0.5, minWidth: 52, color: "#417b79" }),
  period({ id: "tang", label: "唐", startYear: 618, endYear: 907, weight: 1.02, minWidth: 58, color: "#347b82" }),
  period({ id: "five-dynasties", label: "五代", startYear: 908, endYear: 959, weight: 0.62, minWidth: 72, color: "#397486" }),
  period({ id: "northern-song", label: "北宋", startYear: 960, endYear: 1126, weight: 0.68, minWidth: 68, color: "#3d6f88" }),
  period({ id: "southern-song", label: "南宋", startYear: 1127, endYear: 1278, weight: 0.68, minWidth: 68, color: "#476b89" }),
  period({ id: "yuan", label: "元", startYear: 1279, endYear: 1367, weight: 0.6, minWidth: 54, color: "#526c8a" }),
  period({ id: "ming", label: "明", startYear: 1368, endYear: 1643, weight: 0.84, minWidth: 54, color: "#6c6687" }),
  period({ id: "qing", label: "清", startYear: 1644, endYear: 1911, weight: 0.86, minWidth: 54, color: "#7b647e" }),
  period({ id: "republic-of-china", label: "中华民国时期", startYear: 1912, endYear: 1948, weight: 0.78, minWidth: 112, color: "#835f70" }),
  period({ id: "prc-founding-and-construction", label: "新中国成立与建设时期", startYear: 1949, endYear: 1978, weight: 0.82, minWidth: 136, color: "#8c615d" }),
  period({ id: "early-reform-and-opening", label: "改革开放早期", startYear: 1979, endYear: 1999, weight: 0.72, minWidth: 112, color: "#8a6c51" }),
  period({ id: "contemporary", label: "当代", startYear: 2000, endYear: 2026, weight: 0.7, minWidth: 72, color: "#6f7652" }),
]);

export const TIMELINE_TICKS: readonly Readonly<TimelineTick>[] = Object.freeze([
  Object.freeze({ year: -1700000, label: "前170万" }),
  Object.freeze({ year: -10000, label: "前1万" }),
  Object.freeze({ year: -2070, label: "前2070" }),
  Object.freeze({ year: -221, label: "前221" }),
  Object.freeze({ year: 1, label: "公元1" }),
  Object.freeze({ year: 618, label: "618" }),
  Object.freeze({ year: 960, label: "960" }),
  Object.freeze({ year: 1368, label: "1368" }),
  Object.freeze({ year: 1644, label: "1644" }),
  Object.freeze({ year: 1912, label: "1912" }),
  Object.freeze({ year: 1949, label: "1949" }),
  Object.freeze({ year: 1979, label: "1979" }),
  Object.freeze({ year: 2000, label: "2000" }),
  Object.freeze({ year: 2026, label: "2026" }),
]);

export function getTimelinePeriodForYear(
  year: number,
): Readonly<TimelinePeriod> | undefined {
  return TIMELINE_PERIODS.find(
    (candidate) => year >= candidate.startYear && year <= candidate.endYear,
  );
}