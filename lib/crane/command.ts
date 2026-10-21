/**
 * 크레인 음성/텍스트 지시 파싱 (B-5) — 동형 모듈
 *
 * 한국어/영어/베트남어 지시를 {축, 방향, 이동량}으로 해석한다.
 * 실제 LLM 경로는 lib/ai/craneCommand.ts, 이 파일은 데모 폴백 규칙과
 * "작업자 언어로 되보여주기" 문자열을 담당한다.
 * 모든 명령은 Confirm을 눌러야 크레인(SIM/LIVE)에 전달된다.
 */

import { z } from "zod";

/** 골리앗 크레인 축: 주행(레일)/횡행(트롤리)/권상(후크) */
export const CRANE_AXES = ["TRAVEL", "TROLLEY", "HOIST"] as const;
export type CraneAxis = (typeof CRANE_AXES)[number];

export const CraneCommandSchema = z.object({
  axis: z.enum(CRANE_AXES),
  /** +1: 전진/우측/상승, -1: 후진/좌측/하강 */
  direction: z.union([z.literal(1), z.literal(-1)]),
  /** 이동량 (미터). 권상은 상하 거리 */
  amountM: z.number().min(0.1).max(50),
  /** 감지한 화자 언어 */
  lang: z.enum(["ko", "en", "vi"]),
});
export type CraneCommand = z.infer<typeof CraneCommandSchema>;

const NUM_WORDS: Record<string, number> = {
  // ko
  일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 십: 10, 반: 0.5,
  하나: 1, 둘: 2, 셋: 3, 넷: 4, 다섯: 5,
  // en
  one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, half: 0.5,
  // vi
  "một": 1, hai: 2, ba: 3, "bốn": 4, "năm": 5, "mười": 10,
};

function parseAmount(text: string): number {
  const num = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m|미터|meter|mét|met)?/i);
  if (num) {
    const v = Number(num[1].replace(",", "."));
    if (v > 0 && v <= 50) return v;
  }
  const lower = text.toLowerCase();
  for (const [w, v] of Object.entries(NUM_WORDS)) {
    if (lower.includes(w)) return v;
  }
  return 2; // 기본 2m
}

function detectLang(text: string): "ko" | "en" | "vi" {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[àảãáạăằẳẵắặâầẩẫấậđèẻẽéẹêềểễếệìỉĩíịòỏõóọôồổỗốộơờởỡớợùủũúụưừửữứựỳỷỹýỵ]/i.test(text)) return "vi";
  return "en";
}

/** 규칙 기반 데모 파서. 해석 불가면 null */
export function parseCraneCommandDemo(text: string, langHint?: string): CraneCommand | null {
  const lower = text.toLowerCase();
  const lang = (langHint as "ko" | "en" | "vi") || detectLang(text);
  const amountM = parseAmount(text);

  // ── 권상 (후크 상/하) ──
  if (/올려|들어|올림|상승|권상|raise|up|lift|hoist|lên|nâng/i.test(lower)) {
    if (!/내려|down|hạ|xuống/i.test(lower))
      return { axis: "HOIST", direction: 1, amountM, lang };
  }
  if (/내려|내림|하강|lower|down|hạ|xuống|thả/i.test(lower)) {
    return { axis: "HOIST", direction: -1, amountM, lang };
  }

  // ── 횡행 (트롤리 좌/우) ──
  if (/트롤리|횡행|trolley|xe con/i.test(lower) || /왼|오른|left|right|trái|phải/i.test(lower)) {
    const dir = /왼|좌측|left|trái/i.test(lower) ? -1 : 1;
    return { axis: "TROLLEY", direction: dir as 1 | -1, amountM, lang };
  }

  // ── 주행 (레일 전/후) ──
  if (/주행|전진|후진|앞으로|뒤로|forward|backward|back|travel|tiến|lùi|tới/i.test(lower)) {
    const dir = /후진|뒤로|backward|back\b|lùi/i.test(lower) ? -1 : 1;
    return { axis: "TRAVEL", direction: dir as 1 | -1, amountM, lang };
  }

  return null;
}

/** 작업자 언어로 명령을 되읽어주는 문자열 */
export function echoCommand(cmd: CraneCommand): string {
  const axisName = {
    ko: { TRAVEL: "주행", TROLLEY: "트롤리", HOIST: "후크" },
    en: { TRAVEL: "gantry travel", TROLLEY: "trolley", HOIST: "hook" },
    vi: { TRAVEL: "di chuyển cổng trục", TROLLEY: "xe con", HOIST: "móc cẩu" },
  }[cmd.lang][cmd.axis];
  const dirName = {
    ko: {
      TRAVEL: cmd.direction > 0 ? "전진" : "후진",
      TROLLEY: cmd.direction > 0 ? "우측" : "좌측",
      HOIST: cmd.direction > 0 ? "상승" : "하강",
    },
    en: {
      TRAVEL: cmd.direction > 0 ? "forward" : "backward",
      TROLLEY: cmd.direction > 0 ? "right" : "left",
      HOIST: cmd.direction > 0 ? "up" : "down",
    },
    vi: {
      TRAVEL: cmd.direction > 0 ? "tiến" : "lùi",
      TROLLEY: cmd.direction > 0 ? "sang phải" : "sang trái",
      HOIST: cmd.direction > 0 ? "lên" : "xuống",
    },
  }[cmd.lang][cmd.axis];

  switch (cmd.lang) {
    case "ko":
      return `${axisName} ${dirName} ${cmd.amountM}m — 맞습니까?`;
    case "vi":
      return `${axisName} ${dirName} ${cmd.amountM} mét — đúng không?`;
    default:
      return `Move ${axisName} ${dirName} by ${cmd.amountM} m — correct?`;
  }
}

/** 한국어 요약 (타임라인·관제용) */
export function describeKo(cmd: CraneCommand): string {
  const axis = { TRAVEL: "주행", TROLLEY: "트롤리", HOIST: "후크" }[cmd.axis];
  const dir = {
    TRAVEL: cmd.direction > 0 ? "전진" : "후진",
    TROLLEY: cmd.direction > 0 ? "우측" : "좌측",
    HOIST: cmd.direction > 0 ? "상승" : "하강",
  }[cmd.axis];
  return `${axis} ${dir} ${cmd.amountM}m`;
}
