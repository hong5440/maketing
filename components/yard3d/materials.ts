"use client";

import * as THREE from "three";
import { mulberry32 } from "./coords";

/**
 * A-2: 공유 PBR 재질 + 절차 생성 텍스처 (색·노멀·거칠기).
 * 외부 에셋 호스트(Poly Haven·ambientCG)가 차단된 환경이라 캔버스로 생성한다 —
 * public/textures/ 에 같은 이름의 실제 CC0 텍스처를 넣으면 교체 가능하도록
 * 타일 크기(미터)를 상수로 명시한다. 1 월드 유닛 = 25m.
 *
 * UV 규약: 지오메트리 UV를 "미터 단위"로 굽고(scaleBoxUVs 등),
 * 텍스처 repeat = 1/타일미터 로 설정 → 실스케일 반복.
 */

export const UNIT_M = 25;

/* ── 텍스처 생성 유틸 ─────────────────────────────── */

function canvas2d(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!];
}

function makeTex(
  c: HTMLCanvasElement,
  { srgb = true, repeatPerMeter = 0 }: { srgb?: boolean; repeatPerMeter?: number } = {},
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeatPerMeter > 0) t.repeat.set(repeatPerMeter, repeatPerMeter);
  return t;
}

/** 높이맵 캔버스(0~255 그레이) → 노멀맵 (소벨) */
function heightToNormal(src: HTMLCanvasElement, strength = 2): HTMLCanvasElement {
  const s = src.width;
  const sctx = src.getContext("2d")!;
  const h = sctx.getImageData(0, 0, s, s).data;
  const [dst, dctx] = canvas2d(s);
  const out = dctx.createImageData(s, s);
  const H = (x: number, y: number) =>
    h[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * s + x) * 4;
      out.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      out.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      out.data[i + 2] = inv * 255;
      out.data[i + 3] = 255;
    }
  }
  dctx.putImageData(out, 0, 0);
  return dst;
}

/** 값 노이즈 채우기 */
function fillNoise(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: string,
  amp: number,
  seed: number,
  cell = 6,
) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const rng = mulberry32(seed);
  const n = Math.floor((size / cell) ** 2 * 1.2);
  for (let i = 0; i < n; i++) {
    const v = (rng() - 0.5) * amp;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(rng() * size, rng() * size, cell * (0.6 + rng()), cell * (0.6 + rng()));
  }
}

/* ── 개별 텍스처 ──────────────────────────────────── */

/** 골함석(세로 골) — 타일 2m. 색맵+노멀+거칠기. */
function corrugated(colorHex: string, seed: number) {
  const S = 256;
  const TILE = 2; // m
  const [cc, cctx] = canvas2d(S);
  fillNoise(cctx, S, colorHex, 0.1, seed, 10);
  // 골 세로줄 음영 + 패널 이음
  for (let x = 0; x < S; x++) {
    const ph = Math.sin((x / S) * Math.PI * 2 * 16);
    cctx.fillStyle = ph > 0 ? `rgba(255,255,255,${ph * 0.07})` : `rgba(0,0,0,${-ph * 0.1})`;
    cctx.fillRect(x, 0, 1, S);
  }
  cctx.fillStyle = "rgba(0,0,0,0.22)";
  cctx.fillRect(0, 0, 2, S);
  // 높이맵 → 노멀
  const [hc, hctx] = canvas2d(S);
  for (let x = 0; x < S; x++) {
    const v = (Math.sin((x / S) * Math.PI * 2 * 16) * 0.5 + 0.5) * 220 + 20;
    hctx.fillStyle = `rgb(${v},${v},${v})`;
    hctx.fillRect(x, 0, 1, S);
  }
  const [rc, rctx] = canvas2d(S);
  fillNoise(rctx, S, "#8a8a8a", 0.5, seed + 1, 14);
  return {
    map: makeTex(cc, { repeatPerMeter: 1 / TILE }),
    normalMap: makeTex(heightToNormal(hc, 3), { srgb: false, repeatPerMeter: 1 / TILE }),
    roughnessMap: makeTex(rc, { srgb: false, repeatPerMeter: 1 / TILE }),
  };
}

