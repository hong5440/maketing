"use client";

import { useState } from "react";

/**
 * 경량 SVG 차트 (도넛 + 주차별 라인).
 * 팔레트는 lib/dashboardStats의 검증된 시리즈 색을 호출부에서 주입한다.
 * 텍스트는 항상 텍스트 토큰(console-text/muted), 색은 마크에만.
 */

export interface DonutDatum {
  label: string;
  count: number;
  color: string;
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

export function Donut({ data, size = 120 }: { data: DonutDatum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const [hover, setHover] = useState<number | null>(null);
  if (total === 0) {
    return <p className="text-xs text-console-muted">표시할 보고가 없습니다.</p>;
  }
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const gap = 0.035; // 세그먼트 사이 서피스 갭
  let acc = -Math.PI / 2;
  const segs = data.map((d, i) => {
    const frac = d.count / total;
    const a0 = acc + gap / 2;
    const a1 = acc + Math.max(frac * Math.PI * 2 - gap / 2, 0.02);
    acc += frac * Math.PI * 2;
    return { ...d, a0, a1, i };
  });
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} role="img" aria-label="위험유형 분포 도넛 차트">
        {segs.map((s) => (
          <path
            key={s.label}
            d={arcPath(cx, cy, r, s.a0, s.a1)}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === s.i ? 16 : 13}
            strokeLinecap="butt"
            onMouseEnter={() => setHover(s.i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-console-text num"
          fontSize={20}
          fontWeight={700}
        >
          {hover != null ? segs[hover].count : total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-console-muted"
          fontSize={10}
        >
          {hover != null ? segs[hover].label : "전체 건"}
        </text>
      </svg>
      <ul className="space-y-1 text-xs">
        {data.map((d, i) => (
          <li
            key={d.label}
            className={`flex items-center gap-1.5 ${hover === i ? "text-console-text" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span>{d.label}</span>
            <span className="text-console-muted">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeeklyLine({
  values,
  color = "#3987e5",
  height = 96,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 300;
  const H = height;
  const padX = 8;
  const padY = 14;
  const max = Math.max(...values, 1);
  const x = (i: number) => padX + (i / (values.length - 1)) * (W - padX * 2);
  const y = (v: number) => H - padY - (v / max) * (H - padY * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${padX},${H - padY} ${points} ${W - padX},${H - padY}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="주차별 보고 추이"
      onMouseMove={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0;
        let bd = Infinity;
        values.forEach((_, i) => {
          const d = Math.abs(x(i) - mx);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        setHover(best);
      }}
      onMouseLeave={() => setHover(null)}
    >
      {/* 격자 (은은하게) */}
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1={padX}
          x2={W - padX}
          y1={y(max * f)}
          y2={y(max * f)}
          stroke="#1f2a3f"
          strokeWidth={1}
        />
      ))}
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={hover === i ? 4.5 : 3}
          fill={color}
          stroke="#111827"
          strokeWidth={2}
        />
      ))}
      {hover != null && (
        <g>
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padY - 4}
            y2={H - padY}
            stroke="#7b8aa3"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={Math.min(Math.max(x(hover), 22), W - 22)}
            y={y(values[hover]) - 9}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            className="fill-console-text"
          >
            {values[hover]}건
          </text>
        </g>
      )}
      {/* X 라벨: 처음/끝만 */}
      <text x={padX} y={H - 2} fontSize={9} className="fill-console-muted">
        {values.length - 1}주 전
      </text>
      <text x={W - padX} y={H - 2} fontSize={9} textAnchor="end" className="fill-console-muted">
        이번 주
      </text>
    </svg>
  );
}
