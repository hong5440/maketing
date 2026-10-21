"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32, toWorld } from "./coords";

/**
 * 절차적 선박 모델링 — QA 패스에서 정적 선박을 재질 버킷으로 병합해
 * draw call을 줄였다 (Water 반사 패스가 씬을 한 번 더 그리므로 효과 2배).
 * 선체는 BoxGeometry 정점을 조작해 선수/선미 테이퍼를 만든다 (외부 모델 없음).
 */

/** 선체 지오메트리: 길이 L(X축), 높이 H, 폭 B. 선수(+X)는 뾰족, 선미는 둥글게 */
function hullGeometry(L: number, H: number, B: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(L, H, B, 16, 1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = x / L; // -0.5 ~ 0.5
    let scale = 1;
    if (t > 0.28) {
      const k = (t - 0.28) / 0.22;
      scale = Math.cos(k * Math.PI * 0.5) * 0.96 + 0.04;
    } else if (t < -0.34) {
      const k = (-t - 0.34) / 0.16;
      scale = 1 - k * k * 0.55;
    }
    pos.setZ(i, z * scale);
    if (y < 0) {
      const edge = Math.max(0, Math.abs(t) - 0.3) / 0.2;
      pos.setY(i, y + edge * edge * H * 0.35);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.6, metal = 0.2): THREE.MeshStandardMaterial {
  const key = `${color}-${rough}-${metal}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    matCache.set(key, m);
  }
  return m;
}

/** 재질 버킷 수집기: key → 변환 적용된 지오메트리 목록 */
class ShipSink {
  buckets = new Map<string, { mat: THREE.MeshStandardMaterial; geos: THREE.BufferGeometry[] }>();

  add(
    geo: THREE.BufferGeometry,
    color: string,
    base: THREE.Matrix4,
    local?: THREE.Matrix4,
    rough = 0.6,
    metal = 0.2,
  ) {
    const key = `${color}-${rough}-${metal}`;
    let b = this.buckets.get(key);
    if (!b) {
      b = { mat: mat(color, rough, metal), geos: [] };
      this.buckets.set(key, b);
    }
    const g = geo.clone();
    if (local) g.applyMatrix4(local);
    g.applyMatrix4(base);
    b.geos.push(g);
  }

  box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
    base: THREE.Matrix4,
    rough = 0.6,
    metal = 0.2,
    rot?: [number, number, number],
  ) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)));
    g.translate(x, y, z);
    g.applyMatrix4(base);
    this.add(g, color, new THREE.Matrix4(), undefined, rough, metal);
  }

  cyl(
    rTop: number,
    rBot: number,
    h: number,
    seg: number,
    x: number,
    y: number,
    z: number,
    color: string,
    base: THREE.Matrix4,
    rough = 0.6,
    metal = 0.2,
  ) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(x, y, z);
    g.applyMatrix4(base);
    this.add(g, color, new THREE.Matrix4(), undefined, rough, metal);
  }

  merged(): { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }[] {
    const out: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }[] = [];
    for (const { mat: material, geos } of this.buckets.values()) {
      const merged = mergeGeometries(geos, false);
      if (merged) out.push({ geo: merged, mat: material });
      geos.forEach((g) => g.dispose());
    }
    return out;
  }
}

function baseAt(position: [number, number, number], rotation: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationY(rotation).setPosition(...position);
}

function superstructure(
  sink: ShipSink,
  base: THREE.Matrix4,
  x: number,
  w = 0.9,
  h = 0.8,
  b = 1.2,
) {
  sink.box(w, h, b, x, h / 2, 0, "#f0f2f4", base);
  sink.box(w * 0.7, 0.12, b * 0.8, x, h + 0.06, 0, "#c8ccd0", base);
  sink.box(0.3, h * 0.9, 0.35, x - w * 0.9, h * 0.55, 0, "#d33333", base);
}

function lngCarrier(sink: ShipSink, position: [number, number, number], rotation: number, L = 11) {
  const B = L * 0.16;
  const base = baseAt(position, rotation);
  const hull = hullGeometry(L, 1.0, B);
  hull.translate(0, 0.22, 0);
  sink.add(hull, "#aeb6bd", base);
  sink.box(L * 0.62, 0.5, B * 0.72, L * 0.06, 0.95, 0, "#dde2e6", base, 0.45, 0.4);
  sink.box(L * 0.62, 0.06, B * 0.5, L * 0.06, 1.22, 0, "#eef1f3", base, 0.45, 0.4);
  superstructure(sink, base, -L * 0.38, 0.9, 0.8, B * 0.85);
  sink.cyl(0.03, 0.05, 0.5, 6, L * 0.44, 0.95, 0, "#e8971e", base);
}

function tanker(sink: ShipSink, position: [number, number, number], rotation: number, L = 12.5) {
  const B = L * 0.18;
  const base = baseAt(position, rotation);
  const hull = hullGeometry(L, 1.0, B);
  hull.translate(0, 0.22, 0);
  sink.add(hull, "#9c2f26", base);
  sink.box(L * 0.82, 0.07, B * 0.88, L * 0.03, 0.74, 0, "#3f7a4f", base, 0.8);
  sink.box(L * 0.75, 0.06, 0.1, L * 0.03, 0.82, 0, "#c8ccd0", base, 0.5, 0.4);
  superstructure(sink, base, -L * 0.37, 0.9, 0.8, B * 0.8);
}

function drillship(sink: ShipSink, position: [number, number, number], rotation: number, L = 9) {
  const B = L * 0.18;
  const base = baseAt(position, rotation);
  const derrickH = 2.6;
  const hull = hullGeometry(L, 1.0, B);
  hull.translate(0, 0.25, 0);
  sink.add(hull, "#27405c", base);
  sink.box(L * 0.8, 0.08, B * 0.9, 0, 0.78, 0, "#8a2f27", base);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      sink.box(
        0.09,
        derrickH,
        0.09,
        sx * 0.25,
        0.8 + derrickH / 2,
        sz * 0.25,
        "#d8b23a",
        base,
        0.5,
        0.4,
        [sz * -0.09, 0, sx * 0.09],
      );
  sink.box(0.4, 0.18, 0.4, 0, 0.8 + derrickH, 0, "#d8b23a", base, 0.5, 0.4);
  sink.cyl(0.65, 0.65, 0.06, 8, L * 0.42, 0.95, 0, "#3a7f3f", base);
  superstructure(sink, base, L * 0.28, 0.8, 0.7, B * 0.8);
}

function semiSubRig(sink: ShipSink, position: [number, number, number], rotation: number, s = 1) {
  const deckW = 3.4 * s;
  const base = baseAt(position, rotation);
  for (const side of [-1, 1])
    sink.box(deckW * 1.15, 0.3, 0.7 * s, 0, 0.12, side * deckW * 0.36, "#8a2f27", base);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      sink.cyl(
        0.32 * s,
        0.32 * s,
        1.3,
        10,
        sx * deckW * 0.36,
        0.75,
        sz * deckW * 0.36,
        "#d8dce0",
        base,
      );
  sink.box(deckW * 1.1, 0.35, deckW * 1.05, 0, 1.55, 0, "#c9b26a", base, 0.7);
  sink.cyl(0.1, 0.4, 2.2, 4, 0, 1.75 + 1.1, 0, "#d8b23a", base, 0.5, 0.4);
  sink.cyl(0.5, 0.5, 0.06, 8, deckW * 0.4, 1.85, deckW * 0.3, "#3a7f3f", base);
}

/** 컨테이너선 — 선체는 병합, 컨테이너는 공유 InstancedMesh로 */
function containerShipStatic(
  sink: ShipSink,
  containers: { matrix: THREE.Matrix4; color: THREE.Color }[],
  position: [number, number, number],
  rotation: number,
  L = 9.5,
  seed = 3,
) {
  const B = L * 0.15;
  const base = baseAt(position, rotation);
  const hull = hullGeometry(L, 1.0, B);
  hull.translate(0, 0.22, 0);
  sink.add(hull, "#1f4a5e", base);
  sink.box(L * 0.8, 0.08, B * 0.9, 0, 0.74, 0, "#333b41", base);
  superstructure(sink, base, -L * 0.3, 0.7, 1.0, B * 0.9);

  const COLORS = ["#b6443c", "#2d6fae", "#3f7a4f", "#c9821f", "#777f86", "#9c3f78"];
  const rng = mulberry32(seed * 101);
  const bayCount = 9;
  const tmp = new THREE.Object3D();
  let placed = 0;
  for (let bay = 0; bay < bayCount && placed < 70; bay++) {
    const bx = (bay - bayCount / 2 + 0.9) * (L * 0.075);
    for (let row = 0; row < 3; row++) {
      const bz = (row - 1) * (B * 0.3);
      const stack = 1 + Math.floor(rng() * 3);
      for (let s = 0; s < stack && placed < 70; s++) {
        tmp.position.set(bx, 0.82 + s * 0.17, bz);
        // 컨테이너 크기는 선박 L에 비례 → 스케일로 반영
        tmp.scale.set((L * 0.068) / 0.65, 0.16 / 0.16, (B * 0.28) / 0.4);
        tmp.updateMatrix();
        const m4 = tmp.matrix.clone().premultiply(base);
        containers.push({
          matrix: m4,
          color: new THREE.Color(COLORS[Math.floor(rng() * COLORS.length)]),
        });
        placed++;
      }
    }
  }
}

/** 외해 항행 선박 (천천히 이동) */
function SailingShips() {
  const g1 = useRef<THREE.Group>(null);
  const g2 = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g1.current) {
      const x = ((t * 1.1) % 220) - 110;
      g1.current.position.set(x, 0, -72);
    }
    if (g2.current) {
      const x = 110 - ((t * 0.8 + 60) % 220);
      g2.current.position.set(x, 0, -85);
      g2.current.rotation.y = Math.PI;
    }
  });
  const B = 0.9;
  const geo = useMemo(() => hullGeometry(5.5, 0.8, B), [B]);
  return (
    <>
      <group ref={g1}>
        <mesh geometry={geo} position={[0, 0.2, 0]} material={mat("#44525e")} />
        <mesh position={[-1.8, 0.75, 0]} material={mat("#eef1f3")}>
          <boxGeometry args={[0.5, 0.6, 0.7]} />
        </mesh>
        <mesh position={[0.4, 0.62, 0]} material={mat("#2d6fae")}>
          <boxGeometry args={[2.6, 0.3, 0.7]} />
        </mesh>
      </group>
      <group ref={g2}>
        <mesh geometry={geo} position={[0, 0.2, 0]} material={mat("#6e5544")} />
        <mesh position={[-1.8, 0.7, 0]} material={mat("#e8e5da")}>
          <boxGeometry args={[0.5, 0.5, 0.6]} />
        </mesh>
      </group>
    </>
  );
}

export function Ships() {
  const built = useMemo(() => {
    const sink = new ShipSink();
    const containers: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    // 의장안벽(9) 계류
    lngCarrier(sink, toWorld(48.5, 57.4), 0);
    containerShipStatic(sink, containers, toWorld(59.5, 57.2), Math.PI);
    // 하역안벽 동쪽 끝 VLCC
    tanker(sink, toWorld(72, 57.8), 0);
    // 서쪽 해안 (2도크 게이트 북쪽)
    lngCarrier(sink, toWorld(36.5, 70), Math.PI / 2 - 0.24, 9.5);
    // 동측 안벽
    containerShipStatic(sink, containers, toWorld(85, 72), Math.PI / 2 + 0.14, 8.5, 9);
    // 해양플랜트 옥외 조립장(21) 앞 해상
    drillship(sink, toWorld(84.5, 81), Math.PI / 2 + 0.12);
    semiSubRig(sink, toWorld(81, 89), 0.4);
    return { merged: sink.merged(), containers };
  }, []);

  return (
    <group>
      {built.merged.map((b, i) => (
        <mesh key={i} geometry={b.geo} material={b.mat} castShadow receiveShadow />
      ))}
      <instancedMesh
        ref={(node) => {
          if (node) {
            built.containers.forEach((c, i) => {
              node.setMatrixAt(i, c.matrix);
              node.setColorAt(i, c.color);
            });
            node.count = built.containers.length;
            node.instanceMatrix.needsUpdate = true;
            if (node.instanceColor) node.instanceColor.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, built.containers.length]}
        castShadow
      >
        <boxGeometry args={[0.65, 0.16, 0.4]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <SailingShips />
    </group>
  );
}
