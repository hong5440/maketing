"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { QUAY_LINES } from "@/data/geography";
import { ZONES } from "@/data/zones";
import { m, mulberry32, rotY, toWorld } from "./coords";
import { getYardMaterials, scaleBoxUVs } from "./materials";

/**
 * A-4: 절차적 트러스 크레인.
 * - 트러스 부재(현·사재)는 전부 단위 박스 InstancedMesh (노랑/흰색/강재 3버킷)
 * - 고정 구조물(기계실·운전실·카운터웨이트·바퀴·케이블)은 재질별 지오메트리 병합
 * - 1도크 골리앗만 라이브 계층(주행·트롤리·후크 그룹)으로 남겨
 *   크레인 내비(B-5)의 피벗 구조(주행축·트롤리·후크)를 유지한다.
 */

/* ── 부재 수집기 ──────────────────────────────────── */

type Bucket = "yellow" | "white" | "steel";

class MemberSink {
  yellow: THREE.Matrix4[] = [];
  white: THREE.Matrix4[] = [];
  steel: THREE.Matrix4[] = [];
  solids: { geo: THREE.BufferGeometry; mat: "cab" | "steel" | "yellow" | "warn" | "cable" }[] = [];

  private tmp = new THREE.Object3D();
  private vA = new THREE.Vector3();
  private vB = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private quat = new THREE.Quaternion();
  private X = new THREE.Vector3(1, 0, 0);

  /** p1→p2 부재 (단위 박스를 X축 정렬로 스케일) */
  member(
    bucket: Bucket,
    p1: [number, number, number],
    p2: [number, number, number],
    t: number,
    base: THREE.Matrix4,
  ) {
    this.vA.set(...p1);
    this.vB.set(...p2);
    const len = this.vA.distanceTo(this.vB);
    if (len < 1e-5) return;
    this.dir.subVectors(this.vB, this.vA).normalize();
    this.quat.setFromUnitVectors(this.X, this.dir);
    this.tmp.position.addVectors(this.vA, this.vB).multiplyScalar(0.5);
    this.tmp.quaternion.copy(this.quat);
    this.tmp.scale.set(len, t, t);
    this.tmp.updateMatrix();
    const mtx = this.tmp.matrix.clone().premultiply(base);
    this[bucket].push(mtx);
  }

  solid(
    geo: THREE.BufferGeometry,
    mat: "cab" | "steel" | "yellow" | "warn" | "cable",
    base: THREE.Matrix4,
  ) {
    geo.applyMatrix4(base);
    this.solids.push({ geo, mat });
  }
}

/* ── 격자 유틸 ────────────────────────────────────── */

/** 사각 단면 격자 마스트: 4현 + 패널마다 X 사재 */
function latticeMast(
  sink: MemberSink,
  bucket: Bucket,
  h: number,
  half: number,
  panel: number,
  t: number,
  base: THREE.Matrix4,
) {
  const corners: [number, number][] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  for (const [cx, cz] of corners)
    sink.member(bucket, [cx, 0, cz], [cx, h, cz], t, base);
  const n = Math.max(1, Math.round(h / panel));
  for (let i = 0; i < n; i++) {
    const y0 = (i / n) * h;
    const y1 = ((i + 1) / n) * h;
    for (let f = 0; f < 4; f++) {
      const [ax, az] = corners[f];
      const [bx, bz] = corners[(f + 1) % 4];
      const flip = (i + f) % 2 === 0;
      sink.member(
        bucket,
        [ax, flip ? y0 : y1, az],
        [bx, flip ? y1 : y0, bz],
        t * 0.8,
        base,
      );
      if (i % 2 === 0) sink.member(bucket, [ax, y1, az], [bx, y1, bz], t * 0.7, base);
    }
  }
}

