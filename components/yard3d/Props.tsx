"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { QUAY_LINES, ROADS } from "@/data/geography";
import { ZONES } from "@/data/zones";
import { CITY_FLATS } from "./Terrain";
import { mulberry32, toWorld, type YardEnv } from "./coords";

/** 도로 (아스팔트 + 중앙선) */
export function Roads() {
  const segments = useMemo(() => {
    const segs: {
      pos: [number, number, number];
      rot: number;
      len: number;
      width: number;
    }[] = [];
    for (const road of ROADS) {
      const w = road.width ?? 0.8;
      for (let i = 0; i < road.points.length - 1; i++) {
        const a = road.points[i];
        const b = road.points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        const cx = (a.x + b.x) / 2;
        const cz = (a.z + b.z) / 2;
        segs.push({
          pos: toWorld(cx, cz),
          rot: Math.atan2(dz, dx), // 평면각 → three Y 회전 (북=-Z 보정 포함)
          len,
          width: w,
        });
      }
    }
    return segs;
  }, []);
  return (
    <group>
      {segments.map((s, i) => (
        <group key={i} position={[s.pos[0], 0.05, s.pos[2]]} rotation={[0, s.rot, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[s.len + s.width, 0.012, s.width]} />
            <meshStandardMaterial color="#3d4349" roughness={1} />
          </mesh>
          <mesh position={[0, 0.011, 0]}>
            <boxGeometry args={[s.len * 0.98, 0.004, 0.035]} />
            <meshStandardMaterial color="#c8c35a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 안벽: 콘크리트 에이프런 + 계선주 + 방충재 */
export function Quays() {
  const data = useMemo(() => {
    const aprons: { pos: [number, number, number]; rot: number; len: number }[] = [];
    const bollards: [number, number, number][] = [];
    const fenders: { pos: [number, number, number]; rot: number }[] = [];
    for (const quay of QUAY_LINES) {
      for (let i = 0; i < quay.points.length - 1; i++) {
        const a = quay.points[i];
        const b = quay.points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        const nx = dx / len;
        const nz = dz / len;
        // 바다쪽 법선 (평면 좌표에서 진행방향의 왼쪽이 바다라고 가정 — 남쪽 안벽은 북쪽이 바다)
        const px = -nz;
        const pz = nx;
        const cx = (a.x + b.x) / 2;
        const cz = (a.z + b.z) / 2;
        aprons.push({
          pos: toWorld(cx - px * 0.6, cz - pz * 0.6),
          rot: Math.atan2(dz, dx),
          len,
        });
        const n = Math.floor(len / 1.4);
        for (let k = 0; k <= n; k++) {
          const t = n === 0 ? 0.5 : k / n;
          const x = a.x + dx * t;
          const z = a.z + dz * t;
          bollards.push(toWorld(x - px * 0.25, z - pz * 0.25, 0.12));
          fenders.push({
            pos: toWorld(x + px * 0.06, z + pz * 0.06, 0.02),
            rot: Math.atan2(dz, dx),
          });
        }
      }
    }
    return { aprons, bollards, fenders };
  }, []);

  const bollardRef = useRef<THREE.InstancedMesh>(null);
  const fenderRef = useRef<THREE.InstancedMesh>(null);

  return (
    <group>
      {data.aprons.map((a, i) => (
        <mesh
          key={i}
          position={[a.pos[0], 0.065, a.pos[2]]}
          rotation={[0, a.rot, 0]}
          receiveShadow
        >
          <boxGeometry args={[a.len + 0.4, 0.03, 1.8]} />
          <meshStandardMaterial color="#a8adb2" roughness={0.95} />
        </mesh>
      ))}
      <instancedMesh
        ref={(node) => {
          bollardRef.current = node;
          if (node) {
            const tmp = new THREE.Object3D();
            data.bollards.forEach((p, i) => {
              tmp.position.set(...p);
              tmp.updateMatrix();
              node.setMatrixAt(i, tmp.matrix);
            });
            node.instanceMatrix.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, data.bollards.length]}
      >
        <cylinderGeometry args={[0.055, 0.075, 0.16, 8]} />
        <meshStandardMaterial color="#2a2f34" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh
        ref={(node) => {
          fenderRef.current = node;
          if (node) {
            const tmp = new THREE.Object3D();
            data.fenders.forEach((f, i) => {
              tmp.position.set(...f.pos);
              tmp.rotation.set(Math.PI / 2, 0, f.rot);
              tmp.updateMatrix();
              node.setMatrixAt(i, tmp.matrix);
            });
            node.instanceMatrix.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, data.fenders.length]}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.35, 8]} />
        <meshStandardMaterial color="#111518" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** 강재적치장(15) 철판·블록 + 조립공장 주변 블록 적치 */
export function StockYards() {
  const { plates, blocks } = useMemo(() => {
    const rng = mulberry32(777);
    const z15 = ZONES.find((z) => z.id === 15)!;
    const plates: { pos: [number, number, number]; rot: number; s: number; h: number }[] =
      [];
    const blocks: {
      pos: [number, number, number];
      rot: number;
      sx: number;
      sy: number;
      sz: number;
      c: number;
    }[] = [];
    // 철판 더미 (15번 내부 격자)
    for (let gx = -4; gx <= 4; gx++) {
      for (let gz = -1.6; gz <= 1.6; gz += 0.8) {
        if (rng() < 0.25) continue;
        const x = z15.center.x + gx * 1.0 + (rng() - 0.5) * 0.3;
        const z = z15.center.z + gz + (rng() - 0.5) * 0.25;
        plates.push({
          pos: toWorld(x, z),
          rot: (rng() - 0.5) * 0.15,
          s: 0.75 + rng() * 0.3,
          h: 0.06 + rng() * 0.16,
        });
      }
    }
    // 블록 적치 (조립공장 12,13 앞 + 도크 주변 + 해양 21 주변)
    const spots: [number, number, number][] = [
      [38, 52.5, 6],
      [33, 51, 4],
      [44, 51.5, 5],
      [24, 52, 4],
      [50, 44, 5],
      [60, 44, 4],
      [90, 78, 5],
      [93, 90, 4],
      [76, 44, 4],
    ];
    for (const [sx, sz, n] of spots) {
      for (let i = 0; i < n; i++) {
        blocks.push({
          pos: toWorld(sx + (rng() - 0.5) * 3.4, sz + (rng() - 0.5) * 1.6),
          rot: (rng() - 0.5) * 0.6,
          sx: 0.7 + rng() * 1.1,
          sy: 0.35 + rng() * 0.55,
          sz: 0.6 + rng() * 0.9,
          c: rng(),
        });
      }
    }
    return { plates, blocks };
  }, []);

  const plateColors = ["#5b6670", "#6e5544", "#74614a", "#616a72"];
  const blockColors = ["#8b4a3a", "#a65e42", "#7f8a93", "#3f6e52", "#5b6670"];

  return (
    <group>
      {plates.map((p, i) => (
        <mesh
          key={`p${i}`}
          position={[p.pos[0], 0.05 + p.h / 2, p.pos[2]]}
          rotation={[0, p.rot, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[p.s * 1.6, p.h, p.s * 0.6]} />
          <meshStandardMaterial
            color={plateColors[i % plateColors.length]}
            roughness={0.8}
            metalness={0.3}
          />
        </mesh>
      ))}
      {blocks.map((b, i) => (
        <mesh
          key={`b${i}`}
          position={[b.pos[0], 0.05 + b.sy / 2, b.pos[2]]}
          rotation={[0, b.rot, 0]}
          castShadow
        >
          <boxGeometry args={[b.sx, b.sy, b.sz]} />
          <meshStandardMaterial
            color={blockColors[Math.floor(b.c * blockColors.length)]}
            roughness={0.75}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 주거지·도심 블록 (InstancedMesh 흰 건물 군집) */
export function CityBlocks() {
  const items = useMemo(() => {
    const rng = mulberry32(2024);
    const arr: { pos: [number, number, number]; h: number; w: number; d: number }[] = [];
    for (const flat of CITY_FLATS) {
      const cols = Math.floor((flat.x1 - flat.x0) / 1.6);
      const rows = Math.floor((flat.z1 - flat.z0) / 1.6);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (rng() < 0.3) continue;
          const x = flat.x0 + (i + 0.5) * 1.6 + (rng() - 0.5) * 0.5;
          const z = flat.z0 + (j + 0.5) * 1.6 + (rng() - 0.5) * 0.5;
          const tall = rng() < 0.18;
          arr.push({
            pos: toWorld(x, z),
            h: tall ? 1.2 + rng() * 1.6 : 0.25 + rng() * 0.5,
            w: 0.5 + rng() * 0.5,
            d: 0.5 + rng() * 0.5,
          });
        }
      }
    }
    return arr;
  }, []);

  return (
    <instancedMesh
      ref={(node) => {
        if (node) {
          const tmp = new THREE.Object3D();
          const color = new THREE.Color();
          items.forEach((it, i) => {
            tmp.position.set(it.pos[0], 0.08 + it.h / 2, it.pos[2]);
            tmp.scale.set(it.w, it.h, it.d);
            tmp.rotation.set(0, 0, 0);
            tmp.updateMatrix();
            node.setMatrixAt(i, tmp.matrix);
            const shade = 0.82 + (i % 7) * 0.02;
            node.setColorAt(i, color.setRGB(shade, shade, shade * 0.99));
          });
          node.instanceMatrix.needsUpdate = true;
          if (node.instanceColor) node.instanceColor.needsUpdate = true;
        }
      }}
      args={[undefined, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

/** 주차장 + 차량 */
export function Parking() {
  const cars = useMemo(() => {
    const rng = mulberry32(55);
    const lots: [number, number, number, number][] = [
      // x, z, 폭, 깊이 (정규화)
      [40, 18.5, 6, 2.2],
      [25, 31, 3.5, 1.8],
      [37, 86.5, 4, 1.8],
    ];
    const arr: { pos: [number, number, number]; rot: number; c: string }[] = [];
    const colors = ["#c8ccd0", "#2b3238", "#6e7a86", "#8a2f27", "#2d4a6e", "#d8d5ce"];
    for (const [lx, lz, lw, ld] of lots) {
      const n = Math.floor(lw / 0.32);
      for (let i = 0; i < n; i++) {
        for (const rowOff of [-ld / 4, ld / 4]) {
          if (rng() < 0.35) continue;
          arr.push({
            pos: toWorld(lx - lw / 2 + (i + 0.5) * 0.32, lz + rowOff),
            rot: 0,
            c: colors[Math.floor(rng() * colors.length)] ?? "#c8ccd0",
          });
        }
      }
    }
    return { lots, arr };
  }, []);

  return (
    <group>
      {cars.lots.map(([lx, lz, lw, ld], i) => (
        <mesh key={i} position={[...toWorld(lx, lz, 0.045)]} receiveShadow>
          <boxGeometry args={[lw, 0.01, ld]} />
          <meshStandardMaterial color="#4a5056" roughness={1} />
        </mesh>
      ))}
      <instancedMesh
        ref={(node) => {
          if (node) {
            const tmp = new THREE.Object3D();
            const color = new THREE.Color();
            cars.arr.forEach((c, i) => {
              tmp.position.set(c.pos[0], 0.1, c.pos[2]);
              tmp.rotation.set(0, c.rot, 0);
              tmp.updateMatrix();
              node.setMatrixAt(i, tmp.matrix);
              node.setColorAt(i, color.set(c.c));
            });
            node.count = cars.arr.length;
            node.instanceMatrix.needsUpdate = true;
            if (node.instanceColor) node.instanceColor.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, cars.arr.length]}
        castShadow
      >
        <boxGeometry args={[0.18, 0.08, 0.26]} />
        <meshStandardMaterial roughness={0.4} metalness={0.3} />
      </instancedMesh>
    </group>
  );
}

/** 녹지 + 나무 */
export function Greenery() {
  const trees = useMemo(() => {
    const rng = mulberry32(99);
    const arr: { pos: [number, number, number]; s: number }[] = [];
    // 도로변 + 사무동 주변 가로수
    const lines: [number, number, number, number, number][] = [
      [16, 27.8, 88, 27.8, 20],
      [16, 36.2, 60, 36.2, 14],
      [20, 22, 30, 22, 5],
      [33, 84, 38, 92, 6],
    ];
    for (const [x0, z0, x1, z1, n] of lines) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        if (rng() < 0.2) continue;
        arr.push({
          pos: toWorld(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t),
          s: 0.7 + rng() * 0.5,
        });
      }
    }
    return arr;
  }, []);
  return (
    <group>
      {/* 화단 */}
      <mesh position={[...toWorld(24, 24, 0.04)]} receiveShadow>
        <boxGeometry args={[7, 0.02, 2.5]} />
        <meshStandardMaterial color="#44633a" roughness={1} />
      </mesh>
      <instancedMesh
        ref={(node) => {
          if (node) {
            const tmp = new THREE.Object3D();
            trees.forEach((t, i) => {
              tmp.position.set(t.pos[0], 0.3 * t.s, t.pos[2]);
              tmp.scale.setScalar(t.s);
              tmp.updateMatrix();
              node.setMatrixAt(i, tmp.matrix);
            });
            node.instanceMatrix.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, trees.length]}
        castShadow
      >
        <coneGeometry args={[0.22, 0.6, 7]} />
        <meshStandardMaterial color="#3d6336" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/** 야간 조명: 공장·안벽의 나트륨등 + 크레인 LED (emissive, Bloom과 함께 사용) */
export function NightLamps({ env }: { env: YardEnv }) {
  const sodiumRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);

  const { sodium, led } = useMemo(() => {
    const rng = mulberry32(31);
    const sodium: [number, number, number][] = [];
    const led: [number, number, number][] = [];
    // 공장동 처마 등
    for (const z of ZONES) {
      if (z.kind !== "factory") continue;
      const n = Math.max(2, Math.round(z.footprint.w));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        sodium.push(
          toWorld(
            z.center.x + (t - 0.5) * z.footprint.w * 0.9,
            z.center.z - z.footprint.d / 2 - 0.15,
            Math.max(0.5, (z.buildingHeight / 25) * 0.55),
          ),
        );
      }
    }
    // 안벽·도로 가로등
    for (const quay of QUAY_LINES) {
      const [a, b] = [quay.points[0], quay.points[quay.points.length - 1]];
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        sodium.push(toWorld(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t - 1.2, 0.55));
      }
    }
    // 크레인 상부 백색등
    led.push(
      toWorld(24.5, 45.5, 4.8),
      toWorld(26, 62, 4.6),
      toWorld(60, 68, 1.9),
      toWorld(88, 80, 2.4),
      toWorld(92, 87, 2.4),
    );
    for (let i = 0; i < 24; i++) {
      led.push(toWorld(10 + rng() * 80, 25 + rng() * 25, 0.6 + rng() * 0.3));
    }
    return { sodium, led };
  }, []);

  const keyLightRef = useRef<THREE.PointLight>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (sodiumRef.current) sodiumRef.current.emissiveIntensity = env.night * 5;
    if (ledRef.current) ledRef.current.emissiveIntensity = env.night * 4;
    if (keyLightRef.current) keyLightRef.current.intensity = env.night * 60;
    // 낮에는 램프 구슬이 공중에 떠 있는 점처럼 보이므로 통째로 숨김
    if (groupRef.current) groupRef.current.visible = env.night > 0.04;
  });

  const place = (node: THREE.InstancedMesh | null, pts: [number, number, number][]) => {
    if (!node) return;
    const tmp = new THREE.Object3D();
    pts.forEach((p, i) => {
      tmp.position.set(...p);
      tmp.updateMatrix();
      node.setMatrixAt(i, tmp.matrix);
    });
    node.instanceMatrix.needsUpdate = true;
  };

  return (
    <group ref={groupRef} visible={false}>
      <instancedMesh
        ref={(n) => place(n, sodium)}
        args={[undefined, undefined, sodium.length]}
      >
        <sphereGeometry args={[0.055, 6, 6]} />
        <meshStandardMaterial
          ref={sodiumRef}
          color="#1a1208"
          emissive="#ff9e3d"
          emissiveIntensity={0}
        />
      </instancedMesh>
      <instancedMesh ref={(n) => place(n, led)} args={[undefined, undefined, led.length]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial
          ref={ledRef}
          color="#10141a"
          emissive="#eaf4ff"
          emissiveIntensity={0}
        />
      </instancedMesh>
      {/* 소수의 실제 광원 (야간 핵심 영역) */}
      <pointLight
        ref={keyLightRef}
        position={[...toWorld(50, 50, 6)]}
        intensity={0}
        distance={60}
        color="#ffc37a"
      />
    </group>
  );
}
