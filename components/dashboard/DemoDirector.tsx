"use client";

import { useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/basePath";

/**
 * 발표용 데모 시나리오 모드 오버레이.
 * - 단축키 D 토글, ←/→ 단계 이동, Shift+N 자막 토글 (키 처리는 Dashboard)
 * - 3단계: 사전 녹음 음성(/demo/report-vi.mp3) + 준비된 구조화 결과 → 오프라인 동작
 * - 5단계: 실제 /tbm/1 페이지를 iframe으로 (승인 버튼까지 실연)
 * - 6단계: 기대효과 피날레
 */

export const DEMO_TOTAL_STEPS = 6;

const CAPTIONS: string[] = [
  "조선소는 하루가 다르게 변하는 도시입니다 — 490만 평방미터, 수만 명. 오늘 밤에도, 내일 낮에도 아차사고는 어딘가에서 일어나고 있습니다.",
  "지난 8주, 보고가 쌓이는 과정입니다. 1도크가 점점 붉어지는 게 보이시나요 — 사람 눈으로는 놓치는 패턴입니다.",
  "현장의 절반은 외국인 근로자입니다. 베트남어로 10초만 말하면 — AI가 번역·분류해서 곧바로 지도 위에 올립니다.",
  "방금 그 보고가 이번 주 일곱 번째였습니다. 평시의 7배 — 레이더가 경보를 울리고, 근거 보고서와 권장 조치까지 설명합니다.",
  "내일 아침 TBM 자료는 이미 만들어져 있습니다. 한국어와 근로자 모국어로 — 안전관리자는 검토하고 승인만 하면 됩니다.",
  "10초 보고, 실시간 분석, 다음 날 현장 적용. 아차사고 레이더였습니다.",
];

/* ── 3단계: 휴대폰 보고 시퀀스 ─────────────────────── */

const VI_TEXT =
  "Cần cẩu đang nâng block, bu lông rơi xuống lối đi bên dưới, suýt trúng người!";
const KO_TEXT =
  "크레인이 블록 인양 중인데 볼트가 아래 통로로 떨어짐. 사람 맞을 뻔했음";

type PhonePhase = "in" | "rec" | "ai" | "result" | "sent";

function PhoneOverlay({ onSubmit }: { onSubmit: () => void }) {
  const [phase, setPhase] = useState<PhonePhase>("in");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const go = (p: PhonePhase, ms: number) =>
      timers.push(setTimeout(() => !cancelled && setPhase(p), ms));

    go("rec", 500);
    // 녹음 단계: 사전 녹음 음성 재생 (없거나 자동재생 차단이면 타이머로 진행)
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        const audio = new Audio(withBase("/demo/report-vi.mp3"));
        audioRef.current = audio;
        let advanced = false;
        const advance = () => {
          if (advanced || cancelled) return;
          advanced = true;
          setPhase("ai");
          timers.push(setTimeout(() => !cancelled && setPhase("result"), 1000));
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setPhase("sent");
              if (!submitted.current) {
                submitted.current = true;
                onSubmit();
              }
            }, 2600),
          );
        };
        audio.onended = advance;
        audio.onerror = () => timers.push(setTimeout(advance, 4200));
        audio.play().catch(() => timers.push(setTimeout(advance, 4200)));
        // 안전망: 음성이 너무 길어도 7초엔 진행
        timers.push(setTimeout(advance, 7000));
      }, 600),
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="demo-phone pointer-events-none absolute right-[420px] top-1/2 z-30 w-[300px] -translate-y-1/2">
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-[#242c3a] bg-console-bg shadow-2xl">
        <div className="mx-auto mt-1.5 h-4 w-20 rounded-full bg-[#242c3a]" />
        <div className="flex min-h-[460px] flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBase("/brand/logo.webp")} alt="" className="h-7 w-7 rounded-lg" />
            <p className="text-sm font-bold">Báo cáo suýt tai nạn</p>
            <span className="ml-auto text-lg">🇻🇳</span>
          </div>
          <div className="rounded-lg border border-risk-safe/40 bg-risk-safe/10 px-2.5 py-1.5 text-xs font-semibold text-risk-safe">
            📍 Dock 1 &amp; 900t Goliath Crane
          </div>

          {(phase === "in" || phase === "rec") && (
            <div
              className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl ${
                phase === "rec" ? "mic-recording bg-risk-danger" : "bg-risk-warning"
              } text-black transition-colors`}
            >
              <span className="text-4xl">🎤</span>
              <p className="text-sm font-bold text-white">
                {phase === "rec" ? "Đang nghe…" : "Nói để báo cáo"}
              </p>
              {phase === "rec" && (
                <div className="flex h-8 items-end gap-1">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span
                      key={i}
                      className="demo-wave w-1.5 rounded-full bg-white"
                      style={{ animationDelay: `${i * 0.09}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "ai" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-console-border border-t-risk-warning" />
              <p className="text-xs text-console-muted">AI đang phân tích…</p>
            </div>
          )}

          {(phase === "result" || phase === "sent") && (
            <div className="demo-fadein flex-1 space-y-2 rounded-2xl border border-console-border bg-console-panel p-3 text-xs">
              <p className="font-bold text-console-muted">AI đã tóm tắt như sau</p>
              <div className="flex justify-between">
                <span className="text-console-muted">Loại nguy hiểm</span>
                <span className="font-bold">📦 Vật rơi (낙하)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-console-muted">Mức độ</span>
                <span className="font-mono tracking-widest">
                  <span className="text-risk-danger">●●●●</span>
                  <span className="text-console-border">●</span>
                </span>
              </div>
              <p className="rounded-lg bg-console-bg/70 p-2 leading-snug">{VI_TEXT}</p>
              <p className="border-t border-console-border/60 pt-1.5 text-[10px] text-console-muted">
                🇰🇷 {KO_TEXT}
              </p>
              {phase === "sent" && (
                <div className="demo-fadein flex items-center justify-center gap-2 pt-1 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withBase("/brand/mascot.webp")} alt="" className="h-10 w-10 rounded-full" />
                  <p className="text-base font-extrabold text-risk-safe">+10 điểm!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-console-muted">
        사전 녹음 음성 · 네트워크 없이 동작
      </p>
    </div>
  );
}

/* ── 6단계: 피날레 ─────────────────────────────────── */

function CountUp({ to, suffix }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1200);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <>
      {v}
      {suffix}
    </>
  );
}

function Finale() {
  const stats = [
    { label: "아차사고 보고", from: "서면 10분", big: <CountUp to={10} suffix="초" />, note: "음성·사진·7개 언어" },
    { label: "위험 분석·전파", from: "월간 집계 2일", big: <>실시간</>, note: "Poisson 급증 감지" },
    { label: "조치 리드타임", from: "평균 7일", big: <CountUp to={1} suffix="일" />, note: "다음 날 TBM 자동 반영" },
  ];
  return (
    <div className="demo-fadein fixed inset-0 z-[60] flex flex-col items-center justify-center gap-10 bg-console-bg/95 backdrop-blur-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={withBase("/brand/logo.webp")} alt="" className="h-24 w-24 rounded-3xl shadow-2xl" />
      <div className="text-center">
        <h2 className="text-4xl font-extrabold">아차사고 레이더</h2>
        <p className="mt-2 text-console-muted">
          보고가 쌓일수록 똑똑해지는 현장 안전 — 한화오션 거제사업장 데모
        </p>
      </div>
      <div className="flex gap-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="w-56 rounded-2xl border border-console-border bg-console-panel p-5 text-center"
          >
            <p className="text-sm text-console-muted">{s.label}</p>
            <p className="mt-1 text-[11px] text-console-muted line-through">{s.from}</p>
            <p className="num my-2 text-4xl font-extrabold text-risk-warning">{s.big}</p>
            <p className="text-xs text-console-muted">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-console-muted">* 기대 효과(목표치) — 데모 기준</p>
    </div>
  );
}

/* ── 본체 ──────────────────────────────────────────── */

export function DemoDirector({
  step,
  captions,
  setStep,
  onExit,
  toggleCaptions,
  onSubmitDemoReport,
}: {
  step: number;
  captions: boolean;
  setStep: (updater: (s: number) => number) => void;
  onExit: () => void;
  toggleCaptions: () => void;
  onSubmitDemoReport: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 5단계 iframe 안으로 포커스가 넘어가도 단축키가 계속 동작하도록 전달
  const hookIframeKeys = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") setStep((s) => Math.min(DEMO_TOTAL_STEPS, s + 1));
        else if (e.key === "ArrowLeft") setStep((s) => Math.max(1, s - 1));
        else if (e.key === "d" || e.key === "D") onExit();
        else if (e.shiftKey && (e.key === "N" || e.key === "n")) toggleCaptions();
      });
    } catch {
      /* 교차 출처 등 — 무시 */
    }
  };

  return (
    <>
      {step === 3 && <PhoneOverlay onSubmit={onSubmitDemoReport} />}

      {/* 4단계부터 숨겨서 미리 로드 → 5단계 진입 시 생성 완료 상태로 열림 */}
      {(step === 4 || step === 5) && (
        <div
          className={`demo-fadein fixed inset-6 bottom-20 z-[60] overflow-hidden rounded-2xl border border-console-border shadow-2xl ${
            step === 4 ? "hidden" : ""
          }`}
        >
          <iframe
            ref={iframeRef}
            src={withBase("/tbm/1")}
            className="h-full w-full bg-white"
            onLoad={hookIframeKeys}
            title="TBM 자료"
          />
        </div>
      )}

      {step === 6 && <Finale />}

      {/* 발표자 자막 */}
      {captions && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] w-[min(860px,80%)] -translate-x-1/2 rounded-xl border border-console-border bg-console-bg/90 px-5 py-3 text-center backdrop-blur">
          <p className="text-[15px] leading-relaxed text-console-text" style={{ textWrap: "pretty" }}>
            {CAPTIONS[step - 1]}
          </p>
        </div>
      )}

      {/* 단계 표시 + 조작 안내 */}
      <div className="fixed bottom-4 right-4 z-[70] rounded-lg border border-console-border bg-console-panel/90 px-3 py-2 text-[11px] text-console-muted backdrop-blur">
        <span className="mr-2 font-bold text-console-text">
          데모 {step}/{DEMO_TOTAL_STEPS}
        </span>
        ←→ 이동 · D 종료 · Shift+N 자막
      </div>
    </>
  );
}
