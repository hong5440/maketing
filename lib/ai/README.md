# lib/ai

LLM(Anthropic) / STT(Whisper) 호출 계층.

규칙 (CLAUDE.md 참조):
- 모든 함수는 실제 API 경로 + 데모 폴백 경로를 가진다
- 키가 없거나 `DEMO_MODE=true`면 `data/demo/`의 준비된 응답을 반환
- 모델명은 `process.env.LLM_MODEL`에서만 읽는다
