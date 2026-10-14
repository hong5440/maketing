# 🧠 심리 마케팅 (Psychology Marketing) v2.0

> 고객의 마음을 읽는 AI 마케팅 솔루션 — 행동심리학 기반 4가지 AI 도구를 탑재한 마케팅 홈페이지.
> 모든 비주얼(히어로/모바일 영상)은 **Seedance 2.5**(시댄스, Higgsfield)로 생성했습니다.

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| ✅ 로그인 | 이메일 가입/로그인 + **카카오톡·구글 간편가입** (키 미설정 시 데모 모드, 키 설정 시 실제 OAuth) |
| ✅ 대시보드 | 사용 통계 · 도구 바로가기 · 최근 결과 · 오늘의 심리 트리거 |
| ✅ 심리분석 AI | 타겟 심리 프로파일, 구매 동기/장벽, 12가지 심리 트리거 추천, 구매 여정 전략, 실행 체크리스트 |
| ✅ 플레이스 자동화 | 플레이스 소개글 2종, 대표 키워드 15개, 4주 소식 플랜, 리뷰 답글 템플릿 3종, 방문 유도 문구 |
| ✅ 광고 생성 | 채널별(인스타/네이버/당근/카카오/페북/유튜브) 헤드라인 10개, 카피 3종, CTA, 해시태그, A/B 가이드 |
| ✅ 성과 분석 | CTR·CVR·CPC·CPA·ROAS 자동 계산, 벤치마크 등급, 병목 진단, 심리학 처방전, 개선 시뮬레이션 |
| ✅ 결과물 복사 | 섹션별 복사 + 전체 복사 버튼, 히스토리 자동 저장(50개) 및 재복사 |
| ✅ 모바일 최적화 | 반응형 레이아웃, 모바일 하단 탭 내비게이션, 터치 타겟/safe-area 대응 |

## 🚀 실행 방법

빌드가 필요 없는 순수 정적 사이트입니다.

```bash
# 아무 정적 서버로 열면 끝
npx serve .          # 또는
python3 -m http.server 8000
```

- `index.html` — 랜딩 페이지 (30초 체험 데모 포함, 로그인 불필요)
- `dashboard.html` — 로그인 후 사용하는 대시보드 (미로그인 시 자동으로 랜딩의 로그인 창으로 이동)

GitHub Pages에 그대로 배포 가능합니다 (Settings → Pages → 브랜치 선택).

## 🤖 AI 생성 방식

