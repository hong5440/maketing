"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getZone } from "@/data/zones";
import type { NearMissReport } from "@/lib/domain";
import {
  detectHotspots,
  type HotspotAlert,
} from "@/lib/ai/detectHotspots";
import {
  DEFAULT_FILTERS,
  WEEK_MS,
  computeKpis,
  filterByAttrs,
  inWindow,
  type DashFilters,
} from "@/lib/dashboardStats";
import type { OverlayDot } from "@/components/yard3d/Overlays";
import { AlertCard, KpiRow, ZoneDetail, type AlertExplainState } from "./SidePanel";
import { TimelineBar } from "./TimelineBar";

const YardScene = dynamic(() => import("@/components/yard3d/YardScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-console-muted">
      3D 조선소 불러오는 중…
    </div>
  ),
});

/** 관제 대시보드 루트 — 상태(필터·타임라인·선택)와 3D/패널 연결 */
export function Dashboard() {
  const [reports, setReports] = useState<NearMissReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState<DashFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"heatmap" | "bars" | "off">("heatmap");
  const [night, setNight] = useState(false);
  const [quality, setQuality] = useState<"low" | "high">("high");
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [simNowMs, setSimNowMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [explains, setExplains] = useState<Record<string, AlertExplainState>>({});

  // ── 데이터 로드 ─────────────────────────────────────
  useEffect(() => {
    fetch("/api/reports?limit=1000")
      .then((r) => r.json())
      .then((d) => {
        const list: NearMissReport[] = d.reports ?? [];
        setReports(list);
        const maxT = list.reduce(
          (m, r) => Math.max(m, Date.parse(r.createdAt)),
          0,
        );
        setSimNowMs(maxT || Date.now());
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const range = useMemo(() => {
    if (reports.length === 0) {
      const now = Date.now();
      return { min: now - 8 * WEEK_MS, max: now };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const r of reports) {
      const t = Date.parse(r.createdAt);
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return { min, max };
  }, [reports]);

  // ── 재생 ────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSimNowMs((t) => {
        const next = t + WEEK_MS * 0.12; // 약 1주/0.8초
        if (next >= range.max) {
          setPlaying(false);
          return range.max;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, range.max]);

  const handlePlayToggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && simNowMs >= range.max - 3600_000) {
        // 끝에서 재생 시작 → 처음(1주차 말)부터
        setSimNowMs(range.min + WEEK_MS);
      }
      return !p;
    });
  }, [simNowMs, range.max, range.min]);

  // ── 분석 (클라이언트에서 직접 — detectHotspots는 순수 통계) ──
  const attrFiltered = useMemo(
    () => filterByAttrs(reports, filters),
    [reports, filters],
  );
  const hotspot = useMemo(
    () => detectHotspots(attrFiltered, new Date(simNowMs)),
    [attrFiltered, simNowMs],
  );
  const alerts = hotspot.alerts.slice(0, 6);
  const alertZoneIds = useMemo(
    () => [...new Set(alerts.map((a) => a.zoneId))],
    [alerts],
  );

  const dots = useMemo<OverlayDot[]>(
    () =>
      attrFiltered.map((r) => ({
        id: r.id,
        zoneId: r.zoneId,
        hazardType: r.hazardType,
        t: Date.parse(r.createdAt),
      })),
    [attrFiltered],
  );

  const countByZone = useMemo(() => {
    const m: Record<number, number> = {};
    for (const r of inWindow(attrFiltered, simNowMs, filters.periodWeeks)) {
      m[r.zoneId] = (m[r.zoneId] ?? 0) + 1;
    }
    return m;
  }, [attrFiltered, simNowMs, filters.periodWeeks]);

  const kpis = useMemo(
    () => computeKpis(attrFiltered, simNowMs, alerts.length),
    [attrFiltered, simNowMs, alerts.length],
  );

  const reportById = useMemo(() => {
    const m = new Map<string, NearMissReport>();
    for (const r of reports) m.set(r.id, r);
    return m;
  }, [reports]);

  // ── 경보 선택 → 카메라 이동 + AI 설명 ───────────────
  const explainCacheRef = useRef(new Set<string>());
  const handleAlertClick = useCallback(
    (alert: HotspotAlert) => {
      if (selectedAlertId === alert.id) {
        setSelectedAlertId(null);
        return;
      }
      setSelectedAlertId(alert.id);
      setSelectedZoneId(alert.zoneId);
      if (!explainCacheRef.current.has(alert.id)) {
        explainCacheRef.current.add(alert.id);
        setExplains((e) => ({ ...e, [alert.id]: { loading: true } }));
        fetch(
          `/api/alerts/${encodeURIComponent(alert.id)}/explain?now=${new Date(
            simNowMs,
          ).toISOString()}`,
          { method: "POST" },
        )
          .then(async (r) => {
            if (!r.ok) throw new Error(`분석 실패 (${r.status})`);
            const d = await r.json();
            setExplains((e) => ({
              ...e,
              [alert.id]: { loading: false, data: d.explanation },
            }));
          })
          .catch((err) => {
            explainCacheRef.current.delete(alert.id);
            setExplains((e) => ({
              ...e,
              [alert.id]: { loading: false, error: String(err.message ?? err) },
            }));
          });
      }
    },
    [selectedAlertId, simNowMs],
  );

  const selectedZone = selectedZoneId ? getZone(selectedZoneId) : null;

  return (
    <main className="flex h-dvh min-w-0">
      {/* ── 3D 맵 ─────────────────────────────────── */}
      <section className="relative min-w-0 flex-1 border-r border-console-border">
        <YardScene
          night={night}
          quality={quality}
          selectedZoneId={selectedZoneId}
          onZoneSelect={(id) => {
            setSelectedZoneId(id);
            setSelectedAlertId(null);
          }}
          alertZoneIds={alertZoneIds}
          overlay={{
            mode: viewMode,
            riskByZone: hotspot.riskByZone,
            alertZoneIds,
            dots,
            simNowMs,
            windowMs: filters.periodWeeks * WEEK_MS,
            countByZone,
          }}
        />

        <header className="pointer-events-none absolute left-4 top-4">
          <h1 className="text-lg font-bold drop-shadow">아차사고 레이더</h1>
          <p className="text-xs text-console-muted drop-shadow">
            한화오션 거제사업장 관제 대시보드
          </p>
        </header>

        <div className="absolute right-4 top-4 flex gap-2 text-xs">
          <button
            onClick={() => setNight((v) => !v)}
            className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
          >
            {night ? "☀️ 낮" : "🌙 밤"}
          </button>
          <button
            onClick={() => {
              setSelectedZoneId(null);
              setSelectedAlertId(null);
            }}
            className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
          >
            ⤢ 전체 보기
          </button>
          <button
            onClick={() => setQuality((q) => (q === "high" ? "low" : "high"))}
            className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
            title="품질 프리셋"
          >
            품질: {quality === "high" ? "High" : "Low"}
          </button>
        </div>

        {selectedZone && (
          <div className="absolute bottom-24 left-4 rounded-md border border-console-border bg-console-panel/85 px-3 py-2 text-sm backdrop-blur">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-risk-warning text-xs font-bold text-white">
              {selectedZone.id}
            </span>
            {selectedZone.name}
          </div>
        )}

        <TimelineBar
          minMs={range.min + WEEK_MS}
          maxMs={range.max}
          simNowMs={Math.max(simNowMs, range.min + WEEK_MS)}
          playing={playing}
          onSimNowChange={(ms) => {
            setPlaying(false);
            setSimNowMs(ms);
          }}
          onPlayToggle={handlePlayToggle}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </section>

      {/* ── 사이드 패널 ────────────────────────────── */}
      <aside className="flex w-[400px] shrink-0 flex-col gap-3 overflow-y-auto bg-console-panel p-3 xl:w-[460px]">
        {!loaded ? (
          <p className="animate-pulse text-sm text-console-muted">데이터 불러오는 중…</p>
        ) : (
          <>
            <KpiRow kpis={kpis} />

            <section>
              <h2 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-console-muted">
                급증 경보
                {alerts.length > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-danger px-1 text-[10px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {alerts.length === 0 && (
                  <p className="text-xs text-console-muted">현재 급증 경보가 없습니다.</p>
                )}
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    selected={selectedAlertId === alert.id}
                    onClick={() => handleAlertClick(alert)}
                    explain={explains[alert.id]}
                    evidence={
                      selectedAlertId === alert.id
                        ? alert.reportIds
                            .map((id) => reportById.get(id))
                            .filter((r): r is NearMissReport => !!r)
                        : []
                    }
                  />
                ))}
              </div>
            </section>

            {selectedZoneId != null && (
              <ZoneDetail
                zoneId={selectedZoneId}
                reports={attrFiltered}
                simNowMs={simNowMs}
                onClose={() => {
                  setSelectedZoneId(null);
                  setSelectedAlertId(null);
                }}
              />
            )}
          </>
        )}
      </aside>
    </main>
  );
}
