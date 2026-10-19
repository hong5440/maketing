/**
 * 대시보드 클라이언트 통계 유틸 (순수 함수 — 서버/클라이언트 공용)
 * 무거운 분석은 lib/ai/detectHotspots를 그대로 사용하고,
 * 여기는 필터·주차별 집계·KPI 등 표시용 파생값만 담당한다.
 */

import type { HazardType, NearMissReport, ReporterLang } from "./domain";
import { kstHour } from "./domain";

export const WEEK_MS = 7 * 86400000;

export interface DashFilters {
  hazardType: HazardType | "all";
  /** 주간 06~20시 / 야간 20~06시 */
  shift: "all" | "day" | "night";
  lang: ReporterLang | "all";
  /** 지도에 표시할 기간 (주) */
  periodWeeks: number;
}

export const DEFAULT_FILTERS: DashFilters = {
  hazardType: "all",
  shift: "all",
  lang: "all",
  periodWeeks: 8,
};

export function isNightShift(createdAt: string): boolean {
  const h = kstHour(createdAt);
  return h >= 20 || h < 6;
}

/** 속성 필터 (시간창 제외) */
export function filterByAttrs(
  reports: NearMissReport[],
  f: DashFilters,
): NearMissReport[] {
  return reports.filter((r) => {
    if (f.hazardType !== "all" && r.hazardType !== f.hazardType) return false;
    if (f.lang !== "all" && r.reporterLang !== f.lang) return false;
    if (f.shift === "night" && !isNightShift(r.createdAt)) return false;
    if (f.shift === "day" && isNightShift(r.createdAt)) return false;
    return true;
  });
}

/** (simNow - weeks, simNow] 시간창 필터 */
export function inWindow(
  reports: NearMissReport[],
  simNowMs: number,
  weeks: number,
): NearMissReport[] {
  const start = simNowMs - weeks * WEEK_MS;
  return reports.filter((r) => {
    const t = Date.parse(r.createdAt);
    return t > start && t <= simNowMs;
  });
}

/** 주차별 건수 (오래된 주 → 최근 주, weeks개) */
export function weeklyCounts(
  reports: NearMissReport[],
  simNowMs: number,
  weeks = 8,
): number[] {
  const counts = new Array<number>(weeks).fill(0);
  for (const r of reports) {
    const t = Date.parse(r.createdAt);
    const age = simNowMs - t;
    if (age < 0 || age >= weeks * WEEK_MS) continue;
    const idx = weeks - 1 - Math.floor(age / WEEK_MS);
    counts[idx]++;
  }
  return counts;
}

export function hazardDistribution(
  reports: NearMissReport[],
): { hazardType: HazardType; count: number }[] {
  const map = new Map<HazardType, number>();
  for (const r of reports) map.set(r.hazardType, (map.get(r.hazardType) ?? 0) + 1);
  return [...map.entries()]
    .map(([hazardType, count]) => ({ hazardType, count }))
    .sort((a, b) => b.count - a.count || a.hazardType.localeCompare(b.hazardType));
}

export interface DashKpis {
  thisWeek: number;
  prevWeek: number;
  /** 전주 대비 % (prev 0이면 null) */
  deltaPct: number | null;
  activeAlerts: number;
  /** 최근 7일 외국어 보고 비율 0~1 */
  foreignRatio: number;
  /** 평균 조치 시간 (시간 단위, 데모 파생값) */
  avgActionHours: number;
}

/** id 해시 기반 결정적 의사 조치 시간 (데모 — 실제 필드 없음) */
function pseudoActionHours(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 6 + (h % 340) / 10; // 6 ~ 40시간
}

export function computeKpis(
  attrFiltered: NearMissReport[],
  simNowMs: number,
  activeAlerts: number,
): DashKpis {
  const thisWeekArr = inWindow(attrFiltered, simNowMs, 1);
  const prevWeekArr = inWindow(attrFiltered, simNowMs - WEEK_MS, 1);
  const thisWeek = thisWeekArr.length;
  const prevWeek = prevWeekArr.length;
  const foreign = thisWeekArr.filter((r) => r.reporterLang !== "ko").length;
  const done = inWindow(attrFiltered, simNowMs, 8).filter(
    (r) => r.status === "조치완료",
  );
  const avg =
    done.length > 0
      ? done.reduce((s, r) => s + pseudoActionHours(r.id), 0) / done.length
      : 0;
  return {
    thisWeek,
    prevWeek,
    deltaPct: prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null,
    activeAlerts,
    foreignRatio: thisWeek > 0 ? foreign / thisWeek : 0,
    avgActionHours: Math.round(avg),
  };
}

/** 위험도 0~100 → 초록-노랑-주황-빨강 보간 색 */
export function riskColor(v: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [34, 197, 94]],
    [33, [234, 179, 8]],
    [66, [249, 115, 22]],
    [100, [239, 68, 68]],
  ];
  const x = Math.max(0, Math.min(100, v));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      const c = ca.map((va, k) => Math.round(va + (cb[k] - va) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(239,68,68)";
}

/**
 * 차트 카테고리 팔레트 (다크 서피스 #111827 검증 통과:
 * CVD ΔE≥8.4, 일반시야 ΔE≥19.3, 대비 3:1 — dataviz 검증 스크립트)
 */
export const CHART_SERIES = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#9085e9",
] as const;
export const CHART_OTHER = "#717c8e";

/** 위험유형 → 지도 점·차트 공용 색 (엔티티 고정 매핑) */
export const HAZARD_COLORS: Record<HazardType, string> = {
  추락: "#3987e5",
  낙하: "#d95926",
  협착: "#c98500",
  충돌: "#d55181",
  "화재·폭발": "#e66767",
  질식: "#9085e9",
  감전: "#f2c94c",
  "절단·화상": "#e3904f",
  전도: "#199e70",
  기타: "#717c8e",
};
