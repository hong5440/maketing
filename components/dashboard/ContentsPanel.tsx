"use client";

/**
 * 콘텐츠 허브 패널 (B-6) — 레이어 토글 + 시설 패널 수준의 5종
 * ① 모국어 안전 브리핑 ② 버튼 하나 제보(기존 /report) ③ 블록 운송 내비
 * ④ 신입 첫 출근 투어 ⑤ 사고 기억 지도
 */

import { useCallback, useMemo, useState } from "react";
import { ZONES } from "@/data/zones";
import type { NearMissReport } from "@/lib/domain";
import {
  BRIEFING_LANGS,
  FOREIGN_WORKER_STAT,
  MEMORY_INCIDENTS,
  TOUR_STEPS,
  demoBriefing,
  type BriefingLang,
  type MemoryIncident,
} from "@/lib/contents";

export interface ContentsState {
  transport: boolean;
  memory: boolean;
  tourStep: number | null; // null = 투어 꺼짐
  memorySelected: string | null;
}

export const INITIAL_CONTENTS: ContentsState = {
  transport: false,
  memory: false,
  tourStep: null,
  memorySelected: null,
};

function zoneName(id: number): string {
  const z = ZONES.find((v) => v.id === id);
  return z ? z.name.split("·")[0].split(" 및 ")[0] : `${id}번`;
}

/* ── ① 모국어 안전 브리핑 (시설 패널에 부착) ───────── */

export function BriefingPanel({
  zoneId,
  reports,
}: {
  zoneId: number;
  reports: NearMissReport[];
}) {
  const [lang, setLang] = useState<BriefingLang>("vi");
  const [speaking, setSpeaking] = useState(false);
  const zoneReports = useMemo(
    () => reports.filter((r) => r.zoneId === zoneId),
    [reports, zoneId],
  );
  const text = useMemo(
    () => demoBriefing(zoneName(zoneId), lang, zoneReports),
    [zoneId, lang, zoneReports],
  );

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = BRIEFING_LANGS.find((l) => l.code === lang)?.speech ?? "ko-KR";
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [text, lang]);

  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">모국어 안전 브리핑</h2>
      <div className="mb-2 flex flex-wrap gap-1">
        {BRIEFING_LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`pressable rounded border px-1.5 py-0.5 text-[11px] ${
              lang === l.code
                ? "border-holo text-holo"
                : "border-console-border text-console-muted"
            }`}
          >
            {l.label}
          </button>
        ))}
        <button
          onClick={speaking ? () => window.speechSynthesis?.cancel() : speak}
          className="pressable ml-auto rounded border border-console-border px-2 py-0.5 text-[11px] text-console-text"
          aria-label="음성 재생"
        >
          {speaking ? "⏹ 정지" : "🔊 음성"}
        </button>
      </div>
      <p className="mb-2 rounded border border-console-border bg-console-bg/60 p-2 text-xs leading-relaxed text-console-text">
        {text}
      </p>
      <p className="text-[10px] leading-snug text-console-muted/80">
        {FOREIGN_WORKER_STAT} · 브리핑은 구역 보고 통계로 자동 생성(시연용)
      </p>
    </section>
  );
}

/* ── ④ 투어 패널 ──────────────────────────────────── */

