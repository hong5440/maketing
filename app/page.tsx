import { YardViewport } from "@/components/dashboard/YardViewport";

export default function DashboardPage() {
  return (
    <main className="flex h-dvh">
      {/* 3D 맵 영역 */}
      <section className="relative min-w-0 flex-1 border-r border-console-border">
        <YardViewport />
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
