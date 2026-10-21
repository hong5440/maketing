/**
 * 야드 위험 예보 (B-2) — 시설×시간대 위험 단계 계산
 *
 * 가상 작업허가서(data/seed/permits.json, 합성 데이터)를 AI 해석 엔진의
 * 규칙 경로(demoInterpret)로 구조화한 뒤, 간섭 규칙으로 단계를 매긴다.
 * ※ 위험 단계는 "시연용 규칙"으로 계산된다 — UI에 상시 고지.
 *
 * 단계: 0 맑음 / 1 주의 / 2 경보
 * 동형(isomorphic) 모듈 — 서버·정적 데모(브라우저) 공유.
 */

import permitsSeed from "../data/seed/permits.json";
import { demoInterpret } from "./ai/demoInterpret";

export type ForecastLevel = 0 | 1 | 2;
export const FORECAST_HOURS = { start: 6, end: 22 } as const;

export interface Permit {
  id: string;
  title: string;
  text: string;
  workKind: string;
  confined?: {
    o2Measured: boolean;
    measuredAt: string | null;
    ventilation: boolean;
    watcher: boolean;
    entrants: number;
    emergencyContact: boolean;
  };
}

export interface PermitInterp {
  permit: Permit;
  zoneId: number | null;
  startH: number | null;
  endH: number | null;
  hazards: string[];
}

export interface Conflict {
  id: string;
  zoneId: number;
  permitIds: [string, string];
  reason: string;
  startH: number;
  endH: number;
}

export interface ZoneForecast {
  level: ForecastLevel;
  permitIds: string[];
  conflictIds: string[];
}

export interface ForecastFrame {
  hour: number;
  byZone: Record<number, ZoneForecast>;
  conflicts: Conflict[]; // 해당 시각에 활성인 간섭만
}

/** 주의 단계를 유발하는 위험 작업 종류 */
const HAZARDOUS_KINDS = new Set([
  "lifting",
  "hotwork",
  "height",
  "confined",
  "painting",
  "electric",
  "transport",
]);

/** 간섭 조합 규칙: [종류A, 종류B, 사유] — 같은 시설·겹치는 시간대일 때 경보 */
const CONFLICT_RULES: [string, string, string][] = [
  ["lifting", "hotwork", "크레인 하중 하부에서 화기작업 — 낙하물·불티 간섭"],
  ["lifting", "piping", "크레인 하중 하부 작업 — 낙하물 간섭"],
  ["lifting", "assembly", "크레인 하중 하부 작업 — 낙하물 간섭"],
  ["painting", "hotwork", "도장 유증기 인접 화기작업 — 점화원 간섭"],
  ["confined", "hotwork", "밀폐공간 인접 화기작업 — 점화원·산소결핍 간섭"],
  ["height", "piping", "고소작업 하부 작업 — 낙하물 간섭"],
  ["height", "assembly", "고소작업 하부 작업 — 낙하물 간섭"],
  ["transport", "transport", "운송 동선 중복 — 교차 충돌 주의"],
];

function hourOf(hhmm: string | null): number | null {
  if (!hhmm) return null;
  return Number(hhmm.slice(0, 2));
}

let _interps: PermitInterp[] | null = null;

/** 허가서 전체를 해석 (모듈 수명 동안 캐시) */
export function interpretPermits(): PermitInterp[] {
  if (_interps) return _interps;
  _interps = (permitsSeed.permits as Permit[]).map((permit) => {
    const { result } = { result: demoInterpret(permit.text, "permit") };
    return {
      permit,
      zoneId: result.where.zoneId,
      startH: hourOf(result.when.start),
      endH: hourOf(result.when.end),
      hazards: result.hazards,
    };
  });
  return _interps;
}

function overlaps(a: PermitInterp, b: PermitInterp): { s: number; e: number } | null {
  if (a.startH == null || b.startH == null) return null;
  const ae = a.endH ?? a.startH + 1;
  const be = b.endH ?? b.startH + 1;
  const s = Math.max(a.startH, b.startH);
  const e = Math.min(ae, be);
  return e > s ? { s, e } : null;
}

let _conflicts: Conflict[] | null = null;

/** 모든 간섭 조합 (하루치) */
export function allConflicts(): Conflict[] {
  if (_conflicts) return _conflicts;
  const interps = interpretPermits();
  const out: Conflict[] = [];
  for (let i = 0; i < interps.length; i++) {
    for (let j = i + 1; j < interps.length; j++) {
      const a = interps[i];
      const b = interps[j];
      if (a.zoneId == null || a.zoneId !== b.zoneId) continue;
      const ov = overlaps(a, b);
      if (!ov) continue;
      const rule = CONFLICT_RULES.find(
        ([ka, kb]) =>
          (a.permit.workKind === ka && b.permit.workKind === kb) ||
          (a.permit.workKind === kb && b.permit.workKind === ka),
      );
      if (!rule) continue;
      out.push({
        id: `C-${a.permit.id}-${b.permit.id}`,
        zoneId: a.zoneId,
        permitIds: [a.permit.id, b.permit.id],
        reason: rule[2],
        startH: ov.s,
        endH: ov.e,
      });
    }
  }
  _conflicts = out;
  return out;
}

/** 특정 시각의 시설별 위험 단계 */
export function forecastAt(hour: number): ForecastFrame {
  const interps = interpretPermits();
  const conflicts = allConflicts().filter((c) => hour >= c.startH && hour < c.endH);
  const byZone: Record<number, ZoneForecast> = {};

  for (const it of interps) {
    if (it.zoneId == null || it.startH == null) continue;
    const endH = it.endH ?? it.startH + 1;
    if (hour < it.startH || hour >= endH) continue;
    const zf = (byZone[it.zoneId] ??= { level: 0, permitIds: [], conflictIds: [] });
    zf.permitIds.push(it.permit.id);
    if (HAZARDOUS_KINDS.has(it.permit.workKind)) zf.level = Math.max(zf.level, 1) as ForecastLevel;
  }
  for (const c of conflicts) {
    const zf = (byZone[c.zoneId] ??= { level: 0, permitIds: [], conflictIds: [] });
    zf.level = 2;
    zf.conflictIds.push(c.id);
  }
  return { hour, byZone, conflicts };
}

export function permitById(id: string): PermitInterp | undefined {
  return interpretPermits().find((p) => p.permit.id === id);
}

export const PERMITS_NOTE: string = permitsSeed.note;

export const FORECAST_LEVEL_LABEL: Record<ForecastLevel, string> = {
  0: "맑음",
  1: "주의",
  2: "경보",
};
