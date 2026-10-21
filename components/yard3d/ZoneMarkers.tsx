"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ZONES } from "@/data/zones";
import { m, toWorld } from "./coords";

/**
 * 조감도 스타일 구역 배지 (1~22) — A-8 라벨 LOD.
 * - 멀리서(OVERVIEW)는 번호 배지만, 줌인/호버/선택/경보 시 이름 표시
 * - 화면공간 충돌 검사로 겹치는 라벨은 우선순위 낮은 쪽을 자동 숨김
 *   (우선순위: 선택 > 경보 > 호버 > footprint 큰 구역)
 * - 선택·경보 배지는 크게 (zone-chip-lg)
 */

type LabelMode = "hidden" | "num" | "full";

const NAME_DIST = 42; // 카메라-구역 거리: 이보다 가까우면 이름 표시

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
  const [modes, setModes] = useState<Record<number, LabelMode>>({});
  const sigRef = useRef("");
  const accRef = useRef(1);

  const anchors = useRef(
    ZONES.map((zone) => ({
      zone,
      pos: new THREE.Vector3(
        ...(() => {
          const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
          return [wx, Math.max(m(zone.buildingHeight) + 1.6, 2.6), wz] as const;
        })(),
      ),
      area: zone.footprint.w * zone.footprint.d,
    })),
  ).current;

  useFrame(({ camera, size }, delta) => {
    accRef.current += delta;
    if (accRef.current < 0.15) return;
    accRef.current = 0;

    const v = new THREE.Vector3();
    const entries = anchors.map(({ zone, pos, area }) => {
      const isSelected = selectedZoneId === zone.id;
      const isAlert = alertZoneIds.includes(zone.id);
      const isHovered = hovered === zone.id;
      v.copy(pos).project(camera);
      const behind = v.z > 1 || v.z < -1;
      const sx = (v.x * 0.5 + 0.5) * size.width;
      const sy = (-v.y * 0.5 + 0.5) * size.height;
      const dist = camera.position.distanceTo(pos);
      const wantFull = isSelected || isAlert || isHovered || dist < NAME_DIST;
      const prio = isSelected ? 4 : isAlert ? 3 : isHovered ? 2 : area / 1000;
      return { id: zone.id, zone, behind, sx, sy, wantFull, prio, isSelected, isAlert };
    });

    // 우선순위 내림차순 그리디 배치
    entries.sort((a, b) => b.prio - a.prio);
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const next: Record<number, LabelMode> = {};
    for (const e of entries) {
      if (e.behind) {
        next[e.id] = "hidden";
        continue;
      }
      const name = e.zone.name.split("·")[0].split(" 및 ")[0];
      const scale = e.isSelected || e.isAlert ? 1.15 : 1;
      const tryModes: LabelMode[] = e.wantFull ? ["full", "num"] : ["num"];
      let chosen: LabelMode = "hidden";
      for (const mode of tryModes) {
        const w = (mode === "full" ? 34 + name.length * 12 : 28) * scale;
        const h = 26 * scale;
        const rect = { x0: e.sx - w / 2, y0: e.sy - h / 2, x1: e.sx + w / 2, y1: e.sy + h / 2 };
        const collides = placed.some(
          (r) => rect.x0 < r.x1 && rect.x1 > r.x0 && rect.y0 < r.y1 && rect.y1 > r.y0,
        );
        if (!collides) {
          placed.push(rect);
          chosen = mode;
          break;
        }
      }
      // 선택/경보는 충돌해도 숨기지 않음 (최우선이라 보통 먼저 배치됨)
      if (chosen === "hidden" && (e.isSelected || e.isAlert)) chosen = "num";
      next[e.id] = chosen;
    }

    const sig = ZONES.map((z) => next[z.id] ?? "hidden").join(",");
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      setModes(next);
    }
  });

  return (
    <group>
      {/* drei Html 버그 워크어라운드: 첫 번째로 마운트되는 Html이 드롭되므로
          보이지 않는 더미를 희생양으로 먼저 렌더한다 */}
      <Html position={[0, -50, 0]} style={{ display: "none" }} zIndexRange={[0, 0]}>
        <span />
      </Html>
      {anchors.map(({ zone, pos }) => {
        const mode = modes[zone.id] ?? "num";
        const isAlert = alertZoneIds.includes(zone.id);
        const isSelected = selectedZoneId === zone.id;
        const shortName = zone.name.split("·")[0].split(" 및 ")[0];
        return (
          <Html
            key={zone.id}
            position={pos}
            center
            zIndexRange={[20, 0]}
            style={{
              pointerEvents: "auto",
              opacity: mode === "hidden" ? 0 : 1,
              transition: "opacity 0.25s",
            }}
          >
            <button
              onClick={() => onZoneSelect?.(zone.id)}
              onMouseEnter={() => setHovered(zone.id)}
              onMouseLeave={() => setHovered(null)}
              className={`zone-chip ${mode === "num" ? "zone-chip-mini" : ""} ${
                isAlert ? "zone-chip-alert" : ""
              } ${isSelected ? "zone-chip-selected" : ""} ${
                isSelected || isAlert ? "zone-chip-lg" : ""
              }`}
              style={{ pointerEvents: mode === "hidden" ? "none" : "auto" }}
              aria-label={zone.name}
              title={zone.name}
            >
              <span className="zone-chip-num">{zone.id}</span>
              {mode === "full" && shortName}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
