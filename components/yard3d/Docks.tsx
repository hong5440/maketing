"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { ZONES, type Zone } from "@/data/zones";
import { m, mulberry32, rotY, toWorld } from "./coords";

/**
 * 드라이도크(1,2): 포장면 구멍 아래로 파인 바닥 + 측벽 + 게이트 + 건조 중인 블록
 * 플로팅 도크(14): 만 위 U자형 도크 + 선박
 */

const PIT_DEPTH = 0.8; // 약 20m

const wallMat = new THREE.MeshStandardMaterial({ color: "#6a6f73", roughness: 0.95 });
const floorMat = new THREE.MeshStandardMaterial({ color: "#3e4246", roughness: 1 });
const copingMat = new THREE.MeshStandardMaterial({ color: "#aeb3b7", roughness: 0.9 });
const gateMat = new THREE.MeshStandardMaterial({
  color: "#3f4e5c",
  roughness: 0.6,
  metalness: 0.5,
});
const primerMat = new THREE.MeshStandardMaterial({ color: "#8b4a3a", roughness: 0.8 });
const primerMat2 = new THREE.MeshStandardMaterial({ color: "#a65e42", roughness: 0.8 });
const steelMat = new THREE.MeshStandardMaterial({
  color: "#8e9aa4",
  roughness: 0.6,
  metalness: 0.4,
});
const keelMat = new THREE.MeshStandardMaterial({ color: "#4a4e52", roughness: 1 });

function DryDock({ zone, gateEnd }: { zone: Zone; gateEnd: 1 | -1 }) {
  const { w, d, rotation } = zone.footprint;
  // 길이축을 로컬 X로 통일
  const alongX = w >= d;
  const L = alongX ? w : d;
  const W = alongX ? d : w;
  const rot = rotY(rotation) + (alongX ? 0 : Math.PI / 2);
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const rng = mulberry32(zone.id * 31 + 5);

  // 건조 중 선박 블록 (일부만 조립된 선체)
  const blocks = useMemo(() => {
    const arr: { x: number; len: number; h: number; mat: THREE.Material }[] = [];
    let cursor = -L * 0.38;
    while (cursor < L * 0.3) {
      const len = 1.2 + rng() * 1.4;
      arr.push({
        x: cursor + len / 2,
        len,
        h: 0.5 + rng() * 0.5,
        mat: rng() < 0.6 ? primerMat : rng() < 0.5 ? primerMat2 : steelMat,
      });
      cursor += len + 0.06;
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  const keels = useMemo(() => {
    const arr: [number, number][] = [];
    for (let x = -L / 2 + 1; x < L / 2 - 0.6; x += 0.9) {
      arr.push([x, -W * 0.22], [x, 0], [x, W * 0.22]);
    }
    return arr;
  }, [L, W]);

  return (
    <group position={[wx, 0, wz]} rotation={[0, rot, 0]}>
      {/* 바닥 */}
      <mesh position={[0, -PIT_DEPTH, 0]} receiveShadow material={floorMat}>
        <boxGeometry args={[L, 0.04, W]} />
      </mesh>
      {/* 측벽 (양측 + 육지측 끝벽) */}
      <mesh position={[0, -PIT_DEPTH / 2, -W / 2 + 0.06]} material={wallMat} receiveShadow>
        <boxGeometry args={[L, PIT_DEPTH, 0.12]} />
      </mesh>
      <mesh position={[0, -PIT_DEPTH / 2, W / 2 - 0.06]} material={wallMat} receiveShadow>
        <boxGeometry args={[L, PIT_DEPTH, 0.12]} />
      </mesh>
      <mesh
        position={[-gateEnd * (L / 2 - 0.06), -PIT_DEPTH / 2, 0]}
        material={wallMat}
        receiveShadow
      >
        <boxGeometry args={[0.12, PIT_DEPTH, W]} />
      </mesh>
      {/* 게이트 (바다쪽 끝) */}
      <mesh
        position={[gateEnd * (L / 2 - 0.1), -PIT_DEPTH / 2 + 0.12, 0]}
        material={gateMat}
        castShadow
      >
        <boxGeometry args={[0.22, PIT_DEPTH + 0.24, W * 0.98]} />
      </mesh>
      {/* 코핑(가장자리 테두리) */}
      <mesh position={[0, 0.045, -W / 2 - 0.12]} material={copingMat}>
        <boxGeometry args={[L + 0.5, 0.05, 0.3]} />
      </mesh>
      <mesh position={[0, 0.045, W / 2 + 0.12]} material={copingMat}>
        <boxGeometry args={[L + 0.5, 0.05, 0.3]} />
      </mesh>
      {/* 킬블록 */}
      {keels.map(([kx, kz], i) => (
        <mesh key={i} position={[kx, -PIT_DEPTH + 0.1, kz]} material={keelMat}>
          <boxGeometry args={[0.25, 0.16, 0.25]} />
        </mesh>
      ))}
      {/* 건조 중 선체 블록 */}
      {blocks.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, -PIT_DEPTH + 0.18 + b.h / 2, 0]}
          material={b.mat}
          castShadow
        >
          <boxGeometry args={[b.len, b.h, W * 0.55]} />
        </mesh>
      ))}
    </group>
  );
}

