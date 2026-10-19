"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getZone } from "@/data/zones";
import type { NearMissReport } from "@/lib/domain";
import {
  detectHotspots,
  type HotspotAlert,
} from "@/lib/ai/detectHotspots";
import { apiExplainAlert, apiGetReports } from "@/lib/clientApi";
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
import { QrPanel } from "./QrPanel";
import { LoadingSplash } from "./LoadingSplash";
import { DEMO_TOTAL_STEPS, DemoDirector } from "./DemoDirector";
import { apiSubmitReport } from "@/lib/clientApi";

const YardScene = dynamic(() => import("@/components/yard3d/YardScene"), {
  ssr: false,
  loading: () => <LoadingSplash />,
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
  const [showQr, setShowQr] = useState(false);
  // ── 발표용 데모 시나리오 모드 (D 토글, ←→ 이동, Shift+N 자막) ──
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [demoCaptions, setDemoCaptions] = useState(true);
  const demoActive = demoStep != null;

  // ── 데이터 로드 (서버 API → 없으면 정적 데모 폴백) ───
  useEffect(() => {
    apiGetReports()
      .then((list) => {
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

  // ── 실시간 반영: 2.5초 폴링으로 새 보고 수신 ───────
  const simNowRef = useRef(simNowMs);
  simNowRef.current = simNowMs;
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(async () => {
      try {
        const list = await apiGetReports();
        setReports((prev) => {
          if (list.length === prev.length) return prev;
          const prevMax = prev.reduce(
            (m, r) => Math.max(m, Date.parse(r.createdAt)),
            0,
          );
          const newMax = list.reduce(
            (m, r) => Math.max(m, Date.parse(r.createdAt)),
            0,
          );
          // "라이브" 위치(타임라인 끝)에서 보고 있었다면 새 보고 시각으로 따라감
          if (newMax > prevMax && simNowRef.current >= prevMax - 3600_000) {
            setSimNowMs(newMax);
          }
          return list;
        });
      } catch {
        /* 다음 폴링에서 재시도 */
      }
    }, 2500);
    return () => clearInterval(id);
  }, [loaded]);

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
        apiExplainAlert(alert, simNowMs)
          .then((explanation) => {
            setExplains((e) => ({
              ...e,
              [alert.id]: { loading: false, data: explanation },
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

  // ── 데모 모드: 키보드 ───────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (
        (e.key === "d" || e.key === "D") &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey
      ) {
        e.preventDefault();
        setDemoStep((s) => (s == null ? 1 : null));
      } else if (e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        setDemoCaptions((c) => !c);
      } else if (demoActive && e.key === "ArrowRight") {
        e.preventDefault();
        setDemoStep((s) => Math.min(DEMO_TOTAL_STEPS, (s ?? 1) + 1));
      } else if (demoActive && e.key === "ArrowLeft") {
        e.preventDefault();
        setDemoStep((s) => Math.max(1, (s ?? 1) - 1));
      } else if (demoActive && e.key === "Escape") {
        setDemoStep(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demoActive]);

  // ── 데모 모드: 단계별 연출 ──────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (demoStep == null) {
      setPlaying(false);
      return;
    }
    setShowQr(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    switch (demoStep) {
      case 1: // 오프닝: 전경, 밤 → 낮, 천천히 회전
        setViewMode("off");
        setSelectedZoneId(null);
        setSelectedAlertId(null);
        setPlaying(false);
        setSimNowMs(range.max);
        setNight(true);
        timers.push(setTimeout(() => setNight(false), 2800));
        break;
      case 2: // 8주 타임랩스: 1도크가 붉어지는 과정
        setNight(false);
        setViewMode("heatmap");
        setSelectedZoneId(null);
        setSelectedAlertId(null);
        setSimNowMs(range.min + WEEK_MS);
        timers.push(setTimeout(() => setPlaying(true), 800));
        break;
      case 3: // 휴대폰 보고 → 지도에 점 낙하
        setNight(false);
        setPlaying(false);
        setSimNowMs(range.max);
        setViewMode("heatmap");
        setSelectedZoneId(null);
        setSelectedAlertId(null);
        break;
      case 4: // 1도크 경보 줌인 + AI 설명 (경보 선택은 아래 별도 효과)
        setPlaying(false);
        setSimNowMs((t) => Math.max(t, range.max));
        setViewMode("heatmap");
        break;
      case 5: // TBM (iframe 오버레이)
      case 6: // 피날레
        setPlaying(false);
        break;
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStep, loaded]);

  // 4단계: 1도크 경보 카드 자동 선택 (+카메라 줌인 + AI 설명)
  useEffect(() => {
    if (demoStep !== 4) return;
    const target = alerts.find((a) => a.zoneId === 1) ?? alerts[0];
    if (target && selectedAlertId !== target.id) handleAlertClick(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStep, alerts]);

  return (
    <main className="flex h-dvh min-w-0">
      {/* ── 3D 맵 ─────────────────────────────────── */}
      <section className="relative min-w-0 flex-1 border-r border-console-border">
        <YardScene
          night={night}
          quality={quality}
          autoRotate={demoStep === 1}
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

        <header className="pointer-events-none absolute left-4 top-4 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.webp"
            alt=""
            className="h-10 w-10 rounded-xl border border-console-border/60 shadow-lg"
          />
          <div>
            <h1 className="text-lg font-bold leading-tight drop-shadow">
              아차사고 레이더
            </h1>
            <p className="text-xs text-console-muted drop-shadow">
              한화오션 거제사업장 관제 대시보드
            </p>
          </div>
        </header>

        <div
          className={`absolute right-4 top-4 flex gap-2 text-xs ${demoActive ? "hidden" : ""}`}
        >
          <button
            onClick={() => setShowQr(true)}
            className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
            title="구역별 보고 QR 코드"
          >
            📱 QR
          </button>
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

        {showQr && <QrPanel onClose={() => setShowQr(false)} />}

        {(!demoActive || demoStep === 2) && (
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
        )}

        {demoActive && (
          <DemoDirector
            step={demoStep}
            captions={demoCaptions}
            setStep={(up) => setDemoStep((s) => up(s ?? 1))}
            onExit={() => setDemoStep(null)}
            toggleCaptions={() => setDemoCaptions((c) => !c)}
            onSubmitDemoReport={() => {
              void apiSubmitReport({
                text:
                  "Cần cẩu đang nâng block, bu lông rơi xuống lối đi bên dưới, suýt trúng người!\n(위험유형 힌트: 낙하)",
                zoneId: 1,
                lang: "vi",
                reporterAnonymous: true,
              });
            }}
          />
        )}
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