/** 삼각 단면 지브 트러스 (길이축 +X, 끝으로 갈수록 좁아짐) */
function jibTruss(
  sink: MemberSink,
  bucket: Bucket,
  len: number,
  w0: number,
  h0: number,
  taper: number,
  panel: number,
  t: number,
  base: THREE.Matrix4,
) {
  const n = Math.max(2, Math.round(len / panel));
  const at = (i: number) => {
    const x = (i / n) * len;
    const k = 1 - (i / n) * (1 - taper);
    return { x, w: (w0 * k) / 2, h: h0 * k };
  };
  for (let i = 0; i < n; i++) {
    const a = at(i);
    const b = at(i + 1);
    // 하현 2 + 상현 1
    sink.member(bucket, [a.x, 0, -a.w], [b.x, 0, -b.w], t, base);
    sink.member(bucket, [a.x, 0, a.w], [b.x, 0, b.w], t, base);
    sink.member(bucket, [a.x, a.h, 0], [b.x, b.h, 0], t, base);
    // 사재
    const flip = i % 2 === 0;
    sink.member(bucket, [a.x, 0, flip ? -a.w : a.w], [b.x, b.h, 0], t * 0.75, base);
    sink.member(bucket, [a.x, a.h, 0], [b.x, 0, flip ? b.w : -b.w], t * 0.75, base);
    // 하현 횡재
    sink.member(bucket, [a.x, 0, -a.w], [a.x, 0, a.w], t * 0.7, base);
  }
}

/* ── 크레인 빌더 ──────────────────────────────────── */

function buildGoliath(
  sink: MemberSink,
  pos: [number, number, number],
  rot: number,
  span: number,
  height: number,
  trolleyT: number,
  withLive: boolean,
) {
  const base = new THREE.Matrix4().makeRotationY(rot).setPosition(...pos);
  const girderH = 0.5;
  const legSpread = 1.0;

  // ── 박스 거더 2본 + 측면 트러스 패턴 ──
  for (const gz of [-0.26, 0.26]) {
    const g = new THREE.BoxGeometry(span + 1.4, girderH, 0.3);
    scaleBoxUVs(g, span + 1.4, girderH, 0.3);
    g.translate(0, height + girderH / 2, gz);
    sink.solid(g, "yellow", base.clone());
    // 거더 측면 대각 리브
    const n = Math.round((span + 1.4) / 0.5);
    for (let i = 0; i < n; i++) {
      const x0 = -(span + 1.4) / 2 + i * 0.5;
      const flip = i % 2 === 0;
      sink.member(
        "steel",
        [x0, height + (flip ? 0.04 : girderH - 0.04), gz + (gz > 0 ? 0.16 : -0.16)],
        [x0 + 0.5, height + (flip ? girderH - 0.04 : 0.04), gz + (gz > 0 ? 0.16 : -0.16)],
        0.03,
        base,
      );
    }
  }
  // 거더 상부 통로 난간 + 기계실
  sink.member("steel", [-span / 2, height + girderH + 0.1, 0], [span / 2, height + girderH + 0.1, 0], 0.025, base);
  const mach = new THREE.BoxGeometry(0.9, 0.26, 0.9);
  mach.translate(span * 0.3, height + girderH + 0.15, 0);
  sink.solid(mach, "cab", base.clone());

  // ── 다리 (강성 A형 + 유성) + 경고 줄무늬 + 주행 대차 ──
  for (const side of [-1, 1] as const) {
    const sx = side * (span / 2);
    for (const lz of [-legSpread / 2, legSpread / 2]) {
      // 기울어진 다리 부재 (A형)
      sink.member(
        "yellow",
        [sx + side * 0.25, 0.25, lz * 1.6],
        [sx, height, lz * 0.35],
        0.17,
        base,
      );
      // 다리 수평·사선 브레이싱
      sink.member("yellow", [sx + side * 0.18, height * 0.45, -legSpread * 0.7], [sx + side * 0.18, height * 0.45, legSpread * 0.7], 0.09, base);
      sink.member("yellow", [sx + side * 0.22, height * 0.2, lz * 1.35], [sx + side * 0.12, height * 0.68, -lz * 0.45], 0.06, base);
    }
    // 하부 경고 줄무늬 기둥 커버
    for (const lz of [-legSpread / 2, legSpread / 2]) {
      const warn = new THREE.BoxGeometry(0.2, 0.5, 0.2);
      scaleBoxUVs(warn, 0.2, 0.5, 0.2);
      warn.translate(sx + side * 0.24, 0.45, lz * 1.55);
      sink.solid(warn, "warn", base.clone());
    }
    // 주행 대차(보기) + 바퀴
    const bogie = new THREE.BoxGeometry(0.75, 0.2, legSpread * 1.9);
    bogie.translate(sx + side * 0.25, 0.22, 0);
    sink.solid(bogie, "steel", base.clone());
    for (let wIdx = 0; wIdx < 4; wIdx++) {
      const wheel = new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10);
      wheel.rotateZ(Math.PI / 2);
      wheel.translate(
        sx + side * 0.25 + (wIdx % 2 === 0 ? -0.22 : 0.22),
        0.085,
        (wIdx < 2 ? -1 : 1) * legSpread * 0.75,
      );
      sink.solid(wheel, "steel", base.clone());
    }
    // 지면 레일
    const rail = new THREE.BoxGeometry(0.14, 0.04, 9);
    rail.translate(sx + side * 0.25, 0.02, 0);
    sink.solid(rail, "steel", base.clone());
  }

  // ── 트롤리 + 후크 (정적 크레인만 여기서 굽고, 라이브는 JSX 계층) ──
  if (!withLive) {
    const tx = (trolleyT - 0.5) * span;
    const trol = new THREE.BoxGeometry(0.55, 0.26, 0.9);
    trol.translate(tx, height + girderH + 0.13, 0);
    sink.solid(trol, "cab", base.clone());
    const cableL = height * 0.45;
    const cab1 = new THREE.CylinderGeometry(0.012, 0.012, cableL, 4);
    cab1.translate(tx, height - cableL / 2, 0);
    sink.solid(cab1, "cable", base.clone());
    const hook = new THREE.BoxGeometry(0.28, 0.13, 0.2);
    hook.translate(tx, height - cableL, 0);
    sink.solid(hook, "yellow", base.clone());
  }
}

