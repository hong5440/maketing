import { NextRequest, NextResponse } from "next/server";
import { interpret } from "@/lib/ai/engine";
import { INTERPRET_TYPES, type InterpretType } from "@/lib/ai/interpretTypes";

/**
 * POST /api/interpret — 공용 AI 해석 엔진 (B-1)
 * body: { text: string, type: "permit"|"crane"|"nearmiss", langHint?: string }
 * 얇은 라우트: 검증 → lib/ai/engine 호출 → 응답 (CLAUDE.md 규칙)
 */
export async function POST(req: NextRequest) {
  let body: { text?: string; type?: string; langHint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text가 비어 있습니다." }, { status: 400 });
  }
  if (!INTERPRET_TYPES.includes(body.type as InterpretType)) {
    return NextResponse.json(
      { error: `type은 ${INTERPRET_TYPES.join("|")} 중 하나여야 합니다.` },
      { status: 400 },
    );
  }

  try {
    const out = await interpret({
      text,
      type: body.type as InterpretType,
      langHint: body.langHint,
    });
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "해석 실패" },
      { status: 500 },
    );
  }
}
