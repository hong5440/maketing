/**
 * 아차사고 시드 데이터 생성 스크립트
 *
 * - LLM 호출 없이 템플릿 + 시드 고정 PRNG(mulberry32)로 250건 생성
 * - 기준일: 2026-10-19 (최근 8주)
 * - 실행: npm run seed  →  data/seed/reports.json
 *
 * 심은 패턴 (데모 하이라이트):
 *  1) 1도크(1): 최근 7일 "크레인 인양 중 볼트·공구 낙하" 7건 급증 (이전 주 평균 1건)
 *  2) LNGC 도장공장(22): 탱크 내부 질식 아차사고 4주 연속 증가 (1→2→3→5)
 *  3) 강재적치장(15): 야간(20~24시) 협착·충돌이 주간의 3배 (18 vs 6)
 *  4) 의장안벽(9): 비 오는 날 미끄러짐 추락 집중
 *  5) 사무·교육 구역(3,4,7,8): 거의 없음 (총 3건)
 */

import fs from "node:fs";
import path from "node:path";
import { ZONES, type Zone } from "../data/zones";
import {
  type HazardType,
  type NearMissReport,
  type ReporterLang,
  type ReportStatus,
  type Severity,
  type Weather,
  kstHour,
  isNightHour,
} from "../lib/domain";

// ─────────────────────────────────────────────────────────────
// 시드 고정 PRNG (mulberry32)
// ─────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const randInt = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)];
function pickWeighted<T>(rng: Rng, items: readonly [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1][0];
}

// ─────────────────────────────────────────────────────────────
// 날짜 (기준: 2026-10-19 18:00 KST, 최근 8주 = offset 0~55일)
// ─────────────────────────────────────────────────────────────

const BASE_UTC = Date.UTC(2026, 9, 19); // 2026-10-19 (KST 달력 기준)
const TOTAL_DAYS = 56;