function buildTower(
  sink: MemberSink,
  pos: [number, number, number],
  rot: number,
  h: number,
  jib: number,
) {
  const base = new THREE.Matrix4().makeRotationY(rot).setPosition(...pos);
  // 격자 마스트
  latticeMast(sink, "yellow", h, 0.09, 0.28, 0.035, base);
  // 선회부 + 운전실
  const slew = new THREE.BoxGeometry(0.2, 0.14, 0.2);
  slew.translate(0, h + 0.07, 0);
  sink.solid(slew, "yellow", base.clone());
  const cab = new THREE.BoxGeometry(0.2, 0.2, 0.16);
  cab.translate(0.16, h + 0.22, 0);
  sink.solid(cab, "cab", base.clone());
  // 메인 지브 (삼각 트러스)
  const jibBase = new THREE.Matrix4()
    .makeTranslation(0.1, h + 0.3, 0)
    .premultiply(base);
  jibTruss(sink, "yellow", jib, 0.16, 0.14, 0.4, 0.3, 0.028, jibBase);
  // 카운터 지브 + 카운터웨이트
  const cjBase = new THREE.Matrix4()
    .makeRotationY(Math.PI)
    .premultiply(new THREE.Matrix4().makeTranslation(-0.1, h + 0.3, 0))
    .premultiply(base);
  jibTruss(sink, "yellow", jib * 0.38, 0.16, 0.1, 0.8, 0.3, 0.028, cjBase);
  const cw = new THREE.BoxGeometry(0.22, 0.26, 0.3);
  cw.translate(-0.1 - jib * 0.34, h + 0.2, 0);
  sink.solid(cw, "steel", base.clone());
  // 타워 꼭대기 + 타이바
  const apex = 0.45;
  sink.member("yellow", [0, h + 0.3, 0], [0, h + 0.3 + apex, 0], 0.03, base);
  sink.member("steel", [0, h + 0.3 + apex, 0], [0.1 + jib * 0.65, h + 0.32, 0], 0.012, base);
  sink.member("steel", [0, h + 0.3 + apex, 0], [-0.1 - jib * 0.3, h + 0.32, 0], 0.012, base);
  // 호이스트 와이어 + 후크
  const hx = 0.1 + jib * 0.55;
  const drop = 0.55;
  sink.member("steel", [hx, h + 0.3, 0], [hx, h + 0.3 - drop, 0], 0.01, base);
  const hook = new THREE.BoxGeometry(0.07, 0.09, 0.07);
  hook.translate(hx, h + 0.3 - drop, 0);
  sink.solid(hook, "steel", base.clone());
}

