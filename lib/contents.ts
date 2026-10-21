/**
 * 콘텐츠 5종 (B-6) 데이터·규칙 — 동형 모듈
 * ① 모국어 안전 브리핑 ③ 블록 운송 내비 ④ 신입 첫 출근 투어 ⑤ 사고 기억 지도
 * (② 버튼 하나 제보는 기존 /report 흐름 + 15번 적치장 전도 20건 시드)
 */

import type { NearMissReport } from "./domain";

/* ── ① 모국어 안전 브리핑 ─────────────────────────── */

export const FOREIGN_WORKER_STAT =
  "조선업 외국인 근로자 비중은 2007년 3.2%에서 2024년 22.7%로 늘었습니다. (한국조선해양플랜트협회)";

export const BRIEFING_LANGS = [
  { code: "ko", label: "한국어", speech: "ko-KR" },
  { code: "en", label: "English", speech: "en-US" },
  { code: "vi", label: "Tiếng Việt", speech: "vi-VN" },
  { code: "uz", label: "Oʻzbekcha", speech: "uz-UZ" },
  { code: "ne", label: "नेपाली", speech: "ne-NP" },
] as const;
export type BriefingLang = (typeof BRIEFING_LANGS)[number]["code"];

/** 위험유형 번역 (데모 범위) */
const HAZARD_I18N: Record<string, Record<BriefingLang, string>> = {
  추락: { ko: "추락", en: "falls from height", vi: "ngã cao", uz: "balanddan yiqilish", ne: "उचाइबाट खस्ने" },
  낙하: { ko: "낙하물", en: "falling objects", vi: "vật rơi", uz: "tushayotgan jismlar", ne: "खस्ने वस्तु" },
  협착: { ko: "끼임", en: "caught-in pinch points", vi: "kẹp tay", uz: "qisilib qolish", ne: "च्यापिने" },
  충돌: { ko: "부딪힘", en: "collisions", vi: "va chạm", uz: "to'qnashuv", ne: "ठोकिने" },
  "화재·폭발": { ko: "화재·폭발", en: "fire and explosion", vi: "cháy nổ", uz: "yong'in-portlash", ne: "आगलागी" },
  질식: { ko: "질식", en: "asphyxiation in confined spaces", vi: "ngạt khí", uz: "bo'g'ilish", ne: "निसास्सिने" },
  감전: { ko: "감전", en: "electric shock", vi: "điện giật", uz: "tok urishi", ne: "करेन्ट लाग्ने" },
  "절단·화상": { ko: "절단·화상", en: "cuts and burns", vi: "đứt tay, bỏng", uz: "kesilish-kuyish", ne: "काटिने-पोल्ने" },
  전도: { ko: "넘어짐", en: "slips and trips", vi: "trượt ngã", uz: "sirpanib yiqilish", ne: "चिप्लिने" },
  기타: { ko: "기타 위험", en: "other hazards", vi: "nguy cơ khác", uz: "boshqa xavflar", ne: "अन्य जोखिम" },
};

const BRIEFING_TMPL: Record<
  BriefingLang,
  (zone: string, hazards: string[], count: number) => string
