/**
 * 공용 AI 해석 엔진의 타입/스키마 — 서버·클라이언트 공유 (Node 의존성 금지)
 */

import { z } from "zod";

/** 입력 문서 종류: 작업허가서 / 크레인 음성 지시 / 아차사고 제보 */
export const INTERPRET_TYPES = ["permit", "crane", "nearmiss"] as const;
export type InterpretType = (typeof INTERPRET_TYPES)[number];

export const InterpretResultSchema = z.object({
  /** 무엇을 하는가 (한국어 한 줄) */
  what: z.string().min(1),
  where: z.object({
    /** 시설 번호 (1~22), 확신 없으면 null */
    zoneId: z.number().int().min(1).max(22).nullable(),
    /** 시설 내 세부 위치 (예: "도크 바닥 선미측"), 없으면 null */
    detail: z.string().nullable(),
  }),
  when: z.object({
    /** "HH:MM" 또는 null */
    start: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    end: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  }),
  /** 위험 요소 (한국어, 간결히) */
  hazards: z.array(z.string()).default([]),
  /** 판단 근거 — 원문 인용 또는 규칙 설명 */
  evidence: z.string().default(""),
  /** 0~1 확신도 */
  confidence: z.number().min(0).max(1),
});

export type InterpretResult = z.infer<typeof InterpretResultSchema>;

export interface InterpretOutput {
  result: InterpretResult;
  /** 데모 폴백 경로를 사용했는지 (UI에 "데모 해석" 배지 표시용) */
  demo: boolean;
}
