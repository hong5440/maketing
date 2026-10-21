"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NearMissReport } from "@/lib/domain";
import {
  detectHotspots,
  type HotspotAlert,
} from "@/lib/ai/detectHotspots";
import { apiExplainAlert, apiGetReports } from "@/lib/clientApi";
import {
  DEFAULT_FILTERS,
  HAZARD_COLORS,
  WEEK_MS,
  computeKpis,
  filterByAttrs,
  hazardDistribution,
  inWindow,
  type DashFilters,
} from "@/lib/dashboardStats";
import type { OverlayDot } from "@/components/yard3d/Overlays";
import type { TimeOfDay } from "@/components/yard3d/coords";
import { AlertCard, ZoneDetail, type AlertExplainState } from "./SidePanel";
import { Donut } from "./charts";
import {
  BrandPlate,
  DockBar,
  MiniMap,
  NavRail,
  OverviewRows,
  Slogan,
  StatusStrip,
} from "./HoloChrome";
import { TimelineBar } from "./TimelineBar";
import { QrPanel } from "./QrPanel";
import { LoadingSplash } from "./LoadingSplash";
import { DEMO_TOTAL_STEPS, DemoDirector } from "./DemoDirector";
import { ForecastHourSlider, ForecastPanel } from "./ForecastPanel";
import { forecastAt } from "@/lib/forecast";
import { ConfinedPanel } from "./ConfinedPanel";
import { HeatPanel, useWeather } from "./HeatPanel";
import { feelByZone } from "@/lib/heat";
import { confinedEntries } from "@/lib/confined";
import type { ConfinedMarker } from "@/components/yard3d/ConfinedMarkers";
import { apiSubmitReport } from "@/lib/clientApi";

const YardScene = dynamic(() => import("@/components/yard3d/YardScene"), {
  ssr: false,
  loading: () => <LoadingSplash />,
});

