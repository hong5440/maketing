"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { QUAY_LINES } from "@/data/geography";
import { ZONES } from "@/data/zones";
import { mulberry32, rotY, toWorld } from "./coords";

/**
 * 크레인류.
 * - 900톤 골리앗: 문형(겐트리) — A형 다리 2개 + 더블 거더 + 트롤리 + 후크. 도크를 가로지름
 * - 지브 크레인(레벨러핑): 안벽·도크 주변
 * - 타워 크레인: 조립공장·해양 조립장 주변
 */

const orange = new THREE.MeshStandardMaterial({
  color: "#e8971e",
  roughness: 0.5,
  metalness: 0.3,
});
const orangeDark = new THREE.MeshStandardMaterial({
  color: "#c87a10",
  roughness: 0.55,
  metalness: 0.3,
});
const white = new THREE.MeshStandardMaterial({ color: "#dde3e8", roughness: 0.6 });
const steel = new THREE.MeshStandardMaterial({
  color: "#6a7680",
  roughness: 0.5,
  metalness: 0.5,
});
const cable = new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.8 });

/** 900톤 골리앗 크레인 — span: 거더 길이(도크 폭 방향), height: 거더 하단 높이 */
export function GoliathCrane({
  position,
  rotation = 0,
  span = 5.2, // 약 130m
  height = 4.0, // 약 100m
  trolleyT = 0.35,
}: {
  position: [number, number, number];
  rotation?: number;
  span?: number;
  height?: number;
  trolleyT?: number;
}) {
  const legSpread = 1.1;
  const girderH = 0.55;
  const girderGap = 0.5;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 거더(더블) — 길이축 X */}
      {[-girderGap / 2, girderGap / 2].map((gz, i) => (
        <mesh key={i} position={[0, height + girderH / 2, gz]} castShadow material={orange}>
          <boxGeometry args={[span + 1.6, girderH, 0.32]} />
        </mesh>
      ))}
      {/* 거더 상부 통로 + 기계실 */}
      <mesh position={[span * 0.32, height + girderH + 0.12, 0]} castShadow material={white}>
        <boxGeometry args={[0.9, 0.24, 0.9]} />
      </mesh>
      {/* 다리: 강성(A형) + 유성(힌지) */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * (span / 2), 0, 0]}>
          {[-legSpread / 2, legSpread / 2].map((lz, i) => (
            <mesh
              key={i}
              position={[0, height / 2, lz / 2 + (lz > 0 ? 0.1 : -0.1)]}
              rotation={[lz > 0 ? -0.1 : 0.1, 0, side * 0.045]}
              castShadow
              material={side < 0 ? orange : orangeDark}
            >
              <boxGeometry args={[0.34, height + 0.1, 0.26]} />
            </mesh>
          ))}
          {/* 다리 하부 보기(대차) */}
          <mesh position={[0, 0.14, 0]} castShadow material={steel}>
            <boxGeometry args={[0.7, 0.28, legSpread + 0.5]} />
          </mesh>
          {/* 수평 브레이싱 */}
          <mesh position={[0, height * 0.55, 0]} material={side < 0 ? orange : orangeDark}>
            <boxGeometry args={[0.16, 0.14, legSpread]} />
          </mesh>
        </group>
      ))}
      {/* 트롤리 + 후크 */}
      <group position={[(trolleyT - 0.5) * span, height, 0]}>
        <mesh position={[0, girderH + 0.14, 0]} castShadow material={white}>
          <boxGeometry args={[0.6, 0.3, girderGap + 0.5]} />
        </mesh>
        <mesh position={[0, -height * 0.21, 0]} material={cable}>
          <cylinderGeometry args={[0.012, 0.012, height * 0.42, 4]} />
        </mesh>
        <mesh position={[0, -height * 0.42, 0]} material={orangeDark}>
          <boxGeometry args={[0.3, 0.14, 0.2]} />
        </mesh>
      </group>
      {/* 지면 레일 */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * (span / 2), 0.03, 0]} material={steel}>
          <boxGeometry args={[0.16, 0.05, 9]} />
        </mesh>
      ))}
    </group>
  );
}

