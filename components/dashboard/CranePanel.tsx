"use client";

/**
 * 크레인 내비 패널 (B-5) — 1도크 골리앗
 * - 마이크(Web Speech)/텍스트로 한·영·베 지시 입력 → AI 해석(/api/crane-command,
 *   정적 데모에서는 규칙 파서) → 작업자 언어로 되보여주고 Confirm 후 실행
 * - SIM/LIVE 전환, 연결 상태, 인터록 표시, 명령 타임라인
 * - "정사영 출력 창" 버튼: /projection (바닥 프로젝터 투사용)
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { withBase } from "@/lib/basePath";
import {
  echoCommand,
  describeKo,
  parseCraneCommandDemo,
  type CraneCommand,
} from "@/lib/crane/command";
import { applyCommand, craneNav, emitCrane, pushTimeline, subscribeCrane } from "@/lib/crane/store";
import { sendCommand, startBridge, stopBridge } from "@/lib/crane/bridge";

const LANGS = [
  { code: "ko", speech: "ko-KR", label: "한국어" },
  { code: "en", speech: "en-US", label: "English" },
  { code: "vi", speech: "vi-VN", label: "Tiếng Việt" },
] as const;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeech(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function aiParse(text: string, langHint: string): Promise<{ command: CraneCommand | null; demo: boolean }> {
  try {
    const res = await fetch(withBase("/api/crane-command"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, langHint }),
    });
    if (res.ok) return (await res.json()) as { command: CraneCommand | null; demo: boolean };
  } catch {
    /* 정적 데모 — 아래 규칙 파서로 */
  }
  return { command: parseCraneCommandDemo(text, langHint), demo: true };
}

