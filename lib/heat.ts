/**
 * 폭염 쉼표 (B-4) — 체감온도·휴식 기준 계산
 *
 * - 날씨: Open-Meteo API (키 불필요, 거제 34.89N 128.69E). 실패 시 데모 여름 데이터
 * - 체감온도: Rothfusz 열지수 근사(27°C 이상에서 적용) — 시연용 근사임을 고지
 * - 장소 보정(가정): 실내 0 / 철판·도크 바닥 +3 / 블록·탱크 내부 +5 / 안벽 +2
 * - 기준(2025.7.17 시행 산업안전보건규칙 기반, 시연용 단순화):
 *   31°C↑ 조치 1개 이상 / 33°C↑ 2시간마다 20분 휴식 / 35°C↑ 1시간마다 15분
 *   + 14~17시 옥외 중지 권고 / 38°C↑ 가장 더운 시간대 옥외 중지
 */

import { ZONES, type Zone } from "../data/zones";

export interface WeatherHour {
  hour: number; // 0~23
  temp: number; // °C
  rh: number; // %
}

export interface WeatherData {
  source: "live" | "demo";
  current: { temp: number; rh: number };
  hourly: WeatherHour[]; // 오늘 06~22시
}

/** 데모 여름 데이터 (전형적인 7월 말 거제 폭염일) */
export const DEMO_SUMMER: WeatherData = {
  source: "demo",
  // 기준 체감 약 33°C — 실내 주의 / 안벽 경고 / 도크·옥외 경고~위험으로 단계가 갈리는 수준
  current: { temp: 31.2, rh: 55 },
  hourly: Array.from({ length: 17 }, (_, i) => {
    const h = 6 + i;
    // 06시 27.5°C → 15시 34.5°C 피크 → 22시 29.5°C
    const t =
      h <= 15 ? 27.5 + (h - 6) * (7 / 9) : 34.5 - (h - 15) * (5 / 7);
    return { hour: h, temp: Math.round(t * 10) / 10, rh: Math.round(70 - (t - 27) * 2) };
  }),
};

/** Open-Meteo 호출 (브라우저/서버 공용). 4초 타임아웃, 실패 시 null */
export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=34.89&longitude=128.69" +
      "&current=temperature_2m,relative_humidity_2m" +
      "&hourly=temperature_2m,relative_humidity_2m&forecast_days=1&timezone=Asia%2FSeoul";
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = (await res.json()) as {
      current: { temperature_2m: number; relative_humidity_2m: number };
      hourly: { time: string[]; temperature_2m: number[]; relative_humidity_2m: number[] };
    };
    const hourly: WeatherHour[] = [];
    j.hourly.time.forEach((t, i) => {
      const h = Number(t.slice(11, 13));
      if (h >= 6 && h <= 22)
        hourly.push({ hour: h, temp: j.hourly.temperature_2m[i], rh: j.hourly.relative_humidity_2m[i] });
    });
    return {
      source: "live",
      current: { temp: j.current.temperature_2m, rh: j.current.relative_humidity_2m },
      hourly,
    };
  } catch {
    return null;
  }
}

/** Rothfusz 열지수 근사 (°C). 27°C 미만은 기온 그대로 */
export function heatIndex(tC: number, rh: number): number {
  if (tC < 27) return tC;
  const t = tC * 1.8 + 32;
  const hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh;
  return Math.round(((hi - 32) / 1.8) * 10) / 10;
}

/** 장소 보정 (가정) */
export function zoneAdjust(zone: Zone): { add: number; label: string } {
  switch (zone.kind) {
    case "dock":
      return { add: 3, label: "철판·도크 바닥 +3°C" };
    case "quay":
      return { add: 2, label: "안벽 +2°C" };
    case "factory":
    case "office":
      return { add: 0, label: "실내 ±0°C" };
    default:
      return { add: 3, label: "옥외 철판 적치 +3°C" };
  }
}

/** 탱크·블록 내부(밀폐) 작업이면 +5 — 호출부에서 플래그로 전달 */
export const CONFINED_ADJUST = { add: 5, label: "블록·탱크 내부 +5°C" };

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export const HEAT_LEVELS: {
  level: HeatLevel;
  min: number;
  name: string;
  color: string;
  rule: string;
}[] = [
  { level: 0, min: -Infinity, name: "정상", color: "#39c98f", rule: "일반 수칙 적용" },
  { level: 1, min: 31, name: "관심", color: "#ffd84d", rule: "보냉장구·음료 제공 등 조치 1개 이상" },
  { level: 2, min: 33, name: "주의", color: "#ffa23d", rule: "2시간마다 20분 이상 휴식" },
  {
    level: 3,
    min: 35,
    name: "경고",
    color: "#ff6b3d",
    rule: "1시간마다 15분 이상 휴식 · 14~17시 옥외작업 중지 권고",
  },
  { level: 4, min: 38, name: "위험", color: "#ff3b30", rule: "가장 더운 시간대 옥외작업 중지" },
];

export function heatLevelOf(feel: number): (typeof HEAT_LEVELS)[number] {
  for (let i = HEAT_LEVELS.length - 1; i >= 0; i--) {
    if (feel >= HEAT_LEVELS[i].min) return HEAT_LEVELS[i];
  }
  return HEAT_LEVELS[0];
}

/** 시설별 체감온도 맵 */
export function feelByZone(current: { temp: number; rh: number }): Record<number, number> {
  const base = heatIndex(current.temp, current.rh);
  const out: Record<number, number> = {};
  for (const z of ZONES) {
    out[z.id] = Math.round((base + zoneAdjust(z).add) * 10) / 10;
  }
  return out;
}

/** 다음 휴식까지 남은 시간(분). 휴식은 매시 정각 기준으로 가정 (시연용) */
export function minutesToNextBreak(level: HeatLevel, now = new Date()): number | null {
  if (level < 2) return null;
  const intervalH = level >= 3 ? 1 : 2;
  const h = now.getHours();
  const nextH = (Math.floor(h / intervalH) + 1) * intervalH;
  return (nextH - h) * 60 - now.getMinutes();
}

/** 휴식 이행 기록 (합성 데이터) */
export const DEMO_REST_LOG: { zoneId: number; start: string; end: string; confirmedBy: string }[] = [
  { zoneId: 1, start: "11:00", end: "11:20", confirmedBy: "안전관리자 김○○" },
  { zoneId: 15, start: "11:05", end: "11:25", confirmedBy: "직장 박○○" },
  { zoneId: 9, start: "12:00", end: "12:15", confirmedBy: "안전관리자 김○○" },
  { zoneId: 1, start: "13:00", end: "13:20", confirmedBy: "직장 이○○" },
  { zoneId: 21, start: "13:10", end: "13:25", confirmedBy: "반장 최○○" },
];
