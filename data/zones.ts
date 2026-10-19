/**
 * 한화오션 거제사업장 구역 데이터 (22개 구역)
 *
 * 좌표계:
 * - 평면 좌표 x(서→동), z(남→북), 0~100 정규화
 * - 3D 환산: 1단위 = 25m (UNIT_METERS, 부지 약 2.5km 사방 / 490만㎡)
 * - footprint: 회전 전 w는 x축, d는 z축 방향 길이(정규화 단위).
 *   rotation은 평면도(위에서 본) 기준 반시계(CCW) 각도(도).
 * - buildingHeight는 미터 단위
 *
 * ⚠ reference/yard_map.png 미확보 상태 — 사용자가 준 텍스트 좌표를 기준으로 작성.
 *   해안선(geography.ts)과 모순되는 위치만 보정했고, 보정한 구역은 주석에 표시.
 *   조감도 이미지 확보 후 /debug/plan 에서 비교·재보정할 것.
 */

export const UNIT_METERS = 25;

export type ZoneKind =
  | "dock" // 드라이도크·플로팅도크
  | "factory" // 공장동
  | "quay" // 안벽
  | "yard" // 옥외 적치장·조립장
  | "office" // 사무·교육·복지
  | "water" // 수역
  | "outdoor"; // 기타 옥외

export interface ZoneFootprint {
  /** 회전 전 x축 방향 길이 (정규화 단위, ×25m) */
  w: number;
  /** 회전 전 z축 방향 길이 (정규화 단위, ×25m) */
  d: number;
  /** 평면도 기준 CCW 회전각 (도) */
  rotation: number;
}

export interface NationalityShare {
  country: string;
  /** TBM 모국어 생성용 언어 코드 */
  lang: string;
  ratio: number; // 합계 1.0
}

export interface Zone {
  id: number;
  name: string;
  nameEn: string;
  center: { x: number; z: number };
  footprint: ZoneFootprint;
  kind: ZoneKind;
  /** 지붕/구조물 높이 (m). 야드·안벽은 0 */
  buildingHeight: number;
  roofColor: string;
  workTypes: string[];
  hazards: string[];
  /** 평시 근무 인원 */
  headcount: number;
  nationalities: NationalityShare[];
}

// 자주 쓰는 국적 구성 프리셋
const KR = { country: "한국", lang: "ko" };
const VN = { country: "베트남", lang: "vi" };
const PH = { country: "필리핀", lang: "en" };
const TH = { country: "태국", lang: "th" };
const NP = { country: "네팔", lang: "ne" };
const ID = { country: "인도네시아", lang: "id" };
const UZ = { country: "우즈베키스탄", lang: "uz" };
const LK = { country: "스리랑카", lang: "si" };
const MM = { country: "미얀마", lang: "my" };

