/**
 * 시설(구역) 별칭 사전 — AI 프롬프트와 데모 폴백이 공유한다.
 * "1도크" = 1, "LNGC 도장" = 22 처럼 현장에서 부르는 이름을 구역 id로 잇는다.
 */

import { ZONES } from "../../data/zones";

/** 별칭 → 구역 id. 긴 별칭을 먼저 매칭하도록 사용처에서 길이순 정렬한다. */
export const ZONE_ALIASES: Record<string, number> = {
  // 도크·크레인
  "1도크": 1,
  "제1도크": 1,
  "일도크": 1,
  "900톤": 1,
  골리앗: 1,
  "2도크": 2,
  "제2도크": 2,
  "플로팅 도크": 14,
  플로팅: 14,
  FD: 14,
  // 공장동
  기술교육원: 3,
  교육원: 3,
  연구소: 4,
  선행의장: 5,
  소부재: 6,
  오션플라자: 7,
  하모니센터: 7,
  맑은물: 8,
  의장안벽: 9,
  안벽: 9,
  전처리: 10,
  도장공장: 10,
  절단: 11,
  "조립 1공장": 12,
  조립1: 12,
  "조립 3공장": 12,
  "조립 2공장": 13,
  조립2: 13,
  하역안벽: 15,
  강재적치장: 15,
  적치장: 15,
  "해양 의장": 16,
  "해양제작 1": 17,
  "해양제작 2": 18,
  "해양제작 3": 19,
  "해양플랜트 도장": 20,
  "옥외 조립장": 21,
  "해양플랜트 옥외": 21,
  "LNGC 도장": 22,
  LNGC: 22,
  "엘엔지 도장": 22,
};

/** 본문에서 구역을 추정: 명시 번호("12번") > 긴 별칭 > 짧은 별칭 */
export function findZoneInText(text: string): number | null {
  const num = text.match(/(\d{1,2})\s*번(?:\s*(?:구역|공장|시설))?/);
  if (num) {
    const id = Number(num[1]);
    if (id >= 1 && id <= 22) return id;
  }
  const keys = Object.keys(ZONE_ALIASES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (text.includes(k)) return ZONE_ALIASES[k];
  }
  // 정식 명칭 일부 매칭
  for (const z of ZONES) {
    const head = z.name.split("·")[0].split(" 및 ")[0];
    if (head.length >= 3 && text.includes(head)) return z.id;
  }
  return null;
}

/** 프롬프트용 별칭 목록 문자열 */
export function aliasCatalog(): string {
  const byZone = new Map<number, string[]>();
  for (const [alias, id] of Object.entries(ZONE_ALIASES)) {
    byZone.set(id, [...(byZone.get(id) ?? []), alias]);
  }
  return [...byZone.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, aliases]) => `- ${id}번: ${aliases.join(", ")}`)
    .join("\n");
}
