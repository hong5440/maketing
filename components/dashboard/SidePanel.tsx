"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { HotspotAlert } from "@/lib/ai/detectHotspots";
import type { NearMissReport } from "@/lib/domain";
import { LANG_LABELS } from "@/lib/domain";
import {
  CHART_OTHER,
  CHART_SERIES,
  type DashKpis,
  hazardDistribution,
  inWindow,
  riskColor,
  weeklyCounts,
} from "@/lib/dashboardStats";
import { getZone } from "@/data/zones";
import { Donut, WeeklyLine } from "./charts";

export interface AlertExplainState {
  loading: boolean;
  data?: {
    pattern: string;
    riskReason: string;
    recommendedActions: string[];
    demo: boolean;
  };
  error?: string;
}

function Kpi({
  label,
  value,
  sub,
  subClass,
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="rounded-lg border border-console-border bg-console-bg/60 px-3 py-2.5">
      <p className="text-[11px] text-console-muted">{label}</p>
      <p className="num mt-0.5 text-xl font-bold leading-tight">{value}</p>
      {sub && <p className={`text-[11px] ${subClass ?? "text-console-muted"}`}>{sub}</p>}
    </div>
  );
}

export function KpiRow({ kpis }: { kpis: DashKpis }) {
  const delta =
    kpis.deltaPct == null
      ? "전주 데이터 없음"
      : `전주 대비 ${kpis.deltaPct >= 0 ? "+" : ""}${kpis.deltaPct}%`;
  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <Kpi
        label="이번 주 보고"
        value={`${kpis.thisWeek}건`}
        sub={delta}
        subClass={
          kpis.deltaPct != null && kpis.deltaPct > 0 ? "text-risk-warning" : "text-risk-safe"
        }
      />
      <Kpi
        label="활성 경보"
        value={`${kpis.activeAlerts}건`}
        sub={kpis.activeAlerts > 0 ? "조치 필요" : "정상"}
        subClass={kpis.activeAlerts > 0 ? "text-risk-danger" : "text-risk-safe"}
      />
      <Kpi label="외국어 보고 비율" value={`${Math.round(kpis.foreignRatio * 100)}%`} sub="최근 7일" />
      <Kpi label="평균 조치 시간" value={`${kpis.avgActionHours}시간`} sub="조치완료 기준" />
    </div>
  );
}

