/**
 * GET /api/hotspots — 구역 위험 점수 + 급증 경보 (?now=ISO 로 기준 시각 고정 가능)
 */

import { NextRequest, NextResponse } from "next/server";
import { listReports } from "../../../lib/data/reportStore";
import { detectHotspots, resolveNow } from "../../../lib/ai/detectHotspots";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const reports = listReports();
  const now = resolveNow(reports, req.nextUrl.searchParams.get("now"));
  const result = detectHotspots(reports, now);
  return NextResponse.json({ now: now.toISOString(), ...result });
}
