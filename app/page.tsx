export default function DashboardPage() {
  return (
    <main className="flex h-dvh">
      {/* 3D 맵 영역 — components/yard3d/YardScene이 들어올 자리 */}
      <section className="relative flex-1 border-r border-console-border">
        <div className="flex h-full items-center justify-center text-console-muted">
          3D 조선소 맵 (yard3d)
        </div>
        <header className="absolute left-4 top-4">
          <h1 className="text-lg font-bold">아차사고 레이더</h1>
          <p className="text-xs text-console-muted">한화오션 거제사업장 관제 대시보드</p>
        </header>
      </section>

      {/* 사이드 패널 — components/dashboard/* 가 들어올 자리 */}
      <aside className="w-96 shrink-0 bg-console-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-console-muted">
          실시간 보고 현황
        </h2>
        <div className="flex gap-2 text-xs">
          <span className="rounded px-2 py-1 bg-risk-safe/15 text-risk-safe">안전</span>
          <span className="rounded px-2 py-1 bg-risk-caution/15 text-risk-caution">주의</span>
          <span className="rounded px-2 py-1 bg-risk-warning/15 text-risk-warning">경계</span>
          <span className="rounded px-2 py-1 bg-risk-danger/15 text-risk-danger">위험</span>
        </div>
      </aside>
    </main>
  );
}