export const ZONES: Zone[] = [
  {
    id: 1,
    name: "1도크와 900톤 골리앗 크레인",
    nameEn: "Dock 1 & 900t Goliath Crane",
    // 만 남서쪽 코너를 향해 북동쪽으로 길게 뻗은 드라이도크 (약 525×125m)
    center: { x: 22, z: 45 },
    footprint: { w: 5, d: 21, rotation: -38 },
    kind: "dock",
    buildingHeight: 0,
    roofColor: "#64748b",
    workTypes: ["블록 탑재", "골리앗 크레인 인양", "고소 족장(비계) 작업", "선체 용접"],
    hazards: ["고소작업 추락", "크레인 인양물 낙하", "블록 탑재 협착", "도크 바닥 전도·전락"],
    headcount: 550,
    nationalities: [
      { ...KR, ratio: 0.5 },
      { ...VN, ratio: 0.2 },
      { ...PH, ratio: 0.12 },
      { ...TH, ratio: 0.1 },
      { ...NP, ratio: 0.08 },
    ],
  },
  {
    id: 2,
    name: "2도크와 900톤 골리앗 크레인",
    nameEn: "Dock 2 & 900t Goliath Crane",
    // 원안 (42,62)는 만 수역 내부라 서쪽 해안선 위로 보정.
    // 게이트가 만을 향해 동쪽으로 열리도록 해안에 직각 배치 (도크 전체는 육지 안).
    center: { x: 26.5, z: 62 },
    footprint: { w: 9.5, d: 4.2, rotation: -14 },
    kind: "dock",
    buildingHeight: 0,
    roofColor: "#64748b",
    workTypes: ["블록 탑재", "골리앗 크레인 인양", "고소 족장(비계) 작업", "선체 용접"],
    hazards: ["고소작업 추락", "크레인 인양물 낙하", "블록 탑재 협착", "도크 바닥 전도·전락"],
    headcount: 480,
    nationalities: [
      { ...KR, ratio: 0.52 },
      { ...VN, ratio: 0.18 },
      { ...TH, ratio: 0.12 },
      { ...NP, ratio: 0.1 },
      { ...LK, ratio: 0.08 },
    ],
  },
  {
    id: 3,
    name: "기술교육원",
    nameEn: "Technical Training Center",
    center: { x: 42, z: 22 },
    footprint: { w: 3.5, d: 2, rotation: 0 },
    kind: "office",
    buildingHeight: 20,
    roofColor: "#94a3b8",
    workTypes: ["용접·도장 기능 교육", "신규 입사자 안전교육", "외국인 근로자 교육"],
    hazards: ["실습 장비 끼임(경미)", "저위험"],
    headcount: 120,
    nationalities: [
      { ...KR, ratio: 0.6 },
      { ...VN, ratio: 0.15 },
      { ...ID, ratio: 0.13 },
      { ...MM, ratio: 0.12 },
    ],
  },
  {
    id: 4,
    name: "연구소",
    nameEn: "R&D Center",
    center: { x: 22, z: 35 },
    footprint: { w: 3, d: 2, rotation: 0 },
    kind: "office",
    buildingHeight: 28,
    roofColor: "#94a3b8",
    workTypes: ["설계·연구", "시험·계측"],
    hazards: ["저위험(사무)"],
    headcount: 200,
    nationalities: [{ ...KR, ratio: 1.0 }],
  },
  {
    id: 5,
    name: "선행의장 1공장",
    nameEn: "Pre-Outfitting Shop 1",
    center: { x: 30, z: 42 },
    footprint: { w: 8, d: 3.5, rotation: 0 },
    kind: "factory",
    buildingHeight: 24,
    roofColor: "#475569",
    workTypes: ["배관 스풀 제작", "의장품 선행 설치", "유닛 조립"],
    hazards: ["중량물 협착", "용접 화상", "그라인더 비산물 눈 상해"],
    headcount: 320,
    nationalities: [
      { ...KR, ratio: 0.48 },
      { ...VN, ratio: 0.22 },
      { ...TH, ratio: 0.15 },
      { ...NP, ratio: 0.15 },
    ],
  },
  {
    id: 6,
    name: "소부재조립공장",
    nameEn: "Sub-Assembly Shop",
    center: { x: 48, z: 40 },
    footprint: { w: 7, d: 3.5, rotation: 0 },
    kind: "factory",
    buildingHeight: 20,
    roofColor: "#475569",
    workTypes: ["소부재 취부·용접", "론지 부착"],
    hazards: ["용접 흄 흡입", "화상", "자재 틈 끼임"],
    headcount: 280,
    nationalities: [
      { ...KR, ratio: 0.45 },
      { ...VN, ratio: 0.25 },
      { ...LK, ratio: 0.15 },
      { ...MM, ratio: 0.15 },
    ],
  },
  {
    id: 7,
    name: "오션플라자·하모니센터·해피니스홀",
    nameEn: "Ocean Plaza · Harmony Center · Happiness Hall",
    // 서북쪽 해안의 파란 고층 복지·사무 건물군
    center: { x: 35, z: 90 },
    footprint: { w: 4, d: 2.5, rotation: 20 },
    kind: "office",
    buildingHeight: 60,
    roofColor: "#3b82f6",
    workTypes: ["사무", "식당·복지시설 운영", "행사"],
    hazards: ["저위험(사무·복지)"],
    headcount: 150,
    nationalities: [
      { ...KR, ratio: 0.85 },
      { ...VN, ratio: 0.08 },
      { ...PH, ratio: 0.07 },
    ],
  },
  {
    id: 8,
    name: "맑은물관리센터",
    nameEn: "Wastewater Treatment Center",
    center: { x: 93, z: 42 },
    footprint: { w: 3, d: 3, rotation: 0 },
    kind: "factory",
    buildingHeight: 10,
    roofColor: "#0ea5e9",
    workTypes: ["폐수 처리", "설비 점검"],
    hazards: ["처리조 밀폐공간 질식(황화수소)", "약품 취급 화상"],
    headcount: 40,
    nationalities: [
      { ...KR, ratio: 0.9 },
      { ...NP, ratio: 0.1 },
    ],
  },
  {
    id: 9,
    name: "의장안벽",
    nameEn: "Outfitting Quay",
    // 만 남쪽 해안선(z=55)을 따라 동서로 긴 안벽, 선박 계류
    center: { x: 55, z: 54 },
    footprint: { w: 20, d: 2, rotation: 0 },
    kind: "quay",
    buildingHeight: 0,
    roofColor: "#78716c",
    workTypes: ["계류 선박 의장", "시운전 준비", "화기(용접·절단) 작업"],
    hazards: ["해상 추락", "화기작업 화재", "이동식 크레인 전도", "현문 사다리 전락"],
    headcount: 420,
    nationalities: [
      { ...KR, ratio: 0.5 },
      { ...VN, ratio: 0.2 },
      { ...PH, ratio: 0.15 },
      { ...TH, ratio: 0.15 },
    ],
  },
  {
    id: 10,
    name: "전처리 및 도장공장",
    nameEn: "Pre-Treatment & Painting Shop",
    center: { x: 8, z: 38 },
    footprint: { w: 6, d: 5, rotation: 0 },
    kind: "factory",
    buildingHeight: 22,
    roofColor: "#1d4ed8",
    workTypes: ["쇼트 블라스팅", "스프레이 도장", "건조"],
    hazards: ["밀폐공간 질식", "유기용제 화재·폭발", "도장 분진 호흡기 질환"],
    headcount: 260,
    nationalities: [
      { ...KR, ratio: 0.35 },
      { ...VN, ratio: 0.25 },
      { ...TH, ratio: 0.2 },
      { ...UZ, ratio: 0.2 },
    ],
  },
  {
    id: 11,
    name: "절단공장",
    nameEn: "Steel Cutting Shop",
    center: { x: 54, z: 40 },
    footprint: { w: 7, d: 3.5, rotation: 0 },
    kind: "factory",
    buildingHeight: 18,
    roofColor: "#475569",
    workTypes: ["강재 플라즈마·가스 절단", "마킹", "곡직"],
    hazards: ["절단 화상", "가스 화재", "고소음 난청", "강판 날카로운 모서리 베임"],
    headcount: 190,
    nationalities: [
      { ...KR, ratio: 0.55 },
      { ...VN, ratio: 0.2 },
      { ...NP, ratio: 0.15 },
      { ...LK, ratio: 0.1 },
    ],
  },
  {
    id: 12,
    name: "조립 1공장 및 조립 3공장",
    nameEn: "Assembly Shops 1 & 3",
    center: { x: 38, z: 48 },
    footprint: { w: 9, d: 4, rotation: 0 },
    kind: "factory",
    buildingHeight: 28,
    roofColor: "#475569",
    workTypes: ["블록 조립", "대조립 용접", "천장크레인 운반"],
    hazards: ["블록 전도", "고소작업 추락", "용접 흄", "천장크레인 인양물 낙하"],
    headcount: 520,
    nationalities: [
      { ...KR, ratio: 0.45 },
      { ...VN, ratio: 0.22 },
      { ...TH, ratio: 0.13 },
      { ...NP, ratio: 0.12 },
      { ...MM, ratio: 0.08 },
    ],
  },
  {
    id: 13,
    name: "조립 2공장",
    nameEn: "Assembly Shop 2",
    center: { x: 32, z: 32 },
    footprint: { w: 7, d: 4, rotation: 0 },
    kind: "factory",
    buildingHeight: 28,
    roofColor: "#475569",
    workTypes: ["블록 조립", "대조립 용접", "천장크레인 운반"],
    hazards: ["블록 전도", "고소작업 추락", "용접 흄", "천장크레인 인양물 낙하"],
    headcount: 350,
    nationalities: [
      { ...KR, ratio: 0.48 },
      { ...VN, ratio: 0.22 },
      { ...LK, ratio: 0.16 },
      { ...ID, ratio: 0.14 },
    ],
  },
  {
    id: 14,
    name: "플로팅 도크",
    nameEn: "Floating Dock",
    // 만 안의 수상 도크
    center: { x: 60, z: 68 },
    footprint: { w: 9, d: 3, rotation: 15 },
    kind: "dock",
    buildingHeight: 15,
    roofColor: "#dc2626",
    workTypes: ["수상 블록 탑재", "해상 크레인 인양", "진수"],
    hazards: ["해상 추락", "탑재 협착", "해상 크레인 인양물 낙하", "작업선 이동 중 충돌"],
    headcount: 260,
    nationalities: [
      { ...KR, ratio: 0.55 },
      { ...VN, ratio: 0.2 },
      { ...PH, ratio: 0.15 },
      { ...TH, ratio: 0.1 },
    ],
  },
  {
    id: 15,
    name: "하역안벽 및 강재적치장",
    nameEn: "Unloading Quay & Steel Stockyard",
    center: { x: 62, z: 50 },
    footprint: { w: 10, d: 5, rotation: 0 },
    kind: "yard",
    buildingHeight: 0,
    roofColor: "#78716c",
    workTypes: ["강재 하역", "철판 적치·불출", "트랜스포터 운반"],
    hazards: ["중량물 협착", "지게차·트랜스포터 충돌", "적치 강재 붕괴", "매달린 하중 하부 통행"],
    headcount: 140,
    nationalities: [
      { ...KR, ratio: 0.6 },
      { ...VN, ratio: 0.2 },
      { ...NP, ratio: 0.2 },
    ],
  },
  {
    id: 16,
    name: "해양 의장공장",
    nameEn: "Offshore Outfitting Shop",
    center: { x: 95, z: 62 },
    footprint: { w: 4, d: 5, rotation: 0 },
    kind: "factory",
    buildingHeight: 25,
    roofColor: "#475569",
    workTypes: ["해양플랜트 모듈 의장", "배관·전장 설치"],
    hazards: ["모듈 내부 고소 추락", "중량물 협착", "밀폐구역 환기 불량"],
    headcount: 300,
    nationalities: [
      { ...KR, ratio: 0.45 },
      { ...PH, ratio: 0.2 },
      { ...VN, ratio: 0.2 },
      { ...TH, ratio: 0.15 },
    ],
  },
  {
    id: 17,
    name: "해양제작 1공장",
    nameEn: "Offshore Fabrication Shop 1",
    center: { x: 82, z: 33 },
    footprint: { w: 7, d: 4, rotation: 0 },
    kind: "factory",
    buildingHeight: 30,
    roofColor: "#475569",
    workTypes: ["대형 모듈 제작", "후판 용접", "취부"],
    hazards: ["고소작업 추락", "중량물 협착", "화기작업 화재", "용접 흄"],
    headcount: 400,
    nationalities: [
      { ...KR, ratio: 0.42 },
      { ...VN, ratio: 0.23 },
      { ...NP, ratio: 0.15 },
      { ...LK, ratio: 0.12 },
      { ...MM, ratio: 0.08 },
    ],
  },
  {
    id: 18,
    name: "해양제작 2공장",
    nameEn: "Offshore Fabrication Shop 2",
    center: { x: 82, z: 48 },
    footprint: { w: 7, d: 4, rotation: 0 },
    kind: "factory",
    buildingHeight: 30,
    roofColor: "#475569",
    workTypes: ["대형 모듈 제작", "후판 용접", "취부"],
    hazards: ["고소작업 추락", "중량물 협착", "화기작업 화재", "용접 흄"],
    headcount: 380,
    nationalities: [
      { ...KR, ratio: 0.42 },
      { ...VN, ratio: 0.25 },
      { ...TH, ratio: 0.18 },
      { ...UZ, ratio: 0.15 },
    ],
  },
  {
    id: 19,
    name: "해양제작 3공장",
    nameEn: "Offshore Fabrication Shop 3",
    center: { x: 84, z: 58 },
    footprint: { w: 6, d: 4, rotation: -10 },
    kind: "factory",
    buildingHeight: 30,
    roofColor: "#475569",
    workTypes: ["대형 모듈 제작", "후판 용접", "취부"],
    hazards: ["고소작업 추락", "중량물 협착", "화기작업 화재", "용접 흄"],
    headcount: 360,
    nationalities: [
      { ...KR, ratio: 0.45 },
      { ...VN, ratio: 0.25 },
      { ...PH, ratio: 0.15 },
      { ...NP, ratio: 0.15 },
    ],
  },
  {
    id: 20,
    name: "해양플랜트 도장 및 전처리 공장",
    nameEn: "Offshore Painting & Pre-Treatment Shop",
    // 동쪽 해안을 따라 배치
    center: { x: 90, z: 72 },
    footprint: { w: 4.5, d: 5, rotation: -8 },
    kind: "factory",
    buildingHeight: 25,
    roofColor: "#1d4ed8",
    workTypes: ["모듈 블라스팅", "스프레이 도장", "건조"],
    hazards: ["밀폐공간 질식", "유기용제 화재·폭발", "도장 분진 호흡기 질환"],
    headcount: 220,
    nationalities: [
      { ...KR, ratio: 0.32 },
      { ...VN, ratio: 0.28 },
      { ...TH, ratio: 0.22 },
      { ...UZ, ratio: 0.18 },
    ],
  },
  {
    id: 21,
    name: "해양플랜트 옥외 조립장",
    nameEn: "Offshore Outdoor Assembly Yard",
    // 동북쪽 해안, 시추선·리그 계류
    center: { x: 92, z: 84 },
    footprint: { w: 6, d: 9, rotation: -8 },
    kind: "yard",
    buildingHeight: 0,
    roofColor: "#78716c",
    workTypes: ["리그·시추선 옥외 조립", "대형 크레인 인양", "계류 작업"],
    hazards: ["옥외 고소작업 추락", "강풍 시 구조물 전도", "해상 추락", "크레인 인양물 낙하"],
    headcount: 310,
    nationalities: [
      { ...KR, ratio: 0.4 },
      { ...PH, ratio: 0.22 },
      { ...VN, ratio: 0.2 },
      { ...ID, ratio: 0.18 },
    ],
  },
  {
    id: 22,
    name: "LNGC 도장 및 전처리 공장",
    nameEn: "LNGC Painting & Pre-Treatment Shop",
    // 남쪽의 가장 큰 파란 공장동
    center: { x: 65, z: 32 },
    footprint: { w: 11, d: 6, rotation: 0 },
    kind: "factory",
    buildingHeight: 35,
    roofColor: "#2563eb",
    workTypes: ["LNGC 카고탱크 도장", "블라스팅", "보온(인슐레이션) 작업"],
    hazards: ["밀폐공간 질식", "유기용제 화재·폭발", "보온재 분진", "탱크 내부 고소 추락"],
    headcount: 340,
    nationalities: [
      { ...KR, ratio: 0.35 },
      { ...VN, ratio: 0.25 },
      { ...TH, ratio: 0.2 },
      { ...UZ, ratio: 0.12 },
      { ...MM, ratio: 0.08 },
    ],
  },
];

export function getZone(id: number): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

/** kind별 표시 색 (디버그 평면도·대시보드 공용) */
export const ZONE_KIND_COLORS: Record<ZoneKind, string> = {
  dock: "#f59e0b",
  factory: "#60a5fa",
  quay: "#a78bfa",
  yard: "#fbbf24",
  office: "#34d399",
  water: "#0ea5e9",
  outdoor: "#fb923c",
};
