/**
 * 보고서 저장 계층 (JSON 시드 + 서버 메모리)
 *
 * - 유일한 보고서 읽기/쓰기 창구. 다른 코드에서 data/seed/*.json을 직접 읽지 말 것.
 * - 추후 SQLite 교체 시 이 모듈만 바꾸면 되도록 인터페이스를 좁게 유지한다.
 */

import fs from "node:fs";
import path from "node:path";
import type { NearMissReport } from "../domain";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "reports.json");

interface StoreState {
  reports: NearMissReport[];
  nextSeq: number;
}

// Next.js dev 서버의 모듈 재평가(HMR)에도 메모리 상태가 살아남도록 globalThis에 보관
const globalStore = globalThis as unknown as {
  __nearMissStore?: StoreState;
};

function loadSeed(): NearMissReport[] {
  try {
    const raw = fs.readFileSync(SEED_PATH, "utf8");
    const parsed = JSON.parse(raw) as NearMissReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 시드 파일이 없어도(npm run seed 이전) 빈 저장소로 동작
    return [];
  }
}

function state(): StoreState {
  if (!globalStore.__nearMissStore) {
    const reports = loadSeed();
    globalStore.__nearMissStore = {
      reports,
      nextSeq: reports.length + 1,
    };
  }
  return globalStore.__nearMissStore;
}

export interface ReportFilter {
  zoneId?: number;
  /** createdAt >= since (ISO) */
  since?: string;
  hazardType?: string;
  status?: string;
  limit?: number;
}

/** 전체(또는 필터링된) 보고서 — createdAt 오름차순 */
export function listReports(filter?: ReportFilter): NearMissReport[] {
  let out = state().reports;
  if (filter?.zoneId !== undefined)
    out = out.filter((r) => r.zoneId === filter.zoneId);
  if (filter?.since) out = out.filter((r) => r.createdAt >= filter.since!);
  if (filter?.hazardType)
    out = out.filter((r) => r.hazardType === filter.hazardType);
  if (filter?.status) out = out.filter((r) => r.status === filter.status);
  out = [...out].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (filter?.limit !== undefined && filter.limit >= 0)
    out = out.slice(-filter.limit);
  return out;
}

export function getReport(id: string): NearMissReport | undefined {
  return state().reports.find((r) => r.id === id);
}

export function getReportsByIds(ids: string[]): NearMissReport[] {
  const set = new Set(ids);
  return state().reports.filter((r) => set.has(r.id));
}

/** 새 보고서 저장 (id는 저장소가 발급) */
export function addReport(input: Omit<NearMissReport, "id">): NearMissReport {
  const s = state();
  const report: NearMissReport = {
    id: `NM-${String(s.nextSeq++).padStart(4, "0")}`,
    ...input,
  };
  s.reports.push(report);
  return report;
}

export function updateReport(
  id: string,
  patch: Partial<Pick<NearMissReport, "status" | "actionTaken">>
): NearMissReport | undefined {
  const r = state().reports.find((x) => x.id === id);
  if (!r) return undefined;
  Object.assign(r, patch);
  return r;
}

/** 테스트·시드 재적재용 */
export function resetStore(): void {
  globalStore.__nearMissStore = undefined;
}
