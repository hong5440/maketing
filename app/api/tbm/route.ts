/**
 * POST /api/tbm — 구역별 TBM 자료 생성
 * body: { zoneId, date?: "YYYY-MM-DD", langs?: ["vi", ...] }
 * langs 생략 시 구역 국적 구성에서 자동 결정
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getZone } from "../../../data/zones";
import {
  REPORTER_LANGS,
  formatKstIso,
  kstDate,
  type ReporterLang,
} from "../../../lib/domain";
import { listReports } from "../../../lib/data/reportStore";
import { resolveNow } from "../../../lib/ai/detectHotspots";
import { generateTBM } from "../../../lib/ai/generateTBM";

export const runtime = "nodejs";

const BodySchema = z.object({
  zoneId: z.number().int().min(1).max(22),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  langs: z.array(z.enum(REPORTER_LANGS)).max(7).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "잘못된 요청", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  const zone = getZone(body.zoneId);
  if (!zone) {
    return NextResponse.json({ error: `존재하지 않는 구역: ${body.zoneId}` }, { status: 404 });
  }

  const reports = listReports();
  // 날짜 생략 시: 최신 보고 기준 날짜 (시드 데이터 시연에서도 항상 유효)
  const date = body.date ?? kstDate(formatKstIso(resolveNow(reports, null)));
  // 언어 생략 시: 구역 국적 구성에서 지원 언어 자동 선택 (ko 제외)
  const langs: ReporterLang[] =
    body.langs ??
    zone.nationalities
      .map((n) => n.lang)
      .filter((l): l is ReporterLang =>
        (REPORTER_LANGS as readonly string[]).includes(l) && l !== "ko"
      );

  try {
    const tbm = await generateTBM(body.zoneId, date, langs, reports);
    return NextResponse.json({ tbm });
  } catch (err) {
    return NextResponse.json(
      { error: "TBM 자료 생성 실패", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