/** 플로팅 도크(14): U자 단면 + 내부 선박 */
function FloatingDock({ zone }: { zone: Zone }) {
  const { w, d, rotation } = zone.footprint;
  const L = Math.max(w, d);
  const W = Math.min(w, d);
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const wingH = m(zone.buildingHeight);
  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: "#20557d", roughness: 0.7, metalness: 0.3 }),
    [],
  );
  return (
    <group position={[wx, -0.05, wz]} rotation={[0, rotY(rotation), 0]}>
      {/* 폰툰 (바닥) */}
      <mesh position={[0, 0.1, 0]} castShadow material={hullMat}>
        <boxGeometry args={[L, 0.3, W]} />
      </mesh>
      {/* 윙월 */}
      <mesh position={[0, wingH / 2 + 0.2, -W / 2 + 0.2]} castShadow material={hullMat}>
        <boxGeometry args={[L, wingH, 0.4]} />
      </mesh>
      <mesh position={[0, wingH / 2 + 0.2, W / 2 - 0.2]} castShadow material={hullMat}>
        <boxGeometry args={[L, wingH, 0.4]} />
      </mesh>
      {/* 윙 크레인 2기 */}
      {[-L * 0.25, L * 0.25].map((x, i) => (
        <group key={i} position={[x, wingH + 0.2, W / 2 - 0.2]}>
          <mesh position={[0, 0.3, 0]} material={steelMat}>
            <boxGeometry args={[0.12, 0.6, 0.12]} />
          </mesh>
          <mesh position={[0.35, 0.62, 0]} rotation={[0, 0, -0.35]} material={steelMat}>
            <boxGeometry args={[0.8, 0.07, 0.07]} />
          </mesh>
        </group>
      ))}
      {/* 내부 건조 선박 (단순 선체) */}
      <mesh position={[0, 0.65, 0]} castShadow material={primerMat}>
        <boxGeometry args={[L * 0.78, 0.7, W * 0.52]} />
      </mesh>
      <mesh position={[L * 0.25, 1.15, 0]} castShadow material={steelMat}>
        <boxGeometry args={[0.6, 0.3, W * 0.3]} />
      </mesh>
    </group>
  );
}

export function Docks() {
  const dock1 = ZONES.find((z) => z.id === 1)!;
  const dock2 = ZONES.find((z) => z.id === 2)!;
  const floating = ZONES.find((z) => z.id === 14)!;
  // 1도크: 로컬 X(+)가 북동(만) 방향 → footprint d축이 길이축이라 +90° 후 게이트는 +X
  return (
    <group>
      <DryDock zone={dock1} gateEnd={1} />
      <DryDock zone={dock2} gateEnd={1} />
      <FloatingDock zone={floating} />
    </group>
  );
}
