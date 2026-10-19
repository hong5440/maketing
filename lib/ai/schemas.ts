/**
 * LLM 출력 zod 스키마 (구조화 보고 / 경보 설명 / TBM 자료)
 */

import { z } from "zod";
import { HAZARD_TYPES, REPORTER_LANGS } from "../domain";

export const StructuredReportSchema = z.object({
  /** 감지된 보고자 언어 */
  lang: z.enum(REPORTER_LANGS),
  /** 한국어 번역 (원문이 한국어면 정돈된 원문) */
  translatedKo: z.string().min(1),
  hazardType: z.enum(HAZARD_TYPES),
  workType: z.string().min(1),
  severity: z.number().int().min(1).max(5),
  cause: z.string().min(1),
  /** 본문에서 추정한 위치(구역). 확신 없으면 null */
  zoneId: z.number().int().min(1).max(22).nullable(),
  /** 사진 등에서 발견한 추가 위험 요소 */
  hazardFactors: z.array(z.string()).default([]),
});
export type StructuredReport = z.infer<typeof StructuredReportSchema>;

export const AlertExplanationSchema = z.object({
  /** 어떤 패턴이 보이는가 (한국어) */
  pattern: z.string().min(1),
  /** 왜 위험한가 (한국어) */
  riskReason: z.string().min(1),
  /** 권장 조치 3가지 (한국어) */
  recommendedActions: z.array(z.string().min(1)).length(3),
});
export type AlertExplanation = z.infer<typeof AlertExplanationSchema>;

/** 언어코드 → 문자열. ko는 반드시 포함 */
export const LocalizedTextSchema = z
  .record(z.string(), z.string())
  .refine((v) => typeof v.ko === "string" && v.ko.length > 0, {
    message: "ko(한국어) 텍스트는 필수입니다",
  });
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const TBMDocumentSchema = z.object({
  zoneId: z.number().int().min(1).max(22),
  date: z.string().min(1),
  /** 오늘의 핵심 위험 1~3개 */
  keyRisks: z
    .array(
      z.object({
        hazardType: z.enum(HAZARD_TYPES),
        title: LocalizedTextSchema,
        detail: LocalizedTextSchema,
      })
    )
    .min(1)
    .max(3),
  /** 익명화된 실제 아차사고 사례 */
  cases: z.array(LocalizedTextSchema).max(3),
  /** 작업 전 체크리스트 */
  checklist: z.array(LocalizedTextSchema).min(3),
  /** 한 줄 구호 */
  slogan: LocalizedTextSchema,
});
export type TBMDocument = z.infer<typeof TBMDocumentSchema>;
