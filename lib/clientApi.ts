/**
 * 클라이언트 API 파사드 — 서버(API 라우트)가 있으면 그대로 쓰고,
 * 정적 HTML 데모(API 없음)에서는 번들된 시드 + 데모 폴백으로 완전히 동일하게 동작한다.
 *
 * 정적 모드 저장소: 번들 시드(JSON) + localStorage("nmr-local-reports").
 * localStorage 덕분에 /report 탭에서 보낸 보고가 대시보드 탭 폴링에 바로 잡힌다.
 */

import seedData from "../data/seed/reports.json";
import { getZone } from "../data/zones";
import {
  REPORTER_LANGS,
  formatKstIso,
  kstDate,
  type NearMissReport,
  type ReporterLang,
} from "./domain";
import {
  detectHotspots,
  resolveNow,
  type HotspotAlert,
} from "./ai/detectHotspots";
import {
  demoExplain,
  demoStructure,
  demoTBM,
  topHazards,
} from "./ai/demoFallbacks";

const LOCAL_KEY = "nmr-local-reports";

/** API 라우트 존재 여부 (첫 호출에서 판별, 이후 고정) */
let staticMode: boolean | null = null;

function readLocalExtras(): NearMissReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as NearMissReport[]) : [];
  } catch {
    return [];
  }
}

function writeLocalExtras(extras: NearMissReport[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(extras));
  } catch {
    /* 프라이빗 모드 등 — 탭 내 메모리로만 동작 */
    memoryExtras = extras;
  }
}

let memoryExtras: NearMissReport[] = [];

function staticReports(): NearMissReport[] {
  const extras = readLocalExtras();
  const all = [...(seedData as NearMissReport[]), ...extras, ...memoryExtras];
  // id 중복 제거 (메모리/로컬 겹침 방지)
  const seen = new Set<string>();
  return all.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/* ── 보고 목록 ─────────────────────────────────────── */

export async function apiGetReports(): Promise<NearMissReport[]> {
  if (staticMode !== true) {
    try {
      const res = await fetch("/api/reports?limit=1000");
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d.reports)) {
          staticMode = false;
          return d.reports as NearMissReport[];
        }
      }
      throw new Error("no api");
    } catch {
      staticMode = true;
    }
  }
  return staticReports();
}

/* ── 보고 접수 ─────────────────────────────────────── */

export interface SubmitReportBody {
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
  imageBase64?: string;
  imageMimeType?: string;
  zoneId?: number;
  lang?: string;
  reporterAnonymous?: boolean;
}

export interface SubmitReportResult {
  report: NearMissReport;
  analysis?: { demo?: boolean };
}

export async function apiSubmitReport(
  body: SubmitReportBody,
): Promise<SubmitReportResult> {
  if (staticMode !== true) {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        staticMode = false;
        return (await res.json()) as SubmitReportResult;
      }
      // 400(입력 오류)은 서버가 있다는 뜻 — 그대로 실패 전달
      if (res.status < 500 && res.status !== 404 && res.status !== 405) {
        throw Object.assign(new Error(`submit failed ${res.status}`), {
          fatal: true,
        });
      }
      throw new Error("no api");
    } catch (err) {
      if ((err as { fatal?: boolean }).fatal) throw err;
      staticMode = true;
    }
  }

  // ── 정적 데모 경로: 키워드 규칙 구조화 + localStorage 저장 ──
  const text = body.text?.trim() || "(음성 보고)";
  const structured = demoStructure(text, {
    zoneId: body.zoneId,
    lang: body.lang,
  });
  const extras = readLocalExtras();
  const report: NearMissReport = {
    id: `NM-L${String(Date.now()).slice(-7)}`,
    createdAt: formatKstIso(new Date()),
    zoneId: body.zoneId ?? structured.zoneId ?? 0,
    reporterLang: structured.lang,
    reporterAnonymous: body.reporterAnonymous ?? true,
    rawText: text.replace(/\s*\(위험유형 힌트: [^)]*\)\s*$/, ""),
    translatedKo: structured.translatedKo.replace(
      /\s*\(위험유형 힌트: [^)]*\)\s*$/,
      "",
    ),
    hazardType: structured.hazardType,
    workType: structured.workType,
    severity: structured.severity as NearMissReport["severity"],
    cause: structured.cause,
    status: "접수",
    weather: "맑음",
  };
  extras.push(report);
  writeLocalExtras(extras);
  return { report, analysis: { demo: true } };
}

/* ── 경보 설명 ─────────────────────────────────────── */

export interface ExplainResult {
  pattern: string;
  riskReason: string;
  recommendedActions: string[];
  demo: boolean;
}

export async function apiExplainAlert(
  alert: HotspotAlert,
  simNowMs: number,
): Promise<ExplainResult> {
  if (staticMode !== true) {
    try {
      const res = await fetch(
        `/api/alerts/${encodeURIComponent(alert.id)}/explain?now=${new Date(
          simNowMs,
        ).toISOString()}`,
        { method: "POST" },
      );
      if (res.ok) {
        staticMode = false;
        const d = await res.json();
        return d.explanation as ExplainResult;
      }
      throw new Error("no api");
    } catch {
      staticMode = true;
    }
  }
  const zone = getZone(alert.zoneId);
  return {
    ...demoExplain(alert, zone ? zone.name : `${alert.zoneId}번 구역`),
    demo: true,
  };
}

/* ── TBM 생성 ──────────────────────────────────────── */

export interface TbmResult {
  tbm: {
    zoneId: number;
    date: string;
    keyRisks: {
      hazardType: string;
      title: Record<string, string>;
      detail: Record<string, string>;
    }[];
    cases: Record<string, string>[];
    checklist: Record<string, string>[];
    slogan: Record<string, string>;
  };
}

export async function apiGenerateTbm(zoneId: number): Promise<TbmResult> {
  if (staticMode !== true) {
    try {
      const res = await fetch("/api/tbm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zoneId }),
      });
      if (res.ok) {
        staticMode = false;
        return (await res.json()) as TbmResult;
      }
      throw new Error("no api");
    } catch {
      staticMode = true;
    }
  }

  const reports = staticReports();
  const zone = getZone(zoneId);
  const now = resolveNow(reports, null);
  const date = kstDate(formatKstIso(now));
  const langs: ReporterLang[] = (zone?.nationalities ?? [])
    .map((n) => n.lang)
    .filter(
      (l): l is ReporterLang =>
        (REPORTER_LANGS as readonly string[]).includes(l) && l !== "ko",
    );
  const zoneReports = reports.filter((r) => r.zoneId === zoneId);
  const hazards = topHazards(zoneReports, now);
  const tbm = demoTBM(zoneId, date, langs, hazards, zoneReports, now);
  return { tbm };
}

/** 대시보드 핫스팟 (정적/서버 공통 — detectHotspots는 순수 통계라 항상 클라이언트 계산) */
export { detectHotspots };
