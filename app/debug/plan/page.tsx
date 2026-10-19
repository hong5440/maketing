import { ZONES, ZONE_KIND_COLORS, type Zone } from "@/data/zones";
import { BAY_WATER, COASTLINE, QUAY_LINES, ROADS } from "@/data/geography";

/**
 * 구역 배치 디버그용 2D 평면도.
 * reference/yard_map.png 조감도와 배치를 눈으로 비교하기 위한 페이지.
 * 평면 좌표(z 북쪽) → SVG(y 아래쪽)로 뒤집어 그린다: svgY = 100 - z
 */

const toSvg = (p: { x: number; z: number }) => ({ x: p.x, y: 100 - p.z });

function polyPoints(points: { x: number; z: number }[]): string {
  return points.map((p) => `${p.x},${100 - p.z}`).join(" ");
}

function ZoneRect({ zone }: { zone: Zone }) {
  const { x, y } = toSvg(zone.center);
  const { w, d, rotation } = zone.footprint;
  const color = ZONE_KIND_COLORS[zone.kind];
  return (
    // 평면 기준 CCW 회전은 SVG(y 반전)에서는 CW이므로 부호 반전
    <g transform={`translate(${x} ${y}) rotate(${-rotation})`}>
      <rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        fill={color}
        fillOpacity={0.35}
        stroke={color}
        strokeWidth={0.25}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={1.8}
        fontWeight="bold"
        fill="#fff"
        transform={`rotate(${rotation})`}
      >
        {zone.id}
      </text>
    </g>
  );
}

export default function PlanDebugPage() {
  return (
    <main className="min-h-dvh p-6">
      <header className="mb-4">
        <h1 className="text-lg font-bold">구역 배치 디버그 평면도</h1>
        <p className="text-xs text-console-muted">
          x: 서→동, z: 남→북 (위가 북쪽 바다) · 1단위 = 25m ·
          reference/yard_map.png 와 비교용
        </p>
      </header>

      <div className="flex flex-wrap gap-8">
        <svg
          viewBox="-2 -4 104 108"
          className="w-full max-w-3xl rounded-lg border border-console-border bg-[#1a2c1f]"
        >
          {/* 만 수역 */}
          <polygon
            points={polyPoints(BAY_WATER.points)}
            fill="#0c4a6e"
            stroke="none"
          />
          {/* 해안선 */}
          <polyline
            points={polyPoints(COASTLINE.points)}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth={0.35}
          />
          {/* 도로망 */}
          {ROADS.map((road) => (
            <polyline
              key={road.name}
              points={polyPoints(road.points)}
              fill="none"
              stroke="#3f4a5c"
              strokeWidth={road.width ?? 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* 안벽 라인 */}
          {QUAY_LINES.map((quay) => (
            <polyline
              key={quay.name}
              points={polyPoints(quay.points)}
              fill="none"
              stroke="#a78bfa"
              strokeWidth={0.7}
              strokeLinecap="butt"
            />
          ))}
          {/* 구역 */}
          {ZONES.map((zone) => (
            <ZoneRect key={zone.id} zone={zone} />
          ))}
          {/* 눈금 */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v} fill="#64748b" fontSize={1.6}>
              <text x={v} y={103}>{v}</text>
              <text x={-2} y={100 - v}>{v}</text>
            </g>
          ))}
          <text x={50} y={-1.5} fontSize={2} fill="#7dd3fc" textAnchor="middle">
            ↑ 북 (외해)
          </text>
        </svg>

        <aside className="min-w-64 text-xs">
          <h2 className="mb-2 font-semibold text-console-muted">범례 (kind)</h2>
          <ul className="mb-4 space-y-1">
            {Object.entries(ZONE_KIND_COLORS).map(([kind, color]) => (
              <li key={kind} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                {kind}
              </li>
            ))}
          </ul>
          <h2 className="mb-2 font-semibold text-console-muted">구역 목록</h2>
          <ol className="space-y-0.5">
            {ZONES.map((z) => (
              <li key={z.id}>
                <span className="inline-block w-6 font-mono text-console-muted">
                  {z.id}
                </span>
                {z.name}
                <span className="ml-1 text-console-muted">
                  ({z.center.x},{z.center.z})
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}
