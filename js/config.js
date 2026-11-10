/* ================================================================
   심리 마케팅 (Psychology Marketing) — 환경 설정
   ----------------------------------------------------------------
   ⬇️ 아래는 "더미 키"입니다. 실제 키를 발급받아 값만 교체하면
      해당 기능이 자동으로 활성화됩니다. (발급 방법: SETUP_GUIDE.md)
   더미 키 상태에서는 간편가입이 데모 모드로, 생성이 내장
   심리 엔진으로 안전하게 동작합니다.
   ================================================================ */
window.PM_CONFIG = {
  // [카카오 로그인] 카카오 개발자센터(developers.kakao.com)
  //  → 내 애플리케이션 → 앱 키 → "REST API 키"로 교체.
  //  콘솔에서 ①Web 플랫폼 등록 ②카카오 로그인 활성화
  //  ③Redirect URI 등록(예: https://내도메인/) ④Client Secret "사용 안 함" 확인.
  //  서버 없이 동작하는 리다이렉트 방식이라 정적 사이트에서 바로 작동합니다.
  KAKAO_REST_API_KEY: 'DUMMY_KAKAO_REST_API_KEY_REPLACE_ME',

  // [구글 로그인] Google Cloud Console → API 및 서비스 → 사용자 인증 정보
  //  → "OAuth 2.0 클라이언트 ID(웹 애플리케이션)"로 교체.
  //  "승인된 JavaScript 원본"에 배포 도메인 등록 필수.
  GOOGLE_CLIENT_ID: 'DUMMY_GOOGLE_CLIENT_ID_REPLACE_ME.apps.googleusercontent.com',

  // [생성형 AI 연동(선택)] Google AI Studio(aistudio.google.com/apikey)
  //  무료 발급 키로 교체 시 내장 엔진 대신 실제 AI가 작성.
  //  대시보드 → 설정 화면에서 사용자가 직접 입력할 수도 있습니다.
  GEMINI_API_KEY: 'DUMMY_GEMINI_API_KEY_REPLACE_ME',
  GEMINI_MODEL: 'gemini-2.5-flash', // 호출 실패 시 gemini-flash-latest로 자동 재시도

  // [신청 접수 이메일] 가게/크루 신청서가 도착할 이메일 주소로 교체하세요.
  // 더미 상태에서는 신청 내용이 "복사 모드"로 동작합니다(복사해서 문자·카톡으로 전달).
  CONTACT_EMAIL: 'DUMMY_CONTACT_EMAIL_REPLACE_ME@example.com',

  // [응답 시간 약속] 신청 양식 안내 문구에 쓰입니다. 실제로 지킬 수 있는 시간으로 유지하세요.
  RESPONSE_PROMISE: '영업일 기준 2일 안에',

  APP_NAME: '심리마케팅',
  COMPANY: '고래싸움에 성장하는 새우들',
  CEO: '홍성현',
  VERSION: '3.0.0',
};

/* ----------------------------------------------------------------
   더미(플레이스홀더) 키 안전장치 — 수정하지 마세요.
   'DUMMY' / 'REPLACE' / 'YOUR_' 가 포함된 값은 "미설정"으로 간주해
   런타임에서 비워 둡니다. 실제 키로 교체하는 순간 자동 활성화됩니다.
   ---------------------------------------------------------------- */
(function () {
  var isDummy = function (v) { return !v || /DUMMY|REPLACE|YOUR_/i.test(String(v)); };
  ['KAKAO_REST_API_KEY', 'GOOGLE_CLIENT_ID', 'GEMINI_API_KEY', 'CONTACT_EMAIL'].forEach(function (k) {
    if (isDummy(window.PM_CONFIG[k])) window.PM_CONFIG[k] = '';
  });
})();
