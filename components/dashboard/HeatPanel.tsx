"use client";

/**
 * 폭염 쉼표 패널 (B-4)
 * - 현재 기온·습도(Open-Meteo, 실패 시 데모 여름 데이터) + 체감온도
 * - 폭염 단계·기준표, 선택 시설의 보정·다음 휴식까지 시간
 * - 휴식 이행 기록 표 (합성 데이터)
 */

import { useEffect, useMemo, useState } from "react";
import { ZONES } from "@/data/zones";
import {
  DEMO_REST_LOG,
  DEMO_SUMMER,
  HEAT_LEVELS,
  fetchWeather,
  feelByZone,
  heatIndex,
  heatLevelOf,
  minutesToNextBreak,
  zoneAdjust,
  type WeatherData,
} from "@/lib/heat";

function zoneName(id: number): string {
  const z = ZONES.find((v) => v.id === id);
  return z ? z.name.split("·")[0].split(" 및 ")[0] : `${id}번`;
}

export function useWeather(): WeatherData {
  const [data, setData] = useState<WeatherData>(DEMO_SUMMER);
  useEffect(() => {
    let alive = true;
    fetchWeather().then((w) => {
      if (alive && w && w.hourly.length > 0) setData(w);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

export function HeatPanel({
  weather,
  selectedZoneId,
}: {
  weather: WeatherData;
  selectedZoneId: number | null;
}) {
  const baseFeel = heatIndex(weather.current.temp, weather.current.rh);
  const feels = useMemo(() => feelByZone(weather.current), [weather]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const zone = selectedZoneId != null ? ZONES.find((z) => z.id === selectedZoneId) : null;
  const zoneFeel = zone ? feels[zone.id] : null;
  const zoneLevel = zoneFeel != null ? heatLevelOf(zoneFeel) : null;
  const nextBreak = zoneLevel ? minutesToNextBreak(zoneLevel.level, now) : null;

  // 단계별 시설 수
  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const z of ZONES) {
      const lv = heatLevelOf(feels[z.id]).level;
      c[lv] = (c[lv] ?? 0) + 1;
    }
    return c;
  }, [feels]);

  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">
        폭염 쉼표
        <span className="ml-auto rounded border border-console-border px-1.5 py-0.5 text-[10px] font-normal text-console-muted">
          {weather.source === "live" ? "Open-Meteo 실황" : "데모 여름 데이터"}
        </span>
      </h2>

      {/* 현재 체감 */}
      <div className="mb-2 flex items-center gap-3 rounded border border-console-border bg-console-bg/60 p-2">
        <div>
          <span className="num block text-2xl font-bold" style={{ color: heatLevelOf(baseFeel).color }}>
            {baseFeel.toFixed(1)}°C
          </span>
          <span className="text-[10px] text-console-muted">기준 체감온도</span>
        </div>
        <div className="text-[11px] leading-snug text-console-muted">
          기온 <b className="num text-console-text">{weather.current.temp.toFixed(1)}°C</b> · 습도{" "}
          <b className="num text-console-text">{Math.round(weather.current.rh)}%</b>
          <br />
          장소 보정(가정): 실내 ±0 / 도크 +3 / 탱크 내부 +5 / 안벽 +2
        </div>
      </div>

      {/* 단계 기준표 */}
      <table className="mb-2 w-full border-collapse text-[11px]">
        <tbody>
          {HEAT_LEVELS.filter((l) => l.level > 0).map((l) => (
            <tr key={l.level} className="border-b border-console-border/60 last:border-0">
              <td className="num py-1 pr-1 align-top font-bold" style={{ color: l.color }}>
                {l.min}°C↑
              </td>
              <td className="py-1 pr-1 align-top font-semibold" style={{ color: l.color }}>
                {l.name}
                {counts[l.level] ? (
                  <span className="num ml-1 font-normal text-console-muted">({counts[l.level]})</span>
                ) : null}
              </td>
              <td className="py-1 leading-snug text-console-muted">{l.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 선택 시설 */}
      {zone && zoneFeel != null && zoneLevel && (
        <div
          className="mb-2 rounded border p-2"
          style={{ borderColor: `${zoneLevel.color}99`, background: `${zoneLevel.color}14` }}
        >
          <p className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-console-text">
            {zone.id}번 {zoneName(zone.id)}
            <span className="num ml-auto" style={{ color: zoneLevel.color }}>
              {zoneFeel.toFixed(1)}°C · {zoneLevel.name}
            </span>
          </p>
          <p className="text-[11px] leading-snug text-console-muted">
            {zoneAdjust(zone).label} 적용 · {zoneLevel.rule}
          </p>
          {nextBreak != null && (
            <p className="num mt-1 text-[11px] font-bold text-risk-warning">
              다음 휴식까지 {nextBreak}분
            </p>
          )}
        </div>
      )}

      {/* 휴식 이행 기록 */}
      <h3 className="mb-1 text-[11px] font-bold text-console-text">휴식 이행 기록 (합성)</h3>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-left text-[10px] text-console-muted">
            <th className="py-0.5 font-normal">구역</th>
            <th className="py-0.5 font-normal">시작~종료</th>
            <th className="py-0.5 font-normal">확인자</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_REST_LOG.map((r, i) => (
            <tr key={i} className="border-t border-console-border/60">
              <td className="py-1 text-console-text">
                {r.zoneId}번 {zoneName(r.zoneId)}
              </td>
              <td className="num py-1 text-console-muted">
                {r.start}~{r.end}
              </td>
              <td className="py-1 text-console-muted">{r.confirmedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 border-t border-console-border pt-1.5 text-[10px] leading-snug text-console-muted/80">
        체감온도는 열지수 근사 + 장소 보정 가정으로 계산한 시연용 값입니다. 기준은
        산업안전보건규칙(2025.7.17 시행)을 단순화한 것입니다.
      </p>
    </section>
  );
}