function dateKey(offset: number): string {
  const d = new Date(BASE_UTC - offset * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/** offset일 전, KST hour:minute → "+09:00" ISO 문자열 */
function iso(offset: number, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${dateKey(offset)}T${hh}:${mm}:00+09:00`;
}

// ─────────────────────────────────────────────────────────────
// 날짜별 날씨 (같은 날짜 = 같은 날씨)
// ─────────────────────────────────────────────────────────────

const rngWeather = mulberry32(20261019);
const weatherByDate = new Map<string, Weather>();
for (let o = TOTAL_DAYS - 1; o >= 0; o--) {
  weatherByDate.set(
    dateKey(o),
    pickWeighted<Weather>(rngWeather, [
      ["맑음", 50],
      ["흐림", 25],
      ["비", 17],
      ["강풍", 8],
    ])
  );
}
// 패턴 4(우천 미끄러짐)를 위해 최소 5일의 비 오는 날 보장
{
  const rainOffsets = [] as number[];
  for (let o = 0; o < TOTAL_DAYS; o++)
    if (weatherByDate.get(dateKey(o)) === "비") rainOffsets.push(o);
  const forced = [2, 5, 13, 24, 38];
  for (const f of forced) {
    if (rainOffsets.length >= 5) break;
    if (!rainOffsets.includes(f)) {
      weatherByDate.set(dateKey(f), "비");
      rainOffsets.push(f);
    }
  }
}
const weatherOf = (offset: number): Weather =>
  weatherByDate.get(dateKey(offset))!;

// ─────────────────────────────────────────────────────────────
// 원문 템플릿 (언어별 × 위험유형별), ko 번역 포함
// ─────────────────────────────────────────────────────────────

interface Tpl {
  raw: string;
  ko: string;
}
type TplBank = Partial<Record<ReporterLang, Tpl[]>>;

const t = (raw: string, ko: string): Tpl => ({ raw, ko });
const k = (raw: string): Tpl => ({ raw, ko: raw }); // 한국어 원문

const TEMPLATES: Record<HazardType, TplBank> = {
  추락: {
    ko: [
      k("족장 발판이 흔들려서 떨어질뻔함. 고정 클램프 하나 빠져있었음"),
      k("사다리 타고 내려오다 미끄러져서 중간에서 뛰어내림 ㅎㄷㄷ"),
      k("안전고리 걸 데가 없어서 그냥 작업함. 아래 보니까 아찔했음"),
      k("맨홀 커버 열려있는거 모르고 지나가다 빠질뻔 했음. 표시도 없음"),
      k("블록 위에서 이동하다가 개구부에 발 헛디딤. 덮개 안되있었음"),
    ],
    vi: [
      t(
        "Giàn giáo bị lỏng, suýt ngã từ tầng 2 xuống. Sợ quá.",
        "족장(비계)이 헐거워서 2단에서 떨어질 뻔했다. 너무 무서웠다."
      ),
      t(
        "Không có chỗ móc dây an toàn nên làm liều, suýt trượt chân rơi xuống.",
        "안전대를 걸 곳이 없어 그냥 작업하다가 발이 미끄러져 떨어질 뻔했다."
      ),
      t(
        "Nắp manhole mở mà không có rào chắn, suýt bước hụt xuống.",
        "맨홀 커버가 열려 있는데 방호울이 없어 헛디뎌 빠질 뻔했다."
      ),
    ],
    ne: [
      t(
        "माचानको फल्याक खुकुलो थियो, झन्डै तल खसें।",
        "족장 발판이 헐거워서 하마터면 아래로 떨어질 뻔했다."
      ),
      t(
        "सेफ्टी बेल्ट झुन्ड्याउने ठाउँ थिएन, डरलाग्दो थियो।",
        "안전벨트를 걸 곳이 없어서 아찔했다."
      ),
    ],
    uz: [
      t(
        "Lesa taxtasi bo'sh ekan, pastga yiqilib tushishimga sal qoldi.",
        "비계 발판이 헐거워서 아래로 떨어질 뻔했다."
      ),
    ],
    th: [
      t(
        "นั่งร้านหลวม เกือบตกลงมาจากชั้นสอง",
        "족장이 헐거워서 2단에서 떨어질 뻔했다."
      ),
      t(
        "ฝาแมนโฮลเปิดอยู่ ไม่มีป้ายเตือน เกือบตกลงไป",
        "맨홀 커버가 열려 있고 경고 표지도 없어 빠질 뻔했다."
      ),
    ],
    en: [
      t(
        "Scaffold plank was loose, almost fell from the 2nd level. No hook point for harness.",
        "족장 발판이 헐거워 2단에서 떨어질 뻔했다. 안전고리를 걸 곳도 없었다."
      ),
    ],
    id: [
      t(
        "Papan scaffolding goyang, hampir jatuh dari lantai dua.",
        "족장 발판이 흔들려서 2층에서 떨어질 뻔했다."
      ),
    ],
  },
  낙하: {
    ko: [
      k("위에서 그라인더 날 떨어짐. 바로 옆에 떨어져서 식겁함"),
      k("크레인으로 자재 올리는데 결속 와이어 한가닥 풀려있었음"),
      k("상부 족장에서 공구 떨어짐. 공구 낙하방지끈 안하고 있었음"),
      k("용접봉 통이 블록 위에서 떨어져서 바닥에 쏟아짐"),
    ],
    vi: [
      t(
        "Dụng cụ rơi từ trên cao xuống, may mà đội mũ bảo hộ.",
        "공구가 위에서 떨어졌는데 안전모를 써서 다행이었다."
      ),
      t(
        "Đang đi thì thanh sắt nhỏ rơi từ giàn giáo xuống ngay trước mặt.",
        "걷고 있는데 족장에서 작은 철재가 바로 앞에 떨어졌다."
      ),
    ],
    ne: [
      t(
        "माथिबाट औजार खस्यो, हेल्मेट लगाएकोले बाँचें।",
        "위에서 공구가 떨어졌는데 안전모 덕분에 살았다."
      ),
    ],
    uz: [
      t(
        "Tepadan asbob tushib ketdi, yonimga tushdi, qo'rqib ketdim.",
        "위에서 공구가 떨어져 내 옆에 떨어졌다. 깜짝 놀랐다."
      ),
    ],
    th: [
      t(
        "มีน็อตหล่นจากที่สูง ตกลงมาข้างๆ ตกใจมาก",
        "높은 곳에서 볼트가 떨어져 바로 옆에 떨어졌다. 깜짝 놀랐다."
      ),
    ],
    en: [
      t(
        "A hand tool dropped from the upper scaffold, landed right beside me.",
        "상부 족장에서 수공구가 떨어져 바로 옆에 떨어졌다."
      ),
    ],
    id: [
      t(
        "Ada baut jatuh dari atas, untung pakai helm.",
        "위에서 볼트가 떨어졌는데 안전모를 써서 다행이었다."
      ),
    ],
  },
  협착: {
    ko: [
      k("지게차 후진하는데 경보음 안울림. 뒤에 있다가 끼일뻔"),
      k("블록 턴오버할때 받침목 사이에 발 끼일뻔함"),
      k("중량물 내리는데 신호수 없이 하다가 손 낄뻔했음"),
      k("스풀 운반대차랑 벽 사이에 몸 낄뻔. 통로가 너무 좁음"),
    ],
    vi: [
      t(
        "Xe nâng lùi mà không có còi, suýt bị kẹp vào tường.",
        "지게차가 경고음 없이 후진해서 벽 사이에 끼일 뻔했다."
      ),
      t(
        "Hạ block xuống mà không có người ra hiệu, suýt kẹp tay.",
        "신호수 없이 블록을 내리다가 손이 끼일 뻔했다."
      ),
    ],
    ne: [
      t(
        "फोर्कलिफ्ट पछाडि सर्दा देखेन, झन्डै च्यापिएँ।",
        "지게차가 후진할 때 나를 못 봐서 하마터면 끼일 뻔했다."
      ),
    ],
    uz: [
      t(
        "Pogruzchik orqaga yurganda meni ko'rmadi, qisilib qolishimga oz qoldi.",
        "지게차가 후진하면서 나를 못 봐서 끼일 뻔했다."
      ),
    ],
    th: [
      t(
        "โฟล์คลิฟท์ถอยหลังไม่เห็นผม เกือบโดนหนีบ",
        "지게차가 후진하면서 나를 못 봐서 끼일 뻔했다."
      ),
    ],
    en: [
      t(
        "Forklift reversed without horn, almost got pinned against the wall.",
        "지게차가 경적 없이 후진해 벽에 끼일 뻔했다."
      ),
    ],
    id: [
      t(
        "Forklift mundur tanpa klakson, hampir kejepit.",
        "지게차가 클락션 없이 후진해서 끼일 뻔했다."
      ),
    ],
  },
  충돌: {
    ko: [
      k("트랜스포터가 코너에서 갑자기 나옴. 하마터면 치일뻔"),
      k("지게차랑 보행자 동선 겹쳐서 부딪힐뻔함. 통로 구분 없음"),
      k("자전거 타고 이동하다 트럭이랑 부딪힐뻔. 사각지대임"),
    ],
    vi: [
      t(
        "Transporter chạy nhanh ở góc cua, suýt đâm vào tôi.",
        "트랜스포터가 코너를 빨리 돌아서 나를 칠 뻔했다."
      ),
    ],
    ne: [
      t(
        "ट्रकले मलाई देखेन, झन्डै ठोक्कियो।",
        "트럭이 나를 못 봐서 하마터면 부딪힐 뻔했다."
      ),
    ],
    uz: [
      t(
        "Transporter burchakdan tez chiqdi, urib yuborishiga sal qoldi.",
        "트랜스포터가 코너에서 빨리 나와서 칠 뻔했다."
      ),
    ],
    th: [
      t(
        "รถทรานสปอร์ตเตอร์วิ่งเร็วตรงหัวมุม เกือบชนผม",
        "트랜스포터가 코너에서 빨리 달려서 나를 칠 뻔했다."
      ),
    ],
    en: [
      t(
        "Transporter came fast around the corner, almost hit me.",
        "트랜스포터가 코너에서 빨리 나와 나를 칠 뻔했다."
      ),
    ],
    id: [
      t(
        "Transporter ngebut di tikungan, hampir nabrak saya.",
        "트랜스포터가 코너에서 과속해 나를 칠 뻔했다."
      ),
    ],
  },
  "화재·폭발": {
    ko: [
      k("가우징 작업중 불티가 옆에 시너통 쪽으로 튐. 큰일날뻔"),
      k("용접하다가 뒤에 도장면에 불붙을뻔. 근처에 소화기도 없었음"),
      k("산소호스 연결부에서 가스새는 소리남. 비눗물 점검 안한듯"),
    ],
    vi: [
      t(
        "Tia lửa hàn bắn vào thùng sơn gần đó, suýt cháy.",
        "용접 불티가 근처 페인트통에 튀어 불이 날 뻔했다."
      ),
    ],
    ne: [
      t(
        "ग्यास होसबाट ग्यासको गन्ध आयो, डर लाग्यो।",
        "가스 호스에서 가스 냄새가 나서 무서웠다."
      ),
    ],
    uz: [
      t(
        "Payvand uchquni bo'yoq idishiga sachradi, yong'in chiqishiga oz qoldi.",
        "용접 불꽃이 페인트 통에 튀어 불이 날 뻔했다."
      ),
    ],
    th: [
      t(
        "สะเก็ดไฟเชื่อมกระเด็นไปถังทินเนอร์ เกือบไฟไหม้",
        "용접 불티가 시너통에 튀어 불이 날 뻔했다."
      ),
    ],
    en: [
      t(
        "Welding sparks flew near the thinner cans. Could have caught fire.",
        "용접 불티가 시너통 근처로 튀었다. 불이 날 뻔했다."
      ),
    ],
    id: [
      t(
        "Percikan las kena kaleng thinner, hampir kebakaran.",
        "용접 불티가 시너 캔에 튀어 불이 날 뻔했다."
      ),
    ],
  },
  질식: {
    ko: [
      k("탱크 안에서 도장하는데 환기팬 꺼져있어서 어지러웠음"),
      k("밀폐구역 들어갔는데 산소농도 측정 안하고 들어감. 머리 아팠음"),
      k("맨홀 안 작업중 환기호스가 중간에 꺾여있었음. 숨이 답답함"),
    ],
    vi: [
      t(
        "Sơn trong tank mà quạt thông gió hỏng, chóng mặt quá phải chạy ra.",
        "탱크 안에서 도장하는데 환기팬이 고장나서 너무 어지러워 뛰쳐나왔다."
      ),
    ],
    ne: [
      t(
        "ट्याङ्क भित्र हावा आएन, टाउको दुख्यो र रिंगटा लाग्यो।",
        "탱크 안에 환기가 안 되어 머리가 아프고 어지러웠다."
      ),
    ],
    uz: [
      t(
        "Tank ichida bo'yoq sepayotganda boshim aylanib qoldi, ventilyatsiya ishlamayapti.",
        "탱크 안에서 도장 중 어지러웠다. 환기장치가 작동하지 않는다."
      ),
    ],
    th: [
      t(
        "พ่นสีในแทงค์ พัดลมระบายอากาศเสีย เวียนหัวมาก",
        "탱크 안에서 도장하는데 환기팬이 고장나 너무 어지러웠다."
      ),
    ],
    en: [
      t(
        "Painting inside the tank, ventilation fan was off. Got dizzy, had to get out.",
        "탱크 내부 도장 중 환기팬이 꺼져 있었다. 어지러워서 나와야 했다."
      ),
    ],
    id: [
      t(
        "Ngecat di dalam tangki, blower mati, kepala pusing sekali.",
        "탱크 안에서 도장하는데 블로워가 꺼져 머리가 너무 어지러웠다."
      ),
    ],
  },
  감전: {
    ko: [
      k("용접기 홀더 피복 벗겨져있어서 손 찌릿함"),
      k("물 고인 바닥에 전선 지나가는데 피복 까져있음"),
      k("가설전등 소켓에 물 들어가서 스파크 튐"),
    ],
    vi: [
      t(
        "Dây điện máy hàn bị hở, chạm vào tê cả tay.",
        "용접기 전선 피복이 벗겨져 만졌다가 손이 찌릿했다."
      ),
    ],
    ne: [
      t(
        "वेल्डिङ मेसिनको तार खुला थियो, करेन्ट लाग्यो।",
        "용접기 전선이 노출되어 감전될 뻔했다."
      ),
    ],
    uz: [
      t(
        "Kabel ochilib qolgan ekan, tok urishiga sal qoldi.",
        "케이블 피복이 벗겨져 감전될 뻔했다."
      ),
    ],
    th: [
      t(
        "สายไฟเครื่องเชื่อมฉีก โดนช็อตที่มือ",
        "용접기 전선이 찢어져 손에 전기가 올랐다."
      ),
    ],
    en: [
      t(
        "Welder cable insulation torn, felt a shock on my hand.",
        "용접기 케이블 피복이 찢어져 손에 전기 충격을 느꼈다."
      ),
    ],
    id: [
      t(
        "Kabel las terkelupas, kena setrum di tangan.",
        "용접 케이블이 벗겨져 손에 감전됐다."
      ),
    ],
  },
  "절단·화상": {
    ko: [
      k("그라인더 날 깨지면서 파편 튐. 보안경 안썼으면 큰일났음"),
      k("취부하다가 달궈진 철판 모르고 잡아서 델뻔"),
      k("강판 모서리에 장갑 찢어지면서 손 베일뻔함"),
    ],
    vi: [
      t(
        "Đá mài vỡ, mảnh văng vào kính bảo hộ.",
        "그라인더 숫돌이 깨져 파편이 보안경에 튀었다."
      ),
    ],
    ne: [
      t(
        "ग्राइन्डर चलाउँदा आगोको झिल्का हातमा पर्‍यो।",
        "그라인더 작업 중 불꽃이 손에 튀었다."
      ),
    ],
    uz: [
      t(
        "Qizigan metallni bilmay ushlab oldim, qo'lim kuyishiga sal qoldi.",
        "달궈진 철판인 줄 모르고 잡아서 손을 델 뻔했다."
      ),
    ],
    th: [
      t(
        "ใบเจียรแตก เศษกระเด็นใส่แว่น",
        "그라인더 날이 깨져 파편이 보안경에 튀었다."
      ),
    ],
    en: [
      t(
        "Grinder disc broke and fragments hit my goggles.",
        "그라인더 디스크가 깨져 파편이 보안경에 맞았다."
      ),
    ],
    id: [
      t(
        "Pegang plat panas nggak tahu, hampir melepuh tangan.",
        "뜨거운 철판인 줄 모르고 잡아서 손을 델 뻔했다."
      ),
    ],
  },
  전도: {
    ko: [
      k("론지 사이 넘어가다 발 걸려서 넘어질뻔"),
      k("도크 바닥 기름때문에 미끄러짐. 엉덩방아 찧음"),
      k("케이블이 통로에 널려있어서 걸려 넘어짐"),
    ],
    vi: [
      t(
        "Sàn dính dầu, trượt chân ngã suýt đập đầu.",
        "바닥에 기름이 있어 미끄러져 머리를 부딪힐 뻔했다."
      ),
    ],
    ne: [
      t("भुइँमा केबल थियो, अल्झिएर लडें।", "바닥에 케이블이 있어 걸려 넘어졌다."),
    ],
    uz: [
      t("Pol moyli ekan, sirg'anib yiqildim.", "바닥에 기름이 있어 미끄러져 넘어졌다."),
    ],
    th: [
      t(
        "พื้นมีน้ำมัน ลื่นล้มเกือบหัวฟาดพื้น",
        "바닥에 기름이 있어 미끄러져 머리를 부딪힐 뻔했다."
      ),
    ],
    en: [
      t(
        "Floor was oily, slipped and almost hit my head.",
        "바닥에 기름이 있어 미끄러져 머리를 부딪힐 뻔했다."
      ),
    ],
    id: [
      t("Lantai licin kena oli, saya terpeleset.", "바닥이 기름에 미끄러워 넘어졌다."),
    ],
  },
  기타: {
    ko: [
      k("용접 흄 때문에 목이 따가움. 국소배기 안돌아감"),
      k("소음 너무 심한데 귀마개 지급 안됨"),
      k("조명 나가있어서 어두운데 작업 계속함. 위험함"),
    ],
    vi: [
      t(
        "Khói hàn nhiều quá mà không có quạt hút, khó thở.",
        "용접 흄이 너무 많은데 배기팬이 없어 숨쉬기 힘들다."
      ),
    ],
    ne: [t("धुलो धेरै छ, मास्क पनि छैन।", "분진이 너무 많은데 마스크도 없다.")],
    uz: [
      t(
        "Chang juda ko'p, niqob ham berilmadi.",
        "분진이 너무 많은데 마스크도 지급되지 않았다."
      ),
    ],
    th: [
      t("ควันเชื่อมเยอะมาก หายใจไม่ออก", "용접 흄이 너무 많아 숨을 쉴 수 없다."),
    ],
    en: [
      t(
        "Too much welding fume, exhaust fan not working.",
        "용접 흄이 너무 많은데 배기팬이 작동하지 않는다."
      ),
    ],
    id: [
      t(
        "Asap las banyak banget, nggak ada blower.",
        "용접 연기가 너무 많은데 블로워가 없다."
      ),
    ],
  },
};

// 패턴 전용 템플릿 ---------------------------------------------------------

/** P1: 1도크 크레인 인양 중 볼트·공구 낙하 */
const P1_TEMPLATES: { lang: ReporterLang; tpl: Tpl }[] = [
  { lang: "ko", tpl: k("골리앗으로 블록 인양중에 위에서 볼트 떨어짐. 밑에 사람 지나가고 있었는데 큰일날뻔") },
  { lang: "ko", tpl: k("크레인 인양할때 공구주머니에서 스패너 떨어짐. 3미터 옆에 떨어졌음") },
  { lang: "ko", tpl: k("인양중인 블록에서 볼트 두개 떨어지는거 봄. 하부 통제구역 설정 안되있었음") },
  { lang: "ko", tpl: k("탑재 작업 크레인 아래로 지나가는데 너트가 툭 떨어짐. 안전모 쓰고있어서 다행") },
  { lang: "ko", tpl: k("골리앗 인양중 취부용 피스 떨어짐. 줍줍하다가 또 떨어질까봐 무서웠음") },
  {
    lang: "vi",
    tpl: t(
      "Cẩu goliath đang nâng block, bu lông rơi xuống ngay lối đi bên dưới.",
      "골리앗 크레인이 블록을 인양하는 중 볼트가 아래 통로에 떨어졌다."
    ),
  },
  {
    lang: "vi",
    tpl: t(
      "Đang cẩu hàng thì cái cờ lê rơi từ trên xuống, suýt trúng đầu tôi.",
      "크레인 인양 중 렌치가 위에서 떨어져 내 머리에 맞을 뻔했다."
    ),
  },
  {
    lang: "th",
    tpl: t(
      "เครนโกไลแอทยกบล็อก มีน็อตหล่นลงมาใส่ทางเดิน",
      "골리앗 크레인이 블록을 인양하는데 볼트가 통로로 떨어졌다."
    ),
  },
  {
    lang: "ne",
    tpl: t(
      "गोलियाथ क्रेनले ब्लक उठाउँदा माथिबाट बोल्ट खस्यो।",
      "골리앗 크레인이 블록을 들어올릴 때 위에서 볼트가 떨어졌다."
    ),
  },
  {
    lang: "en",
    tpl: t(
      "During goliath crane lifting, a spanner fell from the block. No barricade below.",
      "골리앗 크레인 인양 중 블록에서 스패너가 떨어졌다. 하부에 통제 구역이 없었다."
    ),
  },
];

/** P2: LNGC 도장공장 탱크 내부 환기불량 질식 */
const P2_TEMPLATES: { lang: ReporterLang; tpl: Tpl }[] = [
  { lang: "ko", tpl: k("LNGC 탱크 안에서 도장중인데 환기 제대로 안됨. 어지럽고 메스꺼움") },
  { lang: "ko", tpl: k("탱크 들어간지 30분만에 머리 아파서 나옴. 송기마스크 수량 부족함") },
  { lang: "ko", tpl: k("카고탱크 하부 도장인데 환기덕트가 입구까지만 와있음. 안쪽은 공기 안통함") },
  {
    lang: "vi",
    tpl: t(
      "Sơn trong tank LNGC, quạt gió yếu quá, chóng mặt buồn nôn.",
      "LNGC 탱크 안에서 도장하는데 환기팬이 너무 약해서 어지럽고 메스꺼웠다."
    ),
  },
  {
    lang: "vi",
    tpl: t(
      "Mới vào tank 20 phút đã đau đầu, hình như thiếu ôxy.",
      "탱크에 들어간 지 20분 만에 머리가 아팠다. 산소가 부족한 것 같다."
    ),
  },
  {
    lang: "th",
    tpl: t(
      "พ่นสีในแทงค์ LNGC อากาศไม่พอ เวียนหัวคลื่นไส้",
      "LNGC 탱크 안에서 도장하는데 공기가 부족해 어지럽고 메스꺼웠다."
    ),
  },
  {
    lang: "uz",
    tpl: t(
      "LNGC tank ichida bo'yoq sepayotganda havo yetishmadi, ko'nglim aynidi.",
      "LNGC 탱크 안에서 도장 중 공기가 부족해 메스꺼웠다."
    ),
  },
];

/** P3: 강재적치장 야간 지게차·트랜스포터 협착/충돌 */
const P3_TEMPLATES: { lang: ReporterLang; tpl: Tpl }[] = [
  { lang: "ko", tpl: k("야간에 강재 불출하는데 지게차가 후진으로 옴. 조명 어두워서 못볼뻔") },
  { lang: "ko", tpl: k("밤 10시쯤 트랜스포터 지나가는데 신호수 없음. 바로 앞에서 겨우 멈춤") },
  { lang: "ko", tpl: k("야간작업중 지게차랑 트랜스포터 교차하는데 하마터면 사이에 낄뻔") },
  { lang: "ko", tpl: k("적치장 야간 조명 반이 나가있음. 지게차 기사도 사람 안보인다고함") },
  {
    lang: "vi",
    tpl: t(
      "Ban đêm xe nâng lùi trong bãi thép, đèn tối quá suýt bị kẹp.",
      "밤에 강재적치장에서 지게차가 후진했는데 조명이 어두워 끼일 뻔했다."
    ),
  },
  {
    lang: "vi",
    tpl: t(
      "Transporter chạy ca đêm không có người ra hiệu, suýt đâm vào tôi.",
      "야간에 트랜스포터가 신호수 없이 운행해서 나를 칠 뻔했다."
    ),
  },
  {
    lang: "ne",
    tpl: t(
      "रातको काममा फोर्कलिफ्टले देखेन, झन्डै ठोक्कियो। बत्ती कम छ।",
      "야간 작업 중 지게차가 나를 못 봐서 부딪힐 뻔했다. 조명이 부족하다."
    ),
  },
];

/** P3 주간용 */
const P3_DAY_TEMPLATES: { lang: ReporterLang; tpl: Tpl }[] = [
  { lang: "ko", tpl: k("강재 불출중에 지게차가 급하게 돌아서 부딪힐뻔함") },
  {
    lang: "vi",
    tpl: t(
      "Xe nâng quay đầu gấp trong bãi thép, suýt va vào tôi.",
      "강재적치장에서 지게차가 급하게 방향을 틀어 나와 부딪힐 뻔했다."
    ),
  },
  {
    lang: "ne",
    tpl: t(
      "स्टील यार्डमा ट्रान्सपोर्टर नजिकै आयो, झन्डै च्यापियो।",
      "강재 야드에서 트랜스포터가 가까이 와서 하마터면 끼일 뻔했다."
    ),
  },
];

/** P4: 의장안벽 우천 시 미끄러짐 추락 */
const P4_TEMPLATES: { lang: ReporterLang; tpl: Tpl }[] = [
  { lang: "ko", tpl: k("비와서 안벽 바닥 미끄러운데 현문사다리 내려오다 미끄러짐. 바다에 빠질뻔") },
  { lang: "ko", tpl: k("우천중 갑판 이동하다 쭉 미끄러짐. 하마터면 안벽 아래로 떨어질뻔") },
  { lang: "ko", tpl: k("비오는데 안벽 가장자리에 미끄럼방지 안되있음. 발 헛디뎌서 아찔했음") },
  {
    lang: "vi",
    tpl: t(
      "Trời mưa, cầu thang mạn tàu trơn quá, suýt trượt ngã xuống biển.",
      "비가 와서 현문 사다리가 너무 미끄러워 바다로 떨어질 뻔했다."
    ),
  },
  {
    lang: "th",
    tpl: t(
      "ฝนตก พื้นท่าเรือลื่นมาก เกือบตกลงทะเล",
      "비가 와서 안벽 바닥이 너무 미끄러워 바다에 빠질 뻔했다."
    ),
  },
  {
    lang: "en",
    tpl: t(
      "Raining, quay deck very slippery, almost slipped into the sea from the gangway.",
      "비가 와서 안벽 갑판이 매우 미끄러웠고, 현문에서 바다로 미끄러질 뻔했다."
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// 원인·조치·기타 텍스트
// ─────────────────────────────────────────────────────────────

const CAUSES: Record<HazardType, string[]> = {
  추락: ["족장 고정 상태 불량", "안전대 부착설비 미설치", "개구부 덮개·표지 미설치", "사다리 고정 불량"],
  낙하: ["인양물 결속 불량", "공구 낙하방지끈 미사용", "하부 통제구역 미설정", "소지품 관리 미흡"],
  협착: ["후진 경보장치 불량", "신호수 미배치", "작업 반경 내 접근 통제 미흡", "협소 통로 동선 미분리"],
  충돌: ["운반장비·보행자 동선 미분리", "사각지대 반사경 미설치", "야간 조명 불량", "제한속도 미준수"],
  "화재·폭발": ["불티 비산방지 조치 미흡", "인화물 격리 미흡", "가스 누설 점검 미실시", "소화기 미비치"],
  질식: ["환기장치 가동 불량", "산소농도 측정 미실시", "송기마스크 수량 부족", "밀폐공간 출입 절차 미준수"],
  감전: ["전선 피복 손상", "누전차단기 미설치", "가설전선 관리 불량", "접지 불량"],
  "절단·화상": ["연삭 숫돌 상태 불량", "보호구 미착용", "고온부 표시 미흡", "강재 모서리 보호 미흡"],
  전도: ["바닥 유류·이물질 방치", "통로 정리정돈 불량", "케이블 정리 미흡", "미끄럼방지 조치 미흡"],
  기타: ["국소배기장치 가동 불량", "보호구 지급 미흡", "조명 불량", "작업환경 관리 미흡"],
};

const ACTIONS: Record<HazardType, string[]> = {
  추락: ["족장 전수 점검 및 클램프 보강", "안전대 부착설비(생명줄) 설치", "개구부 덮개 설치 및 경고표지 부착"],
  낙하: ["인양 전 결속상태 2인 교차점검 시행", "공구 낙하방지끈 지급 및 착용 확인", "인양구간 하부 출입통제 라인 설치"],
  협착: ["후진 경보음·후방카메라 점검 정비", "중량물 작업 시 전담 신호수 배치", "협소구간 보행 금지 표시"],
  충돌: ["운반장비·보행자 동선 분리 라인 도색", "교차로 반사경·경광등 설치", "야간 조명 보강"],
  "화재·폭발": ["불티받이·방화포 설치 의무화", "인화물 별도 보관소 이동", "화기작업 전 가스농도 측정 시행"],
  질식: ["환기팬·덕트 상시 가동 확인 체계 도입", "밀폐공간 출입 전 산소농도 측정 의무화", "송기마스크 추가 배치"],
  감전: ["손상 전선 즉시 교체", "누전차단기 설치 및 접지 보강", "가설전선 가공(높이) 정리"],
  "절단·화상": ["숫돌 교체주기 관리대장 운영", "보호구 착용 TBM 시 상호확인", "고온부 경고표지 부착"],
  전도: ["작업장 바닥 유류 제거 및 청소 강화", "통로 케이블 트레이 정리", "미끄럼방지 테이프 부착"],
  기타: ["국소배기장치 수리 및 가동 점검", "보호구 재고 확보 및 지급", "조명 교체"],
};

// 구역 hazards 문자열 → 표준 hazardType 매핑
function hazardTypeFromText(s: string): HazardType {
  if (/추락|전락/.test(s)) return "추락";
  if (/낙하/.test(s)) return "낙하";
  if (/협착|끼임/.test(s)) return "협착";
  if (/충돌/.test(s)) return "충돌";
  if (/화재|폭발/.test(s)) return "화재·폭발";
  if (/질식|환기/.test(s)) return "질식";
  if (/감전/.test(s)) return "감전";
  if (/화상|절단|베임|비산/.test(s)) return "절단·화상";
  if (/전도/.test(s)) return "전도";
  return "기타";
}

// ─────────────────────────────────────────────────────────────
// 보고서 팩토리
// ─────────────────────────────────────────────────────────────

const rng = mulberry32(42);

const LANG_WEIGHTS: [ReporterLang, number][] = [
  ["ko", 45],
  ["vi", 20],
  ["ne", 10],
  ["uz", 8],
  ["th", 7],
  ["en", 5],
  ["id", 5],
];

function pickLang(r: Rng, allowed?: ReporterLang[]): ReporterLang {
  const pool = allowed
    ? LANG_WEIGHTS.filter(([l]) => allowed.includes(l))
    : LANG_WEIGHTS;
  return pickWeighted(r, pool);
}

function pickTemplate(hazard: HazardType, lang: ReporterLang, r: Rng): Tpl {
  const bank = TEMPLATES[hazard];
  const arr = bank[lang] ?? bank.ko!;
  return pick(r, arr);
}

function statusFor(offset: number, r: Rng): ReportStatus {
  if (offset >= 14)
    return pickWeighted(r, [["조치완료", 70], ["검토중", 20], ["접수", 10]]);
  if (offset >= 7)
    return pickWeighted(r, [["조치완료", 40], ["검토중", 40], ["접수", 20]]);
  return pickWeighted(r, [["접수", 50], ["검토중", 40], ["조치완료", 10]]);
}

interface MakeOpts {
  offset: number;
  hour: number;
  zoneId: number;
  hazardType: HazardType;
  lang?: ReporterLang;
  tpl?: Tpl;
  severity?: Severity;
}

type Draft = Omit<NearMissReport, "id">;
const drafts: Draft[] = [];
let photoSeq = 0;

function makeReport(o: MakeOpts): void {
  const zone = ZONES.find((z) => z.id === o.zoneId)!;
  let hour = o.hour;
  // 주차 경계(offset % 7 === 0)에서 18시 이후 보고는 주차 집계가 밀리므로 보정
  if (o.offset % 7 === 0 && hour >= 18) hour = 17;
  const lang = o.lang ?? pickLang(rng);
  const tpl = o.tpl ?? pickTemplate(o.hazardType, lang, rng);
  const severity =
    o.severity ??
    (pickWeighted(rng, [[1, 15], [2, 30], [3, 30], [4, 18], [5, 7]]) as Severity);
  const status = statusFor(o.offset, rng);
  const withPhoto = rng() < 0.22;
  const d: Draft = {
    createdAt: iso(o.offset, hour, randInt(rng, 0, 59)),
    zoneId: o.zoneId,
    reporterLang: lang,
    reporterAnonymous: rng() < 0.35,
    rawText: tpl.raw,
    translatedKo: tpl.ko,
    hazardType: o.hazardType,
    workType: pick(rng, zone.workTypes),
    severity,
    cause: pick(rng, CAUSES[o.hazardType]),
    status,
    weather: weatherOf(o.offset),
  };
  if (withPhoto) d.photoUrl = `/demo/photos/nearmiss-${++photoSeq % 20}.jpg`;
  if (status === "조치완료") d.actionTaken = pick(rng, ACTIONS[o.hazardType]);
  drafts.push(d);
}

function pickPatternTpl(
  r: Rng,
  bank: { lang: ReporterLang; tpl: Tpl }[]
): { lang: ReporterLang; tpl: Tpl } {
  const langs = [...new Set(bank.map((b) => b.lang))];
  const lang = pickLang(r, langs);
  const candidates = bank.filter((b) => b.lang === lang);
  return pick(r, candidates);
}

// ─────────────────────────────────────────────────────────────
// 패턴 1: 1도크(1) — 최근 7일 크레인 인양 낙하 7건 급증 (이전 주당 1건)
// ─────────────────────────────────────────────────────────────

{
  // 최근 7일: 7건
  const recentOffsets = [0, 1, 2, 3, 4, 5, 6];
  for (const off of recentOffsets) {
    const { lang, tpl } = pickPatternTpl(rng, P1_TEMPLATES);
    makeReport({
      offset: off,
      hour: randInt(rng, 8, 17),
      zoneId: 1,
      hazardType: "낙하",
      lang,
      tpl,
      severity: pickWeighted(rng, [[3, 40], [4, 45], [5, 15]]) as Severity,
    });
  }
  // 이전 7주: 주당 1건
  for (let w = 1; w <= 7; w++) {
    const { lang, tpl } = pickPatternTpl(rng, P1_TEMPLATES);
    makeReport({
      offset: 7 * w + randInt(rng, 0, 6),
      hour: randInt(rng, 8, 17),
      zoneId: 1,
      hazardType: "낙하",
      lang,
      tpl,
      severity: pickWeighted(rng, [[2, 30], [3, 50], [4, 20]]) as Severity,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 패턴 2: LNGC 도장공장(22) — 질식 4주 연속 증가 (1 → 2 → 3 → 5)
// ─────────────────────────────────────────────────────────────

{
  const weeklyCounts = [5, 3, 2, 1]; // week0(최근 7일) → week3
  weeklyCounts.forEach((count, week) => {
    for (let i = 0; i < count; i++) {
      const { lang, tpl } = pickPatternTpl(rng, P2_TEMPLATES);
      makeReport({
        offset: 7 * week + randInt(rng, 0, 6),
        hour: randInt(rng, 8, 17),
        zoneId: 22,
        hazardType: "질식",
        lang,
        tpl,
        severity: pickWeighted(rng, [[3, 50], [4, 50]]) as Severity,
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 패턴 3: 강재적치장(15) — 야간(20~24시) 협착·충돌 = 주간의 3배 (18 vs 6)
// ─────────────────────────────────────────────────────────────

{
  const nightPerWeek = [3, 2, 2, 2, 2, 2, 2, 3]; // 합 18
  const dayPerWeek = [1, 1, 1, 0, 1, 1, 1, 0]; // 합 6
  let alt = 0;
  for (let week = 0; week < 8; week++) {
    for (let i = 0; i < nightPerWeek[week]; i++) {
      const { lang, tpl } = pickPatternTpl(rng, P3_TEMPLATES);
      makeReport({
        offset: 7 * week + randInt(rng, 1, 6), // 주차 경계 보정 회피
        hour: randInt(rng, 20, 23),
        zoneId: 15,
        hazardType: alt++ % 2 === 0 ? "협착" : "충돌",
        lang,
        tpl,
        severity: pickWeighted(rng, [[3, 40], [4, 45], [5, 15]]) as Severity,
      });
    }
    for (let i = 0; i < dayPerWeek[week]; i++) {
      const { lang, tpl } = pickPatternTpl(rng, P3_DAY_TEMPLATES);
      makeReport({
        offset: 7 * week + randInt(rng, 0, 6),
        hour: randInt(rng, 9, 17),
        zoneId: 15,
        hazardType: alt++ % 2 === 0 ? "협착" : "충돌",
        lang,
        tpl,
        severity: pickWeighted(rng, [[2, 30], [3, 50], [4, 20]]) as Severity,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 패턴 4: 의장안벽(9) — 비 오는 날 미끄러짐 추락 집중
// ─────────────────────────────────────────────────────────────

{
  const rainOffsets: number[] = [];
  for (let o = 0; o < TOTAL_DAYS; o++)
    if (weatherOf(o) === "비") rainOffsets.push(o);
  // 비 오는 날에 9건 (순환 배치)
  for (let i = 0; i < 9; i++) {
    const off = rainOffsets[i % rainOffsets.length];
    const { lang, tpl } = pickPatternTpl(rng, P4_TEMPLATES);
    makeReport({
      offset: off,
      hour: randInt(rng, 8, 17),
      zoneId: 9,
      hazardType: "추락",
      lang,
      tpl,
      severity: pickWeighted(rng, [[3, 50], [4, 40], [5, 10]]) as Severity,
    });
  }
  // 맑은 날 1건 (대비용)
  const clearOffsets: number[] = [];
  for (let o = 0; o < TOTAL_DAYS; o++)
    if (weatherOf(o) === "맑음") clearOffsets.push(o);
  makeReport({
    offset: clearOffsets[Math.floor(clearOffsets.length / 2)],
    hour: 14,
    zoneId: 9,
    hazardType: "추락",
    lang: "ko",
    tpl: k("현문사다리 올라가다 발 헛디딤. 난간 잡아서 괜찮았음"),
    severity: 2,
  });
}

// ─────────────────────────────────────────────────────────────
// 패턴 5: 사무·교육 구역(3,4,7,8) — 거의 없음 (총 3건, 경미)
// ─────────────────────────────────────────────────────────────

{
  makeReport({
    offset: 31,
    hour: 10,
    zoneId: 3,
    hazardType: "기타",
    lang: "ko",
    tpl: k("실습장 그라인더 커버 헐거워져있음. 조이고 사용함"),
    severity: 1,
  });
  makeReport({
    offset: 18,
    hour: 15,
    zoneId: 7,
    hazardType: "전도",
    lang: "ko",
    tpl: k("식당 앞 계단 물기때문에 미끄러질뻔"),
    severity: 1,
  });
  makeReport({
    offset: 44,
    hour: 11,
    zoneId: 8,
    hazardType: "질식",
    lang: "ko",
    tpl: k("처리조 점검구 열었는데 냄새 심함. 측정기 들고 다시 가기로함"),
    severity: 2,
  });
}

// ─────────────────────────────────────────────────────────────
// 배경 보고서 (나머지 구역, 250건 채우기)
// ─────────────────────────────────────────────────────────────

const TARGET_TOTAL = 250;
{
  // 패턴 구역별로 패턴과 겹치는 위험유형은 배경에서 제외 (패턴 왜곡 방지)
  const EXCLUDED: Record<number, HazardType[]> = {
    1: ["낙하"],
    9: ["추락"],
    15: ["협착", "충돌"],
    22: ["질식"],
  };
  const pool = ZONES.filter((z) => ![3, 4, 7, 8].includes(z.id));
  const zoneWeights: [Zone, number][] = pool.map((z) => [z, z.headcount]);

  while (drafts.length < TARGET_TOTAL) {
    const zone = pickWeighted(rng, zoneWeights);
    const candidates = zone.hazards
      .map(hazardTypeFromText)
      .filter((h) => !(EXCLUDED[zone.id] ?? []).includes(h));
    if (candidates.length === 0) continue;
    const hazardType = pick(rng, candidates);
    const offset = randInt(rng, 0, TOTAL_DAYS - 1);
    const hour = pickWeighted(rng, [
      [randInt(rng, 7, 11), 40],
      [randInt(rng, 12, 17), 45],
      [randInt(rng, 18, 22), 15],
    ]);
    makeReport({ offset, hour, zoneId: zone.id, hazardType });
  }
}

// ─────────────────────────────────────────────────────────────
// 정렬·ID 부여·저장
// ─────────────────────────────────────────────────────────────

drafts.sort(
  (a, b) => a.createdAt.localeCompare(b.createdAt) || a.zoneId - b.zoneId
);
const reports: NearMissReport[] = drafts.map((d, i) => ({
  id: `NM-${String(i + 1).padStart(4, "0")}`,
  ...d,
}));

const outDir = path.join(process.cwd(), "data", "seed");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "reports.json");
fs.writeFileSync(outPath, JSON.stringify(reports, null, 2) + "\n", "utf8");

// ─────────────────────────────────────────────────────────────
// 검증 출력: 구역 × 주차 건수 표 + 패턴 요약
// ─────────────────────────────────────────────────────────────

const NOW_MS = Date.parse("2026-10-19T18:00:00+09:00");
const weekOf = (r: NearMissReport) =>
  Math.floor((NOW_MS - Date.parse(r.createdAt)) / (7 * 86400000));

console.log(`\n✅ ${reports.length}건 생성 → data/seed/reports.json\n`);
console.log("구역 × 주차 건수 (W-7 = 7주 전, W-0 = 최근 7일)\n");

const header =
  "구역".padEnd(4) +
  ["W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "W-0"]
    .map((h) => h.padStart(5))
    .join("") +
  "  합계".padStart(6) +
  "  구역명";
console.log(header);
console.log("-".repeat(78));

for (const zone of ZONES) {
  const zr = reports.filter((r) => r.zoneId === zone.id);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const w = 7 - i; // W-7 → W-0
    return zr.filter((r) => weekOf(r) === w).length;
  });
  const line =
    String(zone.id).padEnd(4) +
    weeks.map((c) => String(c).padStart(5)).join("") +
    String(zr.length).padStart(6) +
    "   " +
    zone.name;
  console.log(line);
}

console.log("\n── 패턴 검증 ──────────────────────────────");
{
  const z1 = reports.filter((r) => r.zoneId === 1 && r.hazardType === "낙하");
  const recent = z1.filter((r) => weekOf(r) === 0).length;
  const prior = z1.filter((r) => weekOf(r) >= 1 && weekOf(r) <= 4).length;
  console.log(
    `P1 1도크 낙하: 최근 7일 ${recent}건 vs 이전 4주 평균 ${(prior / 4).toFixed(2)}건/주`
  );

  const z22 = reports.filter((r) => r.zoneId === 22 && r.hazardType === "질식");
  const w = [3, 2, 1, 0].map(
    (wk) => z22.filter((r) => weekOf(r) === wk).length
  );
  console.log(`P2 LNGC(22) 질식 주별(과거→최근): ${w.join(" → ")}`);

  const z15 = reports.filter(
    (r) =>
      r.zoneId === 15 && (r.hazardType === "협착" || r.hazardType === "충돌")
  );
  const night = z15.filter((r) => isNightHour(kstHour(r.createdAt))).length;
  const day = z15.length - night;
  console.log(
    `P3 강재적치장(15) 협착·충돌: 야간 ${night}건 vs 주간 ${day}건 (${(night / Math.max(day, 1)).toFixed(1)}배)`
  );

  const z9 = reports.filter((r) => r.zoneId === 9 && r.hazardType === "추락");
  const rain = z9.filter((r) => r.weather === "비").length;
  console.log(`P4 의장안벽(9) 추락: 비 ${rain}건 / 기타 날씨 ${z9.length - rain}건`);

  const office = reports.filter((r) => [3, 4, 7, 8].includes(r.zoneId)).length;
  console.log(`P5 사무·교육(3,4,7,8): 총 ${office}건`);

  const langCount = new Map<string, number>();
  for (const r of reports)
    langCount.set(r.reporterLang, (langCount.get(r.reporterLang) ?? 0) + 1);
  const langStr = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([l, c]) => `${l}:${((c / reports.length) * 100).toFixed(0)}%`)
    .join(" ");
  console.log(`언어 비율: ${langStr}`);
  const rainDays = [...weatherByDate.values()].filter((v) => v === "비").length;
  console.log(`날씨: 비 오는 날 ${rainDays}일 / ${TOTAL_DAYS}일`);
}