> = {
  ko: (z, h, c) =>
    `${z} 안전 브리핑입니다. 최근 8주 이 구역에서 ${c}건의 아차사고가 보고되었습니다. ` +
    `가장 잦은 위험은 ${h.join(", ")}입니다. 작업 전 안전대·보호구를 확인하고, ` +
    `크레인 하중 아래로 지나가지 마세요. 위험을 보면 10초 보고로 알려주세요.`,
  en: (z, h, c) =>
    `Safety briefing for ${z}. In the last 8 weeks, ${c} near-misses were reported here. ` +
    `Most frequent risks: ${h.join(", ")}. Check your harness and PPE before work, ` +
    `never walk under a suspended load, and report any hazard with the 10-second report.`,
  vi: (z, h, c) =>
    `Briefing an toàn khu ${z}. Trong 8 tuần qua có ${c} báo cáo suýt tai nạn tại đây. ` +
    `Nguy cơ thường gặp nhất: ${h.join(", ")}. Kiểm tra dây an toàn và đồ bảo hộ trước khi làm việc, ` +
    `không đi dưới tải cẩu, thấy nguy hiểm hãy báo cáo 10 giây.`,
  uz: (z, h, c) =>
    `${z} uchun xavfsizlik brifingi. So'nggi 8 haftada bu yerda ${c} ta xavfli holat qayd etildi. ` +
    `Eng ko'p uchraydigan xavflar: ${h.join(", ")}. Ishdan oldin himoya vositalarini tekshiring, ` +
    `yuk ostidan o'tmang, xavfni ko'rsangiz 10 soniyalik hisobot yuboring.`,
  ne: (z, h, c) =>
    `${z} को सुरक्षा ब्रिफिङ। पछिल्ला ८ हप्तामा यहाँ ${c} वटा घटना रिपोर्ट भए। ` +
    `मुख्य जोखिम: ${h.join(", ")}। काम अघि सुरक्षा बेल्ट र पीपीई जाँच्नुहोस्, ` +
    `क्रेनको भार मुनि नहिँड्नुहोस्, जोखिम देखे १० सेकेन्ड रिपोर्ट पठाउनुहोस्।`,
};

