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

/** 시간대 프리셋: t 스칼라 위의 키프레임 (0=낮 → 0.55=해질녘 → 1=밤) */
export type TimeOfDay = "day" | "dusk" | "night";
export const TOD_T: Record<TimeOfDay, number> = { day: 0, dusk: 0.55, night: 1 };

/** 시간대 공유 상태 — 리렌더 없이 useFrame에서 직접 갱신 */
export interface YardEnv {
  /** 현재 시간대 스칼라 (0 낮 ~ 0.55 해질녘 ~ 1 밤) */
  t: number;
  /** 목표값 (프리셋 전환 시 변경) */
  target: number;
  /** 트윈 속도 (t/초) — 전환 시 2초가 되도록 Dashboard가 설정 */
  speed: number;
  /** 파생 야간도 0~1 (기존 소비자 호환: 창문 발광·램프·수면색) */
  night: number;
  /** 개발용 노출 배율 (?dev=1 슬라이더) */
  exposureMul: number;
  /** Lighting이 매 프레임 갱신하는 수면색 (Sea가 소비) */
  waterColor: THREE.Color;
}

export function makeYardEnv(tod: TimeOfDay): YardEnv {
  return {
    t: TOD_T[tod],
    target: TOD_T[tod],
    speed: 0.5,
    night: tod === "night" ? 1 : tod === "dusk" ? 0.35 : 0,
    exposureMul: 1,
    waterColor: new THREE.Color("#10425e"),
  };
}

/** 시간대 키프레임 (태양·조명·안개·노출·수면색) */
export interface SkyKey {
  t: number;
  sunEl: number;
  sunAz: number;
  sunInt: number;
  sunColor: THREE.Color;
  ambient: number;
  hemi: number;
  fog: THREE.Color;
  fogDensity: number;
  exposure: number;
  envIntensity: number;
  bgIntensity: number;
  water: THREE.Color;
}

export const SKY_KEYS: SkyKey[] = [
  {
    t: 0,
    sunEl: 48,
    sunAz: 200,
    sunInt: 3.0,
    sunColor: new THREE.Color("#fff2dd"),
    ambient: 0.1,
    hemi: 0.28,
    fog: new THREE.Color("#b9cfdf"),
    fogDensity: 0.0052,
    exposure: 1.0,
    envIntensity: 0.9,
    bgIntensity: 1.0,
    water: new THREE.Color("#10425e"),
  },
  {
    t: 0.55,
    sunEl: 7,
    sunAz: 250,
    sunInt: 2.1,
    sunColor: new THREE.Color("#ff9a4a"),
    ambient: 0.07,
    hemi: 0.16,
    fog: new THREE.Color("#5d4a55"),
    fogDensity: 0.005,
    exposure: 1.08,
    envIntensity: 0.75,
    bgIntensity: 1.0,
    water: new THREE.Color("#1c2c42"),
  },
  {
    t: 1,
    sunEl: -8,
    sunAz: 255,
    sunInt: 0,
    sunColor: new THREE.Color("#405070"),
    ambient: 0.045,
    hemi: 0.05,
    fog: new THREE.Color("#0a1226"),
    fogDensity: 0.0068,
    exposure: 1.0,
    envIntensity: 0.3,
    bgIntensity: 1.0,
    water: new THREE.Color("#04101e"),
  },
];

/** t(0~1)에서 키프레임 구간 선형 보간 — out 객체에 기록 (GC 없음) */
export function sampleSky(t: number, out: SkyKey): SkyKey {
  const keys = SKY_KEYS;
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  const lerp = (x: number, y: number) => x + (y - x) * k;
  out.sunEl = lerp(a.sunEl, b.sunEl);
  out.sunAz = lerp(a.sunAz, b.sunAz);
  out.sunInt = lerp(a.sunInt, b.sunInt);
  out.sunColor.lerpColors(a.sunColor, b.sunColor, k);
  out.ambient = lerp(a.ambient, b.ambient);
  out.hemi = lerp(a.hemi, b.hemi);
  out.fog.lerpColors(a.fog, b.fog, k);
  out.fogDensity = lerp(a.fogDensity, b.fogDensity);
  out.exposure = lerp(a.exposure, b.exposure);
  out.envIntensity = lerp(a.envIntensity, b.envIntensity);
  out.bgIntensity = lerp(a.bgIntensity, b.bgIntensity);
  out.water.lerpColors(a.water, b.water, k);
  return out;
}

/** (하위 호환) 일부 모듈이 참조하는 낮/밤 수면색 */
export const DAY = {
  fog: new THREE.Color("#b9cfdf"),
  water: new THREE.Color("#10425e"),
  sunElevation: 48,
  sunAzimuth: 200,
};

export const NIGHT = {
  fog: new THREE.Color("#0a1226"),
  water: new THREE.Color("#04101e"),
  sunElevation: -8,
  sunAzimuth: 255,
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
