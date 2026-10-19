import * as THREE from "three";

/**
 * 좌표 변환: 정규화 평면 좌표(x 서→동 0~100, z 남→북 0~100)
 * → three.js 월드 좌표 (중앙 원점, 북쪽 = -Z, 1 월드 단위 = 25m)
 */
export const UNIT_METERS = 25;

/** 미터 → 월드 단위 */
export const m = (meters: number) => meters / UNIT_METERS;

export function toWorld(x: number, z: number, y = 0): [number, number, number] {
  return [x - 50, y, 50 - z];
}

export function toWorldV(x: number, z: number, y = 0): THREE.Vector3 {
  return new THREE.Vector3(x - 50, y, 50 - z);
}

/** 평면 CCW 회전각(도) → three.js Y축 회전(라디안). 북=-Z 반전 때문에 그대로 사용 가능 */
export function rotY(rotationDeg: number): number {
  return (rotationDeg * Math.PI) / 180;
}

/** 결정적 의사난수 (배치 재현용) */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D 해시 노이즈 (지형용) */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function fbm2(x: number, y: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return sum;
}

/** 점-폴리곤 내부 판정 (정규화 좌표) */
export function pointInPolygon(
  px: number,
  pz: number,
  poly: { x: number; z: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const zi = poly[i].z;
    const xj = poly[j].x;
    const zj = poly[j].z;
    const intersect =
      zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 낮/밤 파라미터 보간용 공유 상태 (리렌더 없이 useFrame에서 직접 갱신) */
export interface YardEnv {
  /** 0 = 낮, 1 = 밤 */
  night: number;
  /** 목표값 (토글 시 변경, 2초 트윈) */
  nightTarget: number;
}

export const DAY = {
  fog: new THREE.Color("#b9cfdf"),
  water: new THREE.Color("#10425e"),
  sunElevation: 42,
  sunAzimuth: 200,
};

export const NIGHT = {
  fog: new THREE.Color("#0a1226"),
  water: new THREE.Color("#04101e"),
  sunElevation: -8,
  sunAzimuth: 230,
};

export const PALETTE = {
  pavement: "#8e979c",
  pavementNight: "#2a3240",
  road: "#3d4349",
  quay: "#a8adb2",
  factoryWall: "#d4d9dd",
  roofBlue: "#2f6fd6",
  roofSky: "#5aa0e8",
  crane: "#e8971e",
  craneDark: "#c87a10",
  hullRed: "#9c2f26",
  primer: "#8b4a3a",
  sodium: "#ff9e3d",
  led: "#eaf4ff",
};
