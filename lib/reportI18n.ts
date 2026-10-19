/**
 * 근로자 보고 화면 다국어 사전 (ko/vi/ne/uz/th/id/en).
 * 번역 품질이 데모 체감에 직결되므로 기계적 축약 없이 자연스러운 문장으로 유지.
 */

import type { HazardType, ReporterLang } from "./domain";

export const LANG_META: {
  code: ReporterLang;
  flag: string;
  native: string;
  /** Web Speech API 로케일 */
  speech: string;
}[] = [
  { code: "ko", flag: "🇰🇷", native: "한국어", speech: "ko-KR" },
  { code: "vi", flag: "🇻🇳", native: "Tiếng Việt", speech: "vi-VN" },
  { code: "ne", flag: "🇳🇵", native: "नेपाली", speech: "ne-NP" },
  { code: "uz", flag: "🇺🇿", native: "Oʻzbekcha", speech: "uz-UZ" },
  { code: "th", flag: "🇹🇭", native: "ไทย", speech: "th-TH" },
  { code: "id", flag: "🇮🇩", native: "Bahasa Indonesia", speech: "id-ID" },
  { code: "en", flag: "🇬🇧", native: "English", speech: "en-US" },
];

export interface ReportStrings {
  appTitle: string;
  tagline: string;
  reportingAt: string; // {zone} 치환
  zoneUnknown: string;
  speak: string;
  holdToRecord: string;
  recording: string;
  photo: string;
  write: string;
  textPlaceholder: string;
  hazardOptional: string;
  anonymous: string;
  send: string;
  sending: string;
  confirmTitle: string;
  hazardLabel: string;
  severityLabel: string;
  zoneLabel: string;
  summaryLabel: string;
  thanks: string;
  points: string;
  another: string;
  errRetry: string;
  micDenied: string;
  photoAttached: string;
  needContent: string;
}

