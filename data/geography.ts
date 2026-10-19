/**
 * 거제사업장 지형 데이터 — 해안선, 만(灣), 도로망, 안벽 라인
 *
 * 좌표계는 zones.ts와 동일 (x 서→동, z 남→북, 0~100, 1단위=25m).
 * 조감도는 남쪽 상공에서 북쪽 바다를 보는 시점이지만, 여기서는 원근을 걷어낸
 * 평면도 기준으로 정의한다. 중앙 북쪽이 만이고 북쪽 끝(z=100)이 외해로 열린다.
 */

export type Point = { x: number; z: number };

export interface Polyline {
  name: string;
  points: Point[];
  /** 도로 폭 등 (정규화 단위, ×25m) */
  width?: number;
}

export interface Polygon {
  name: string;
  points: Point[];
}

/**
 * 해안선 (서쪽 반도 끝 → 만 안쪽 → 동쪽 해안 → 북동쪽 끝).
 * 이 선의 바다 쪽(만 내부)이 수역이다.
 */
export const COASTLINE: Polyline = {
  name: "해안선",
  points: [
    { x: 38, z: 100 }, // 서쪽 반도 북단 (외해)
    { x: 40, z: 95 },
    { x: 33, z: 72 }, // 서쪽 해안 (30,55)→(40,95) 라인
    { x: 30, z: 55 }, // 만 남서 코너
    { x: 85, z: 55 }, // 만 남쪽 해안선 (의장안벽·하역안벽)
    { x: 86, z: 62 }, // 동쪽 해안 (85,55)→(90,90) 라인
    { x: 90, z: 90 },
    { x: 93, z: 100 }, // 동쪽 해안 북단 (외해)
  ],
};

/**
 * 만 수역 폴리곤 — 해안선 + 북쪽 외해 경계(z=100)로 닫음.
 * 플로팅 도크(14)가 이 안에 뜬다.
 */
export const BAY_WATER: Polygon = {
  name: "옥포만 수역",
  points: [...COASTLINE.points, { x: 93, z: 100 }, { x: 38, z: 100 }],
};

/** 공장동 사이 주도로망 */
export const ROADS: Polyline[] = [
  {
    name: "중앙로 (동서 간선)",
    width: 1,
    points: [
      { x: 4, z: 37 },
      { x: 96, z: 37 },
    ],
  },
  {
    name: "남부로 (동서)",
    width: 0.8,
    points: [
      { x: 14, z: 27 },
      { x: 90, z: 27 },
    ],
  },
  {
    name: "해안로 (동서, 안벽 배후)",
    width: 1,
    points: [
      { x: 12, z: 52 },
      { x: 84, z: 52 },
    ],
  },
  {
    name: "동측 해안로 (해양플랜트)",
    width: 0.8,
    points: [
      { x: 84, z: 52 },
      { x: 92, z: 66 },
      { x: 94, z: 90 },
    ],
  },
  {
    name: "서측 해안로 (오션플라자 방면)",
    width: 0.8,
    points: [
      { x: 28, z: 52 },
      { x: 33, z: 72 },
      { x: 36, z: 87 },
    ],
  },
  {
    name: "남북 1로",
    width: 0.8,
    points: [
      { x: 27, z: 10 },
      { x: 27, z: 52 },
    ],
  },
  {
    name: "남북 2로",
    width: 0.8,
    points: [
      { x: 45, z: 10 },
      { x: 45, z: 52 },
    ],
  },
  {
    name: "남북 3로",
    width: 0.8,
    points: [
      { x: 58, z: 10 },
      { x: 58, z: 52 },
    ],
  },
  {
    name: "남북 4로",
    width: 0.8,
    points: [
      { x: 75, z: 10 },
      { x: 75, z: 52 },
    ],
  },
  {
    name: "남북 5로 (동측)",
    width: 0.8,
    points: [
      { x: 92, z: 27 },
      { x: 92, z: 52 },
    ],
  },
];

/** 안벽 라인 (해안선 위에 놓인 계류·하역 구간) */
export const QUAY_LINES: Polyline[] = [
  {
    name: "의장안벽",
    points: [
      { x: 42, z: 55 },
      { x: 62, z: 55 },
    ],
  },
  {
    name: "하역안벽",
    points: [
      { x: 62, z: 55 },
      { x: 80, z: 55 },
    ],
  },
  {
    name: "해양플랜트 안벽 (동측)",
    points: [
      { x: 86.5, z: 64 },
      { x: 90, z: 88 },
    ],
  },
];