export function AlertCard({
  alert,
  selected,
  onClick,
  explain,
  evidence,
}: {
  alert: HotspotAlert;
  selected: boolean;
  onClick: () => void;
  explain?: AlertExplainState;
  evidence: NearMissReport[];
}) {
  const zone = getZone(alert.zoneId);
  const pct = Math.round((alert.increaseRatio - 1) * 100);
  return (
    <div
      className={`rounded-lg border transition-colors ${
        selected
          ? "border-risk-danger/70 bg-risk-danger/10"
          : "border-console-border bg-console-bg/60 hover:border-console-muted/50"
      }`}
    >
      <button onClick={onClick} className="w-full px-3 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 shrink-0 animate-pulse items-center justify-center rounded-full bg-risk-danger text-[11px] font-bold text-white">
            {alert.zoneId}
          </span>
          <span className="truncate text-sm font-semibold">
            {zone?.name.split("·")[0] ?? `${alert.zoneId}구역`}
          </span>
          <span className="whitespace-nowrap rounded bg-console-panel px-1.5 py-0.5 text-[11px] text-console-text">
            {alert.hazardType}
          </span>
          <span className="num ml-auto shrink-0 text-sm font-bold text-risk-danger">
            +{pct}%
          </span>
        </div>
        <p className="mt-1 text-[11px] text-console-muted">
          최근 7일 {alert.recentCount}건 · 이전 4주 평균 {alert.baselineWeekly.toFixed(1)}건/주
          · p={alert.pValue < 0.001 ? alert.pValue.toExponential(1) : alert.pValue.toFixed(3)}
        </p>
      </button>

      {selected && (
        <div className="border-t border-console-border/60 px-3 py-2.5 text-xs">
          {!explain || explain.loading ? (
            <p className="animate-pulse text-console-muted">AI가 패턴을 분석하는 중…</p>
          ) : explain.error ? (
            <p className="text-risk-warning">{explain.error}</p>
          ) : explain.data ? (
            <div className="space-y-2">
              <div>
                <p className="mb-0.5 font-semibold text-console-muted">패턴</p>
                <p>{explain.data.pattern}</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold text-console-muted">왜 위험한가</p>
                <p>{explain.data.riskReason}</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold text-console-muted">권장 조치</p>
                <ol className="list-decimal space-y-0.5 pl-4">
                  {explain.data.recommendedActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
              {explain.data.demo && (
                <p className="text-[10px] text-console-muted">· 데모 모드 응답</p>
              )}
            </div>
          ) : null}

          {evidence.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 font-semibold text-console-muted">
                근거 보고서 {evidence.length}건
              </p>
              <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {evidence.map((r) => (
                  <li key={r.id} className="rounded bg-console-panel/80 px-2 py-1.5">
                    <p className="text-[10px] text-console-muted">
                      {r.createdAt.slice(5, 16).replace("T", " ")} ·{" "}
                      {LANG_LABELS[r.reporterLang]} · 심각도 {r.severity}
                    </p>
                    <p>{r.translatedKo}</p>
                    {r.reporterLang !== "ko" && (
                      <p className="mt-0.5 text-[10px] text-console-muted">원문: {r.rawText}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ZoneDetail({
  zoneId,
  reports,
  simNowMs,
  onClose,
}: {
  zoneId: number;
  reports: NearMissReport[];
  simNowMs: number;
  onClose: () => void;
}) {
  const zone = getZone(zoneId);
  const zoneReports = useMemo(
    () => inWindow(reports.filter((r) => r.zoneId === zoneId), simNowMs, 8),
    [reports, zoneId, simNowMs],
  );
  const donutData = useMemo(() => {
    const dist = hazardDistribution(zoneReports);
    const top: { label: string; count: number; color: string }[] = dist
      .slice(0, 5)
      .map((d, i) => ({
        label: d.hazardType as string,
        count: d.count,
        color: CHART_SERIES[i] as string,
      }));
    const rest = dist.slice(5).reduce((s, d) => s + d.count, 0);
    if (rest > 0) top.push({ label: "기타 유형", count: rest, color: CHART_OTHER });
    return top;
  }, [zoneReports]);
  const weekly = useMemo(
    () => weeklyCounts(zoneReports, simNowMs, 8),
    [zoneReports, simNowMs],
  );
  const feed = useMemo(
    () =>
      [...zoneReports]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12),
    [zoneReports],
  );

  if (!zone) return null;
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold">
          {zone.id}. {zone.name}
        </h3>
        <button
          onClick={onClose}
          className="ml-auto rounded px-1.5 text-console-muted hover:text-console-text"
          aria-label="구역 상세 닫기"
        >
          ✕
        </button>
      </div>

      <Link
        href={`/tbm/${zone.id}`}
        className="pressable mb-3 block rounded-md bg-risk-warning/90 px-3 py-2 text-center text-sm font-bold text-black hover:bg-risk-warning"
      >
        📋 이 구역 내일 TBM 만들기
      </Link>

      <h4 className="mb-1 text-[11px] font-semibold text-console-muted">
        위험유형 분포 (8주)
      </h4>
      <Donut data={donutData} />

      <h4 className="mb-1 mt-3 text-[11px] font-semibold text-console-muted">주차별 추이</h4>
      <WeeklyLine values={weekly} />

      <h4 className="mb-1 mt-3 text-[11px] font-semibold text-console-muted">최근 보고</h4>
      <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-xs">
        {feed.length === 0 && <li className="text-console-muted">기간 내 보고 없음</li>}
        {feed.map((r) => (
          <li key={r.id} className="rounded bg-console-panel/80 px-2 py-1.5">
            <p className="flex items-center gap-1.5 text-[10px] text-console-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: riskColor(r.severity * 20) }}
              />
              {r.createdAt.slice(5, 16).replace("T", " ")} · {r.hazardType} ·{" "}
              {LANG_LABELS[r.reporterLang]}
            </p>
            <p>{r.translatedKo}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
