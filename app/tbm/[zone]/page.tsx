export default async function TbmPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-white p-8 text-gray-900 print:p-0">
      <header className="mb-6 border-b-2 border-gray-900 pb-4">
        <h1 className="text-2xl font-bold">TBM 안전 브리핑 — {zone}구역</h1>
        <p className="text-sm text-gray-500">
          아차사고 레이더 자동 생성 · 한국어 + 근로자 모국어
        </p>
      </header>

      <section className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-400">
        구역별 TBM 자료(최근 아차사고 요약, 오늘의 주의사항, 다국어 번역)가
        생성될 자리
      </section>
    </main>
  );
}
