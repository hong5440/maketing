/**
 * 공용 AI 해석 엔진 (B-1)
 *
 * 모든 콘텐츠(야드 위험 예보, 밀폐공간 숨길, 크레인 내비, 제보)가 함께 쓰는
 * 단일 진입점. 자유 텍스트 + 종류(permit/crane/nearmiss)를 받아
 * {what, where, when, hazards, evidence, confidence} JSON을 돌려준다.
 *
 * - zod 검증 + 실패 시 1회 재시도 (callClaudeJson)
 * - API 키가 없거나 호출 실패 시 규칙 기반 데모 해석(demoInterpret)으로 대체
 * - 음성 입력은 클라이언트 Web Speech API가 텍스트로 변환해 같은 경로로 들어온다
 * - **모든 AI 해석 결과는 UI에서 사용자가 Confirm을 눌러야 반영된다**
 *   (엔진은 제안만 반환하고, 상태 변경은 호출한 화면이 확인 후 수행)
 */

import { ZONES } from "../../data/zones";
import { callClaudeJson, isDemoMode } from "./config";
import { SHIPYARD_GLOSSARY } from "./glossary";
import { aliasCatalog } from "./aliases";
import { demoInterpret } from "./demoInterpret";
import {
  InterpretResultSchema,
  type InterpretOutput,
  type InterpretType,
} from "./interpretTypes";

export type { InterpretOutput, InterpretResult, InterpretType } from "./interpretTypes";

const TYPE_GUIDE: Record<InterpretType, string> = {
  permit: `입력은 작업허가서(permit) 요약문입니다.
- what: 작업 내용 한 줄 (예: "블록 인양 및 탑재")
- when: 허가 시간대를 HH:MM으로. "14~16시" → start 14:00, end 16:00
- hazards: 작업 자체와 주변 간섭에서 생기는 위험 (낙하, 화기, 질식, 추락 등)`,
  crane: `입력은 크레인 작업자의 음성 지시(한국어/영어/베트남어 등)입니다.
- what: 지시 내용을 한국어 한 줄로 (예: "트롤리를 선수 방향으로 5m 이동")
- where.detail: 지시가 가리키는 세부 위치/방향
- hazards: 하중 하부 통행, 신호 불일치 등 지시에 내재한 위험`,
  nearmiss: `입력은 근로자의 아차사고(near-miss) 제보입니다.
- what: 무슨 일이 있었는지 한 줄
- hazards: 재발 시 예상되는 위험`,
};

function buildSystemPrompt(type: InterpretType): string {
  const zoneCatalog = ZONES.map((z) => `- ${z.id}: ${z.name}`).join("\n");
  return `당신은 한화오션 거제사업장 안전관제 시스템의 문서 해석 엔진입니다.
짧고 구어체인 입력에서 "무엇을·어디서·언제·어떤 위험"을 구조화합니다.

${SHIPYARD_GLOSSARY}

[시설 목록 (1~22)]
${zoneCatalog}

[시설 별칭 — 현장 호칭을 번호로 해석]
${aliasCatalog()}

[이번 입력의 종류]
${TYPE_GUIDE[type]}

다음 JSON 스키마로만 응답하세요 (설명·마크다운 금지, JSON 객체 하나만):
{
  "what": "무엇을 하는가 (한국어 한 줄)",
  "where": { "zoneId": 1~22 또는 null, "detail": "세부 위치 또는 null" },
  "when": { "start": "HH:MM" 또는 null, "end": "HH:MM" 또는 null },
  "hazards": ["위험 요소 (한국어, 간결히)"],
  "evidence": "판단 근거 — 원문에서 인용한 구절",
  "confidence": 0~1 (위치·시간·위험을 모두 원문에서 찾았으면 높게)
}`;
}

export interface InterpretInput {
  /** 자유 텍스트 (음성은 클라이언트 Web Speech가 텍스트로 변환) */
  text: string;
  type: InterpretType;
  /** 화자 언어 힌트 (크레인 지시 등) */
  langHint?: string;
}

export async function interpret(input: InterpretInput): Promise<InterpretOutput> {
  const text = input.text.trim();
  if (!text) throw new Error("해석할 텍스트가 비어 있습니다.");

  if (isDemoMode()) {
    return { result: demoInterpret(text, input.type), demo: true };
  }

  try {
    const langHint = input.langHint ? `\n(화자 언어 힌트: ${input.langHint})` : "";
    const result = await callClaudeJson({
      system: buildSystemPrompt(input.type),
      content: [{ type: "text", text: `다음 입력을 해석하세요.${langHint}\n\n[입력]\n${text}` }],
      schema: InterpretResultSchema,
      maxTokens: 1024,
    });
    return { result, demo: false };
  } catch {
    // 네트워크/API 실패 → 시연이 끊기지 않도록 규칙 기반 폴백
    return { result: demoInterpret(text, input.type), demo: true };
  }
}