export function CranePanel() {
  const state = useSyncExternalStore(
    subscribeCrane,
    () => craneNav,
    () => craneNav,
  );
  const [, bump] = useState(0);
  useEffect(() => subscribeCrane(() => bump((v) => v + 1)), []);

  const [lang, setLang] = useState<(typeof LANGS)[number]>(LANGS[2]); // 데모 기본: 베트남어
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [proposal, setProposal] = useState<{
    command: CraneCommand;
    source: "voice" | "text";
    demo: boolean;
    raw: string;
  } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const interpret = useCallback(
    async (raw: string, source: "voice" | "text") => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setParsing(true);
      setFailed(null);
      setProposal(null);
      const { command, demo } = await aiParse(trimmed, lang.code);
      setParsing(false);
      if (command) setProposal({ command, source, demo, raw: trimmed });
      else setFailed(trimmed);
    },
    [lang.code],
  );

  const startMic = useCallback(() => {
    const Ctor = getSpeech();
    if (!Ctor) {
      setFailed("(이 브라우저는 음성 인식을 지원하지 않습니다 — 텍스트로 입력하세요)");
      return;
    }
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = lang.speech;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? "";
      setText(transcript);
      void interpret(transcript, "voice");
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }, [lang.speech, interpret]);

  // ── 데모 모드: demo-crane-command 이벤트 → 음성 지시 시뮬레이션 + 자동 Confirm ──
  const demoAuto = useRef(false);
  useEffect(() => {
    const onDemo = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; lang: string }>).detail;
      const l = LANGS.find((v) => v.code === d.lang) ?? LANGS[0];
      setLang(l);
      setText(d.text);
      demoAuto.current = true;
      void interpret(d.text, "voice");
    };
    window.addEventListener("demo-crane-command", onDemo);
    return () => window.removeEventListener("demo-crane-command", onDemo);
  }, [interpret]);
  useEffect(() => {
    if (proposal && demoAuto.current) {
      demoAuto.current = false;
      const t = setTimeout(() => {
        applyCommand(proposal.command, proposal.source);
        if (craneNav.mode === "LIVE")
          sendCommand(proposal.command.axis, proposal.command.direction, proposal.command.amountM);
        setProposal(null);
        setText("");
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [proposal]);

  const confirm = useCallback(() => {
    if (!proposal) return;
    applyCommand(proposal.command, proposal.source);
    if (craneNav.mode === "LIVE")
      sendCommand(proposal.command.axis, proposal.command.direction, proposal.command.amountM);
    setProposal(null);
    setText("");
  }, [proposal]);

  const toggleMode = useCallback(() => {
    if (craneNav.mode === "SIM") {
      craneNav.mode = "LIVE";
      startBridge();
      pushTimeline("LIVE 모드 전환 — 브리지 접속 시도", "bridge");
    } else {
      craneNav.mode = "SIM";
      stopBridge();
      pushTimeline("SIM 모드 전환", "bridge");
    }
    emitCrane();
  }, []);

  return (
    <section className="holo-panel p-3">
      <h2 className="holo-title mb-2">
        크레인 내비 · 1도크 골리앗
        <span className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggleMode}
            className={`pressable rounded border px-1.5 py-0.5 text-[10px] font-bold ${
              state.mode === "LIVE"
                ? "border-holo text-holo"
                : "border-console-border text-console-muted"
            }`}
          >
            {state.mode}
          </button>
          {state.mode === "LIVE" && (
            <span
              className={`fc-ico ${state.connected ? "fc-ico-0" : "fc-ico-2"}`}
              title={state.connected ? "브리지 연결됨" : "연결 끊김 — 재접속 중"}
            />
          )}
        </span>
      </h2>

      {state.mode === "LIVE" && !state.connected && (
        <p className="mb-2 rounded bg-risk-warning/15 px-2 py-1 text-[11px] font-semibold text-risk-warning">
          브리지 연결 끊김 — 3초 간격 재접속 중 (docs/protocol.md)
        </p>
      )}

      {/* 인터록 */}
      {state.interlock && (
        <p className="mb-2 animate-pulse rounded border border-risk-danger bg-risk-danger/20 px-2 py-1.5 text-xs font-bold text-risk-danger">
          ⛔ 인터록 — 하중 이동 영역에 작업자. 크레인 정지{state.mode === "LIVE" ? " 신호 송신됨" : ""}
        </p>
      )}

      {/* 입력 */}
      <div className="mb-2 flex items-center gap-1.5">
        <select
          value={lang.code}
          onChange={(e) => setLang(LANGS.find((l) => l.code === e.target.value) ?? LANGS[0])}
          className="rounded border border-console-border bg-console-bg px-1 py-1 text-[11px] text-console-text"
          aria-label="지시 언어"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void interpret(text, "text");
          }}
          placeholder={
            lang.code === "vi" ? "Nâng móc lên 2 mét…" : lang.code === "en" ? "Hoist up 2 meters…" : "후크 2미터 올려…"
          }
          className="min-w-0 flex-1 rounded border border-console-border bg-console-bg px-2 py-1 text-xs text-console-text placeholder:text-console-muted/60"
          aria-label="크레인 지시"
        />
        <button
          onClick={listening ? () => recRef.current?.stop() : startMic}
          className={`pressable rounded border px-2 py-1 text-xs ${
            listening
              ? "animate-pulse border-risk-danger text-risk-danger"
              : "border-console-border text-console-text"
          }`}
          aria-label="음성 입력"
        >
          {listening ? "듣는 중…" : "🎤"}
        </button>
        <button
          onClick={() => void interpret(text, "text")}
          disabled={parsing}
          className="pressable rounded border border-holo/60 px-2 py-1 text-xs text-holo"
        >
          해석
        </button>
      </div>

      {parsing && <p className="mb-2 animate-pulse text-[11px] text-console-muted">AI 해석 중…</p>}
      {failed && (
        <p className="mb-2 rounded bg-risk-warning/10 px-2 py-1 text-[11px] text-risk-warning">
          해석하지 못했습니다: “{failed}” — 축·방향·거리를 함께 말해 주세요.
        </p>
      )}

      {/* Confirm 카드 — 작업자 언어로 되보여주기 */}
      {proposal && (
        <div className="mb-2 rounded border border-holo/70 bg-holo/10 p-2">
          <p className="text-sm font-bold text-console-text">{echoCommand(proposal.command)}</p>
          <p className="mt-0.5 text-[11px] text-console-muted">
            {describeKo(proposal.command)}
            {proposal.demo && " · 데모 해석"}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <button
              onClick={confirm}
              className="pressable flex-1 rounded bg-holo px-2 py-1 text-xs font-bold text-console-bg"
            >
              Confirm — 실행
            </button>
            <button
              onClick={() => setProposal(null)}
              className="pressable rounded border border-console-border px-2 py-1 text-xs text-console-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 크레인 상태 */}
      <div className="mb-2 grid grid-cols-3 gap-1.5 text-center text-[11px]">
        {(
          [
            ["주행", state.crane.travelM],
            ["트롤리", state.crane.trolleyM],
            ["후크", state.crane.hookM],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded border border-console-border bg-console-bg/60 py-1">
            <span className="block text-[10px] text-console-muted">{label}</span>
            <span className="num font-bold text-console-text">{v.toFixed(1)}m</span>
          </div>
        ))}
      </div>

      <a
        href={withBase("/projection/")}
        target="_blank"
        className="pressable mb-2 block rounded border border-console-border px-2 py-1 text-center text-[11px] text-console-muted hover:text-console-text"
      >
        ⬒ 바닥 투영용 정사영 출력 창 열기
      </a>

      {/* 타임라인 */}
      {state.timeline.length > 0 && (
        <div className="max-h-28 space-y-0.5 overflow-y-auto border-t border-console-border pt-1.5">
          {state.timeline.slice(0, 8).map((t, i) => (
            <p key={i} className="flex gap-1.5 text-[10px] text-console-muted">
              <span className="num flex-none">
                {new Date(t.at).toLocaleTimeString("ko-KR", { hour12: false })}
              </span>
              <span className="truncate">{t.text}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
