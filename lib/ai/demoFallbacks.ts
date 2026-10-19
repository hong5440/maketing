/**
 * 데모 모드 폴백 — 순수 함수만 (fs/SDK 없음).
 * 서버 경로(lib/ai/*)와 정적 데모의 클라이언트 경로(lib/clientApi.ts)가 공유한다.
 */

import { ZONES } from "../../data/zones";
import {
  HAZARD_TYPES,
  REPORTER_LANGS,
  type HazardType,
  type NearMissReport,
  type ReporterLang,
  type Severity,
} from "../domain";
import {
  AlertExplanationSchema,
  StructuredReportSchema,
  TBMDocumentSchema,
  type AlertExplanation,
  type LocalizedText,
  type StructuredReport,
  type TBMDocument,
} from "./schemas";
import type { HotspotAlert } from "./detectHotspots";
import structureDemo from "../../data/demo/structure-report.json";
import explainDemo from "../../data/demo/explain-alert.json";
import tbmDemo from "../../data/demo/tbm.json";

void HAZARD_TYPES;

/* ── 보고 구조화 ───────────────────────────────────── */

export function detectLangByScript(text: string, hint?: string): ReporterLang {
  if (hint && (REPORTER_LANGS as readonly string[]).includes(hint))
    return hint as ReporterLang;
  if (/[가-힣]/.test(text)) return "ko";
  if (/[฀-๿]/.test(text)) return "th"; // 태국 문자
  if (/[ऀ-ॿ]/.test(text)) return "ne"; // 데바나가리
  // 베트남어 고유 성조 문자
  if (/[ăâđêôơưàảãạằẳẵặầẩẫậèẻẽẹềểễệìỉĩịòỏõọồổỗộờởỡợùủũụừửữựỳỷỹỵ]/i.test(text))
    return "vi";
  // 우즈베크어 특유 어포스트로피 표기(o'/g') 및 흔한 기능어
  if (/(o['’]|g['’]|\b(va|bilan|uchun|emas|qoldi)\b)/i.test(text)) return "uz";
  // 인도네시아어 흔한 기능어
  if (/\b(yang|tidak|nggak|saya|dari|hampir|kena)\b/i.test(text)) return "id";
  return "en";
}

type DemoRule = { hazardType: string; keywords: string[] };
type DemoCanned = {
  translatedKo: string;
  workType: string;
  severity: number;
  cause: string;
  hazardFactors: string[];
};

export function demoStructure(
  text: string,
  input: { zoneId?: number; lang?: string },
): StructuredReport {
  const lower = text.toLowerCase();
  const rules = structureDemo.rules as DemoRule[];

  // 키워드 매칭 점수가 가장 높은 위험유형 선택
  let best: { hazard: HazardType; score: number } = {
    hazard: "기타",
    score: 0,
  };
  for (const rule of rules) {
    const score = rule.keywords.reduce(
      (s, kw) => s + (lower.includes(kw.toLowerCase()) ? 1 : 0),
      0,
    );
    if (score > best.score)
      best = { hazard: rule.hazardType as HazardType, score };
  }

  const canned = (structureDemo.byHazardType as Record<string, DemoCanned>)[
    best.hazard
  ];
  const lang = detectLangByScript(text, input.lang);
  const zone = input.zoneId ? ZONES.find((z) => z.id === input.zoneId) : null;

  return StructuredReportSchema.parse({
    lang,
    // 원문이 한국어면 원문 그대로, 아니면 준비된 번역문
    translatedKo: lang === "ko" ? text : canned.translatedKo,
    hazardType: best.hazard,
    workType: zone ? zone.workTypes[0] : canned.workType,
    severity: canned.severity as Severity,
    cause: canned.cause,
    zoneId: input.zoneId ?? null,
    hazardFactors: canned.hazardFactors,
  });
}

/* ── 경보 설명 ─────────────────────────────────────── */

