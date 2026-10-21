"use client";

import { useMemo } from "react";
import { ZONES, ZONE_KIND_COLORS, type Zone } from "@/data/zones";
import type { TimeOfDay } from "@/components/yard3d/coords";
import { COASTLINE } from "@/data/geography";
import type { DashKpis } from "@/lib/dashboardStats";

/**
 * 디지털 트윈 관제 HUD 크롬 — 참조 이미지 기반.
 * 브랜드 플레이트 / 상태 스트립 / 좌측 네비 레일 / 하단 독 바 / 미니맵 / 현황 패널.
 * 아이콘은 전부 currentColor 스트로크 SVG (이모지 금지 — 상태는 CSS 색으로).
 */

/* ── 아이콘 (24px, stroke 1.8, currentColor) ───────── */

function Icon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const IC = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6",
  heat: "M12 3c2.5 3 5 5.6 5 9a5 5 0 0 1-10 0c0-1.2.3-2.3.9-3.4C8.6 10 10 11 10 12.5A2.4 2.4 0 0 0 12.4 15c1.4 0 2.6-1.1 2.6-2.7C15 9.4 13.4 6.6 12 3Z",
  bars: "M5 21V12M12 21V5M19 21v-9M3 21h18",
  eyeOff:
    "M4 4l16 16M10.6 6.3A8.9 8.9 0 0 1 12 6c5 0 8.6 4.2 9.5 6-.3.7-1.2 2-2.6 3.2M6.9 6.9C4.8 8.2 3.3 10.3 2.5 12c.9 1.8 4.5 6 9.5 6 1.3 0 2.5-.3 3.6-.8M9.9 9.9a3 3 0 0 0 4.2 4.2",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  dusk: "M12 13a4 4 0 0 1 4 4H8a4 4 0 0 1 4-4Zm0-9v3M5.6 7.6 7 9M18.4 7.6 17 9M3 17h2m14 0h2M2 21h20",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
  gauge:
    "M12 14l4-5M12 21a9 9 0 1 1 9-9M17 20a9 9 0 0 0 4-7.4",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v2M17 20h3",
  bell: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2.2 2.2 0 0 0 4 0",
  play: "M7 4.5v15l13-7.5L7 4.5Z",
  pause: "M7 4.5h3.4v15H7zM13.6 4.5H17v15h-3.4z",
  layers:
    "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 5 9-5",
  radar:
    "M12 12 18.5 7A8.5 8.5 0 1 1 12 3.5M12 12V7.6M12 12h.01",
  compass:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z",
};

/* ── 상단 좌측: 브랜드 플레이트 ────────────────────── */

export function BrandPlate() {
  return (
    <div className="holo-plate holo-plate-brand pointer-events-none absolute left-0 top-0 z-20 flex items-center gap-3 py-3 pl-4 pr-10">
      <span className="holo-slashes" aria-hidden>
        <i /><i /><i />
      </span>
      <div>
        <h1 className="text-[17px] font-extrabold leading-tight tracking-wide">
          아차사고 레이더
        </h1>
        <p className="text-[11px] leading-tight text-console-muted">
          한화오션 거제사업장 · 안전 디지털 트윈
        </p>
      </div>
    </div>
  );
}

/* ── 상단 우측: 날씨 + 안전지수 스트립 ─────────────── */

