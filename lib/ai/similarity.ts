/**
 * 키워드 토큰 겹침(자카드) 유사도 — 유사 과거 사례 선별용 (LLM 불필요)
 */

import type { NearMissReport } from "../domain";

/** 한국어/영문 혼합 텍스트를 2자 이상 토큰으로 분해 */
export function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  const words = text
    .toLowerCase()
    .split(/[^0-9a-z가-힣]+/u)
    .filter((w) => w.length >= 2);
  for (const w of words) {
    tokens.add(w);
    // 한국어 조사·어미 변형에 둔감하도록 2-gram도 추가
    if (/[가-힣]/.test(w)) {
      for (let i = 0; i + 2 <= w.length; i++) tokens.add(w.slice(i, i + 2));
    }
  }
  return tokens;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** query와 유사한 과거 보고서 상위 topN건 선별 (exclude된 id 제외) */
export function findSimilarReports(
  query: string,
  reports: NearMissReport[],
  topN: number,
  excludeIds: Set<string> = new Set()
): NearMissReport[] {
  const q = tokenize(query);
  return reports
    .filter((r) => !excludeIds.has(r.id))
    .map((r) => ({ r, score: jaccard(q, tokenize(r.translatedKo)) }))
    .filter((x) => x.score > 0.05)
    .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id))
    .slice(0, topN)
    .map((x) => x.r);
}
