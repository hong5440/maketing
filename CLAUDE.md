# 아차사고 레이더 (Near-Miss Radar)

조선업 AX 해커톤 데모. 외국인 근로자도 **10초 만에** 아차사고(near-miss)를 보고하고,
AI가 위험 구역을 찾아 **다음 날 TBM(작업 전 안전미팅)에 자동 반영**하는 시스템.

- 무대: **한화오션 거제사업장**. `reference/` 폴더의 조감도를 기준으로 three.js로 3D 재구성
- 해커톤 데모이므로 "시연이 끊기지 않는 것"이 최우선 — 모든 외부 의존(AI, 네트워크)에 폴백 필수

## 핵심 흐름 3가지 (반드시 완벽하게 동작)

1. **모바일 다국어 보고** (`/report`): 음성/사진/텍스트 입력 → LLM이 구조화(위치, 위험 유형, 심각도)
2. **위험 핫스팟 맵** (`/`): 3D 조선소 위에 구역별 위험 핫스팟 시각화 + 급증 경보
3. **TBM 자료 자동 생성** (`/tbm/[zone]`): 구역별 TBM 자료를 한국어 + 근로자 모국어로 생성

## 화면 (라우트)

| 경로 | 용도 |
|---|---|
| `/` | 관제 대시보드 — 3D 맵 + 사이드 패널 |
| `/report` | 근로자용 모바일 보고 화면. QR로 접속, `?zone=12`처럼 구역 자동 입력 |
| `/tbm/[zone]` | 구역별 TBM 자료, 인쇄용 레이아웃 (`@media print` 고려) |

## 기술 스택

- **Next.js (App Router) + TypeScript + Tailwind CSS v4**
- **3D**: three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
  - 3D 컴포넌트는 반드시 `"use client"` + 동적 import(`ssr: false`)로 로드
- **데이터**: DB 없음. `data/*.json` 시드 + 서버 메모리. 저장 계층은 `lib/data/`에 격리
  (나중에 SQLite로 교체하기 쉽게 — 저장소 인터페이스를 통해서만 접근, 직접 fs 호출 금지)
- **LLM**: Anthropic API. 모델명은 환경변수 `LLM_MODEL`로 주입 (코드에 하드코딩 금지)
- **STT**: OpenAI Whisper API → `OPENAI_API_KEY` 없으면 브라우저 Web Speech API로 폴백

## 데모 모드 (중요 규칙)

**모든 AI 호출은 데모 폴백 경로를 가져야 한다.** API 키가 없거나 네트워크가 끊겨도
시연이 끝까지 진행돼야 한다.

- `lib/ai/` 안의 모든 호출 함수는 (1) 실제 API (2) 미리 준비된 데모 응답, 두 경로를 가진다
- 데모 응답(canned responses)은 `data/demo/` 아래 JSON으로 관리
- 키 존재 여부로 자동 판단하되, `DEMO_MODE=true`로 강제 가능

## 폴더 구조

```
app/                  # Next.js App Router 페이지 + API 라우트
  report/             # 근로자 모바일 보고
  tbm/[zone]/         # 구역별 TBM 자료
components/
  yard3d/             # 3D 조선소 씬 (R3F 컴포넌트)
  dashboard/          # 대시보드 사이드 패널 등 2D UI
lib/
  ai/                 # LLM/STT 호출 + 데모 폴백
  data/               # 저장 계층 (JSON + 메모리, 추후 SQLite 교체 지점)
data/                 # 시드 데이터 + 데모 응답 JSON
reference/            # 한화오션 거제사업장 조감도 등 참고 자료 (3D 모델링 기준)
```

> 저장소 루트의 `index.html`, `dashboard.html`, `css/`, `js/`, `assets/`는
> **이전 프로젝트(심리 마케팅)의 레거시 파일**이다. 이번 데모와 무관하며 수정하지 않는다.

## 명령어

```bash
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint
```

## 디자인 톤

- **관제실 느낌의 다크 UI** — 배경은 짙은 네이비/차콜 계열
- 포인트 컬러는 위험도 4단계: 초록(safe) → 노랑(caution) → 주황(warning) → 빨강(danger)
  - 위험도 색은 CSS 변수/Tailwind 토큰으로 정의해 전역에서 일관되게 사용
- 한글 폰트: **Pretendard** (CDN)
- `/report`는 모바일 퍼스트, `/tbm/[zone]`은 인쇄 친화적(밝은 배경) 레이아웃

## 코딩 규칙

- 위험도 단계, 구역 ID 등 도메인 상수는 한 곳(`lib/`)에 정의하고 공유
- API 라우트는 얇게: 검증 → `lib/` 호출 → 응답. 비즈니스 로직은 `lib/`에
- 다국어 문자열: 데모 범위는 한국어 + 근로자 모국어(예: 베트남어, 네팔어 등) — LLM 생성에 의존
- 환경변수는 `.env.example`에 항상 반영