export const STRINGS: Record<ReporterLang, ReportStrings> = {
  ko: {
    appTitle: "아차사고 보고",
    tagline: "10초면 충분해요",
    reportingAt: "{zone}에서 보고 중",
    zoneUnknown: "구역 미지정",
    speak: "말로 보고",
    holdToRecord: "버튼을 누르고 있는 동안 말하세요",
    recording: "듣고 있어요…",
    photo: "사진",
    write: "글로 쓰기",
    textPlaceholder: "무슨 일이 있었나요? 짧게 써주세요",
    hazardOptional: "위험 유형 (선택)",
    anonymous: "익명으로 보고",
    send: "보내기",
    sending: "보내는 중…",
    confirmTitle: "AI가 이렇게 정리했어요",
    hazardLabel: "위험 유형",
    severityLabel: "심각도",
    zoneLabel: "구역",
    summaryLabel: "내용",
    thanks: "고마워요! 덕분에 현장이 안전해져요",
    points: "+10 포인트",
    another: "한 건 더 보고하기",
    errRetry: "전송에 실패했어요. 다시 시도해주세요",
    micDenied: "마이크를 쓸 수 없어요. 글로 써주세요",
    photoAttached: "사진 1장 첨부됨",
    needContent: "말, 사진, 글 중 하나로 알려주세요",
  },
  vi: {
    appTitle: "Báo cáo suýt tai nạn",
    tagline: "Chỉ cần 10 giây",
    reportingAt: "Đang báo cáo tại {zone}",
    zoneUnknown: "Chưa chọn khu vực",
    speak: "Nói để báo cáo",
    holdToRecord: "Giữ nút và nói",
    recording: "Đang nghe…",
    photo: "Chụp ảnh",
    write: "Viết chữ",
    textPlaceholder: "Đã xảy ra chuyện gì? Viết ngắn gọn",
    hazardOptional: "Loại nguy hiểm (tùy chọn)",
    anonymous: "Báo cáo ẩn danh",
    send: "Gửi",
    sending: "Đang gửi…",
    confirmTitle: "AI đã tóm tắt như sau",
    hazardLabel: "Loại nguy hiểm",
    severityLabel: "Mức độ",
    zoneLabel: "Khu vực",
    summaryLabel: "Nội dung",
    thanks: "Cảm ơn bạn! Nhờ bạn mà công trường an toàn hơn",
    points: "+10 điểm",
    another: "Báo cáo thêm",
    errRetry: "Gửi thất bại. Vui lòng thử lại",
    micDenied: "Không dùng được micro. Hãy viết chữ nhé",
    photoAttached: "Đã đính kèm 1 ảnh",
    needContent: "Hãy cho biết bằng lời nói, ảnh hoặc chữ",
  },
  ne: {
    appTitle: "झन्डै-दुर्घटना रिपोर्ट",
    tagline: "१० सेकेन्ड मात्र लाग्छ",
    reportingAt: "{zone}बाट रिपोर्ट गर्दै",
    zoneUnknown: "क्षेत्र छानिएको छैन",
    speak: "बोलेर रिपोर्ट",
    holdToRecord: "बटन थिचिराखेर बोल्नुहोस्",
    recording: "सुन्दै छु…",
    photo: "फोटो",
    write: "लेखेर",
    textPlaceholder: "के भयो? छोटोमा लेख्नुहोस्",
    hazardOptional: "खतराको प्रकार (वैकल्पिक)",
    anonymous: "नाम नखुलाई रिपोर्ट",
    send: "पठाउनुहोस्",
    sending: "पठाउँदै…",
    confirmTitle: "AI ले यसरी मिलायो",
    hazardLabel: "खतराको प्रकार",
    severityLabel: "गम्भीरता",
    zoneLabel: "क्षेत्र",
    summaryLabel: "विवरण",
    thanks: "धन्यवाद! तपाईंले साइट सुरक्षित बनाउनुभयो",
    points: "+१० अंक",
    another: "अर्को रिपोर्ट गर्ने",
    errRetry: "पठाउन सकिएन। फेरि प्रयास गर्नुहोस्",
    micDenied: "माइक चलेन। लेखेर भन्नुहोस्",
    photoAttached: "१ फोटो जोडियो",
    needContent: "बोली, फोटो वा लेखेर बताउनुहोस्",
  },
  uz: {
    appTitle: "Xavfli holat hisoboti",
    tagline: "Atigi 10 soniya kifoya",
    reportingAt: "{zone}dan xabar berilmoqda",
    zoneUnknown: "Hudud tanlanmagan",
    speak: "Gapirib xabar berish",
    holdToRecord: "Tugmani bosib turib gapiring",
    recording: "Eshitmoqdaman…",
    photo: "Rasm",
    write: "Yozish",
    textPlaceholder: "Nima bo'ldi? Qisqa yozing",
    hazardOptional: "Xavf turi (ixtiyoriy)",
    anonymous: "Anonim xabar",
    send: "Yuborish",
    sending: "Yuborilmoqda…",
    confirmTitle: "AI shunday tartibga keltirdi",
    hazardLabel: "Xavf turi",
    severityLabel: "Jiddiylik",
    zoneLabel: "Hudud",
    summaryLabel: "Mazmuni",
    thanks: "Rahmat! Siz tufayli maydon xavfsizroq bo'ladi",
    points: "+10 ball",
    another: "Yana xabar berish",
    errRetry: "Yuborilmadi. Qayta urinib ko'ring",
    micDenied: "Mikrofon ishlamadi. Yozib yuboring",
    photoAttached: "1 ta rasm biriktirildi",
    needContent: "Gapirib, rasm yoki yozib xabar bering",
  },
  th: {
    appTitle: "รายงานเหตุเกือบเกิดอุบัติเหตุ",
    tagline: "ใช้เวลาแค่ 10 วินาที",
    reportingAt: "กำลังรายงานจาก {zone}",
    zoneUnknown: "ยังไม่เลือกพื้นที่",
    speak: "พูดเพื่อรายงาน",
    holdToRecord: "กดปุ่มค้างไว้แล้วพูด",
    recording: "กำลังฟัง…",
    photo: "ถ่ายรูป",
    write: "พิมพ์ข้อความ",
    textPlaceholder: "เกิดอะไรขึ้น? เขียนสั้นๆ",
    hazardOptional: "ประเภทอันตราย (ไม่บังคับ)",
    anonymous: "รายงานแบบไม่ระบุชื่อ",
    send: "ส่ง",
    sending: "กำลังส่ง…",
    confirmTitle: "AI สรุปให้ดังนี้",
    hazardLabel: "ประเภทอันตราย",
    severityLabel: "ความรุนแรง",
    zoneLabel: "พื้นที่",
    summaryLabel: "รายละเอียด",
    thanks: "ขอบคุณ! คุณช่วยให้ไซต์งานปลอดภัยขึ้น",
    points: "+10 แต้ม",
    another: "รายงานอีกครั้ง",
    errRetry: "ส่งไม่สำเร็จ กรุณาลองใหม่",
    micDenied: "ใช้ไมค์ไม่ได้ กรุณาพิมพ์แทน",
    photoAttached: "แนบรูป 1 รูปแล้ว",
    needContent: "กรุณาบอกด้วยเสียง รูป หรือข้อความ",
  },
  id: {
    appTitle: "Laporan nyaris celaka",
    tagline: "Cukup 10 detik saja",
    reportingAt: "Melapor dari {zone}",
    zoneUnknown: "Zona belum dipilih",
    speak: "Lapor dengan suara",
    holdToRecord: "Tahan tombol sambil bicara",
    recording: "Mendengarkan…",
    photo: "Foto",
    write: "Tulis",
    textPlaceholder: "Apa yang terjadi? Tulis singkat saja",
    hazardOptional: "Jenis bahaya (opsional)",
    anonymous: "Lapor anonim",
    send: "Kirim",
    sending: "Mengirim…",
    confirmTitle: "AI merangkum seperti ini",
    hazardLabel: "Jenis bahaya",
    severityLabel: "Tingkat",
    zoneLabel: "Zona",
    summaryLabel: "Isi",
    thanks: "Terima kasih! Berkat Anda lokasi kerja lebih aman",
    points: "+10 poin",
    another: "Lapor lagi",
    errRetry: "Gagal mengirim. Silakan coba lagi",
    micDenied: "Mikrofon tidak bisa dipakai. Silakan tulis",
    photoAttached: "1 foto terlampir",
    needContent: "Beri tahu lewat suara, foto, atau tulisan",
  },
  en: {
    appTitle: "Near-Miss Report",
    tagline: "It only takes 10 seconds",
    reportingAt: "Reporting from {zone}",
    zoneUnknown: "No zone selected",
    speak: "Speak to report",
    holdToRecord: "Hold the button and speak",
    recording: "Listening…",
    photo: "Photo",
    write: "Type it",
    textPlaceholder: "What happened? Keep it short",
    hazardOptional: "Hazard type (optional)",
    anonymous: "Report anonymously",
    send: "Send",
    sending: "Sending…",
    confirmTitle: "Here's how AI structured it",
    hazardLabel: "Hazard type",
    severityLabel: "Severity",
    zoneLabel: "Zone",
    summaryLabel: "Summary",
    thanks: "Thank you! You just made the yard safer",
    points: "+10 points",
    another: "Report another",
    errRetry: "Failed to send. Please try again",
    micDenied: "Microphone unavailable. Please type instead",
    photoAttached: "1 photo attached",
    needContent: "Tell us by voice, photo, or text",
  },
};