/** 금속 패널 벽 (가로 이음 + 하단 오염 그라데이션) — U만 타일(3m), V는 벽 전체 1회 */
function panelWall() {
  const S = 256;
  const [cc, cctx] = canvas2d(S);
  fillNoise(cctx, S, "#cfd4d8", 0.08, 21, 12);
  for (let y = 0; y < S; y += 42) {
    cctx.fillStyle = "rgba(0,0,0,0.13)";
    cctx.fillRect(0, y, S, 2);
  }
  // 하단 오염 (V=1이 바닥)
  const g = cctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0.72, "rgba(60,54,46,0)");
  g.addColorStop(1, "rgba(60,54,46,0.5)");
  cctx.fillStyle = g;
  cctx.fillRect(0, 0, S, S);
  const [hc, hctx] = canvas2d(S);
  hctx.fillStyle = "#808080";
  hctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 42) {
    hctx.fillStyle = "#3a3a3a";
    hctx.fillRect(0, y, S, 2);
  }
  const [rc, rctx] = canvas2d(S);
  fillNoise(rctx, S, "#9b9b9b", 0.4, 22, 16);
  const t = {
    map: makeTex(cc),
    normalMap: makeTex(heightToNormal(hc, 1.6), { srgb: false }),
    roughnessMap: makeTex(rc, { srgb: false }),
  };
  // U 3m 타일, V는 지오메트리에서 0~1 (전체 높이)
  t.map.repeat.set(1 / 3, 1);
  t.normalMap.repeat.set(1 / 3, 1);
  t.roughnessMap.repeat.set(1 / 3, 1);
  return t;
}

/** 콘크리트 — 타일 6m */
function concreteTex(seed = 31, base = "#b4b8bb") {
  const S = 256;
  const TILE = 6;
  const [cc, cctx] = canvas2d(S);
  fillNoise(cctx, S, base, 0.09, seed, 7);
  // 희미한 신축 줄눈
  cctx.strokeStyle = "rgba(0,0,0,0.1)";
  cctx.lineWidth = 2;
  cctx.strokeRect(1, 1, S - 2, S - 2);
  const [rc, rctx] = canvas2d(S);
  fillNoise(rctx, S, "#c0c0c0", 0.35, seed + 5, 9);
  const [hc, hctx] = canvas2d(S);
  fillNoise(hctx, S, "#808080", 0.5, seed + 9, 5);
  return {
    map: makeTex(cc, { repeatPerMeter: 1 / TILE }),
    roughnessMap: makeTex(rc, { srgb: false, repeatPerMeter: 1 / TILE }),
    normalMap: makeTex(heightToNormal(hc, 0.8), { srgb: false, repeatPerMeter: 1 / TILE }),
  };
}

/** 아스팔트 — 타일 5m */
function asphaltTex() {
  const S = 256;
  const TILE = 5;
  const [cc, cctx] = canvas2d(S);
  fillNoise(cctx, S, "#3b4046", 0.12, 41, 4);
  const [rc, rctx] = canvas2d(S);
  fillNoise(rctx, S, "#b6b6b6", 0.3, 42, 5);
  const [hc, hctx] = canvas2d(S);
  fillNoise(hctx, S, "#808080", 0.6, 43, 3);
  return {
    map: makeTex(cc, { repeatPerMeter: 1 / TILE }),
    roughnessMap: makeTex(rc, { srgb: false, repeatPerMeter: 1 / TILE }),
    normalMap: makeTex(heightToNormal(hc, 0.7), { srgb: false, repeatPerMeter: 1 / TILE }),
  };
}

/** 창문 띠 (공장 벽 상부·사무동): U 2m당 창 1칸, V 1층 1회 */
function windowBand(seed: number, lit = 0.4) {
  const S = 256;
  const COLS = 8;
  const [cc, cctx] = canvas2d(S);
  cctx.fillStyle = "#39434d";
  cctx.fillRect(0, 0, S, S);
  const [ec, ectx] = canvas2d(S);
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, S, S);
  const rng = mulberry32(seed);
  const cw = S / COLS;
  for (let cI = 0; cI < COLS; cI++) {
    const x = cI * cw + 3;
    const glass = 0.3 + rng() * 0.35;
    cctx.fillStyle = `rgb(${40 + 60 * glass},${55 + 75 * glass},${75 + 95 * glass})`;
    cctx.fillRect(x, 10, cw - 6, S - 20);
    if (rng() < lit) {
      ectx.fillStyle = rng() < 0.75 ? "#ffd27d" : "#dcebff";
      ectx.fillRect(x, 10, cw - 6, S - 20);
    }
  }
  const map = makeTex(cc);
  const emissiveMap = makeTex(ec);
  map.repeat.set(1 / 2, 1); // 창 1칸 = 2m
  emissiveMap.repeat.set(1 / 2, 1);
  return { map, emissiveMap };
}

