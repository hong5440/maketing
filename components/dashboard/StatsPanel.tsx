"use client";

/**
 * 사고 통계 패널 (B-7) — OVERVIEW 우하단
 * 2025년 조선업 사고 재해자 유형별 막대. 막대 클릭 → 관련 위험유형 히트맵 레이어.
 * 출처: 고용노동부 (이투데이 2026.5.27 보도 기준)
 */

import { useState } from "react";
import type { HazardType } from "@/lib/domain";

const STATS: { label: string; count: number; hazard: HazardType }[] = [
  { label: "넘어짐", count: 294, hazard: "전도" },
  { label: "부딪힘", count: 239, hazard: "충돌" },
  { label: "끼임", count: 221, hazard: "협착" },
  { label: "불균형·무리한 동작", count: 187, hazard: "기타" },
  { label: "떨어짐", count: 171, hazard: "추락" },
  { label: "맞음", count: 169, hazard: "낙하" },
];
const TOTAL = 1632;
const MAX = STATS[0].count;

export function StatsPanel({
  onPick,
}: {
  /** 막대 클릭 → 해당 위험유형 히트맵 레이어 켜기 */
  onPick: (hazard: HazardType) => void;
}) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<HazardType | null>(null);

  return (
    <div className="holo-panel absolute bottom-[176px] right-[380px] z-20 w-[280px] p-3">
      <h2 className="holo-title mb-1.5">
        사고 통계 · 조선업
        <button
          onClick={() => setOpen((v) => !v)}
          className="pressable ml-auto text-[11px] text-console-muted"
          aria-label={open ? "접기" : "펼치기"}
        >
          {open ? "▾" : "▸"}
        </button>
      </h2>
      <p className="mb-1.5 text-[11px] text-console-muted">
        2025년 재해자 <b className="num text-console-text">1,632</b>명
      </p>
      {open && (
        <>
          <div className="space-y-1">
            {STATS.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setPicked(s.hazard);
                  onPick(s.hazard);
                }}
                className="pressable group block w-full text-left"
                title={`${s.label} ${s.count}명 — 클릭하면 관련 레이어 표시`}
              >
                <span className="flex items-center justify-between text-[10px]">
                  <span
                    className={
                      picked === s.hazard ? "font-bold text-holo" : "text-console-muted"
                    }
                  >
                    {s.label}
                  </span>
                  <span className="num text-console-text">{s.count}</span>
                </span>
                <span className="block h-1.5 overflow-hidden rounded bg-console-bg">
                  <span
                    className={`block h-full rounded transition-all ${
                      picked === s.hazard ? "bg-holo" : "bg-holo/55 group-hover:bg-holo/80"
                    }`}
                    style={{ width: `${(s.count / MAX) * 100}%` }}
                  />
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] leading-snug text-console-muted/70">
            막대를 누르면 관련 아차사고 레이어가 켜집니다 · 출처: 고용노동부
            (이투데이 2026.5.27) · 나머지 {TOTAL - STATS.reduce((a, b) => a + b.count, 0)}명은 기타 유형
          </p>
        </>
      )}
    </div>
  );
}
