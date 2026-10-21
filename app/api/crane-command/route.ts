import { NextRequest, NextResponse } from "next/server";
import { parseCraneCommand } from "@/lib/ai/craneCommand";

/**
 * POST /api/crane-command — 크레인 음성/텍스트 지시 해석 (B-5)
 * body: { text: string, langHint?: string }
 * 응답: { command: CraneCommand | null, demo: boolean }
 */
export async function POST(req: NextRequest) {
  let body: { text?: string; langHint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text가 비어 있습니다." }, { status: 400 });
  const out = await parseCraneCommand(text, body.langHint);
  return NextResponse.json(out);
}