function buildJib(
  sink: MemberSink,
  pos: [number, number, number],
  rot: number,
  scale: number,
  boomUp: number,
) {
  const base = new THREE.Matrix4().makeRotationY(rot).setPosition(...pos);
  const towerH = 1.25 * scale;
  const boomL = 2.3 * scale;
  // 받침 + 원통 타워
  const ped = new THREE.CylinderGeometry(0.32 * scale, 0.4 * scale, 0.4, 10);
  ped.translate(0, 0.2, 0);
  sink.solid(ped, "steel", base.clone());
  const tow = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, towerH, 8);
  tow.translate(0, 0.4 + towerH / 2, 0);
  sink.solid(tow, "cab", base.clone());
  // 기계실 + 운전실 + 카운터웨이트
  const house = new THREE.BoxGeometry(0.55 * scale, 0.3 * scale, 0.34 * scale);
  house.translate(0.08 * scale, 0.4 + towerH + 0.12 * scale, 0);
  sink.solid(house, "cab", base.clone());
  const cwt = new THREE.BoxGeometry(0.28 * scale, 0.24 * scale, 0.3 * scale);
  cwt.translate(-0.36 * scale, 0.4 + towerH + 0.1 * scale, 0);
  sink.solid(cwt, "steel", base.clone());
  // 격자 붐 (삼각 트러스, 들어올림 각)
  const boomBase = new THREE.Matrix4()
    .makeRotationZ(boomUp)
    .premultiply(new THREE.Matrix4().makeTranslation(0.15 * scale, 0.4 + towerH + 0.1 * scale, 0))
    .premultiply(base);
  jibTruss(sink, "white", boomL, 0.14 * scale, 0.13 * scale, 0.35, 0.26, 0.022 * scale, boomBase);
  // 와이어 (붐 끝 → 기계실, 붐 끝 → 후크)
  const tipX = 0.15 * scale + boomL * Math.cos(boomUp);
  const tipY = 0.4 + towerH + 0.1 * scale + boomL * Math.sin(boomUp);
  sink.member("steel", [0.05 * scale, 0.4 + towerH + 0.28 * scale, 0], [tipX, tipY, 0], 0.008, base);
  const drop = Math.min(tipY - 0.3, 0.9 * scale);
  sink.member("steel", [tipX, tipY, 0], [tipX, tipY - drop, 0], 0.008, base);
  const hook = new THREE.BoxGeometry(0.06, 0.08, 0.06);
  hook.translate(tipX, tipY - drop, 0);
  sink.solid(hook, "steel", base.clone());
}

/* ── 라이브 골리앗 (1도크, 크레인 내비 피벗 유지) ──── */

export interface GoliathHandles {
  /** 레일 방향 주행 그룹 (전체 크레인) */
  travel: THREE.Group | null;
  /** 거더 위 트롤리 그룹 (로컬 X 이동) */
  trolley: THREE.Group | null;
  /** 후크 그룹 (로컬 Y 이동) */
  hook: THREE.Group | null;
  span: number;
  height: number;
}

export const liveGoliath: GoliathHandles = {
  travel: null,
  trolley: null,
  hook: null,
  span: 7,
  height: 4,
};