/** 파란 유리 커튼월 (7번) — 멀리언 그리드, U·V 실스케일(층고 3.6m, 모듈 1.8m) */
function curtainWall() {
  const S = 256;
  const [cc, cctx] = canvas2d(S);
  const g = cctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, "#9fc4e8");
  g.addColorStop(1, "#4d7fb8");
  cctx.fillStyle = g;
  cctx.fillRect(0, 0, S, S);
  cctx.fillStyle = "rgba(18,30,44,0.85)";
  for (let x = 0; x < S; x += S / 2) cctx.fillRect(x, 0, 3, S); // 1.8m 모듈
  cctx.fillRect(0, 0, S, 3); // 층 구분(3.6m)
  cctx.fillRect(0, S - 3, S, 3);
  const [ec, ectx] = canvas2d(S);
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, S, S);
  const rng = mulberry32(777);
  for (let x = 0; x < 2; x++)
    if (rng() < 0.4) {
      ectx.fillStyle = "#cfe2ff";
      ectx.fillRect(x * (S / 2) + 4, 5, S / 2 - 8, S - 10);
    }
  const map = makeTex(cc);
  const emissiveMap = makeTex(ec);
  map.repeat.set(1 / 3.6, 1 / 3.6);
  emissiveMap.repeat.set(1 / 3.6, 1 / 3.6);
  return { map, emissiveMap };
}

/** 경고 줄무늬 (노랑/검정 대각) — 크레인 다리 하부·안벽 가장자리. 타일 1m */
function warnStripes(yellow = "#e8b50f") {
  const S = 128;
  const [cc, cctx] = canvas2d(S);
  cctx.fillStyle = yellow;
  cctx.fillRect(0, 0, S, S);
  cctx.fillStyle = "#15161a";
  const w = S / 4;
  for (let i = -4; i < 8; i++) {
    cctx.save();
    cctx.translate(i * w, 0);
    cctx.transform(1, 0, -1, 1, 0, 0);
    cctx.fillRect(0, 0, w / 2, S);
    cctx.restore();
  }
  return { map: makeTex(cc, { repeatPerMeter: 1 }) };
}

/* ── 공유 재질 번들 ───────────────────────────────── */

export interface YardMaterials {
  roof: Record<"sky" | "blue" | "deep", THREE.MeshStandardMaterial>;
  wall: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  lanePaint: THREE.MeshStandardMaterial;
  windowBand: THREE.MeshStandardMaterial;
  officeWindow: THREE.MeshStandardMaterial;
  curtainWall: THREE.MeshStandardMaterial;
  skylight: THREE.MeshStandardMaterial;
  shutter: THREE.MeshStandardMaterial;
  warnStripe: THREE.MeshStandardMaterial;
  craneYellow: THREE.MeshStandardMaterial;
  craneSteel: THREE.MeshStandardMaterial;
  craneCab: THREE.MeshStandardMaterial;
  cable: THREE.MeshStandardMaterial;
}

let cached: YardMaterials | null = null;

