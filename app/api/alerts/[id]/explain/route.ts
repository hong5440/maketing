/**
 * POST /api/alerts/[id]/explain — 급증 경보 설명 생성
 * id는 detectHotspots의 결정적 id (`${zoneId}-${hazardType}`, URL 인코딩)
 */

import { NextRequest, NextResponse } from "next/server";
import { listReports } from "../../../../../lib/data/reportStore";
import { detectHotspots, resolveNow } from "../../../../../lib/ai/detectHotspots";
import { explainAlert } from "../../../../../lib/ai/explainAlert";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  const reports = listReports();
  const now = resolveNow(reports, req.nextUrl.searchParams.get("now"));
  const { alerts } = detectHotspots(reports, now);
  const alert = alerts.find((a) => a.id === id);
  if (!alert) {
    return NextResponse.json(
      { error: `경보를 찾을 수 없습니다: ${id}`, availableAlertIds: alerts.map((a) => a.id) },
      { status: 404 }
    );
  }

  try {
    const explanation = await explainAlert(alert, reports);
    return NextResponse.json({ alert, explanation });
  } catch (err) {
    return NextResponse.json(
      { error: "경보 설명 생성 실패", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
