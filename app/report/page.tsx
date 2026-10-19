"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReportApp } from "@/components/report/ReportApp";

/**
 * 정적 내보내기(output: export)에서도 ?zone= 쿼리가 동작하도록
 * 클라이언트에서 useSearchParams로 읽는다.
 */
function ReportWithZone() {
  const sp = useSearchParams();
  const zone = sp.get("zone");
  const zoneId = zone && /^\d+$/.test(zone) ? Number(zone) : null;
  return <ReportApp zoneId={zoneId} />;
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-console-bg" />}>
      <ReportWithZone />
    </Suspense>
  );
}
