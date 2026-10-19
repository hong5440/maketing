"use client";

import { useState } from "react";
import { Html } from "@react-three/drei";
import { ZONES } from "@/data/zones";
import { m, toWorld } from "./coords";

/**
 * 조감도 스타일 주황 원형 번호 배지 (1~22).
 * hover 시 구역명 툴팁, 클릭 시 onZoneSelect 호출.
 * 경보 구역은 빨갛게 깜빡인다 (globals.css의 pulse 애니메이션).
 */
export function ZoneMarkers({
  onZoneSelect,
  selectedZoneId,
  alertZoneIds = [],
}: {
  onZoneSelect?: (id: number) => void;
  selectedZoneId?: number | null;
  alertZoneIds?: number[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <group>
      {/* drei Html 버그 워크어라운드: 첫 번째로 마운트되는 Html이 드롭되므로
          보이지 않는 더미를 희생양으로 먼저 렌더한다 */}
      <Html position={[0, -50, 0]} style={{ display: "none" }} zIndexRange={[0, 0]}>
        <span />
      </Html>
      {ZONES.map((zone) => {
        const y = Math.max(m(zone.buildingHeight) + 1.2, 2.2);
        const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
        const isAlert = alertZoneIds.includes(zone.id);
        const isSelected = selectedZoneId === zone.id;
        return (
          <Html
            key={zone.id}
            position={[wx, y, wz]}
            center
            distanceFactor={55}
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "auto" }}
          >
            <button
              onClick={() => onZoneSelect?.(zone.id)}
              onMouseEnter={() => setHovered(zone.id)}
              onMouseLeave={() => setHovered(null)}
              className={`zone-badge ${isAlert ? "zone-badge-alert" : ""} ${
                isSelected ? "zone-badge-selected" : ""
              }`}
              aria-label={zone.name}
            >
              {zone.id}
              {hovered === zone.id && (
                <span className="zone-tooltip">{zone.name}</span>
              )}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
