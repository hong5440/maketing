/**
 * 급증 경보 설명 — LLM이 근거 보고서를 읽고
 * 패턴 / 위험 이유 / 권장 조치 3가지를 한국어로 생성.
 *
 * - 유사 과거 사례는 키워드 토큰 겹침 유사도로 상위 N건 선별해 프롬프트에 포함
 * - 데모 폴백: data/demo/explain-alert.json (플레이스홀더 치환)
 */

import { getZone } from "../../data/zones";
import type { NearMissReport } from "../domain";
import { callClaudeJson, isDemoMode } from "./config";
import type { HotspotAlert } from "./detectHotspots";
import { SHIPYARD_GLOSSARY } from "./glossary";
import { AlertExplanationSchema, type AlertExplanation } from "./schemas";
import { findSimilarReports } from "./similarity";
import demoData from "../../data/demo/explain-alert.json";

const SIMILAR_TOP_N = 5;

export interface ExplainAlertOutput extends AlertExplanation {
  alertId: string;
  demo: boolean;
  /** 프롬프트에 포함된 유사 과거 사례 id */
  similarReportIds: string[];
}

function fmtReport(r: NearMissReport): string {
  return `- [${r.id}] ${r.createdAt.slice(0, 16)} / 심각도 ${r.severity} / ${r.workType} / 날씨 ${r.weather}\n  "${r.translatedKo}" (원인: ${r.cause})`;
}

function demoExplain(
  alert: HotspotAlert,
  zoneName: string
): AlertExplanation {
  type Canned = {
    pattern: string;
    riskReason: string;
    recommendedActions: string[];
  };
  const bank = demoData.byHazardType as Record<string, Canned>;
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

export async function explainAlert(
  alert: HotspotAlert,
  reports: NearMissReport[]
): Promise<ExplainAlertOutput> {
  const zone = getZone(alert.zoneId);
  const zoneName = zone ? zone.name : `${alert.zoneId}번 구역`;

  // 근거 보고서(최근 급증분)
  const evidenceIds = new Set(alert.reportIds);
  const evidence = reports.filter((r) => evidenceIds.has(r.id));

  // 유사 과거 사례: 근거 보고서 본문을 질의로, 토큰 겹침 상위 N건
  const query = evidence.map((r) => r.translatedKo).join(" ");
  const similar = findSimilarReports(query, reports, SIMILAR_TOP_N, evidenceIds);
  const similarReportIds = similar.map((r) => r.id);

  if (isDemoMode()) {
    return {
      ...demoExplain(alert, zoneName),
      alertId: alert.id,
      demo: true,
      similarReportIds,
    };
  }

  try {
    const system = `당신은 조선소 안전관리 책임자를 보좌하는 AI 분석가입니다.
아차사고 급증 경보의 근거 보고서를 읽고, 현장에서 바로 쓸 수 있는 분석을 한국어로 작성합니다.

${SHIPYARD_GLOSSARY}

다음 JSON 스키마로만 응답하세요 (JSON 객체 하나만):
{
  "pattern": "어떤 패턴이 보이는가 (2~3문장, 수치 인용)",
  "riskReason": "왜 지금 위험한가 (2~3문장)",
  "recommendedActions": ["권장 조치 1", "권장 조치 2", "권장 조치 3"]  // 정확히 3개, 즉시 실행 가능한 수준으로 구체적으로
}`;

    const user = `[경보]
- 구역: ${zoneName} (id ${alert.zoneId})
- 위험 유형: ${alert.hazardType}
- 최근 7일 건수: ${alert.recentCount}건 (이전 4주 주평균 ${alert.baselineWeekly.toFixed(1)}건, ${alert.increaseRatio.toFixed(1)}배)
- 급증 점수(-log10 p): ${alert.surgeScore.toFixed(1)}
${zone ? `- 구역 주요 작업: ${zone.workTypes.join(", ")}\n- 구역 상존 위험: ${zone.hazards.join(", ")}` : ""}

[근거 보고서 — 최근 7일]
${evidence.map(fmtReport).join("\n")}

[유사 과거 사례 — 참고]
${similar.length > 0 ? similar.map(fmtReport).join("\n") : "(없음)"}`;

    const explanation = await callClaudeJson({
      system,
      content: user,
      schema: AlertExplanationSchema,
      maxTokens: 2048,
    });
    return { ...explanation, alertId: alert.id, demo: false, similarReportIds };
  } catch {
    return {
      ...demoExplain(alert, zoneName),
      alertId: alert.id,
      demo: true,
      similarReportIds,
    };
  }
}
