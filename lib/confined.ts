/**
 * 밀폐공간 숨길 (B-3) — 밀폐공간 작업허가의 안전조치 누락 검사
 *
 * permits.json의 confined 필드(합성 데이터)를 검사해 체크리스트를 만들고,
 * 같은 시설·겹치는 시간대의 화기작업이 있으면 "점화원 인접" 경고를 붙인다.
 * 동형 모듈 — 서버·정적 데모 공유.
 */

import { allConflicts, interpretPermits, type PermitInterp } from "./forecast";

export const CONFINED_BACKGROUND =
  "밀폐공간 질식은 10년간(2014~2023) 재해자 338명 중 136명이 사망한, 치명률 약 40%의 재해입니다. (전 산업 기준, 고용노동부 자료)";

export interface ConfinedCheckItem {
  key: string;
  label: string;
  ok: boolean;
  /** 표시용 값 (예: 측정 시각, 출입 인원) */
  value?: string;
}

export interface ConfinedEntry {
  interp: PermitInterp;
  zoneId: number;
  checks: ConfinedCheckItem[];
  missingCount: number;
  /** 같은 시설·겹치는 시간대의 화기작업 허가 id */
  ignitionNearby: string[];
  /** "HH:MM" — 산소 측정 시각 (측정했을 때만) */
  measuredAt: string | null;
  entrants: number;
}

let _entries: ConfinedEntry[] | null = null;

/** 밀폐공간 허가 전체 (캐시) */
export function confinedEntries(): ConfinedEntry[] {
  if (_entries) return _entries;
  const interps = interpretPermits();

  _entries = interps
    .filter((it) => it.permit.confined && it.zoneId != null)
    .map((interp) => {
      const c = interp.permit.confined!;
      const checks: ConfinedCheckItem[] = [
        {
          key: "o2",
          label: "산소·유해가스 측정",
          ok: c.o2Measured,
          value: c.o2Measured && c.measuredAt ? `${c.measuredAt} 측정` : "측정 기록 없음",
        },
        { key: "vent", label: "환기 실시", ok: c.ventilation },
        { key: "watcher", label: "외부 감시인 배치", ok: c.watcher },
        {
          key: "entrants",
          label: "출입 인원 기록",
          ok: c.entrants > 0,
          value: c.entrants > 0 ? `${c.entrants}명` : "미기록",
        },
        { key: "emergency", label: "비상 연락체계", ok: c.emergencyContact },
      ];

      // 점화원 인접: 같은 시설, 시간대 겹치는 화기작업
      const ignitionNearby = interps
        .filter(
          (o) =>
            o !== interp &&
            o.zoneId === interp.zoneId &&
            o.permit.workKind === "hotwork" &&
            interp.startH != null &&
            o.startH != null &&
            Math.max(interp.startH, o.startH) <
              Math.min(interp.endH ?? interp.startH + 1, o.endH ?? o.startH + 1),
        )
        .map((o) => o.permit.id);

      return {
        interp,
        zoneId: interp.zoneId!,
        checks,
        missingCount: checks.filter((x) => !x.ok).length,
        ignitionNearby,
        measuredAt: c.o2Measured ? c.measuredAt : null,
        entrants: c.entrants,
      };
    });
  return _entries;
}

/** 측정 시각("HH:MM", 오늘) 기준 경과 ms. 측정 없으면 null */
export function elapsedSinceMeasure(measuredAt: string | null, now = new Date()): number | null {
  if (!measuredAt) return null;
  const [h, m] = measuredAt.split(":").map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  let diff = now.getTime() - t.getTime();
  if (diff < 0) diff += 24 * 3600_000; // 자정 넘김 보정
  return diff;
}

/** 재측정 권고 기준: 측정 후 2시간 초과 */
export const REMEASURE_AFTER_MS = 2 * 3600_000;

export { allConflicts };