export function StatusStrip({ activeAlerts }: { activeAlerts: number }) {
  const safety =
    activeAlerts === 0
      ? { label: "정상", color: "text-risk-safe", ring: "border-risk-safe/50" }
      : activeAlerts <= 2
        ? { label: "주의", color: "text-risk-warning", ring: "border-risk-warning/50" }
        : { label: "위험", color: "text-risk-danger", ring: "border-risk-danger/60" };
  return (
    <div className="holo-panel flex items-stretch divide-x divide-console-border/70 text-xs">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-console-muted"><Icon d={IC.sun} /></span>
        <div>
          <p className="num text-sm font-bold leading-tight">24°C</p>
          <p className="text-[10px] leading-tight text-console-muted">맑음</p>
        </div>
      </div>
      <div className="flex items-center px-3 py-2">
        <div>
          <p className="num text-sm font-bold leading-tight">3.2<span className="text-[10px] font-medium text-console-muted"> m/s</span></p>
          <p className="text-[10px] leading-tight text-console-muted">풍속 · 파고 0.5m</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${safety.ring} ${safety.color}`}>
          <Icon d={IC.radar} />
        </span>
        <div>
          <p className={`text-sm font-bold leading-tight ${safety.color}`}>{safety.label}</p>
          <p className="text-[10px] leading-tight text-console-muted">안전지수</p>
        </div>
      </div>
    </div>
  );
}

/* ── 좌측 네비 레일 (보기 모드) ────────────────────── */

function RailButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`pressable flex w-full flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center text-[10px] font-semibold leading-[1.15] break-keep transition-colors ${
        active
          ? "border-holo/70 bg-holo/15 text-holo shadow-[0_0_10px_rgba(60,199,255,0.25)]"
          : "border-transparent text-console-muted hover:border-console-border hover:text-console-text"
      }`}
    >
      <Icon d={icon} />
      {label}
    </button>
  );
}

export function NavRail({
  viewMode,
  onViewMode,
  tod,
  onTod,
  quality,
  onQuality,
  onHome,
}: {
  viewMode: "forecast" | "heatmap" | "bars" | "off";
  onViewMode: (m: "forecast" | "heatmap" | "bars" | "off") => void;
  tod: TimeOfDay;
  onTod: () => void;
  quality: "low" | "high";
  onQuality: () => void;
  onHome: () => void;
}) {
  const todMeta =
    tod === "day"
      ? { icon: IC.sun, label: "낮" }
      : tod === "dusk"
        ? { icon: IC.dusk, label: "해질녘" }
        : { icon: IC.moon, label: "밤" };
  return (
    <nav
      aria-label="보기 모드"
      className="holo-panel absolute left-3 top-1/2 z-20 flex w-[64px] -translate-y-1/2 flex-col gap-1 p-1.5"
    >
      <RailButton icon={IC.home} label="전체 현황" onClick={onHome} />
      <RailButton icon={IC.radar} label="위험 예보" active={viewMode === "forecast"} onClick={() => onViewMode("forecast")} />
      <RailButton icon={IC.heat} label="히트맵" active={viewMode === "heatmap"} onClick={() => onViewMode("heatmap")} />
      <RailButton icon={IC.bars} label="3D 막대" active={viewMode === "bars"} onClick={() => onViewMode("bars")} />
      <RailButton icon={IC.eyeOff} label="오버레이" active={viewMode === "off"} onClick={() => onViewMode("off")} />
      <div className="mx-2 my-0.5 border-t border-console-border/70" />
      <RailButton icon={todMeta.icon} label={todMeta.label} onClick={onTod} />
      <RailButton icon={IC.gauge} label={quality === "high" ? "고품질" : "저품질"} active={quality === "high"} onClick={onQuality} />
    </nav>
  );
}

/* ── 하단 중앙: 독 바 (액션) ───────────────────────── */

function DockButton({
  icon,
  label,
  onClick,
  active = false,
  badge,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`pressable relative flex min-w-[84px] flex-col items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold ${
        active ? "text-holo" : "text-console-muted hover:text-console-text"
      }`}
    >
      <Icon d={icon} filled={false} />
      {label}
      {badge != null && badge > 0 && (
        <span className="num absolute -top-0.5 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-danger px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export function DockBar({
  playing,
  onPlay,
  onHome,
  onCycleLayer,
  onQr,
  alerts,
  onAlerts,
}: {
  playing: boolean;
  onPlay: () => void;
  onHome: () => void;
  onCycleLayer: () => void;
  onQr: () => void;
  alerts: number;
  onAlerts: () => void;
}) {
  return (
    <div className="holo-plate holo-plate-dock absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 px-7 py-1.5">
      <DockButton icon={IC.home} label="전체 보기" onClick={onHome} />
      <span className="h-6 w-px bg-console-border/80" />
      <DockButton icon={IC.layers} label="레이어 전환" onClick={onCycleLayer} />
      <span className="h-6 w-px bg-console-border/80" />
      <DockButton icon={playing ? IC.pause : IC.play} label={playing ? "일시정지" : "8주 재생"} active={playing} onClick={onPlay} />
      <span className="h-6 w-px bg-console-border/80" />
      <DockButton icon={IC.bell} label="경보" badge={alerts} onClick={onAlerts} />
      <span className="h-6 w-px bg-console-border/80" />
      <DockButton icon={IC.qr} label="보고 QR" onClick={onQr} />
    </div>
  );
}

/* ── 하단 좌측: 슬로건 ─────────────────────────────── */

export function Slogan() {
  return (
    <p className="pointer-events-none absolute bottom-5 left-5 z-10 text-[22px] font-extrabold leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
      10초의 보고가,
      <br />더 안전한 내일을 만듭니다.
    </p>
  );
}

/* ── 우하단: 미니맵 (평면도 + 범례 + 나침반) ───────── */

function zoneRect(z: Zone) {
  // 정규화 좌표(0~100, 북=z+) → SVG(0~100, 북=위) : y = 100 - z
  const cx = z.center.x;
  const cy = 100 - z.center.z;
  return {
    x: cx - z.footprint.w / 2,
    y: cy - z.footprint.d / 2,
    w: z.footprint.w,
    h: z.footprint.d,
    // 평면 CCW 회전 == SVG 반시계 = 음수 각
    transform: `rotate(${-z.footprint.rotation} ${cx} ${cy})`,
  };
}

const KIND_LABELS: { kind: keyof typeof ZONE_KIND_COLORS; label: string }[] = [
  { kind: "dock", label: "도크" },
  { kind: "factory", label: "공장동" },
  { kind: "office", label: "지원시설" },
];

export function MiniMap({
  selectedZoneId,
  alertZoneIds,
  onSelect,
}: {
  selectedZoneId: number | null;
  alertZoneIds: number[];
  onSelect: (id: number) => void;
}) {
  const coast = useMemo(
    () =>
      COASTLINE.points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${100 - p.z}`)
        .join(" "),
    [],
  );
  return (
    <div className="holo-panel absolute bottom-3 right-3 z-20 w-[228px] p-2.5">
      <div className="flex gap-2">
        <svg viewBox="8 16 90 40" className="h-[96px] flex-1 rounded-md bg-[#071626]">
          {/* 북쪽 바다 */}
          <path d={`${coast} L98,0 L8,0 Z`} fill="#0b2a44" opacity={0.9} />
          <path d={coast} fill="none" stroke="#3cc7ff" strokeWidth={0.4} opacity={0.5} />
          {ZONES.filter((z) => z.kind !== "water").map((z) => {
            const r = zoneRect(z);
            const alert = alertZoneIds.includes(z.id);
            const sel = selectedZoneId === z.id;
            return (
              <rect
                key={z.id}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                transform={r.transform}
                rx={0.6}
                fill={alert ? "#ef4444" : ZONE_KIND_COLORS[z.kind]}
                opacity={sel ? 1 : alert ? 0.95 : 0.55}
                stroke={sel ? "#3cc7ff" : "none"}
                strokeWidth={sel ? 0.8 : 0}
                className="cursor-pointer"
                onClick={() => onSelect(z.id)}
              >
                <title>{`${z.id}. ${z.name}`}</title>
              </rect>
            );
          })}
        </svg>
        {/* 나침반 */}
        <div className="flex flex-col items-center justify-start gap-0.5 pt-1 text-console-muted">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" opacity={0.5} />
            <path d="M12 5l2.5 7L12 10l-2.5 2L12 5Z" fill="#3cc7ff" stroke="none" />
          </svg>
          <span className="text-[9px] font-bold text-holo">N</span>
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-console-muted">
        {KIND_LABELS.map(({ kind, label }) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: ZONE_KIND_COLORS[kind] }} />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-risk-danger" />
          경보 구역
        </li>
      </ul>
    </div>
  );
}