export function getYardMaterials(): YardMaterials {
  if (cached) return cached;
  const roofOf = (hex: string, seed: number) => {
    const t = corrugated(hex, seed);
    return new THREE.MeshStandardMaterial({
      ...t,
      roughness: 0.6,
      metalness: 0.55,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });
  };
  const wallT = panelWall();
  const conc = concreteTex();
  const concD = concreteTex(61, "#9aa0a4");
  const asp = asphaltTex();
  const wband = windowBand(7, 0.5);
  const oband = windowBand(13, 0.45);
  // 사무동: 창 2m × 층고 3.5m 실스케일 반복
  oband.map.repeat.set(1 / 2, 1 / 3.5);
  oband.emissiveMap.repeat.set(1 / 2, 1 / 3.5);
  const cwall = curtainWall();
  const warn = warnStripes();

  cached = {
    roof: {
      sky: roofOf("#79aed6", 3),
      blue: roofOf("#3f7fc0", 4),
      deep: roofOf("#245a9e", 5),
    },
    wall: new THREE.MeshStandardMaterial({
      ...wallT,
      roughness: 0.75,
      metalness: 0.25,
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    concrete: new THREE.MeshStandardMaterial({ ...conc, roughness: 0.95 }),
    concreteDark: new THREE.MeshStandardMaterial({ ...concD, roughness: 0.95 }),
    asphalt: new THREE.MeshStandardMaterial({ ...asp, roughness: 0.98 }),
    lanePaint: new THREE.MeshStandardMaterial({ color: "#cfc568", roughness: 0.85 }),
    windowBand: new THREE.MeshStandardMaterial({
      map: wband.map,
      emissiveMap: wband.emissiveMap,
      emissive: new THREE.Color("#ffdf9e"),
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.4,
    }),
    officeWindow: new THREE.MeshStandardMaterial({
      map: oband.map,
      emissiveMap: oband.emissiveMap,
      emissive: new THREE.Color("#ffd98a"),
      emissiveIntensity: 0,
      roughness: 0.35,
      metalness: 0.45,
    }),
    curtainWall: new THREE.MeshStandardMaterial({
      map: cwall.map,
      emissiveMap: cwall.emissiveMap,
      emissive: new THREE.Color("#cfe2ff"),
      emissiveIntensity: 0,
      color: "#cfe4ff",
      roughness: 0.12,
      metalness: 0.92,
      envMapIntensity: 1.6,
    }),
    skylight: new THREE.MeshStandardMaterial({
      color: "#c8d6de",
      emissive: new THREE.Color("#eaf2ff"),
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.2,
    }),
    shutter: new THREE.MeshStandardMaterial({
      color: "#7d8891",
      roughness: 0.6,
      metalness: 0.5,
    }),
    warnStripe: new THREE.MeshStandardMaterial({ ...warn, roughness: 0.6 }),
    craneYellow: new THREE.MeshStandardMaterial({
      color: "#e8a51e",
      roughness: 0.48,
      metalness: 0.35,
      roughnessMap: conc.roughnessMap,
    }),
    craneSteel: new THREE.MeshStandardMaterial({
      color: "#6a7680",
      roughness: 0.5,
      metalness: 0.6,
    }),
    craneCab: new THREE.MeshStandardMaterial({
      color: "#dde3e8",
      roughness: 0.55,
      metalness: 0.2,
    }),
    cable: new THREE.MeshStandardMaterial({ color: "#1d1f22", roughness: 0.8 }),
  };
  return cached;
}

/* ── UV 유틸 ──────────────────────────────────────── */

/**
 * BoxGeometry UV를 미터 단위로 재스케일.
 * 텍스처 repeat(1/타일미터)와 곱해져 실스케일 반복이 된다.
 * vFull=true면 V축은 0~1 유지 (벽 오염 그라데이션처럼 전체 높이 1회 매핑).
 */
export function scaleBoxUVs(
  geo: THREE.BufferGeometry,
  wUnits: number,
  hUnits: number,
  dUnits: number,
  vFull = false,
) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const wM = wUnits * UNIT_M;
  const hM = hUnits * UNIT_M;
  const dM = dUnits * UNIT_M;
  // BoxGeometry 면 순서: +x,-x(d×h) +y,-y(w×d) +z,-z(w×h), 면당 4버텍스
  const scales: [number, number][] = [
    [dM, hM],
    [dM, hM],
    [wM, dM],
    [wM, dM],
    [wM, hM],
    [wM, hM],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = scales[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * su, vFull ? uv.getY(i) : uv.getY(i) * sv);
    }
  }
  uv.needsUpdate = true;
}

/** 평면(가로 len × 세로 dep 유닛) UV를 미터로 */
export function scalePlaneUVs(geo: THREE.BufferGeometry, lenUnits: number, depUnits: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * lenUnits * UNIT_M, uv.getY(i) * depUnits * UNIT_M);
  }
  uv.needsUpdate = true;
}
