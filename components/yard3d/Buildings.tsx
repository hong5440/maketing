"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ZONES, type Zone } from "@/data/zones";
import { m, mulberry32, rotY, toWorld, type YardEnv } from "./coords";
import { UNIT_M, getYardMaterials, scaleBoxUVs } from "./materials";

/**
 * A-3: 공장동(연속 박공 + 채광창 + 창문 띠 + 셔터) + 사무동(다층 창) +
 * 오션플라자(유리 커튼월) — 재질별 지오메트리 병합으로 draw call 최소화.
 * footprint·위치는 data/zones 그대로.
 */

type Bucket = THREE.BufferGeometry[];

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mtx: THREE.Matrix4,
  vFull = false,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  scaleBoxUVs(g, w, h, d, vFull);
  g.translate(x, y, z);
  g.applyMatrix4(mtx);
  return g;
}

/** 박공지붕: 두 경사면 쿼드 (UV 미터 단위, 길이축 X) */
function gableRoof(
  len: number,
  width: number,
  rise: number,
  x: number,
  y: number,
  z: number,
  mtx: THREE.Matrix4,
): THREE.BufferGeometry {
  const hw = width / 2;
  const slope = Math.hypot(hw, rise);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const quad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    const base = pos.length / 3;
    pos.push(...a, ...b, ...c, ...d);
    uv.push(0, 0, len * UNIT_M, 0, len * UNIT_M, slope * UNIT_M, 0, slope * UNIT_M);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const o = 0.03; // 처마 내밀기
  // 남쪽 경사 (+z → 능선)
  quad(
    [-len / 2 - o, 0, hw + o],
    [len / 2 + o, 0, hw + o],
    [len / 2 + o, rise, 0],
    [-len / 2 - o, rise, 0],
  );
  // 북쪽 경사
  quad(
    [len / 2 + o, 0, -hw - o],
    [-len / 2 - o, 0, -hw - o],
    [-len / 2 - o, rise, 0],
    [len / 2 + o, rise, 0],
  );
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.translate(x, y, z);
  g.applyMatrix4(mtx);
  return g;
}

/** 박공 끝 삼각 벽 (±X 면) */
function gableEnd(
  width: number,
  rise: number,
  x: number,
  y: number,
  z: number,
  sign: 1 | -1,
  mtx: THREE.Matrix4,
): THREE.BufferGeometry {
  const hw = width / 2;
  const g = new THREE.BufferGeometry();
  const pos = [0, 0, -hw, 0, 0, hw, 0, rise, 0];
  const uv = [0, 0.75, width * UNIT_M, 0.75, (width / 2) * UNIT_M, 0.95];
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(sign > 0 ? [0, 1, 2] : [1, 0, 2]);
  g.computeVertexNormals();
  g.translate(x, y, z);
  g.applyMatrix4(mtx);
  return g;
}

interface BuildResult {
  walls: Bucket;
  roofs: { sky: Bucket; blue: Bucket; deep: Bucket };
  skylights: Bucket;
  windowBands: Bucket;
  officeWalls: Bucket;
  curtain: Bucket;
  concrete: Bucket;
  shutters: THREE.Matrix4[];
}

