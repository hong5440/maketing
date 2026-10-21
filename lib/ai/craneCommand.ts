/**
 * 크레인 음성 지시 → 구조화 명령 (B-5, 서버)
 * 한국어/영어/베트남어 지시를 {축, 방향, 이동량}으로. 데모 폴백은 규칙 파서.
 */

import { callClaudeJson, isDemoMode } from "./config";
import {
  CraneCommandSchema,
  parseCraneCommandDemo,
  type CraneCommand,
} from "../crane/command";

const SYSTEM = `당신은 조선소 골리앗 크레인의 음성 지시 해석기입니다.
작업자의 짧은 지시(한국어/영어/베트남어)를 크레인 축 명령으로 변환합니다.

축 정의:
- TRAVEL: 크레인 전체가 레일을 따라 이동 (전진 +1 / 후진 -1)
- TROLLEY: 거더 위 트롤리가 좌우 이동 (우측 +1 / 좌측 -1)
- HOIST: 후크 상하 (상승 +1 / 하강 -1)

다음 JSON만 출력 (설명 금지):
{ "axis": "TRAVEL|TROLLEY|HOIST", "direction": 1 또는 -1, "amountM": 미터 수(0.1~50), "lang": "ko|en|vi" }
수량이 없으면 2m로 간주. 애매하면 가장 안전한 해석(작은 이동량)을 고른다.`;

export async function parseCraneCommand(
  text: string,
  langHint?: string,
): Promise<{ command: CraneCommand | null; demo: boolean }> {
  const trimmed = text.trim();
  if (!trimmed) return { command: null, demo: true };

  if (isDemoMode()) {
    return { command: parseCraneCommandDemo(trimmed, langHint), demo: true };
  }
  try {
    const command = await callClaudeJson({
      system: SYSTEM,
      content: [
        {
          type: "text",
          text: `${langHint ? `(언어 힌트: ${langHint})\n` : ""}지시: ${trimmed}`,
        },
      ],
      schema: CraneCommandSchema,
      maxTokens: 256,
    });
    return { command, demo: false };
  } catch {
    return { command: parseCraneCommandDemo(trimmed, langHint), demo: true };
  }
}
