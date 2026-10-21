"use client";

import { useEffect, useState } from "react";
import { withBase } from "@/lib/basePath";

/**
 * 발표용 시연 모드 (B-8)
 * - 단축키 D 토글, ←/→ 단계 이동, Shift+N 자막 토글 (키 처리는 Dashboard)
 * - 장면 전환·레이어 연출은 Dashboard의 demoStep 효과가 담당하고,
 *   이 컴포넌트는 자막·단계 표시·피날레 오버레이만 그린다.
 * - 모든 AI 호출은 로딩 표시 + 데모 결과 대체 — 네트워크 없이 완주 가능
 */

export const DEMO_TOTAL_STEPS = 6;

const CAPTIONS: string[] = [
  "한화오션 거제사업장 — 공개 조감도를 바탕으로 재구성한 디지털 트윈입니다. 해가 지면 조선소는 또 다른 하루를 시작합니다.",
  "내일 아침 야드의 위험 예보입니다. 작업허가서 31건을 AI가 해석해 14시, 세 곳의 작업 간섭을 미리 찾아냈습니다 — 사람이 모두 겹쳐 보기 어려운 조합입니다.",
  "1도크 골리앗 크레인. 베트남 작업자가 모국어로 말하면 AI가 명령으로 바꾸고, 작업자 언어로 되읽어 확인받은 뒤에만 움직입니다. 하중 아래 사람이 들어오면 — 멈춥니다.",
  "22번 LNGC 도장 공장의 밀폐공간 허가서입니다. AI가 산소 측정 기록이 없다는 걸 잡아냈습니다. 치명률 40%의 재해는, 들어가기 전에 막아야 합니다.",
  "폭염 체감온도 지도입니다. 도크 바닥은 기온보다 3도 더 뜨겁습니다. 규칙이 정한 다음 휴식까지 남은 시간을 구역마다 알려줍니다.",
  "작년 조선업 재해자 1,632명 — 그 숫자를 줄이는 방법을 오늘 보여드렸습니다. 말하면 그려지고, 위험하면 멈춥니다. 아차사고 레이더였습니다.",
];

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
    { label: "위험 예보", from: "사후 집계", big: <>하루 전</>, note: "허가서 AI 해석·간섭 감지" },
    { label: "크레인 안전", from: "수신호 의존", big: <>인터록</>, note: "하중 하부 자동 정지" },
  ];
  return (
    <div className="demo-fadein fixed inset-0 z-[60] flex flex-col items-center justify-center gap-10 bg-console-bg/95 backdrop-blur-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={withBase("/brand/logo.webp")} alt="" className="h-24 w-24 rounded-3xl shadow-2xl" />
      <div className="text-center">
        <h2 className="text-4xl font-extrabold">말하면 그려지고, 위험하면 멈춥니다.</h2>
        <p className="mt-3 text-console-muted">
          아차사고 레이더 — 한화오션 거제사업장 안전 디지털 트윈 데모
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
            <p className="num my-2 text-3xl font-extrabold text-risk-warning">{s.big}</p>
            <p className="text-xs text-console-muted">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-console-muted">
        * 기대 효과(목표치) · 합성 데이터 · 시연용 점수 — 공개 조감도 기반 가상 데모
      </p>
    </div>
  );
}

/* ── 본체 ──────────────────────────────────────────── */

export function DemoDirector({
  step,
  captions,
}: {
  step: number;
  captions: boolean;
}) {
  return (
    <>
      {step === 6 && <Finale />}

      {/* 발표자 자막 */}
      {captions && step !== 6 && (
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
