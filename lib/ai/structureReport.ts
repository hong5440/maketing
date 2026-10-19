/**
 * 아차사고 보고 구조화 파이프라인
 *
 * 1) 음성(audioBase64)이 있으면 Whisper STT 먼저 → 실패/키 없음 시 클라이언트가
 *    Web Speech API로 보낸 text 사용
 * 2) LLM으로 언어 감지·한국어 번역·hazardType/workType/severity/cause/추정 위치 추출.
 *    사진(imageBase64)이 있으면 이미지도 함께 넣어 위험 요소 보강
 * 3) zod 스키마 검증, 파싱 실패 시 1회 재시도 (callClaudeJson)
 * 4) 데모 폴백: 키워드 규칙 매칭 + data/demo/structure-report.json
 */

import type Anthropic from "@anthropic-ai/sdk";
import { ZONES } from "../../data/zones";
import {
  HAZARD_TYPES,
  REPORTER_LANGS,
  type HazardType,
  type ReporterLang,
  type Severity,
} from "../domain";
import { callClaudeJson, isDemoMode } from "./config";
import { SHIPYARD_GLOSSARY } from "./glossary";
import { StructuredReportSchema, type StructuredReport } from "./schemas";
import { transcribeAudio } from "./stt";
import { demoStructure } from "./demoFallbacks";

export interface StructureReportInput {
  /** 텍스트 보고 또는 클라이언트 Web Speech 결과 */
  text?: string;
  /** 음성 녹음 (base64) — 있으면 Whisper STT 우선 */
  audioBase64?: string;
  audioMimeType?: string;
  /** 현장 사진 (base64) */
  imageBase64?: string;
  imageMimeType?: string;
  /** QR 등으로 미리 아는 구역 */
  zoneId?: number;
  /** 클라이언트가 아는 보고자 언어 힌트 */
  lang?: string;
}

export interface StructureReportOutput extends StructuredReport {
  /** 구조화에 사용된 원문 (STT 결과 포함) */
  sourceText: string;
  /** STT를 실제로 수행했는지 */
  sttUsed: boolean;
  /** 데모 폴백 경로를 사용했는지 */
  demo: boolean;
}

// ─────────────────────────────────────────────────────────────

function zoneCatalog(): string {
  return ZONES.map(
    (z) => `- ${z.id}: ${z.name} (주요 작업: ${z.workTypes.join(", ")})`
  ).join("\n");
}

function buildSystemPrompt(): string {
  return `당신은 조선소 안전관리 시스템의 아차사고(near-miss) 보고 분석기입니다.
외국인 근로자가 급하게 쓴 짧은 구어체 보고(오타·은어 포함)를 구조화합니다.

${SHIPYARD_GLOSSARY}

[구역 목록]
${zoneCatalog()}

다음 JSON 스키마로만 응답하세요 (설명·마크다운 금지, JSON 객체 하나만):
{
  "lang": "ko|vi|ne|uz|th|en|id 중 감지된 언어",
  "translatedKo": "정확한 한국어 번역 (원문이 한국어면 의미를 보존해 정돈)",
  "hazardType": "${HAZARD_TYPES.join("|")} 중 하나",
  "workType": "수행 중이던 작업 (한국어, 간결히)",
  "severity": 1~5 정수 (1=경미한 불편, 3=부상 가능, 5=사망·중대재해 가능),
  "cause": "추정 원인 (한국어, 간결히)",
  "zoneId": 본문에서 추정한 구역 id (1~22) 또는 null,
  "hazardFactors": ["본문·사진에서 발견한 추가 위험 요소 (한국어)"]
}`;
}

// ── 데모 폴백 (공용 모듈 lib/ai/demoFallbacks.ts) ─────────────
// demoStructure / detectLangByScript 는 정적 데모의 클라이언트 경로와 공유된다.

// ── 메인 ─────────────────────────────────────────────────────

export async function structureReport(
  input: StructureReportInput
): Promise<StructureReportOutput> {
  // 1) STT (음성 우선, 실패 시 클라이언트 텍스트)
  let sourceText = (input.text ?? "").trim();
  let sttUsed = false;
  if (input.audioBase64) {
    const stt = await transcribeAudio(input.audioBase64, input.audioMimeType);
    if (stt) {
      sourceText = stt;
      sttUsed = true;
    }
  }
  if (!sourceText && !input.imageBase64) {
    throw new Error("보고 내용(text/audioBase64/imageBase64)이 비어 있습니다.");
  }

  // 2) 데모 모드면 규칙 기반 폴백
  if (isDemoMode()) {
    return {
      ...demoStructure(sourceText || "(사진 보고)", input),
      sourceText,
      sttUsed,
      demo: true,
    };
  }

  // 3) 실제 LLM 호출 (실패 시 데모 폴백)
  try {
    const content: Anthropic.MessageParam["content"] = [];
    if (input.imageBase64) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: (input.imageMimeType ??
            "image/jpeg") as "image/jpeg",
          data: input.imageBase64,
        },
      });
    }
    const zoneHint = input.zoneId
      ? `\n(QR 스캔으로 확인된 보고 구역: ${input.zoneId}번)`
      : "";
    const langHint = input.lang ? `\n(언어 힌트: ${input.lang})` : "";
    content.push({
      type: "text",
      text: `아래 아차사고 보고를 구조화하세요.${zoneHint}${langHint}\n\n[보고 원문]\n${
        sourceText || "(텍스트 없음 — 사진만 제출됨)"
      }`,
    });

    const structured = await callClaudeJson({
      system: buildSystemPrompt(),
      content,
      schema: StructuredReportSchema,
      maxTokens: 2048,
    });
    return { ...structured, sourceText, sttUsed, demo: false };
  } catch {
    // 네트워크/API 실패 → 시연이 끊기지 않도록 데모 폴백
    return {
      ...demoStructure(sourceText || "(사진 보고)", input),
      sourceText,
      sttUsed,
      demo: true,
    };
  }
}
