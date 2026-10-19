/**
 * detectHotspots가 시드 데이터에 심어둔 패턴을 실제로 잡아내는지 검증
 * (사전 조건: npm run seed 로 data/seed/reports.json 생성)
 */

import { describe, expect, it, beforeAll } from "vitest";
import { listReports } from "../lib/data/reportStore";
import { detectHotspots, alertId, poissonTail } from "../lib/ai/detectHotspots";
import { isNightHour, kstHour, type NearMissReport } from "../lib/domain";
import { ZONES } from "../data/zones";

// 시드 기준 시각 (2026-10-19 18:00 KST)
const NOW = new Date("2026-10-19T18:00:00+09:00");

let reports: NearMissReport[];
let result: ReturnType<typeof detectHotspots>;

beforeAll(() => {
  reports = listReports();
  expect(reports.length, "npm run seed 를 먼저 실행하세요").toBeGreaterThan(0);
  result = detectHotspots(reports, NOW);
});

describe("시드 데이터 기본 검증", () => {
  it("250건이 로드된다", () => {
    expect(reports.length).toBe(250);
  });

  it("모든 보고의 구역 id가 유효하다", () => {
    const ids = new Set(ZONES.map((z) => z.id));
    for (const r of reports) expect(ids.has(r.zoneId)).toBe(true);
  });

  it("같은 날짜는 같은 날씨를 가진다", () => {
    const byDate = new Map<string, string>();
    for (const r of reports) {
      const date = r.createdAt.slice(0, 10);
      const prev = byDate.get(date);
      if (prev !== undefined) expect(r.weather).toBe(prev);
      else byDate.set(date, r.weather);
    }
  });
});

describe("패턴 1 — 1도크(1) 크레인 낙하 급증", () => {
  it("1도크 '낙하' 급증 경보가 발생한다", () => {
    const alert = result.alerts.find((a) => a.id === alertId(1, "낙하"));
    expect(alert).toBeDefined();
    expect(alert!.zoneId).toBe(1);
    expect(alert!.hazardType).toBe("낙하");
    // 최근 7일 7건 vs 이전 4주 평균 1건/주
    expect(alert!.recentCount).toBeGreaterThanOrEqual(6);
    expect(alert!.increaseRatio).toBeGreaterThanOrEqual(4);
    expect(alert!.pValue).toBeLessThan(0.001);
    expect(alert!.reportIds.length).toBe(alert!.recentCount);
  });

  it("급증 점수 순으로 정렬했을 때 최상위권에 있다", () => {
    const idx = result.alerts.findIndex((a) => a.id === alertId(1, "낙하"));
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(3);
  });
});

describe("패턴 2 — LNGC 도장공장(22) 질식 증가 추세", () => {
  it("22번 '질식' 급증 경보가 발생한다", () => {
    const alert = result.alerts.find((a) => a.id === alertId(22, "질식"));
    expect(alert).toBeDefined();
    expect(alert!.recentCount).toBeGreaterThanOrEqual(4);
    expect(alert!.increaseRatio).toBeGreaterThan(2);
    expect(alert!.pValue).toBeLessThan(0.05);
  });

  it("주별 건수가 4주 연속 증가한다 (시드 데이터 확인)", () => {
    const WEEK = 7 * 86400000;
    const nowMs = NOW.getTime();
    const weekly = [3, 2, 1, 0].map(
      (w) =>
        reports.filter((r) => {
          if (r.zoneId !== 22 || r.hazardType !== "질식") return false;
          const t = Date.parse(r.createdAt);
          return t > nowMs - (w + 1) * WEEK && t <= nowMs - w * WEEK;
        }).length
    );
    for (let i = 1; i < weekly.length; i++) {
      expect(weekly[i]).toBeGreaterThan(weekly[i - 1]);
    }
  });
});

describe("패턴 3 — 강재적치장(15) 야간 협착·충돌", () => {
  it("야간(20~24시) 건수가 주간의 3배 수준이다", () => {
    const z15 = reports.filter(
      (r) =>
        r.zoneId === 15 && (r.hazardType === "협착" || r.hazardType === "충돌")
    );
    expect(z15.length).toBeGreaterThanOrEqual(20);
    const night = z15.filter((r) => isNightHour(kstHour(r.createdAt))).length;
    const day = z15.length - night;
    expect(night / Math.max(day, 1)).toBeGreaterThanOrEqual(2.5);
  });

  it("구역 위험 점수가 상위권이고 사무 구역보다 훨씬 높다", () => {
    const { riskByZone } = result;
    const ranked = Object.entries(riskByZone).sort((a, b) => b[1] - a[1]);
    const rank15 = ranked.findIndex(([zoneId]) => zoneId === "15");
    expect(rank15).toBeGreaterThanOrEqual(0);
    expect(rank15).toBeLessThan(6); // 22개 구역 중 상위 6위 이내
    for (const office of [3, 4, 7, 8]) {
      expect(riskByZone[15]).toBeGreaterThan((riskByZone[office] ?? 0) + 20);
    }
  });
});

describe("riskByZone 일반 속성", () => {
  it("0~100 범위이고 사무 구역은 거의 0", () => {
    for (const zone of ZONES) {
      const v = result.riskByZone[zone.id];
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    for (const office of [3, 4, 7, 8]) {
      expect(result.riskByZone[office]).toBeLessThanOrEqual(5);
    }
  });

  it("최고 점수 구역은 정확히 100", () => {
    expect(Math.max(...Object.values(result.riskByZone))).toBe(100);
  });
});

describe("poissonTail 수치 검증", () => {
  it("경계값이 올바르다", () => {
    expect(poissonTail(0, 5)).toBe(1); // P(X>=0) = 1
    expect(poissonTail(3, 0)).toBe(0); // λ=0에서 3건 관측
    // P(X>=1 | λ=1) = 1 - e^-1 ≈ 0.6321
    expect(poissonTail(1, 1)).toBeCloseTo(1 - Math.exp(-1), 6);
    // P(X>=7 | λ=1) ≈ 8.32e-5 → 급증
    expect(poissonTail(7, 1)).toBeLessThan(1e-4);
  });
});