/** 위험유형 아이콘 + 7개 언어 라벨 */
export const HAZARD_UI: {
  type: HazardType;
  icon: string;
  labels: Record<ReporterLang, string>;
}[] = [
  {
    type: "추락",
    icon: "🪜",
    labels: {
      ko: "추락",
      vi: "Ngã cao",
      ne: "खस्नु",
      uz: "Yiqilish",
      th: "ตกจากที่สูง",
      id: "Jatuh",
      en: "Fall",
    },
  },
  {
    type: "낙하",
    icon: "📦",
    labels: {
      ko: "낙하물",
      vi: "Vật rơi",
      ne: "सामान खस्नु",
      uz: "Jism tushishi",
      th: "ของตกใส่",
      id: "Kejatuhan benda",
      en: "Falling object",
    },
  },
  {
    type: "협착",
    icon: "🗜️",
    labels: {
      ko: "끼임",
      vi: "Bị kẹt",
      ne: "च्यापिनु",
      uz: "Qisilish",
      th: "ถูกหนีบ",
      id: "Terjepit",
      en: "Caught",
    },
  },
  {
    type: "충돌",
    icon: "🚧",
    labels: {
      ko: "충돌",
      vi: "Va chạm",
      ne: "ठक्कर",
      uz: "To'qnashuv",
      th: "ชนกัน",
      id: "Tabrakan",
      en: "Collision",
    },
  },
  {
    type: "화재·폭발",
    icon: "🔥",
    labels: {
      ko: "화재·폭발",
      vi: "Cháy nổ",
      ne: "आगो",
      uz: "Yong'in",
      th: "ไฟไหม้",
      id: "Kebakaran",
      en: "Fire",
    },
  },
  {
    type: "질식",
    icon: "😵",
    labels: {
      ko: "질식·어지러움",
      vi: "Ngạt khí",
      ne: "निसास्सिनु",
      uz: "Bo'g'ilish",
      th: "ขาดอากาศ",
      id: "Sesak napas",
      en: "Suffocation",
    },
  },
  {
    type: "감전",
    icon: "⚡",
    labels: {
      ko: "감전",
      vi: "Điện giật",
      ne: "करेन्ट",
      uz: "Tok urishi",
      th: "ไฟดูด",
      id: "Tersengat listrik",
      en: "Electric shock",
    },
  },
  {
    type: "절단·화상",
    icon: "🩹",
    labels: {
      ko: "베임·화상",
      vi: "Đứt/bỏng",
      ne: "काटिनु/जल्नु",
      uz: "Kesilish/kuyish",
      th: "บาด/ไหม้",
      id: "Terpotong/terbakar",
      en: "Cut/Burn",
    },
  },
  {
    type: "전도",
    icon: "💦",
    labels: {
      ko: "미끄러짐",
      vi: "Trượt ngã",
      ne: "चिप्लिनु",
      uz: "Sirpanish",
      th: "ลื่นล้ม",
      id: "Terpeleset",
      en: "Slip/Trip",
    },
  },
  {
    type: "기타",
    icon: "❓",
    labels: {
      ko: "기타",
      vi: "Khác",
      ne: "अन्य",
      uz: "Boshqa",
      th: "อื่นๆ",
      id: "Lainnya",
      en: "Other",
    },
  },
];

export function hazardLabel(type: string, lang: ReporterLang): string {
  return HAZARD_UI.find((h) => h.type === type)?.labels[lang] ?? type;
}