/** 레벨러핑 지브 크레인 */
function JibCrane({
  position,
  rotation = 0,
  scale = 1,
  boomUp = 0.65,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  boomUp?: number;
}) {
  const towerH = 1.3 * scale;
  const boomL = 2.4 * scale;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 받침 + 타워 */}
      <mesh position={[0, 0.2, 0]} castShadow material={steel}>
        <cylinderGeometry args={[0.34 * scale, 0.42 * scale, 0.4, 10]} />
      </mesh>
      <mesh position={[0, 0.4 + towerH / 2, 0]} castShadow material={white}>
        <cylinderGeometry args={[0.16 * scale, 0.22 * scale, towerH, 8]} />
      </mesh>
      {/* 기계실/운전실 */}
      <mesh position={[0.1 * scale, 0.4 + towerH, 0]} castShadow material={white}>
        <boxGeometry args={[0.55 * scale, 0.34 * scale, 0.34 * scale]} />
      </mesh>
      {/* 카운터웨이트 */}
      <mesh position={[-0.35 * scale, 0.4 + towerH, 0]} material={steel}>
        <boxGeometry args={[0.3 * scale, 0.26 * scale, 0.3 * scale]} />
      </mesh>
      {/* 붐 (격자 흉내: 테이퍼 박스) */}
      <mesh
        position={[
          (boomL / 2) * Math.cos(boomUp) * 0.9,
          0.4 + towerH + (boomL / 2) * Math.sin(boomUp),
          0,
        ]}
        rotation={[0, 0, boomUp]}
        castShadow
        material={white}
      >
        <boxGeometry args={[boomL, 0.1 * scale, 0.1 * scale]} />
      </mesh>
      {/* 와이어 */}
      <mesh
        position={[boomL * Math.cos(boomUp) * 0.92, 0.4 + towerH + boomL * Math.sin(boomUp) * 0.6, 0]}
        material={cable}
      >
        <cylinderGeometry args={[0.008, 0.008, boomL * Math.sin(boomUp) * 0.8, 3]} />
      </mesh>
    </group>
  );
}

/** 타워 크레인 */
function TowerCrane({
  position,
  rotation = 0,
  h = 2.2,
  jib = 2.0,
}: {
  position: [number, number, number];
  rotation?: number;
  h?: number;
  jib?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow material={orange}>
        <boxGeometry args={[0.14, h, 0.14]} />
      </mesh>
      <mesh position={[jib / 2 - 0.3, h, 0]} castShadow material={orange}>
        <boxGeometry args={[jib + 0.6, 0.09, 0.09]} />
      </mesh>
      <mesh position={[-0.55, h, 0]} material={steel}>
        <boxGeometry args={[0.3, 0.14, 0.18]} />
      </mesh>
      <mesh position={[jib * 0.42, h - 0.35, 0]} material={cable}>
        <cylinderGeometry args={[0.008, 0.008, 0.7, 3]} />
      </mesh>
    </group>
  );
}

export function Cranes() {
  const items = useMemo(() => {
    const dock1 = ZONES.find((z) => z.id === 1)!;
    const dock2 = ZONES.find((z) => z.id === 2)!;
    // 골리앗: 도크 길이축 중앙쯤, 거더가 도크를 가로지르도록 (도크 길이축에 수직)
    const d1rot = rotY(dock1.footprint.rotation) + Math.PI / 2; // 길이축
    const d2rot = rotY(dock2.footprint.rotation);
    const goliaths: {
      pos: [number, number, number];
      rot: number;
      span: number;
      trolleyT: number;
    }[] = [
      {
        pos: toWorld(dock1.center.x + 1.2, dock1.center.z - 1.5),
        rot: d1rot + Math.PI / 2,
        span: 7,
        trolleyT: 0.42,
      },
      {
        pos: toWorld(dock2.center.x - 0.5, dock2.center.z),
        rot: d2rot + Math.PI / 2,
        span: 6,
        trolleyT: 0.6,
      },
    ];

    // 지브 크레인: 의장안벽·하역안벽·동측 안벽을 따라
    const jibs: { pos: [number, number, number]; rot: number; scale: number }[] = [];
    const rng = mulberry32(42);
    for (const quay of QUAY_LINES) {
      const [a, b] = [quay.points[0], quay.points[quay.points.length - 1]];
      const n = quay.name.includes("해양") ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t - 0.8; // 안벽 뒤쪽(육지측)
        jibs.push({
          pos: toWorld(x, z),
          rot: rng() * Math.PI * 2,
          scale: 0.9 + rng() * 0.4,
        });
      }
    }
    // 도크 주변 지브
    // 도크 피트 내부를 피해서 배치 (1도크는 회전된 사각형)
    jibs.push(
      { pos: toWorld(24.8, 42.3), rot: 1.2, scale: 1.1 },
      { pos: toWorld(27.5, 46), rot: -0.6, scale: 1.0 },
      { pos: toWorld(27, 58.5), rot: 2.4, scale: 1.0 },
    );

    // 타워 크레인: 조립공장·해양 옥외조립장 주변
    const towers: { pos: [number, number, number]; rot: number }[] = [
      { pos: toWorld(36, 51), rot: 0.4 },
      { pos: toWorld(42, 46), rot: 2.1 },
      { pos: toWorld(88, 80), rot: 1.0 },
      { pos: toWorld(92, 87), rot: -1.2 },
      { pos: toWorld(80, 36), rot: 0.2 },
    ];
    return { goliaths, jibs, towers };
  }, []);

  return (
    <group>
      {items.goliaths.map((g, i) => (
        <GoliathCrane
          key={i}
          position={g.pos}
          rotation={g.rot}
          span={g.span}
          height={4 + i * 0.3}
          trolleyT={g.trolleyT}
        />
      ))}
      {items.jibs.map((j, i) => (
        <JibCrane key={i} position={j.pos} rotation={j.rot} scale={j.scale} />
      ))}
      {items.towers.map((t, i) => (
        <TowerCrane key={i} position={t.pos} rotation={t.rot} />
      ))}
    </group>
  );
}

export const craneMaterials = { orange, orangeDark, white, steel };
