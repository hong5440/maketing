/**
 * LLM(Anthropic) 호출 공통 설정 + 데모 모드 판단
 *
 * 규칙 (CLAUDE.md):
 * - 모델명은 process.env.LLM_MODEL 에서만 읽는다 (하드코딩 금지)
 * - 키가 없거나 DEMO_MODE=true 면 데모 폴백 경로를 사용한다
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

/** 데모 모드 여부: DEMO_MODE=true 강제, 또는 키/모델명이 없으면 자동 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  return !process.env.ANTHROPIC_API_KEY || !process.env.LLM_MODEL;
}

export function getModel(): string {
  const model = process.env.LLM_MODEL;
  if (!model) throw new Error("LLM_MODEL 환경변수가 설정되지 않았습니다.");
  return model;
}

let _client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

function stripJsonFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  // 첫 { 부터 마지막 } 까지만 취해 앞뒤 잡음 제거
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body.trim();
}

/**
 * Claude를 호출해 zod 스키마로 검증된 JSON을 받는다.
 * 파싱/검증 실패 시 오류 내용을 덧붙여 1회 재시도.
 */
export async function callClaudeJson<T>(opts: {
  system: string;
  content: Anthropic.MessageParam["content"];
  schema: ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const client = getAnthropic();
  const model = getModel();

  const request = async (
    extra?: Anthropic.MessageParam[]
  ): Promise<string> => {
    const response = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }, ...(extra ?? [])],
    });
    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }
    return text;
  };

  const tryParse = (text: string): T => {
    const parsed = JSON.parse(stripJsonFences(text));
    return opts.schema.parse(parsed);
  };

  const first = await request();
  try {
    return tryParse(first);
  } catch (err) {
    // 1회 재시도: 이전 응답과 오류를 보여주고 JSON만 다시 요청
    const retry = await request([
      { role: "assistant", content: first || "(빈 응답)" },
      {
        role: "user",
        content: `위 응답을 JSON으로 파싱/검증하는 데 실패했습니다: ${
          err instanceof Error ? err.message : String(err)
        }\n설명 없이, 스키마에 맞는 올바른 JSON 객체 하나만 다시 출력하세요.`,
      },
    ]);
    return tryParse(retry);
  }
}
