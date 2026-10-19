/**
 * TBM(작업 전 안전미팅) 5분 자료 생성 — 구역별, 한국어 + 지정 언어 병기
 *
 * - 해당 구역의 최근 경보(detectHotspots) + 보고서를 근거로
 *   오늘의 핵심 위험 1~3개, 익명화된 실제 사례, 체크리스트, 한 줄 구호를 생성
 * - zod 스키마 검증 + 데모 폴백 (data/demo/tbm.json, vi 등 실제 다국어 문장 포함)
 */

import { getZone } from "../../data/zones";
import {
  type HazardType,
  type NearMissReport,
  type ReporterLang,
} from "../domain";
import { listReports } from "../data/reportStore";
import { callClaudeJson, isDemoMode } from "./config";
import { detectHotspots, type HotspotAlert } from "./detectHotspots";
import { SHIPYARD_GLOSSARY } from "./glossary";
import {
  TBMDocumentSchema,
  type LocalizedText,
  type TBMDocument,
} from "./schemas";
import demoData from "../../data/demo/tbm.json";

export interface GenerateTBMOutput extends TBMDocument {
  demo: boolean;
  /** 근거가 된 경보 id */
  alertIds: string[];
}

// ─────────────────────────────────────────────────────────────

/** 구역의 최근 14일 보고서에서 다발 위험유형 산출 (없으면 8주 전체) */
function topHazards(zoneReports: NearMissReport[], now: Date): HazardType[] {
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
function pickLangs(
  dict: Record<string, string>,
  langs: ReporterLang[]
): LocalizedText {
  const out: Record<string, string> = { ko: dict.ko };
  for (const lang of langs) {
    if (lang === "ko") continue;
    out[lang] = dict[lang] ?? dict.en ?? dict.ko;
  }
  return out;
}

// ── 데모 폴백 ────────────────────────────────────────────────

type DemoHazard = {
  title: Record<string, string>;
  detail: Record<string, string>;
  checklist: Record<string, string>[];
};

function demoTBM(
  zoneId: number,
  date: string,
  langs: ReporterLang[],
  hazards: HazardType[],
  zoneReports: NearMissReport[],
  now: Date
): TBMDocument {
  const bank = demoData.hazards as Record<string, DemoHazard>;
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
  for (const item of demoData.commonChecklist as Record<string, string>[]) {
    checklist.push(pickLangs(item, langs));
    if (checklist.length >= 6) break;
  }

  const slogans = demoData.slogans as Record<string, string>[];
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

// ── 메인 ─────────────────────────────────────────────────────

export async function generateTBM(
  zoneId: number,
  date: string,
  langs: ReporterLang[],
  reports?: NearMissReport[]
): Promise<GenerateTBMOutput> {
  const zone = getZone(zoneId);
  if (!zone) throw new Error(`존재하지 않는 구역 id: ${zoneId}`);

  const all = reports ?? listReports();
  const now = new Date(`${date}T18:00:00+09:00`);
  const effectiveNow = Number.isNaN(now.getTime()) ? new Date() : now;

  const { alerts } = detectHotspots(all, effectiveNow);
  const zoneAlerts = alerts.filter((a) => a.zoneId === zoneId);
  const zoneReports = all.filter((r) => r.zoneId === zoneId);

  // 핵심 위험 후보: 경보 유형 → 최근 다발 유형 → 구역 상존 위험 순
  const hazardCandidates: HazardType[] = [];
  const push = (h: HazardType) => {
    if (!hazardCandidates.includes(h)) hazardCandidates.push(h);
  };
  for (const a of zoneAlerts) push(a.hazardType);
  for (const h of topHazards(zoneReports, effectiveNow)) push(h);

  const alertIds = zoneAlerts.map((a) => a.id);
  const effectiveLangs = langs.filter((l) => l !== "ko");

  if (isDemoMode()) {
    return {
      ...demoTBM(zoneId, date, effectiveLangs, hazardCandidates, zoneReports, effectiveNow),
      demo: true,
      alertIds,
    };
  }

  try {
    const langList = ["ko", ...effectiveLangs];
    const recentForPrompt = [...zoneReports]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);

    const system = `당신은 조선소 ${zone.name} 구역의 TBM(작업 전 안전미팅, 5분) 자료를 만드는 안전관리 AI입니다.
모든 텍스트는 한국어(ko)와 지정 언어를 병기합니다. 번역은 해당 언어 원어민 근로자가 바로 이해할 수 있게 자연스럽게 작성하세요.

${SHIPYARD_GLOSSARY}

다음 JSON 스키마로만 응답하세요 (JSON 객체 하나만). 모든 다국어 필드는 {${langList
      .map((l) => `"${l}": "..."`)
      .join(", ")}} 형태입니다:
{
  "zoneId": ${zoneId},
  "date": "${date}",
  "keyRisks": [ { "hazardType": "위험유형", "title": {다국어}, "detail": {다국어, 1~2문장 행동 지침} } ],  // 1~3개, 경보·최근 보고 기반 우선순위
  "cases": [ {다국어} ],  // 익명화된 실제 사례 1~3개 (아래 보고서에서 발췌, 개인 특정 정보 제거)
  "checklist": [ {다국어} ],  // 작업 전 확인 질문 3~6개
  "slogan": {다국어}  // 한 줄 구호
}`;

    const user = `[오늘 날짜] ${date}
[병기 언어] ${langList.join(", ")}
[구역 정보] ${zone.name} — 작업: ${zone.workTypes.join(", ")} / 상존 위험: ${zone.hazards.join(", ")}

[활성 급증 경보]
${
  zoneAlerts.length > 0
    ? zoneAlerts
        .map(
          (a) =>
            `- ${a.hazardType}: 최근 7일 ${a.recentCount}건 (이전 4주 평균 ${a.baselineWeekly.toFixed(1)}건/주, ${a.increaseRatio.toFixed(1)}배 급증)`
        )
        .join("\n")
    : "(없음)"
}

[최근 아차사고 보고]
${recentForPrompt
  .map(
    (r) =>
      `- ${r.createdAt.slice(0, 10)} [${r.hazardType}/심각도${r.severity}] ${r.translatedKo}`
  )
  .join("\n")}`;

    const doc = await callClaudeJson({
      system,
      content: user,
      schema: TBMDocumentSchema,
      maxTokens: 8192,
    });
    return { ...doc, demo: false, alertIds };
  } catch {
    return {
      ...demoTBM(zoneId, date, effectiveLangs, hazardCandidates, zoneReports, effectiveNow),
      demo: true,
      alertIds,
    };
  }
}
