"use client";

import { Html } from "@react-three/drei";
import { ZONES } from "@/data/zones";
import { m, toWorld } from "./coords";

/**
 * 밀폐공간 아이콘 (B-3) — 10·20·22공장과 1도크 블록 내부 등
 * 밀폐공간 작업허가가 있는 시설에 표시. 클릭하면 패널의 해당 허가로 이동.
 * danger(안전조치 누락)면 빨강 맥동, 정상이면 초록.
 */

export interface ConfinedMarker {
  permitId: string;
  zoneId: number;
  danger: boolean;
  title: string;
}

export function ConfinedMarkers({
  markers,
  selectedPermitId,
  onSelect,
}: {
  markers: ConfinedMarker[];
  selectedPermitId?: string | null;
  onSelect?: (permitId: string, zoneId: number) => void;
}) {
  // 같은 구역에 여러 개면 가로로 벌려 배치
  const byZone = new Map<number, ConfinedMarker[]>();
  for (const mk of markers) byZone.set(mk.zoneId, [...(byZone.get(mk.zoneId) ?? []), mk]);

  return (
    <group>
      {[...byZone.entries()].flatMap(([zoneId, list]) => {
        const zone = ZONES.find((z) => z.id === zoneId);
        if (!zone) return [];
        const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
        const y = Math.max(m(zone.buildingHeight) * 0.5, 0.8);
        return list.map((mk, i) => (
          <Html
            key={mk.permitId}
            position={[wx + (i - (list.length - 1) / 2) * 2.2, y, wz]}
            center
            zIndexRange={[19, 0]}
            style={{ pointerEvents: "auto" }}
          >
            <button
              onClick={() => onSelect?.(mk.permitId, mk.zoneId)}
              className={`confined-badge ${mk.danger ? "confined-badge-danger" : ""} ${
                selectedPermitId === mk.permitId ? "confined-badge-selected" : ""
              }`}
              title={mk.title}
              aria-label={`밀폐공간: ${mk.title}`}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
                <path
                  d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="2.6" fill="currentColor" />
              </svg>
              밀폐
            </button>
          </Html>
        ));
      })}
    </group>
  );
}
