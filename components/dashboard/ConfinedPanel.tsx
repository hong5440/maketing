"use client";

/**
 * 밀폐공간 숨길 패널 (B-3)
 * - 배경 통계 문구 + 허가서별 안전조치 체크리스트 (누락 빨강 / 있음 초록)
 * - 측정 후 경과 타이머 (2시간 초과 시 재측정 권고), 출입 인원
 * - 같은 시간 인접 화기작업 → "점화원 인접" 경고
 */

import { useEffect, useMemo, useState } from "react";
import { ZONES } from "@/data/zones";
import {
  CONFINED_BACKGROUND,
  REMEASURE_AFTER_MS,
  confinedEntries,
  elapsedSinceMeasure,
  type ConfinedEntry,
} from "@/lib/confined";

function zoneName(id: number): string {
  const z = ZONES.find((v) => v.id === id);
  return z ? z.name.split("·")[0].split(" 및 ")[0] : `${id}번`;
}

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function ConfinedCard({
  entry,
  selected,
  onClick,
  now,
}: {
  entry: ConfinedEntry;
  selected: boolean;
  onClick: () => void;
  now: Date;
}) {
  const elapsed = elapsedSinceMeasure(entry.measuredAt, now);
  const needRemeasure = elapsed != null && elapsed > REMEASURE_AFTER_MS;
  const danger = entry.missingCount > 0;

  return (
    <button
      onClick={onClick}
      className={`pressable block w-full rounded border p-2 text-left ${
        danger
          ? "border-risk-danger/60 bg-risk-danger/10"
          : "border-risk-safe/40 bg-risk-safe/5"
      } ${selected ? "ring-1 ring-holo" : ""}`}
    >
      <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-console-text">
        <span className={`fc-ico ${danger ? "fc-ico-2" : "fc-ico-0"}`} />
        {entry.zoneId}번 {zoneName(entry.zoneId)}
        <span className="font-normal text-console-muted">· {entry.interp.permit.title}</span>
        {danger && (
          <span className="num ml-auto rounded bg-risk-danger px-1 text-[10px] font-bold text-white">
            누락 {entry.missingCount}
          </span>
        )}
      </span>

      {/* 체크리스트 */}
      <ul className="space-y-0.5">
        {entry.checks.map((c) => (
          <li key={c.key} className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`inline-flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full text-[9px] font-bold ${
                c.ok ? "bg-risk-safe/25 text-risk-safe" : "bg-risk-danger/30 text-risk-danger"
              }`}
            >
              {c.ok ? "✓" : "✕"}
            </span>
            <span className={c.ok ? "text-console-muted" : "font-semibold text-risk-danger"}>
              {c.label}
            </span>
            {c.value && <span className="num ml-auto text-console-muted/80">{c.value}</span>}
          </li>
        ))}
      </ul>

      {/* 측정 경과 타이머 */}
      {elapsed != null && (
        <p
          className={`num mt-1 text-[11px] ${
            needRemeasure ? "font-bold text-risk-warning" : "text-console-muted"
          }`}
        >
          측정 후 {fmtElapsed(elapsed)} 경과
          {needRemeasure && " · 재측정 권고 (2시간 초과)"}
        </p>
      )}

      {/* 점화원 인접 경고 */}
      {entry.ignitionNearby.length > 0 && (
        <p className="mt-1 rounded bg-risk-warning/15 px-1.5 py-1 text-[11px] font-semibold text-risk-warning">
          ⚠ 점화원 인접 — 같은 시간 같은 시설에 화기작업 허가 {entry.ignitionNearby.join(", ")}
        </p>
      )}
    </button>
  );
}

export function ConfinedPanel({
  selectedPermitId,
  onSelect,
}: {
  selectedPermitId: string | null;
  onSelect: (permitId: string, zoneId: number) => void;
}) {
  const entries = useMemo(() => {
    const list = [...confinedEntries()];
    // 선택된 허가 먼저, 다음 누락 많은 순
    list.sort((a, b) => {
      const sa = a.interp.permit.id === selectedPermitId ? 1 : 0;
      const sb = b.interp.permit.id === selectedPermitId ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return b.missingCount - a.missingCount;
    });
    return list;
  }, [selectedPermitId]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const missing = entries.filter((e) => e.missingCount > 0).length;

  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">
        밀폐공간 숨길
        {missing > 0 && (
          <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-danger px-1 text-[10px] font-bold text-white">
            {missing}
          </span>
        )}
      </h2>
      <p className="mb-2 rounded border border-console-border bg-console-bg/60 p-2 text-[11px] leading-snug text-console-muted">
        {CONFINED_BACKGROUND}
      </p>
      <div className="space-y-2">
        {entries.map((e) => (
          <ConfinedCard
            key={e.interp.permit.id}
            entry={e}
            selected={selectedPermitId === e.interp.permit.id}
            onClick={() => onSelect(e.interp.permit.id, e.zoneId)}
            now={now}
          />
        ))}
      </div>
      <p className="mt-2 border-t border-console-border pt-1.5 text-[10px] leading-snug text-console-muted/80">
        허가서는 시연용 합성 데이터이며, 누락 검사는 AI 해석 엔진의 규칙 경로로 수행됩니다.
      </p>
    </section>
  );
}
