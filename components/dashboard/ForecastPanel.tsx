"use client";

/**
 * 야드 위험 예보 (B-2)
 * - ForecastHourSlider: 상단 중앙 06~22시 시간 슬라이더
 * - ForecastPanel: 우측 "오늘의 위험 예보" 요약 + 간섭 카드 (클릭 → 카메라 이동)
 * 위험 단계는 시연용 규칙으로 계산되며, 허가서는 합성 데이터임을 상시 고지한다.
 */

import { useMemo } from "react";
import { ZONES } from "@/data/zones";
import {
  FORECAST_HOURS,
  FORECAST_LEVEL_LABEL,
  PERMITS_NOTE,
  permitById,
  type ForecastFrame,
} from "@/lib/forecast";

function zoneName(id: number): string {
  const z = ZONES.find((v) => v.id === id);
  return z ? z.name.split("·")[0].split(" 및 ")[0] : `${id}번`;
}

export function ForecastHourSlider({
  hour,
  onHour,
}: {
  hour: number;
  onHour: (h: number) => void;
}) {
  return (
    <div className="holo-panel absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 px-4 py-2">
      <span className="holo-title whitespace-nowrap">위험 예보</span>
      <span className="num text-[11px] text-console-muted">
        {String(FORECAST_HOURS.start).padStart(2, "0")}시
      </span>
      <input
        type="range"
        min={FORECAST_HOURS.start}
        max={FORECAST_HOURS.end}
        step={1}
        value={hour}
        onChange={(e) => onHour(Number(e.target.value))}
        className="w-48 accent-holo"
        aria-label="예보 기준 시각"
      />
      <span className="num text-[11px] text-console-muted">{FORECAST_HOURS.end}시</span>
      <span className="num whitespace-nowrap text-sm font-bold text-holo">
        {String(hour).padStart(2, "0")}:00
      </span>
    </div>
  );
}

export function ForecastPanel({
  frame,
  onZoneSelect,
}: {
  frame: ForecastFrame;
  onZoneSelect: (zoneId: number) => void;
}) {
  const summary = useMemo(() => {
    const zones = Object.entries(frame.byZone).map(([id, v]) => ({
      zoneId: Number(id),
      ...v,
    }));
    return {
      alert: zones.filter((z) => z.level === 2),
      caution: zones.filter((z) => z.level === 1),
      clear: zones.filter((z) => z.level === 0),
      active: zones.reduce((s, z) => s + z.permitIds.length, 0),
    };
  }, [frame]);

  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">
        오늘의 위험 예보
        <span className="num text-[10px] font-normal text-console-muted">
          {String(frame.hour).padStart(2, "0")}:00 기준
        </span>
      </h2>

      {/* 단계 요약 */}
      <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
        {([2, 1, 0] as const).map((lv) => {
          const n =
            lv === 2 ? summary.alert.length : lv === 1 ? summary.caution.length : summary.clear.length;
          return (
            <div key={lv} className="rounded border border-console-border bg-console-bg/60 px-1 py-1.5">
              <span className={`fc-ico fc-ico-${lv} mx-auto mb-1 block`} />
              <span className="num block text-base font-bold text-console-text">{n}</span>
              <span className="text-[10px] text-console-muted">{FORECAST_LEVEL_LABEL[lv]}</span>
            </div>
          );
        })}
      </div>
      <p className="mb-2 text-[11px] text-console-muted">
        활성 작업허가 <b className="num text-console-text">{summary.active}</b>건 ·
        간섭 <b className="num text-risk-danger">{frame.conflicts.length}</b>건
      </p>

      {/* 간섭 카드 */}
      <div className="space-y-2">
        {frame.conflicts.length === 0 && (
          <p className="text-xs text-console-muted">이 시각에는 작업 간섭이 없습니다.</p>
        )}
        {frame.conflicts.map((c) => {
          const [pa, pb] = c.permitIds.map((id) => permitById(id));
          return (
            <button
              key={c.id}
              onClick={() => onZoneSelect(c.zoneId)}
              className="pressable block w-full rounded border border-risk-danger/60 bg-risk-danger/10 p-2 text-left"
            >
              <span className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-console-text">
                <span className="fc-ico fc-ico-2" />
                {c.zoneId}번 {zoneName(c.zoneId)}
                <span className="num ml-auto font-normal text-console-muted">
                  {String(c.startH).padStart(2, "0")}~{String(c.endH).padStart(2, "0")}시
                </span>
              </span>
              <span className="block text-[11px] leading-snug text-console-muted">
                {c.reason}
              </span>
              <span className="mt-1 block text-[10px] text-console-muted/80">
                {pa?.permit.title} + {pb?.permit.title}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 border-t border-console-border pt-1.5 text-[10px] leading-snug text-console-muted/80">
        위험 단계는 시연용 규칙으로 계산됩니다 · {PERMITS_NOTE}
      </p>
    </section>
  );
}
