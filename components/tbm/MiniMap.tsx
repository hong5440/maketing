"use client";

import { useMemo } from "react";
import { BAY_WATER, COASTLINE } from "@/data/geography";
import { ZONES, getZone } from "@/data/zones";

/**
 * 사례 카드용 미니맵 — 사업장 윤곽 + 해당 구역 강조 (인쇄 친화 밝은 톤).
 */
export function MiniMap({ zoneId, size = 128 }: { zoneId: number; size?: number }) {
  const zone = getZone(zoneId);
  const poly = (pts: { x: number; z: number }[]) =>
    pts.map((p) => `${p.x},${100 - p.z}`).join(" ");

  const zoneRects = useMemo(
    () =>
      ZONES.map((z) => {
        const { w, d, rotation } = z.footprint;
        return {
          id: z.id,
          cx: z.center.x,
          cy: 100 - z.center.z,
          w,
          d,
          rot: -rotation,
        };
      }),
    [],
  );

  if (!zone) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="shrink-0 rounded-md border border-gray-300 bg-[#eef3f0]"
      role="img"
      aria-label={`${zone.name} 위치`}
    >
      <polygon points={poly(BAY_WATER.points)} fill="#cfe4f2" />
      <polyline
        points={poly(COASTLINE.points)}
        fill="none"
        stroke="#8fb4c9"
        strokeWidth={0.8}
      />
      {zoneRects.map((r) => (
        <g key={r.id} transform={`translate(${r.cx} ${r.cy}) rotate(${r.rot})`}>
          <rect
            x={-r.w / 2}
            y={-r.d / 2}
            width={r.w}
            height={r.d}
            fill={r.id === zoneId ? "#ef4444" : "#b9c2c6"}
            fillOpacity={r.id === zoneId ? 0.9 : 0.5}
            stroke={r.id === zoneId ? "#b91c1c" : "none"}
            strokeWidth={0.6}
          />
        </g>
      ))}
      {/* 강조 핀 */}
      <circle
        cx={zone.center.x}
        cy={100 - zone.center.z}
        r={5.5}
        fill="none"
        stroke="#ef4444"
        strokeWidth={1.4}
      />
    </svg>
  );
}