export function TourPanel({
  step,
  onStep,
  onExit,
}: {
  step: number;
  onStep: (n: number) => void;
  onExit: () => void;
}) {
  const s = TOUR_STEPS[step];
  const [answered, setAnswered] = useState<number | null>(null);

  const go = (n: number) => {
    setAnswered(null);
    onStep(n);
  };

  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">
        신입 첫 출근 투어
        <span className="num text-[10px] font-normal text-console-muted">
          {step + 1} / {TOUR_STEPS.length}
        </span>
        <button onClick={onExit} className="pressable ml-auto text-[11px] text-console-muted" aria-label="투어 종료">
          ✕
        </button>
      </h2>
      <p className="mb-1 text-xs font-bold text-console-text">
        {s.zoneId}번 · {s.title}
      </p>
      <p className="mb-2 text-xs leading-relaxed text-console-muted">{s.guide}</p>

      {s.quiz && (
        <div className="mb-2 rounded border border-console-border bg-console-bg/60 p-2">
          <p className="mb-1.5 text-[11px] font-bold text-console-text">Q. {s.quiz.q}</p>
          <div className="space-y-1">
            {s.quiz.options.map((opt, i) => {
              const isAnswer = i === s.quiz!.answer;
              const chosen = answered === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswered(i)}
                  className={`pressable block w-full rounded border px-2 py-1 text-left text-[11px] ${
                    answered == null
                      ? "border-console-border text-console-text"
                      : isAnswer
                        ? "border-risk-safe text-risk-safe"
                        : chosen
                          ? "border-risk-danger text-risk-danger"
                          : "border-console-border text-console-muted/60"
                  }`}
                >
                  {i + 1}. {opt}
                </button>
              );
            })}
          </div>
          {answered != null && (
            <p className="mt-1.5 text-[11px] text-console-muted">
              {answered === s.quiz.answer ? "✅ 정답! " : "❌ 오답 — "}
              {s.quiz.explain}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={() => go(Math.max(0, step - 1))}
          disabled={step === 0}
          className="pressable rounded border border-console-border px-2 py-1 text-xs text-console-muted disabled:opacity-40"
        >
          ← 이전
        </button>
        {step < TOUR_STEPS.length - 1 ? (
          <button
            onClick={() => go(step + 1)}
            className="pressable flex-1 rounded bg-holo px-2 py-1 text-xs font-bold text-console-bg"
          >
            다음 구역으로 →
          </button>
        ) : (
          <button
            onClick={onExit}
            className="pressable flex-1 rounded bg-risk-safe px-2 py-1 text-xs font-bold text-console-bg"
          >
            투어 완료 🎉
          </button>
        )}
      </div>
    </section>
  );
}

/* ── 허브 패널 ────────────────────────────────────── */

export function ContentsPanel({
  contents,
  onChange,
  onOpenQr,
  memoryIncident,
}: {
  contents: ContentsState;
  onChange: (next: Partial<ContentsState>) => void;
  onOpenQr: () => void;
  memoryIncident: MemoryIncident | null;
}) {
  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">현장 콘텐츠</h2>
      <div className="space-y-1.5 text-xs">
        <p className="flex items-center justify-between text-console-muted">
          <span>① 모국어 안전 브리핑</span>
          <span className="text-[10px]">시설 선택 시 하단 표시</span>
        </p>
        <button
          onClick={onOpenQr}
          className="pressable flex w-full items-center justify-between rounded border border-console-border px-2 py-1 text-console-text"
        >
          <span>② 버튼 하나 제보 (QR)</span>
          <span className="text-[10px] text-console-muted">15번 전도 20건 수집</span>
        </button>
        <button
          onClick={() => onChange({ transport: !contents.transport })}
          className={`pressable flex w-full items-center justify-between rounded border px-2 py-1 ${
            contents.transport ? "border-holo text-holo" : "border-console-border text-console-text"
          }`}
        >
          <span>③ 블록 운송 내비 (15 → 1도크)</span>
          <span className="text-[10px]">{contents.transport ? "켜짐" : "꺼짐"}</span>
        </button>
        <button
          onClick={() => onChange({ tourStep: contents.tourStep == null ? 0 : null })}
          className={`pressable flex w-full items-center justify-between rounded border px-2 py-1 ${
            contents.tourStep != null ? "border-holo text-holo" : "border-console-border text-console-text"
          }`}
        >
          <span>④ 신입 첫 출근 투어</span>
          <span className="text-[10px]">{contents.tourStep != null ? "진행 중" : "시작"}</span>
        </button>
        <button
          onClick={() => onChange({ memory: !contents.memory, memorySelected: null })}
          className={`pressable flex w-full items-center justify-between rounded border px-2 py-1 ${
            contents.memory ? "border-holo text-holo" : "border-console-border text-console-text"
          }`}
        >
          <span>⑤ 사고 기억 지도</span>
          <span className="text-[10px]">{contents.memory ? `${MEMORY_INCIDENTS.length}건` : "꺼짐"}</span>
        </button>
      </div>

      {/* 기억 지도 선택 카드 */}
      {contents.memory && memoryIncident && (
        <div className="mt-2 rounded border border-[#b98aff]/50 bg-[#b98aff]/10 p-2">
          <p className="text-xs font-bold text-console-text">
            ◈ {memoryIncident.type} · {memoryIncident.zoneId}번 {zoneName(memoryIncident.zoneId)}
            <span className="num ml-1 font-normal text-console-muted">{memoryIncident.year}</span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-console-muted">{memoryIncident.summary}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#cdaaff]">교훈: {memoryIncident.lesson}</p>
        </div>
      )}
      {contents.memory && (
        <p className="mt-2 text-[10px] leading-snug text-console-muted/80">
          사고 기억 지도는 공개 사례를 유형 수준으로 일반화한 합성 데이터입니다.
        </p>
      )}
    </section>
  );
}