function buildFactory(zone: Zone, out: BuildResult) {
  const { w, d, rotation } = zone.footprint;
  const rng = mulberry32(zone.id * 97 + 11);
  const alongX = w >= d;
  const length = (alongX ? w : d) * 0.96;
  const width = (alongX ? d : w) * 0.96;
  const nSheds = Math.max(1, Math.min(5, Math.round(width / 1.7)));
  const shedW = width / nSheds;
  const wallH = m(zone.buildingHeight) * 0.68;
  const rise = m(zone.buildingHeight) * 0.32;
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const mtx = new THREE.Matrix4()
    .makeRotationY(rotY(rotation) + (alongX ? 0 : Math.PI / 2))
    .setPosition(wx, 0.04, wz);

  const roofKeys = ["sky", "blue", "deep"] as const;
  for (let i = 0; i < nSheds; i++) {
    const off = (i - (nSheds - 1) / 2) * shedW;
    const shedLen = length * (0.9 + rng() * 0.1);
    const jx = rng() * 0.3 - 0.15;
    // 벽 (V 전체 1회 → 하단 오염 그라데이션)
    out.walls.push(box(shedLen, wallH, shedW * 0.94, jx, wallH / 2, off, mtx, true));
    // 지붕 (3색 변주)
    const key = roofKeys[Math.floor(rng() * 3)];
    out.roofs[key].push(gableRoof(shedLen, shedW * 0.94, rise, jx, wallH, off, mtx));
    // 박공 끝 삼각 벽
    out.walls.push(
      gableEnd(shedW * 0.94, rise, jx + shedLen / 2, wallH, off, 1, mtx),
      gableEnd(shedW * 0.94, rise, jx - shedLen / 2, wallH, off, -1, mtx),
    );
    // 능선 채광창 띠
    out.skylights.push(
      box(shedLen * 0.82, 0.045, 0.12, jx, wallH + rise + 0.012, off, mtx),
    );
    // 벽 상부 창문 띠 (양 장변)
    const bandH = m(2.6);
    const bandY = wallH - bandH * 0.75;
    for (const s of [1, -1]) {
      out.windowBands.push(
        box(shedLen * 0.94, bandH, 0.012, jx, bandY, off + s * (shedW * 0.47), mtx, true),
      );
    }
    // 대형 셔터 (남측 장변, 셰드당 1~2개)
    const doors = 1 + (rng() < 0.5 ? 1 : 0);
    for (let k = 0; k < doors; k++) {
      const dx = jx + (k - (doors - 1) / 2) * shedLen * 0.35 + (rng() - 0.5) * 0.2;
      const dm = new THREE.Matrix4()
        .makeScale(m(10), m(8), 1)
        .premultiply(new THREE.Matrix4().setPosition(dx, m(8) / 2, off + shedW * 0.471))
        .premultiply(mtx);
      out.shutters.push(dm);
    }
  }
}

function buildOffice(zone: Zone, out: BuildResult) {
  const { w, d, rotation } = zone.footprint;
  const h = m(zone.buildingHeight);
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const mtx = new THREE.Matrix4().makeRotationY(rotY(rotation)).setPosition(wx, 0.04, wz);
  out.officeWalls.push(box(w * 0.8, h, d * 0.8, 0, h / 2, 0, mtx));
  // 옥상 패러핏 + 옥탑
  out.concrete.push(
    box(w * 0.82, m(1.2), d * 0.82, 0, h + m(0.6), 0, mtx),
    box(w * 0.25, m(2.4), d * 0.25, w * 0.12, h + m(2), -d * 0.1, mtx),
  );
}

function buildPlaza(zone: Zone, out: BuildResult) {
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const h = m(zone.buildingHeight);
  const mtx = new THREE.Matrix4()
    .makeRotationY(rotY(zone.footprint.rotation))
    .setPosition(wx, 0.04, wz);
  out.curtain.push(
    box(1.4, h, 1.6, -1.2, h / 2, 0, mtx),
    box(1.2, h * 0.72, 1.4, 0.5, (h * 0.72) / 2, 0.3, mtx),
    box(1.1, h * 0.45, 1.3, 1.7, (h * 0.45) / 2, -0.3, mtx),
  );
  // 저층 포디움 (사무동 창)
  out.officeWalls.push(box(3.8, m(7), 2.2, 0.3, m(7) / 2, 0, mtx));
  out.concrete.push(box(3.9, m(1), 2.3, 0.3, m(7.5), 0, mtx));
}

