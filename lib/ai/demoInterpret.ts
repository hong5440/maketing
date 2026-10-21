/**
 * 해석 엔진의 데모 폴백 (규칙 기반) — 서버와 정적 데모(브라우저)가 공유하는
 * 동형(isomorphic) 모듈. Node 전용 의존성을 넣지 말 것.
 */

import { findZoneInText } from "./aliases";
import type { InterpretResult, InterpretType } from "./interpretTypes";

const HAZARD_RULES: { re: RegExp; label: string }[] = [
  { re: /인양|탑재|크레인|호이스트|줄걸이|샤클/i, label: "중량물 인양 (낙하·충돌)" },
  { re: /용접|화기|가우징|절단|그라인더|불티/i, label: "화기작업 (화재·폭발)" },
  { re: /도장|페인트|스프레이|신너|도료/i, label: "도장작업 (유증기·화재)" },
  { re: /탱크|밀폐|이중저|맨홀|내부\s*작업/i, label: "밀폐공간 (질식·중독)" },
  { re: /고소|족장|비계|사다리|높이|추락/i, label: "고소작업 (추락)" },
  { re: /전기|케이블|활선|감전/i, label: "전기작업 (감전)" },
  { re: /트랜스포터|지게차|차량|운반|통행/i, label: "장비·보행 동선 교차 (부딪힘)" },
  { re: /산소|가스|환기|측정/i, label: "유해가스 (질식·중독)" },
];

/** "14시", "14:00", "14~16시", "오후 2시" 등에서 시작·종료 추출 */
export function parseTimeRange(text: string): { start: string | null; end: string | null } {
  const range = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:시)?\s*[~\-부터]+\s*(\d{1,2})(?::(\d{2}))?\s*시?/);
  if (range) {
    const h1 = Number(range[1]);
    const h2 = Number(range[3]);
    if (h1 <= 24 && h2 <= 24)
      return {
        start: `${String(h1).padStart(2, "0")}:${range[2] ?? "00"}`,
        end: `${String(h2).padStart(2, "0")}:${range[4] ?? "00"}`,
      };
  }
  const single = text.match(/(?:오후\s*)?(\d{1,2})(?::(\d{2}))?\s*시/);
  if (single) {
    let h = Number(single[1]);
    if (/오후/.test(text) && h < 12) h += 12;
    if (h <= 24) return { start: `${String(h).padStart(2, "0")}:${single[2] ?? "00"}`, end: null };
  }
  return { start: null, end: null };
}

/** 규칙 기반 해석: 별칭으로 위치, 정규식으로 시간대·위험 요소 추출 */
export function demoInterpret(text: string, type: InterpretType): InterpretResult {
  const zoneId = findZoneInText(text);
  const { start, end } = parseTimeRange(text);
  const hazards = HAZARD_RULES.filter((r) => r.re.test(text)).map((r) => r.label);

  const what =
    type === "crane"
      ? "크레인 동작 지시"
      : type === "permit"
        ? text.split(/[.\n]/)[0].slice(0, 60) || "작업허가서"
        : text.split(/[.\n]/)[0].slice(0, 60) || "아차사고 제보";

  return {
    what,
    where: { zoneId, detail: null },
    when: { start, end },
    hazards,
    evidence: `규칙 매칭: ${[
      zoneId != null ? `위치 별칭→${zoneId}번` : null,
      start ? `시간 "${start}${end ? `~${end}` : ""}"` : null,
      hazards.length ? `위험 키워드 ${hazards.length}건` : null,
    ]
      .filter(Boolean)
      .join(", ") || "매칭 없음"}`,
    confidence: Math.min(0.75, 0.3 + (zoneId != null ? 0.2 : 0) + (start ? 0.15 : 0) + hazards.length * 0.05),
  };
}