function LiveGoliathParts({
  span,
  height,
  trolleyT,
}: {
  span: number;
  height: number;
  trolleyT: number;
}) {
  const mats = getYardMaterials();
  const girderH = 0.5;
  const trolleyRef = useRef<THREE.Group>(null);
  const hookRef = useRef<THREE.Group>(null);
  return (
    <group
      ref={(g) => {
        liveGoliath.travel = g;
        liveGoliath.span = span;
        liveGoliath.height = height;
      }}
    >
      <group
        position={[(trolleyT - 0.5) * span, height, 0]}
        ref={(g) => {
          liveGoliath.trolley = g;
          trolleyRef.current = g;
        }}
      >
        <mesh position={[0, girderH + 0.13, 0]} castShadow material={mats.craneCab}>
          <boxGeometry args={[0.55, 0.26, 0.9]} />
        </mesh>
        <group
          position={[0, -height * 0.45, 0]}
          ref={(g) => {
            liveGoliath.hook = g;
            hookRef.current = g;
          }}
        >
          <mesh position={[0, height * 0.225, 0]} material={mats.cable}>
            <cylinderGeometry args={[0.012, 0.012, height * 0.45, 4]} />
          </mesh>
          <mesh material={mats.craneYellow}>
            <boxGeometry args={[0.28, 0.13, 0.2]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ── 루트 ─────────────────────────────────────────── */

export function Cranes() {
  const mats = getYardMaterials();

  const built = useMemo(() => {
    const sink = new MemberSink();
    const dock1 = ZONES.find((z) => z.id === 1)!;
    const dock2 = ZONES.find((z) => z.id === 2)!;
    const d1rot = rotY(dock1.footprint.rotation) + Math.PI / 2;
    const d2rot = rotY(dock2.footprint.rotation);

    const g1pos = toWorld(dock1.center.x + 1.2, dock1.center.z - 1.5);
    const g1rot = d1rot + Math.PI / 2;
    buildGoliath(sink, g1pos, g1rot, 7, 4, 0.42, true);
    buildGoliath(
      sink,
      toWorld(dock2.center.x - 0.5, dock2.center.z),
      d2rot + Math.PI / 2,
      6,
      4.3,
      0.6,
      false,
    );

    const rng = mulberry32(42);
    for (const quay of QUAY_LINES) {
      const [a, b] = [quay.points[0], quay.points[quay.points.length - 1]];
      const n = quay.name.includes("해양") ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        buildJib(
          sink,
          toWorld(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t - 0.8),
          rng() * Math.PI * 2,
          0.9 + rng() * 0.4,
          0.55 + rng() * 0.25,
        );
      }
    }
    buildJib(sink, toWorld(24.8, 42.3), 1.2, 1.1, 0.65);
    buildJib(sink, toWorld(27.5, 46), -0.6, 1.0, 0.6);
    buildJib(sink, toWorld(27, 58.5), 2.4, 1.0, 0.7);

    for (const t of [
      { pos: toWorld(36, 51), rot: 0.4 },
      { pos: toWorld(42, 46), rot: 2.1 },
      { pos: toWorld(88, 80), rot: 1.0 },
      { pos: toWorld(92, 87), rot: -1.2 },
      { pos: toWorld(80, 36), rot: 0.2 },
    ])
      buildTower(sink, t.pos as [number, number, number], t.rot, 2.1, 2.0);

    // 재질별 솔리드 병합
    const byMat: Record<string, THREE.BufferGeometry[]> = {};
    for (const s of sink.solids) (byMat[s.mat] ??= []).push(s.geo);
    const solidMeshes = Object.entries(byMat).map(([mat, geos]) => ({
      mat,
      geo: mergeGeometries(geos, false)!,
    }));
    return {
      members: { yellow: sink.yellow, white: sink.white, steel: sink.steel },
      solidMeshes,
      live: { pos: g1pos, rot: g1rot, span: 7, height: 4, trolleyT: 0.42 },
    };
  }, []);

  const matOf = (k: string) =>
    k === "cab"
      ? mats.craneCab
      : k === "steel"
        ? mats.craneSteel
        : k === "yellow"
          ? mats.craneYellow
          : k === "warn"
            ? mats.warnStripe
            : mats.cable;

  const memberMesh = (
    matrices: THREE.Matrix4[],
    material: THREE.Material,
    key: string,
    shadow = true,
  ) => (
    <instancedMesh
      key={key}
      args={[undefined, undefined, Math.max(1, matrices.length)]}
      castShadow={shadow}
      ref={(node) => {
        if (!node) return;
        matrices.forEach((mtx, i) => node.setMatrixAt(i, mtx));
        node.count = matrices.length;
        node.instanceMatrix.needsUpdate = true;
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );

  return (
    <group>
      {memberMesh(built.members.yellow, mats.craneYellow, "my")}
      {memberMesh(built.members.white, mats.craneCab, "mw")}
      {memberMesh(built.members.steel, mats.craneSteel, "ms", false)}
      {built.solidMeshes.map((s) => (
        <mesh
          key={s.mat}
          geometry={s.geo}
          material={matOf(s.mat)}
          castShadow={s.mat !== "cable"}
        />
      ))}
      {/* 1도크 라이브 골리앗 (주행/트롤리/후크 피벗) */}
      <group position={built.live.pos} rotation={[0, built.live.rot, 0]}>
        <LiveGoliathParts
          span={built.live.span}
          height={built.live.height}
          trolleyT={built.live.trolleyT}
        />
      </group>
    </group>
  );
}

export const craneMaterials = {};