/* ── 우측: 실시간 안전 현황 패널 (KPI 행) ──────────── */

export function OverviewRows({ kpis }: { kpis: DashKpis }) {
  const rows = [
    {
      label: "이번 주 보고",
      value: `${kpis.thisWeek}건`,
      sub:
        kpis.deltaPct == null
          ? "전주 데이터 없음"
          : `전주 대비 ${kpis.deltaPct >= 0 ? "+" : ""}${kpis.deltaPct}%`,
      tone: kpis.deltaPct != null && kpis.deltaPct > 0 ? "text-risk-warning" : "text-risk-safe",
      dot: "#3987e5",
    },
    {
      label: "활성 경보",
      value: `${kpis.activeAlerts}건`,
      sub: kpis.activeAlerts > 0 ? "조치 필요" : "정상",
      tone: kpis.activeAlerts > 0 ? "text-risk-danger" : "text-risk-safe",
      dot: "#d95926",
    },
    {
      label: "외국어 보고 비율",
      value: `${Math.round(kpis.foreignRatio * 100)}%`,
      sub: "최근 7일",
      tone: "text-console-muted",
      dot: "#199e70",
    },
    {
      label: "평균 조치 시간",
      value: `${kpis.avgActionHours}시간`,
      sub: "조치완료 기준",
      tone: "text-console-muted",
      dot: "#c98500",
    },
  ];
  return (
    <ul className="divide-y divide-console-border/60">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2.5 py-2 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.dot }} />
          <span className="text-console-muted">{r.label}</span>
          <span className="ml-auto text-right">
            <span className="num block text-sm font-bold leading-tight">{r.value}</span>
            <span className={`block text-[10px] leading-tight ${r.tone}`}>{r.sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
