/**
 * 핫스팟 탐지 — LLM 없이 순수 통계
 *
 * - 구역×위험유형별: 최근 7일 건수(k) vs 이전 4주 주평균(λ)을 Poisson으로 비교.
 *   P(X ≥ k | λ)가 작을수록 급증. surgeScore = -log10(P).
 * - 구역 위험 점수(0~100): Σ(심각도 가중치 × exp(-경과일/τ)) 를 최대값으로 정규화.
 */

import { ZONES } from "../../data/zones";
import type { HazardType, NearMissReport } from "../domain";

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
/** 시간 감쇠 상수 τ (일) */
const DECAY_TAU_DAYS = 14;
/** 심각도 가중치 (severity 1~5) */
const SEVERITY_WEIGHTS = [0, 1, 2, 4, 7, 11];
/** 급증 경보 기준: 최근 7일 최소 건수 / P(X≥k) 상한 */
const MIN_RECENT_COUNT = 3;
const P_VALUE_THRESHOLD = 0.05;

export interface HotspotAlert {
  /** 결정적 id: `${zoneId}-${hazardType}` */
  id: string;
  zoneId: number;
  hazardType: HazardType;
  /** 최근 7일 건수 */
  recentCount: number;
  /** 이전 4주 주평균 (λ) */
  baselineWeekly: number;
  /** 최근 7일 / 주평균 배율 */
  increaseRatio: number;
  /** -log10 P(X≥k | λ). 클수록 급증 */
  surgeScore: number;
  /** P(X≥k | λ) */
  pValue: number;
  /** 근거 보고서(최근 7일) id */
  reportIds: string[];
}

export interface HotspotResult {
  riskByZone: Record<number, number>;
  alerts: HotspotAlert[];
}

/** Poisson 상단 꼬리 확률 P(X ≥ k | λ) */
export function poissonTail(k: number, lambda: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0; // 기대 0에서 1건 이상 관측 → 확률 0 취급
  // P(X≥k) = 1 - Σ_{i=0}^{k-1} e^-λ λ^i / i!
  let term = Math.exp(-lambda); // i = 0
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.min(1, Math.max(0, 1 - cdf));
}

export function alertId(zoneId: number, hazardType: string): string {
  return `${zoneId}-${hazardType}`;
}

/**
 * 분석 기준 시각 결정: 명시값 > 최신 보고 시각 > 현재 시각.
 * (시드 데이터 시연 시 "최근 7일" 창이 항상 데이터와 겹치도록)
 */
export function resolveNow(
  reports: NearMissReport[],
  explicit?: string | null
): Date {
  if (explicit) {
    const d = new Date(explicit);
    if (!Number.isNaN(d.getTime())) return d;
  }
  let latest = Number.NEGATIVE_INFINITY;
  for (const r of reports) {
    const t = Date.parse(r.createdAt);
    if (!Number.isNaN(t) && t > latest) latest = t;
  }
  return Number.isFinite(latest) ? new Date(latest) : new Date();
}

export function detectHotspots(
  reports: NearMissReport[],
  now: Date
): HotspotResult {
  const nowMs = now.getTime();
  const recentStart = nowMs - WEEK_MS;
  const baselineStart = nowMs - 5 * WEEK_MS; // 이전 4주 = [now-5주, now-1주)

  // ── 구역×위험유형 집계 ──────────────────────────────
  const recentByKey = new Map<string, NearMissReport[]>();
  const baselineCountByKey = new Map<string, number>();

  for (const r of reports) {
    const t = Date.parse(r.createdAt);
    if (Number.isNaN(t) || t > nowMs) continue;
    const key = alertId(r.zoneId, r.hazardType);
    if (t > recentStart) {
      const arr = recentByKey.get(key);
      if (arr) arr.push(r);
      else recentByKey.set(key, [r]);
    } else if (t > baselineStart) {
      baselineCountByKey.set(key, (baselineCountByKey.get(key) ?? 0) + 1);
    }
  }

  const alerts: HotspotAlert[] = [];
  for (const [key, recentReports] of recentByKey) {
    const k = recentReports.length;
    if (k < MIN_RECENT_COUNT) continue;
    const lambda = (baselineCountByKey.get(key) ?? 0) / 4; // 주평균
    const p = poissonTail(k, lambda);
    if (p > P_VALUE_THRESHOLD) continue;
    const [zoneIdStr] = key.split("-", 1);
    const zoneId = Number(zoneIdStr);
    const hazardType = recentReports[0].hazardType;
    alerts.push({
      id: key,
      zoneId,
      hazardType,
      recentCount: k,
      baselineWeekly: lambda,
      increaseRatio: k / Math.max(lambda, 0.25),
      surgeScore: Math.min(99, -Math.log10(Math.max(p, 1e-12))),
      pValue: p,
      reportIds: recentReports
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((r) => r.id),
    });
  }
  alerts.sort((a, b) => b.surgeScore - a.surgeScore || a.id.localeCompare(b.id));

  // ── 구역 위험 점수 (0~100) ──────────────────────────
  const raw = new Map<number, number>();
  for (const zone of ZONES) raw.set(zone.id, 0);
  for (const r of reports) {
    const t = Date.parse(r.createdAt);
    if (Number.isNaN(t) || t > nowMs) continue;
    const ageDays = (nowMs - t) / DAY_MS;
    if (ageDays > 56) continue; // 8주 밖은 무시
    const w =
      SEVERITY_WEIGHTS[r.severity] * Math.exp(-ageDays / DECAY_TAU_DAYS);
    raw.set(r.zoneId, (raw.get(r.zoneId) ?? 0) + w);
  }
  const max = Math.max(...raw.values(), 1e-9);
  const riskByZone: Record<number, number> = {};
  for (const [zoneId, v] of raw) {
    riskByZone[zoneId] = Math.round((v / max) * 100);
  }

  return { riskByZone, alerts };
}