export function demoExplain(
  alert: HotspotAlert,
  zoneName: string,
): AlertExplanation {
  type Canned = {
    pattern: string;
    riskReason: string;
    recommendedActions: string[];
  };
  const bank = explainDemo.byHazardType as Record<string, Canned>;
  const canned = bank[alert.hazardType] ?? bank.default;
  const fill = (s: string) =>
    s
      .replaceAll("{zone}", zoneName)
      .replaceAll("{hazard}", alert.hazardType)
      .replaceAll("{count}", String(alert.recentCount))
      .replaceAll("{baseline}", alert.baselineWeekly.toFixed(1))
      .replaceAll("{ratio}", alert.increaseRatio.toFixed(1));
  return AlertExplanationSchema.parse({
    pattern: fill(canned.pattern),
    riskReason: fill(canned.riskReason),
    recommendedActions: canned.recommendedActions.slice(0, 3).map(fill),
  });
}

/* ── TBM 생성 ──────────────────────────────────────── */

/** 구역의 최근 14일 보고서에서 다발 위험유형 산출 (없으면 8주 전체) */
export function topHazards(
  zoneReports: NearMissReport[],
  now: Date,
): HazardType[] {
  const nowMs = now.getTime();
  const count = (sinceDays: number) => {
    const m = new Map<HazardType, number>();
    for (const r of zoneReports) {
      const t = Date.parse(r.createdAt);
      if (t > nowMs || nowMs - t > sinceDays * 86400000) continue;
      m.set(r.hazardType, (m.get(r.hazardType) ?? 0) + 1);
    }
    return m;
  };
  let m = count(14);
  if (m.size === 0) m = count(56);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([h]) => h);
}

/** 다국어 사전에서 ko + 요청 언어만 추출 (없는 언어는 en으로 폴백) */
export function pickLangs(
  dict: Record<string, string>,
  langs: ReporterLang[],
): LocalizedText {
  const out: Record<string, string> = { ko: dict.ko };
  for (const lang of langs) {
    if (lang === "ko") continue;
    out[lang] = dict[lang] ?? dict.en ?? dict.ko;
  }
  return out;
}

type DemoHazard = {
  title: Record<string, string>;
  detail: Record<string, string>;
  checklist: Record<string, string>[];
};

export function demoTBM(
  zoneId: number,
  date: string,
  langs: ReporterLang[],
  hazards: HazardType[],
  zoneReports: NearMissReport[],
  now: Date,
): TBMDocument {
  const bank = tbmDemo.hazards as Record<string, DemoHazard>;
  const chosen = hazards.filter((h) => bank[h]).slice(0, 3);
  if (chosen.length === 0) chosen.push("기타");

  const keyRisks = chosen.map((h) => ({
    hazardType: h,
    title: pickLangs(bank[h].title, langs),
    detail: pickLangs(bank[h].detail, langs),
  }));

  // 익명화된 실제 사례: 최근 보고서 번역문 (보고자 언어가 요청 언어와 같으면 원문 병기)
  const nowMs = now.getTime();
  const recentCases = [...zoneReports]
    .filter((r) => Date.parse(r.createdAt) <= nowMs)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((r) => chosen.includes(r.hazardType))
    .slice(0, 2);
  const cases: LocalizedText[] = recentCases.map((r) => {
    const c: Record<string, string> = {
      ko: `(익명 사례 · ${r.createdAt.slice(5, 10)} · ${r.hazardType}) ${r.translatedKo}`,
    };
    if (langs.includes(r.reporterLang) && r.reporterLang !== "ko") {
      c[r.reporterLang] = r.rawText;
    }
    return c;
  });

  // 체크리스트: 핵심 위험별 항목 + 공통 항목
  const checklist: LocalizedText[] = [];
  for (const h of chosen) {
    for (const item of bank[h].checklist) checklist.push(pickLangs(item, langs));
  }
  for (const item of tbmDemo.commonChecklist as Record<string, string>[]) {
    checklist.push(pickLangs(item, langs));
    if (checklist.length >= 6) break;
  }

  const slogans = tbmDemo.slogans as Record<string, string>[];
  const slogan = pickLangs(slogans[zoneId % slogans.length], langs);

  return TBMDocumentSchema.parse({
    zoneId,
    date,
    keyRisks,
    cases,
    checklist,
    slogan,
  });
}