function buildWaterTreatment(zone: Zone, out: BuildResult) {
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const mtx = new THREE.Matrix4().setPosition(wx, 0.04, wz);
  for (const [tx, tz] of [
    [-0.9, -0.8],
    [0.9, -0.8],
    [-0.9, 0.8],
    [0.9, 0.8],
  ] as const) {
    const g = new THREE.CylinderGeometry(0.65, 0.65, m(5), 20);
    g.translate(tx, m(5) / 2, tz);
    g.applyMatrix4(mtx);
    out.concrete.push(g);
  }
  out.walls.push(box(1.2, m(zone.buildingHeight), 1.2, 0, m(zone.buildingHeight) / 2, 0, mtx, true));
}

export function Buildings({ env }: { env: YardEnv }) {
  const mats = getYardMaterials();

  useFrame(() => {
    const n = env.night;
    mats.windowBand.emissiveIntensity = n * 1.6;
    mats.officeWindow.emissiveIntensity = n * 1.3;
    mats.curtainWall.emissiveIntensity = n * 0.9;
    mats.skylight.emissiveIntensity = n * 1.8;
  });

  const merged = useMemo(() => {
    const out: BuildResult = {
      walls: [],
      roofs: { sky: [], blue: [], deep: [] },
      skylights: [],
      windowBands: [],
      officeWalls: [],
      curtain: [],
      concrete: [],
      shutters: [],
    };
    for (const z of ZONES) {
      if (z.kind === "factory" && z.id !== 8) buildFactory(z, out);
      else if (z.kind === "office" && z.id !== 7) buildOffice(z, out);
    }
    buildPlaza(ZONES.find((z) => z.id === 7)!, out);
    buildWaterTreatment(ZONES.find((z) => z.id === 8)!, out);
    const mg = (b: Bucket) => (b.length ? mergeGeometries(b, false) : null);
    return {
      walls: mg(out.walls),
      roofSky: mg(out.roofs.sky),
      roofBlue: mg(out.roofs.blue),
      roofDeep: mg(out.roofs.deep),
      skylights: mg(out.skylights),
      windowBands: mg(out.windowBands),
      officeWalls: mg(out.officeWalls),
      curtain: mg(out.curtain),
      concrete: mg(out.concrete),
      shutters: out.shutters,
    };
  }, []);

  return (
    <group>
      {merged.walls && (
        <mesh geometry={merged.walls} material={mats.wall} castShadow receiveShadow />
      )}
      {merged.roofSky && (
        <mesh geometry={merged.roofSky} material={mats.roof.sky} castShadow receiveShadow />
      )}
      {merged.roofBlue && (
        <mesh geometry={merged.roofBlue} material={mats.roof.blue} castShadow receiveShadow />
      )}
      {merged.roofDeep && (
        <mesh geometry={merged.roofDeep} material={mats.roof.deep} castShadow receiveShadow />
      )}
      {merged.skylights && <mesh geometry={merged.skylights} material={mats.skylight} />}
      {merged.windowBands && (
        <mesh geometry={merged.windowBands} material={mats.windowBand} />
      )}
      {merged.officeWalls && (
        <mesh geometry={merged.officeWalls} material={mats.officeWindow} castShadow receiveShadow />
      )}
      {merged.curtain && (
        <mesh geometry={merged.curtain} material={mats.curtainWall} castShadow receiveShadow />
      )}
      {merged.concrete && (
        <mesh geometry={merged.concrete} material={mats.concreteDark} castShadow receiveShadow />
      )}
      {/* 대형 셔터 (인스턴스) */}
      <instancedMesh
        args={[undefined, undefined, Math.max(1, merged.shutters.length)]}
        ref={(node) => {
          if (!node) return;
          merged.shutters.forEach((mtx, i) => node.setMatrixAt(i, mtx));
          node.count = merged.shutters.length;
          node.instanceMatrix.needsUpdate = true;
        }}
      >
        <planeGeometry args={[1, 1]} />
        <primitive object={mats.shutter} attach="material" />
      </instancedMesh>
    </group>
  );
}
