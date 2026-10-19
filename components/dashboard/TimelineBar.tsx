"use client";

import { HAZARD_TYPES, LANG_LABELS, REPORTER_LANGS } from "@/lib/domain";
import type { DashFilters } from "@/lib/dashboardStats";

/**
 * 하단 타임 슬라이더 + 필터 바.
 * 지난 8주를 재생하며 핫스팟이 생겨나는 과정을 보여준다 (발표 하이라이트).
 */
export function TimelineBar({
  minMs,
  maxMs,
  simNowMs,
  playing,
  onSimNowChange,
  onPlayToggle,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
}: {
  minMs: number;
  maxMs: number;
  simNowMs: number;
  playing: boolean;
  onSimNowChange: (ms: number) => void;
  onPlayToggle: () => void;
  viewMode: "heatmap" | "bars" | "off";
  onViewModeChange: (m: "heatmap" | "bars" | "off") => void;
  filters: DashFilters;
  onFiltersChange: (f: DashFilters) => void;
}) {
  const dateLabel = new Date(simNowMs).toISOString().slice(0, 10);
  const selectCls =
    "rounded border border-console-border bg-console-panel px-1.5 py-1 text-[11px]";

  return (
    <div className="absolute inset-x-3 bottom-3 rounded-xl border border-console-border bg-console-panel/85 px-3 py-2 backdrop-blur">
      {/* 타임라인 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPlayToggle}
          className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-risk-warning text-sm font-bold text-black hover:brightness-110"
          aria-label={playing ? "일시정지" : "8주 재생"}
          title="지난 8주 재생"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={minMs}
          max={maxMs}
          step={3600_000}
          value={simNowMs}
          onChange={(e) => onSimNowChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-risk-warning"
          aria-label="타임라인"
        />
        <span className="w-24 shrink-0 text-right font-mono text-xs text-console-text">
          {dateLabel}
        </span>
      </div>

      {/* 보기 모드 + 필터 */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <div className="flex overflow-hidden rounded-md border border-console-border">
          {(
            [
              ["heatmap", "히트맵"],
              ["bars", "3D 막대"],
              ["off", "끄기"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2.5 py-1 ${
                viewMode === mode
                  ? "bg-risk-warning font-bold text-black"
                  : "bg-console-panel text-console-muted hover:text-console-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="ml-1 text-console-muted">필터</span>
        <select
          className={selectCls}
          value={filters.periodWeeks}
          onChange={(e) =>
            onFiltersChange({ ...filters, periodWeeks: Number(e.target.value) })
          }
          aria-label="기간"
        >
          {[1, 2, 4, 8].map((w) => (
            <option key={w} value={w}>
              최근 {w}주
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={filters.hazardType}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              hazardType: e.target.value as DashFilters["hazardType"],
            })
          }
          aria-label="위험유형"
        >
          <option value="all">전체 유형</option>
          {HAZARD_TYPES.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={filters.shift}
          onChange={(e) =>
            onFiltersChange({ ...filters, shift: e.target.value as DashFilters["shift"] })
          }
          aria-label="주간/야간"
        >
          <option value="all">주·야간 전체</option>
          <option value="day">주간 (06~20시)</option>
          <option value="night">야간 (20~06시)</option>
        </select>
        <select
          className={selectCls}
          value={filters.lang}
          onChange={(e) =>
            onFiltersChange({ ...filters, lang: e.target.value as DashFilters["lang"] })
          }
          aria-label="언어"
        >
          <option value="all">전체 언어</option>
          {REPORTER_LANGS.map((l) => (
            <option key={l} value={l}>
              {LANG_LABELS[l]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
