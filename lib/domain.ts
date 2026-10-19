/**
 * 아차사고 보고 도메인 상수·타입 (한 곳에서 정의하고 전역 공유)
 */

export const HAZARD_TYPES = [
  "추락",
  "낙하",
  "협착",
  "충돌",
  "화재·폭발",
  "질식",
  "감전",
  "절단·화상",
  "전도",
  "기타",
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

/** 보고자 언어 (데모 범위) */
export const REPORTER_LANGS = ["ko", "vi", "ne", "uz", "th", "en", "id"] as const;
export type ReporterLang = (typeof REPORTER_LANGS)[number];

export const LANG_LABELS: Record<ReporterLang, string> = {
  ko: "한국어",
  vi: "베트남어",
  ne: "네팔어",
  uz: "우즈베크어",
  th: "태국어",
  en: "영어",
  id: "인도네시아어",
};

export const WEATHERS = ["맑음", "흐림", "비", "강풍"] as const;
export type Weather = (typeof WEATHERS)[number];

export const REPORT_STATUSES = ["접수", "검토중", "조치완료"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type Severity = 1 | 2 | 3 | 4 | 5;

export interface NearMissReport {
  id: string;
  /** ISO 8601, 항상 +09:00(KST) 오프셋으로 직렬화 */
  createdAt: string;
  zoneId: number;
  reporterLang: ReporterLang;
  reporterAnonymous: boolean;
  /** 보고자 언어 원문 */
  rawText: string;
  /** 한국어 번역 */
  translatedKo: string;
  hazardType: HazardType;
  workType: string;
  severity: Severity;
  cause: string;
  photoUrl?: string;
  status: ReportStatus;
  actionTaken?: string;
  /** 보고 당일 날씨 (같은 날짜는 같은 날씨) */
  weather: Weather;
}

/** createdAt(+09:00 직렬화 규약)에서 KST 시(hour)를 추출 */
export function kstHour(createdAt: string): number {
  const m = createdAt.match(/T(\d{2}):/);
  return m ? Number(m[1]) : 0;
}

/** createdAt에서 KST 날짜(YYYY-MM-DD) 추출 */
export function kstDate(createdAt: string): string {
  return createdAt.slice(0, 10);
}

/** 야간 시간대(20~24시) 여부 */
export function isNightHour(hour: number): boolean {
  return hour >= 20 && hour < 24;
}

/** Date → "+09:00" 오프셋의 KST ISO 문자열 */
export function formatKstIso(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 3600000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())}` +
    `T${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}:${p(kst.getUTCSeconds())}+09:00`
  );
}