/** 데모 브리핑 생성: 구역 보고 통계 기반 (LLM 경로는 추후 /api/briefing) */
export function demoBriefing(
  zoneName: string,
  lang: BriefingLang,
  reports: NearMissReport[],
): string {
  const counts = new Map<string, number>();
  for (const r of reports) counts.set(r.hazardType, (counts.get(r.hazardType) ?? 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => HAZARD_I18N[t]?.[lang] ?? t);
  if (top.length === 0) top.push(HAZARD_I18N["기타"][lang]);
  return BRIEFING_TMPL[lang](zoneName, top, reports.length);
}

/* ── ③ 블록 운송 내비 (15번 적치장 → 1도크) ─────────── */

/** 정규화 좌표 경유점 — 도로망을 따라 이동 */
export const TRANSPORT_ROUTE: { x: number; z: number }[] = [
  { x: 62, z: 52 }, // 15번 적치장 출발
  { x: 55, z: 50 },
  { x: 44, z: 49 },
  { x: 36, z: 49 },
  { x: 30, z: 51 },
  { x: 26, z: 53 }, // 1도크 진입
];

/** 보행 동선 교차 경고 지점 (정규화 좌표) */
export const TRANSPORT_CROSSINGS: { x: number; z: number; label: string }[] = [
  { x: 44, z: 49, label: "조립 1공장 앞 횡단" },
  { x: 30, z: 51, label: "1도크 게이트 보행 교차" },
];

/* ── ④ 신입 첫 출근 투어 (3번 기술교육원 출발) ───────── */

export interface TourStep {
  zoneId: number;
  title: string;
  guide: string;
  quiz?: { q: string; options: string[]; answer: number; explain: string };
}

export const TOUR_STEPS: TourStep[] = [
  {
    zoneId: 3,
    title: "출발 — 기술교육원",
    guide:
      "입사를 환영합니다! 모든 출입은 안전교육 이수 후 가능합니다. 안전모·안전화·보안경은 야드 전 구역 필수입니다.",
  },
  {
    zoneId: 11,
    title: "절단공장",
    guide:
      "강재를 자르는 곳입니다. 플라즈마 불티와 흄이 발생하니 지정 통로로만 다니세요. 바닥의 노란 선 안쪽이 보행로입니다.",
    quiz: {
      q: "공장 안에서 걸어도 되는 곳은?",
      options: ["아무 곳이나", "노란 선 안쪽 보행로", "크레인 아래 지름길"],
      answer: 1,
      explain: "보행로(노란 선) 밖은 지게차·크레인 작업 구역입니다.",
    },
  },
  {
    zoneId: 15,
    title: "강재적치장",
    guide:
      "트랜스포터와 지게차가 수시로 다닙니다. 적치된 강재 사이 통로에서 전도(넘어짐) 보고가 가장 많은 곳입니다 — 발밑을 확인하세요.",
    quiz: {
      q: "트랜스포터가 다가올 때 올바른 행동은?",
      options: ["빨리 앞질러 지나간다", "멈춰서 신호수의 수신호를 따른다", "뒤로 돌아 달린다"],
      answer: 1,
      explain: "대형 운반 장비는 사각지대가 큽니다. 신호수 지시를 따르세요.",
    },
  },
  {
    zoneId: 1,
    title: "1도크 — 골리앗 크레인",
    guide:
      "900톤 골리앗 크레인이 블록을 들어 올리는 곳입니다. 인양 중에는 하중 아래 출입이 금지됩니다. 바닥의 빨간 투영 영역을 피해 다니세요.",
    quiz: {
      q: "크레인이 블록을 들고 있을 때는?",
      options: ["하중 아래로 빠르게 통과", "하중 이동 영역 밖으로 우회", "크레인 운전실에 손 흔들기"],
      answer: 1,
      explain: "낙하 위험 — 하중 아래는 절대 출입 금지입니다.",
    },
  },
  {
    zoneId: 22,
    title: "LNGC 도장 공장 — 밀폐공간",
    guide:
      "탱크 내부는 밀폐공간입니다. 출입 전 산소 측정, 환기, 외부 감시인이 반드시 필요합니다. 허가 없이 절대 들어가지 마세요. 투어 수고하셨습니다!",
  },
];

/* ── ⑤ 사고 기억 지도 (유형별 대표 8건, 일반화·합성) ──── */

export interface MemoryIncident {
  id: string;
  zoneId: number;
  year: string;
  type: string;
  summary: string;
  lesson: string;
}

/** 공개 보도·재해 사례를 유형 수준으로 일반화한 합성 데이터 — 특정 사건·인물과 무관 */
export const MEMORY_INCIDENTS: MemoryIncident[] = [
  { id: "M1", zoneId: 1, year: "20XX", type: "낙하", summary: "인양 중 블록 체결부가 풀려 하부 통로에 낙하", lesson: "인양 전 줄걸이 2중 확인, 하부 통제" },
  { id: "M2", zoneId: 22, year: "20XX", type: "질식", summary: "탱크 내부 도장 중 환기 중단으로 의식 저하", lesson: "산소 측정·송기마스크·외부 감시인" },
  { id: "M3", zoneId: 9, year: "20XX", type: "추락", summary: "계류선 현문 사다리에서 야간 이동 중 추락", lesson: "야간 조명·안전대 걸이 확인" },
  { id: "M4", zoneId: 11, year: "20XX", type: "화재·폭발", summary: "절단 불티가 도장면에 옮겨붙어 화재", lesson: "화기작업 전 인화물 제거·불티 방지포" },
  { id: "M5", zoneId: 15, year: "20XX", type: "충돌", summary: "후진하는 트랜스포터와 보행자 충돌 위기", lesson: "운반 경로 보행 통제·신호수 배치" },
  { id: "M6", zoneId: 12, year: "20XX", type: "협착", summary: "대조립 반목 조정 중 손가락 끼임", lesson: "중량물 하부 손 넣기 금지, 보조 공구 사용" },
  { id: "M7", zoneId: 18, year: "20XX", type: "감전", summary: "우천 후 가설 전선 피복 손상부 접촉", lesson: "가설 전선 일일 점검·누전 차단기" },
  { id: "M8", zoneId: 2, year: "20XX", type: "전도", summary: "도크 바닥 그리스 잔류부에서 미끄러짐", lesson: "작업 후 바닥 정리·미끄럼 주의 표지" },
];