/** 관제 대시보드 루트 — 상태(필터·타임라인·선택)와 3D/패널 연결 */
export function Dashboard() {
  // 접근성: 움직임 줄이기 설정 시 자동 회전 등 장식성 모션 비활성화
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reports, setReports] = useState<NearMissReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState<DashFilters>(DEFAULT_FILTERS);
  // OVERVIEW 첫 화면은 야드 위험 예보 (B-2)
  const [viewMode, setViewMode] = useState<
    "forecast" | "confined" | "heat" | "heatmap" | "bars" | "off"
  >("forecast");
  const [forecastHour, setForecastHour] = useState(14);
  // 발표 기본값: 해 질 녘 (레일에서 낮/해질녘/밤 순환)
  const [tod, setTod] = useState<TimeOfDay>("dusk");
  // 개발용 노출 슬라이더 (?dev=1)
  const [devMode] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("dev=1"),
  );
  const [exposure, setExposure] = useState(1);
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

  // 현황 패널 도넛: 기간 내 위험유형 분포 (상위 5 + 기타)
  const hazardMix = useMemo(() => {
    const dist = hazardDistribution(
      inWindow(attrFiltered, simNowMs, filters.periodWeeks),
    );
    const top = dist.slice(0, 5).map((d) => ({
      label: d.hazardType as string,
      count: d.count,
      color: HAZARD_COLORS[d.hazardType],
    }));
    const rest = dist.slice(5).reduce((s, d) => s + d.count, 0);
    if (rest > 0) top.push({ label: "그 외", count: rest, color: "#717c8e" });
    return top;
  }, [attrFiltered, simNowMs, filters.periodWeeks]);

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
      case 1: // 오프닝: 전경, 밤 → 해 질 녘, 천천히 회전
        setViewMode("off");
        setSelectedZoneId(null);
        setSelectedAlertId(null);
        setPlaying(false);
        setSimNowMs(range.max);
        setTod("night");
        timers.push(setTimeout(() => setTod("dusk"), 2800));
        break;
      case 2: // 8주 타임랩스: 1도크가 붉어지는 과정
        setTod("dusk");
        setViewMode("heatmap");
        setSelectedZoneId(null);
        setSelectedAlertId(null);
        setSimNowMs(range.min + WEEK_MS);
        timers.push(setTimeout(() => setPlaying(true), 800));
        break;
      case 3: // 휴대폰 보고 → 지도에 점 낙하
        setTod("dusk");
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

  // ── 야드 위험 예보 (B-2) — 시연용 규칙 계산 ─────────
  const forecastFrame = useMemo(() => forecastAt(forecastHour), [forecastHour]);
  const forecastByZone = useMemo(() => {
    const m: Record<number, 0 | 1 | 2> = {};
    for (const [id, v] of Object.entries(forecastFrame.byZone)) m[Number(id)] = v.level;
    return m;
  }, [forecastFrame]);

  // ── 폭염 쉼표 (B-4) ────────────────────────────────
  const weather = useWeather();
  const heatByZone = useMemo(() => feelByZone(weather.current), [weather]);

  // ── 밀폐공간 숨길 (B-3) ─────────────────────────────
  const [selectedConfinedId, setSelectedConfinedId] = useState<string | null>(null);
  const confinedMarkers = useMemo<ConfinedMarker[]>(
    () =>
      confinedEntries().map((e) => ({
        permitId: e.interp.permit.id,
        zoneId: e.zoneId,
        danger: e.missingCount > 0,
        title: e.interp.permit.title,
      })),
    [],
  );
  const handleConfinedSelect = useCallback((permitId: string, zoneId: number) => {
    setSelectedConfinedId(permitId);
    setSelectedZoneId(zoneId);
    setSelectedAlertId(null);
  }, []);

  const cycleLayer = useCallback(() => {
    setViewMode((m) =>
      m === "forecast" ? "heatmap" : m === "heatmap" ? "bars" : m === "bars" ? "off" : "forecast",
    );
  }, []);
  const goHome = useCallback(() => {
    setSelectedZoneId(null);
    setSelectedAlertId(null);
  }, []);

  return (
    <main className="relative h-dvh overflow-hidden">
      {/* ── 3D 디지털 트윈 (풀블리드) ───────────────── */}
      <YardScene
        timeOfDay={tod}
        quality={quality}
        exposure={exposure}
        autoRotate={demoStep === 1 && !reduceMotion}
        selectedZoneId={selectedZoneId}
        onZoneSelect={(id) => {
          setSelectedZoneId(id);
          setSelectedAlertId(null);
        }}
        alertZoneIds={alertZoneIds}
        forecastByZone={viewMode === "forecast" ? forecastByZone : undefined}
        confinedMarkers={viewMode === "confined" ? confinedMarkers : undefined}
        selectedConfinedId={selectedConfinedId}
        onConfinedSelect={handleConfinedSelect}
        overlay={{
          mode: viewMode,
          riskByZone: hotspot.riskByZone,
          alertZoneIds,
          dots,
          simNowMs,
          windowMs: filters.periodWeeks * WEEK_MS,
          countByZone,
          forecast: forecastFrame,
          heatByZone,
        }}
      />

      <BrandPlate />

      {!demoActive && viewMode === "forecast" && (
        <ForecastHourSlider hour={forecastHour} onHour={setForecastHour} />
      )}

      {!demoActive && (
        <>
          <NavRail
            viewMode={viewMode}
            onViewMode={setViewMode}
            tod={tod}
            onTod={() =>
              setTod((v) => (v === "day" ? "dusk" : v === "dusk" ? "night" : "day"))
            }
            quality={quality}
            onQuality={() => setQuality((q) => (q === "high" ? "low" : "high"))}
            onHome={goHome}
          />
          <Slogan />
          {devMode && (
            <div className="holo-panel absolute bottom-24 left-3 z-20 flex items-center gap-2 px-3 py-2 text-[11px] text-console-muted">
              노출
              <input
                type="range"
                min={0.4}
                max={2}
                step={0.05}
                value={exposure}
                onChange={(e) => setExposure(Number(e.target.value))}
                className="w-28 accent-holo"
                aria-label="톤매핑 노출"
              />
              <span className="num w-8 text-console-text">{exposure.toFixed(2)}</span>
            </div>
          )}
          <MiniMap
            selectedZoneId={selectedZoneId}
            alertZoneIds={alertZoneIds}
            onSelect={(id) => {
              setSelectedZoneId(id);
              setSelectedAlertId(null);
            }}
          />
          <DockBar
            playing={playing}
            onPlay={handlePlayToggle}
            onHome={goHome}
            onCycleLayer={cycleLayer}
            onQr={() => setShowQr(true)}
            alerts={alerts.length}
            onAlerts={() => {
              if (alerts.length > 0) handleAlertClick(alerts[0]);
            }}
          />
        </>
      )}

      {/* ── 우측 플로팅 패널 스택 ───────────────────── */}
      <aside
        className={`absolute right-3 top-3 z-20 flex w-[360px] flex-col gap-2.5 ${
          demoActive ? "bottom-3" : "bottom-[176px]"
        }`}
      >
        {!demoActive && <StatusStrip activeAlerts={alerts.length} />}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {!loaded ? (
            <div className="holo-panel p-3">
              <p className="animate-pulse text-sm text-console-muted">
                데이터 불러오는 중…
              </p>
            </div>
          ) : (
            <>
              {viewMode === "heat" && (
                <HeatPanel weather={weather} selectedZoneId={selectedZoneId} />
              )}
              {viewMode === "confined" && (
                <ConfinedPanel
                  selectedPermitId={selectedConfinedId}
                  onSelect={handleConfinedSelect}
                />
              )}
              {viewMode === "forecast" && (
                <ForecastPanel
                  frame={forecastFrame}
                  onZoneSelect={(id) => {
                    setSelectedZoneId(id);
                    setSelectedAlertId(null);
                  }}
                />
              )}
              <section className="holo-panel p-3">
                <h2 className="holo-title mb-2">실시간 안전 현황</h2>
                <div className="flex items-center justify-center">
                  <Donut data={hazardMix} size={116} />
                </div>
                <OverviewRows kpis={kpis} />
              </section>

              <section className="holo-panel p-3">
                <h2 className="holo-title mb-2">
                  급증 경보
                  {alerts.length > 0 && (
                    <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-danger px-1 text-[10px] font-bold text-white">
                      {alerts.length}
                    </span>
                  )}
                </h2>
                <div className="space-y-2">
                  {alerts.length === 0 && (
                    <p className="text-xs text-console-muted">
                      현재 급증 경보가 없습니다.
                    </p>
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
                <section className="holo-panel p-3">
                  <ZoneDetail
                    zoneId={selectedZoneId}
                    reports={attrFiltered}
                    simNowMs={simNowMs}
                    onClose={goHome}
                  />
                </section>
              )}
            </>
          )}
        </div>
      </aside>

      {showQr && <QrPanel onClose={() => setShowQr(false)} />}

      {((!demoActive && viewMode !== "forecast" && viewMode !== "confined" && viewMode !== "heat") || demoStep === 2) && (
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
    </main>
  );
}