- **기본: 내장 심리 엔진 2.0** — 12가지 심리 트리거 × 12개 업종 지식 베이스 × 연령대 심리 데이터 기반의 생성 엔진. 서버·API 키 없이 완전 오프라인으로 동작합니다. 같은 입력이면 같은 결과, "다시 생성"을 누르면 변형이 나옵니다.
- **선택: Gemini 연동** — `대시보드 → 설정`에서 [Google AI Studio](https://aistudio.google.com/apikey) 무료 API 키를 입력하면 4가지 도구 모두 실제 생성형 AI가 작성합니다. (키는 브라우저 localStorage에만 저장, 실패 시 내장 엔진으로 자동 폴백)

## 🔐 API 키 (현재: 더미 키 상태)

`js/config.js`에는 자리만 잡아 둔 **더미 키**가 들어 있습니다. 더미 키 상태에서는 간편가입이 데모 모드로, 생성이 내장 엔진으로 안전하게 동작하며(안전장치 내장), 나중에 실제 키로 **값만 교체하면 자동 활성화**됩니다.

```js
window.PM_CONFIG = {
  KAKAO_REST_API_KEY: 'DUMMY_KAKAO_REST_API_KEY_REPLACE_ME', // ← developers.kakao.com의 REST API 키로 교체
  GOOGLE_CLIENT_ID: 'DUMMY_GOOGLE_CLIENT_ID_REPLACE_ME.apps.googleusercontent.com', // ← OAuth 클라이언트 ID로 교체
  GEMINI_API_KEY: 'DUMMY_GEMINI_API_KEY_REPLACE_ME',         // ← (선택) aistudio.google.com 키로 교체
  ...
};
```

- 카카오: 서버가 필요 없는 **OAuth 리다이렉트 방식** — Web 플랫폼 등록 + 카카오 로그인 활성화 + Redirect URI 등록 + Client Secret "사용 안 함"
- 구글: Google Identity Services — "승인된 JavaScript 원본"에 배포 도메인 등록
- `DUMMY` / `REPLACE` / `YOUR_` 가 포함된 값은 미설정으로 간주됩니다
- 📘 **키 발급 상세 절차·무료 AI API 비교·도메인(www.심리마케팅.com) 연결 방법: [SETUP_GUIDE.md](SETUP_GUIDE.md)**

## ☁️ 클라우드플레어(Cloudflare Pages) 배포

1. [Cloudflare 대시보드](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets (직접 업로드)**
2. 프로젝트 이름 입력 → 배포 ZIP(또는 이 폴더 전체)을 드래그 & 드롭 → **Deploy site**
3. 끝! `https://프로젝트명.pages.dev` 주소가 발급됩니다 (빌드 설정 불필요 — 순수 정적 사이트)
4. 소셜 로그인을 실제 연동할 때는 발급된 `pages.dev` 도메인을 카카오/구글 콘솔에 등록하세요

## ⚽ 간편 축구 (멀티플레이 미니게임)

`soccer.html` — 헥스볼(HaxBall)을 벤치마킹한 탑다운 2D 축구 게임입니다.

- **서버 없이 멀티플레이**: WebRTC(PeerJS 공개 브로커) P2P 방식이라 이 정적 사이트 그대로 배포하면 끝. 방장이 "방 만들기" → 4자리 코드 발급 → 친구가 코드(또는 초대 링크 `soccer.html?room=코드`)로 참가
- **헥스볼식 방 메뉴**: Red / Spectators / Blue 3단 로스터(핑 표시, 방장 👑), 신규 입장자는 관전자로 시작하고 방장이 ◀▶ 버튼으로 팀 배정(🔀 랜덤 배정 포함). Time limit·Score limit·Stadium(Hot Small/Classic/Hot Huge) 설정 후 ▶ 게임 시작. Esc 또는 ☰ 메뉴 버튼으로 토글
- **헥스볼식 물리 엔진**: 모든 오브젝트가 원형 디스크(`invMass`·`bCoef`·`damping`) — 법선/접선 분해 운동량 보존 충돌, 반발 계수는 bCoef 곱, 골포스트는 invMass 0 고정 디스크. 킥은 가산 임펄스라 투터치 가속·원터치 같은 헥스볼 기술이 재현됩니다
- **경기 규칙**: 스코어 리밋 도달 또는 타임 리밋 종료 시 승리(동점이면 ⚡서든데스), 골 후 2초 연출 → 킥오프, 승리 배너 후 방 메뉴로 복귀
- **캐릭터 선택**: 로비에서 24명의 멤버 캐릭터(이모지 아바타) 중 선택하거나 닉네임 직접 입력
- **조작**: 이동 WASD/방향키 · 킥 Space/X/Shift · 모바일은 가상 조이스틱 + KICK 버튼 자동 표시
- **혼자서도**: 메뉴의 🤖 봇 추가 버튼으로 AI 상대와 연습 가능 (최대 4봇)
- **네트워크**: 호스트 브라우저가 60Hz 물리 시뮬레이션(권위 서버) → 30Hz 스냅샷 브로드캐스트, 게스트는 입력만 전송하고 스냅샷 보간 + 속도 기반 데드 레코닝(추측 항법)으로 부드럽게 렌더링

> 배포 후 접속 주소: `https://도메인/soccer.html`

## 🎬 Seedance 생성 영상

| 파일 | 용도 | 규격 |
|---|---|---|
| `assets/hero.mp4` | 히어로 배경 | 16:9 · 720p · 5s |
| `assets/mobile.mp4` | 모바일 쇼케이스(폰 목업) | 9:16 · 720p · 5s |

사이트는 **로컬 파일 → Higgsfield CDN** 순서로 자동 폴백하므로 영상 파일 없이도 동작합니다.
로컬 파일로 두고 싶다면: `bash assets/fetch-videos.sh` (영상이 repo에 커밋되어 있지 않은 환경에서만 필요)

## 📁 구조

```
index.html          랜딩 페이지 (로그인/가입 모달, 30초 데모)
dashboard.html      대시보드 (4가지 도구 · 히스토리 · 설정)
soccer.html         ⚽ 간편 축구 — P2P 멀티플레이 미니게임 (단일 파일)
css/style.css       디자인 시스템 + 랜딩
css/dashboard.css   대시보드 레이아웃 (하단 탭 등 모바일 UI)
js/config.js        키 설정 (카카오/구글/Gemini)
js/ui.js            공용 헬퍼 (토스트·클립보드·비디오 폴백)
js/auth.js          인증 (이메일 + 카카오/구글 간편가입)
js/engine.js        AI 생성 엔진 (심리 지식 베이스 + Gemini 연동)
js/dashboard.js     대시보드 로직 (도구 실행·결과 렌더·히스토리)
assets/             파비콘 · Seedance 영상 · 다운로드 스크립트
```

## 🔒 데이터 보관

계정·히스토리·통계·API 키는 모두 **사용자 브라우저의 localStorage**에만 저장됩니다. 외부 전송은 사용자가 Gemini 키를 등록하고 생성을 실행할 때의 해당 요청뿐입니다.
