import { Suspense } from "react";

function ReportForm({ zone }: { zone?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold">아차사고 보고</h1>
        <p className="text-sm text-console-muted">
          10초면 충분합니다 — 음성, 사진, 텍스트 무엇이든 OK
        </p>
      </header>

      <div className="rounded-lg border border-console-border bg-console-panel p-4 text-sm">
        구역: <span className="font-semibold">{zone ?? "미지정 (QR로 자동 입력)"}</span>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-console-border text-console-muted">
        음성 / 사진 / 텍스트 입력 UI 자리
      </div>
    </main>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  const { zone } = await searchParams;
  return (
    <Suspense>
      <ReportForm zone={zone} />
    </Suspense>
  );
}
