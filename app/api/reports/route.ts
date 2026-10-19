/**
 * POST /api/reports — 보고 접수 (structureReport로 구조화 후 저장)
 * GET  /api/reports — 보고 목록 (?zoneId=&hazardType=&status=&limit=)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WEATHERS, formatKstIso } from "../../../lib/domain";
import { addReport, listReports } from "../../../lib/data/reportStore";
import { structureReport } from "../../../lib/ai/structureReport";

export const runtime = "nodejs";

const PostBodySchema = z
  .object({
    text: z.string().max(4000).optional(),
    audioBase64: z.string().optional(),
    audioMimeType: z.string().optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
    zoneId: z.number().int().min(1).max(22).optional(),
    lang: z.string().optional(),
    reporterAnonymous: z.boolean().default(false),
    weather: z.enum(WEATHERS).default("맑음"),
  })
  .refine((b) => b.text?.trim() || b.audioBase64 || b.imageBase64, {
    message: "text, audioBase64, imageBase64 중 하나는 필요합니다.",
  });

export async function POST(req: NextRequest) {
  let body: z.infer<typeof PostBodySchema>;
  try {
    body = PostBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "잘못된 요청", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  try {
    const structured = await structureReport({
      text: body.text,
      audioBase64: body.audioBase64,
      audioMimeType: body.audioMimeType,
      imageBase64: body.imageBase64,
      imageMimeType: body.imageMimeType,
      zoneId: body.zoneId,
      lang: body.lang,
    });

    const report = addReport({
      createdAt: formatKstIso(new Date()),
      zoneId: body.zoneId ?? structured.zoneId ?? 0,
      reporterLang: structured.lang,
      reporterAnonymous: body.reporterAnonymous,
      rawText: structured.sourceText || body.text || "(사진 보고)",
      translatedKo: structured.translatedKo,
      hazardType: structured.hazardType,
      workType: structured.workType,
      severity: structured.severity as 1 | 2 | 3 | 4 | 5,
      cause: structured.cause,
      status: "접수",
      weather: body.weather,
    });

    return NextResponse.json(
      {
        report,
        analysis: {
          demo: structured.demo,
          sttUsed: structured.sttUsed,
          hazardFactors: structured.hazardFactors,
          suggestedZoneId: structured.zoneId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "보고 처리 실패", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const zoneId = sp.get("zoneId");
  const limit = sp.get("limit");
  const reports = listReports({
    zoneId: zoneId ? Number(zoneId) : undefined,
    hazardType: sp.get("hazardType") ?? undefined,
    status: sp.get("status") ?? undefined,
    limit: limit ? Number(limit) : undefined,
  });
  return NextResponse.json({ count: reports.length, reports });
}
