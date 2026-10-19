"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BAY_WATER, COASTLINE } from "@/data/geography";
import { ZONES } from "@/data/zones";
import { fbm2, pointInPolygon } from "./coords";

/**
 * 지형 + 부지 포장면.
 * - 바다(만 + 북쪽 외해)는 음수 깊이, 사업장 부지는 평탄(0),
 *   주변(서·동·남)은 노이즈 기반 녹지 언덕
 * - 부지 포장면은 해안선 폴리곤을 따라 Shape로 만들고 드라이도크 자리는 구멍
 */

/** 도시 블록이 놓일 평탄 지대 (정규화 좌표 사각형) */
export const CITY_FLATS: { x0: number; z0: number; x1: number; z1: number }[] = [
  { x0: 6, z0: 62, x1: 27, z1: 92 }, // 서북쪽 주거지 (오션플라자 배후)
  { x0: 102, z0: 30, x1: 122, z1: 78 }, // 동쪽 바깥 도심
];

function inCityFlat(nx: number, nz: number): boolean {
  return CITY_FLATS.some(
    (c) => nx >= c.x0 && nx <= c.x1 && nz >= c.z0 && nz <= c.z1,
  );
}

/** 정규화 좌표 기준 바다 여부 */
export function isWaterNorm(nx: number, nz: number): boolean {
  if (nz >= 99.5) {
    // 북쪽 외해 — 서쪽 반도(x<38)와 동쪽 해안 너머(x>93) 위는 z=100까지 육지
    return nx > 36 || nz > 103;
  }
  return pointInPolygon(nx, nz, BAY_WATER.points);
}

const SEA_DEPTH = -2.5;

function terrainHeight(nx: number, nz: number): number {
  if (isWaterNorm(nx, nz)) return SEA_DEPTH;

  // 사업장 부지 (해안선 남쪽 육지): 평탄
  const inSiteBounds = nx >= -2 && nx <= 102 && nz >= -2 && nz <= 101;
  if (inSiteBounds) {
    // 부지 내부라도 외곽으로 갈수록 언덕과 블렌딩
    const edge = Math.min(nx + 2, 102 - nx, nz + 2); // 북쪽은 바다라 제외
    if (edge > 8) return 0;
    const t = 1 - Math.max(0, edge) / 8;
    return hillAt(nx, nz) * t * t;
  }
  if (inCityFlat(nx, nz)) return 0.08;
  return hillAt(nx, nz);
}

function hillAt(nx: number, nz: number): number {
  // 외곽 녹지 언덕: 부지에서 멀수록 높게 (서·동·남 산, 북쪽은 바다)
  const dx = Math.max(0, -nx, nx - 100);
  const dz = Math.max(0, -nz);
  const dist = Math.hypot(dx, dz);
  const ramp = Math.min(1, dist / 28);
  const n = fbm2(nx * 0.045 + 7.3, nz * 0.045 + 2.1, 4);
  const base = n * 9 * (0.25 + 0.75 * ramp);
  return Math.max(0.05, base);
}

export function Terrain() {
  const geometry = useMemo(() => {
    const SIZE = 340;
    const SEG = 170;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const grassLow = new THREE.Color("#3e5e33");
    const grassHigh = new THREE.Color("#5c7a45");
    const rock = new THREE.Color("#6b7263");
    const sand = new THREE.Color("#8d9187");
    const seabed = new THREE.Color("#122b36");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      const nx = wx + 50;
      const nz = 50 - wz;
      const h = terrainHeight(nx, nz);
      pos.setY(i, h);
      if (h <= SEA_DEPTH + 0.01) {
        c.copy(seabed);
      } else if (h < 0.12) {
        c.copy(sand);
      } else {
        c.lerpColors(grassLow, grassHigh, Math.min(1, h / 7));
        if (h > 6.5) c.lerp(rock, (h - 6.5) / 3);
        // 약간의 색 노이즈
        const v = fbm2(nx * 0.3, nz * 0.3, 2) * 0.12;
        c.offsetHSL(0, 0, v - 0.06);
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow position={[0, -0.12, 0]}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

/** 드라이도크 footprint 사각형 (포장면 구멍용, 정규화 좌표 코너 반환) */
export function dockCorners(zoneId: number): { x: number; z: number }[] {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const { w, d, rotation } = zone.footprint;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = w / 2;
  const hd = d / 2;
  return [
    { dx: -hw, dz: -hd },
    { dx: hw, dz: -hd },
    { dx: hw, dz: hd },
    { dx: -hw, dz: hd },
  ].map(({ dx, dz }) => ({
    // 평면 CCW 회전
    x: zone.center.x + dx * cos - dz * sin,
    z: zone.center.z + dx * sin + dz * cos,
  }));
}

export function SitePavement() {
  const geometry = useMemo(() => {
    // 부지 외곽: 남쪽 사각형 + 해안선 (반시계 방향, Shape는 XY 평면에 정의 후 눕힘)
    const outline: { x: number; z: number }[] = [
      { x: 0, z: 8 },
      { x: 101, z: 8 },
      { x: 101, z: 101 }, // 동쪽 바깥 북단
      { x: 93, z: 100 },
      { x: 90, z: 90 },
      { x: 86, z: 62 },
      { x: 85, z: 55 },
      { x: 30, z: 55 },
      { x: 33, z: 72 },
      { x: 40, z: 95 },
      { x: 38, z: 100 },
      { x: 0, z: 101 },
    ];
    const shape = new THREE.Shape();
    outline.forEach((p, i) => {
      const wx = p.x - 50;
      const wy = -(50 - p.z); // rotateX(-90°) 후 z = -y 가 되도록
      if (i === 0) shape.moveTo(wx, wy);
      else shape.lineTo(wx, wy);
    });
    // 드라이도크 구멍
    for (const id of [1, 2]) {
      const hole = new THREE.Path();
      dockCorners(id).forEach((p, i) => {
        const wx = p.x - 50;
        const wy = -(50 - p.z);
        if (i === 0) hole.moveTo(wx, wy);
        else hole.lineTo(wx, wy);
      });
      hole.closePath();
      shape.holes.push(hole);
    }
    const geo = new THREE.ShapeGeometry(shape, 2);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow position={[0, 0.02, 0]}>
      <meshStandardMaterial color="#949b9f" roughness={0.95} metalness={0.02} />
    </mesh>
  );
}
