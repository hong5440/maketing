"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { getZone } from "@/data/zones";

const YardScene = dynamic(() => import("@/components/yard3d/YardScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-console-muted">
      3D 조선소 불러오는 중…
    </div>
  ),
});

/**
 * 3D 뷰포트 + 뷰 컨트롤(낮/밤, 전체 보기, 품질).
 * 이후 단계에서 riskByZone/alertZoneIds를 /api/hotspots 결과로 연결한다.
 */
export function YardViewport() {
  const [night, setNight] = useState(false);
  const [quality, setQuality] = useState<"low" | "high">("high");
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const selected = selectedZoneId ? getZone(selectedZoneId) : null;

  return (
    <div className="relative h-full w-full">
      <YardScene
        night={night}
        quality={quality}
        selectedZoneId={selectedZoneId}
        onZoneSelect={(id) => setSelectedZoneId(id)}
      />

      {/* 상단 좌측 타이틀 */}
      <header className="pointer-events-none absolute left-4 top-4">
        <h1 className="text-lg font-bold drop-shadow">아차사고 레이더</h1>
        <p className="text-xs text-console-muted drop-shadow">
          한화오션 거제사업장 관제 대시보드
        </p>
      </header>

      {/* 상단 우측 컨트롤 */}
      <div className="absolute right-4 top-4 flex gap-2 text-xs">
        <button
          onClick={() => setNight((v) => !v)}
          className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
        >
          {night ? "☀️ 낮" : "🌙 밤"}
        </button>
        <button
          onClick={() => setSelectedZoneId(null)}
          className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
        >
          ⤢ 전체 보기
        </button>
        <button
          onClick={() => setQuality((q) => (q === "high" ? "low" : "high"))}
          className="rounded-md border border-console-border bg-console-panel/85 px-3 py-1.5 font-medium backdrop-blur hover:bg-console-panel"
          title="품질 프리셋"
        >
          품질: {quality === "high" ? "High" : "Low"}
        </button>
      </div>

      {/* 선택된 구역 라벨 */}
      {selected && (
        <div className="absolute bottom-4 left-4 rounded-md border border-console-border bg-console-panel/85 px-3 py-2 text-sm backdrop-blur">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-risk-warning text-xs font-bold text-white">
            {selected.id}
          </span>
          {selected.name}
          <span className="ml-2 text-xs text-console-muted">{selected.nameEn}</span>
        </div>
      )}
    </div>
  );
}
