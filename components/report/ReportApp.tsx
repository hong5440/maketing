"use client";

import { withBase } from "@/lib/basePath";
import { useCallback, useEffect, useRef, useState } from "react";
import { getZone } from "@/data/zones";
import type { NearMissReport, ReporterLang } from "@/lib/domain";
import {
  HAZARD_UI,
  LANG_META,
  STRINGS,
  hazardLabel,
  type ReportStrings,
} from "@/lib/reportI18n";
import { apiSubmitReport } from "@/lib/clientApi";

/**
 * 근로자용 모바일 보고 화면.
 * 목표: 장갑 낀 손으로도 10초 안에 보고 완료 — 큰 버튼, 최소 단계.
 * 🎤 누르고 있는 동안 녹음(MediaRecorder + Web Speech 폴백), 떼면 자동 전송.
 */

type Step = "lang" | "form" | "done";

interface SubmitResult {
  report: NearMissReport;
  analysis?: { demo?: boolean };
}

/** Web Speech API 최소 타입 (dom lib에 없음) */
interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: MinimalSpeechEvent) => void) | null;
  start(): void;
  stop(): void;
}
interface MinimalSpeechEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
    SpeechRecognition?: new () => MinimalSpeechRecognition;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export function ReportApp({ zoneId }: { zoneId: number | null }) {
  const [step, setStep] = useState<Step>("lang");
  const [lang, setLang] = useState<ReporterLang>("ko");
  const [text, setText] = useState("");
  const [hazardHint, setHazardHint] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [photo, setPhoto] = useState<{ base64: string; mime: string; url: string } | null>(
    null,
  );
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRef = useRef<MinimalSpeechRecognition | null>(null);
  const speechTextRef = useRef("");
  const streamRef = useRef<MediaStream | null>(null);

  const t: ReportStrings = STRINGS[lang];
  const zone = zoneId ? getZone(zoneId) : null;
  const zoneDisplay = zone
    ? lang === "ko"
      ? zone.name
      : zone.nameEn
    : null;

  // 저장된 언어 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nmr-lang") as ReporterLang | null;
      if (saved && STRINGS[saved]) {
        setLang(saved);
        setStep("form");
      }
    } catch {
      /* 프라이빗 모드 등 — 무시 */
    }
  }, []);

  const pickLang = (code: ReporterLang) => {
    setLang(code);
    setStep("form");
    try {
      localStorage.setItem("nmr-lang", code);
    } catch {
      /* 무시 */
    }
  };

  // ── 전송 ───────────────────────────────────────────
  const submit = useCallback(
    async (opts: { audioBase64?: string; audioMime?: string; speechText?: string }) => {
      const bodyText = [opts.speechText?.trim() || text.trim() || undefined]
        .filter(Boolean)
        .join("");
      if (!bodyText && !opts.audioBase64 && !photo) {
        setError(t.needContent);
        return;
      }
      setSending(true);
      setError(null);
      try {
        const hinted =
          bodyText && hazardHint ? `${bodyText}\n(위험유형 힌트: ${hazardHint})` : bodyText;
        const data: SubmitResult = await apiSubmitReport({
          text: hinted,
          audioBase64: opts.audioBase64,
          audioMimeType: opts.audioMime,
          imageBase64: photo?.base64,
          imageMimeType: photo?.mime,
          zoneId: zoneId ?? undefined,
          lang,
          reporterAnonymous: anonymous,
        });
        setResult(data);
        setStep("done");
        setText("");
        setPhoto(null);
        setHazardHint(null);
      } catch {
        setError(t.errRetry);
      } finally {
        setSending(false);
      }
    },
    [text, photo, hazardHint, zoneId, lang, anonymous, t],
  );

  // ── 음성: 누르는 동안 녹음 ──────────────────────────
  const startRecording = useCallback(async () => {
    if (recording || sending) return;
    setError(null);
    speechTextRef.current = "";
    // Web Speech (브라우저 지원 시 — Whisper 실패 대비 텍스트 폴백)
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SR) {
      try {
        const sr = new SR();
        sr.lang = LANG_META.find((l) => l.code === lang)?.speech ?? "ko-KR";
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e: MinimalSpeechEvent) => {
          let s = "";
          for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
          speechTextRef.current = s;
        };
        sr.start();
        speechRef.current = sr;
      } catch {
        speechRef.current = null;
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      speechRef.current?.stop();
      setError(t.micDenied);
    }
  }, [recording, sending, lang, t]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    setRecording(false);
    try {
      speechRef.current?.stop();
    } catch {
      /* 무시 */
    }
    const rec = recorderRef.current;
    if (!rec) return;
    const done = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.stop();
    await done;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
    // 아주 짧은(실수) 녹음은 무시
    if (blob.size < 1500 && !speechTextRef.current) return;
    const audioBase64 = await blobToBase64(blob);
    // 떼는 즉시 자동 전송 (10초 목표의 핵심)
    void submit({
      audioBase64,
      audioMime: blob.type,
      speechText: speechTextRef.current,
    });
  }, [recording, submit]);

  // ── 사진 ───────────────────────────────────────────
  const onPhotoPicked = async (file: File | undefined) => {
    if (!file) return;
    const base64 = await blobToBase64(file);
    setPhoto({ base64, mime: file.type || "image/jpeg", url: URL.createObjectURL(file) });
  };

  /* ───────────────── 화면 ───────────────── */

  const frame = (children: React.ReactNode) => (
    <div className="min-h-dvh bg-[#05070d] md:flex md:items-center md:justify-center md:py-8">
      <div className="relative flex min-h-dvh w-full flex-col overflow-y-auto bg-console-bg md:min-h-0 md:h-[780px] md:w-[390px] md:rounded-[2.6rem] md:border-[7px] md:border-[#242c3a] md:shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        {/* 데스크톱 노치 */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 hidden h-5 w-28 -translate-x-1/2 rounded-full bg-[#242c3a] md:block" />
        {children}
      </div>
    </div>
  );

  // 1) 언어 선택
  if (step === "lang") {
    return frame(
      <main className="flex flex-1 flex-col gap-3 p-5 pt-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withBase("/brand/logo.webp")}
          alt=""
          className="mx-auto h-16 w-16 rounded-2xl shadow-lg"
        />
        <h1 className="text-center text-xl font-bold">
          아차사고 보고 <span className="text-console-muted">· Near-Miss Report</span>
        </h1>
        <p className="mb-2 text-center text-xs text-console-muted">
          언어 선택 · Select your language
        </p>
        {LANG_META.map((l) => (
          <button
            key={l.code}
            onClick={() => pickLang(l.code)}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-console-border bg-console-panel px-4 text-lg font-semibold pressable active:bg-console-border"
          >
            <span className="text-2xl">{l.flag}</span>
            {l.native}
          </button>
        ))}
      </main>,
    );
  }

  // 3) 완료 화면
  if (step === "done" && result) {
    const r = result.report;
    return frame(
      <main className="flex flex-1 flex-col gap-4 p-5 pt-10">
        <div className="points-pop mx-auto mt-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBase("/brand/mascot.webp")}
            alt=""
            className="mx-auto h-32 w-32 rounded-full shadow-xl"
          />
          <p className="mt-2 text-2xl font-extrabold text-risk-safe">{t.points}</p>
          <p className="mt-1 text-sm text-console-muted">{t.thanks}</p>
        </div>

        <section className="rounded-2xl border border-console-border bg-console-panel p-4">
          <h2 className="mb-3 text-sm font-bold text-console-muted">{t.confirmTitle}</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-console-muted">{t.hazardLabel}</dt>
              <dd className="font-bold">
                {HAZARD_UI.find((h) => h.type === r.hazardType)?.icon}{" "}
                {hazardLabel(r.hazardType, lang)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-console-muted">{t.severityLabel}</dt>
              <dd className="font-mono tracking-widest">
                <span className="text-risk-danger">{"●".repeat(r.severity)}</span>
                <span className="text-console-border">{"●".repeat(5 - r.severity)}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-console-muted">{t.zoneLabel}</dt>
              <dd className="text-right font-semibold">
                {zoneDisplay ?? `#${r.zoneId}`}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-console-muted">{t.summaryLabel}</dt>
              <dd className="rounded-lg bg-console-bg/70 p-2.5 leading-snug">
                {r.rawText}
                {lang !== "ko" && (
                  <p className="mt-1.5 border-t border-console-border/60 pt-1.5 text-xs text-console-muted">
                    🇰🇷 {r.translatedKo}
                  </p>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <button
          onClick={() => {
            setResult(null);
            setStep("form");
          }}
          className="mt-auto min-h-14 rounded-xl bg-risk-warning text-lg font-bold text-black pressable"
        >
          {t.another}
        </button>
      </main>,
    );
  }

  // 2) 보고 폼
  return frame(
    <main className="flex flex-1 flex-col gap-3.5 p-5 pt-9">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold">{t.appTitle}</h1>
          <p className="text-xs text-console-muted">{t.tagline}</p>
        </div>
        <button
          onClick={() => setStep("lang")}
          className="pressable flex h-11 min-w-11 items-center justify-center rounded-lg border border-console-border text-lg"
          aria-label="언어 변경"
        >
          {LANG_META.find((l) => l.code === lang)?.flag}
        </button>
      </header>

      <div
        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
          zone
            ? "border-risk-safe/40 bg-risk-safe/10 text-risk-safe"
            : "border-console-border bg-console-panel text-console-muted"
        }`}
      >
        📍 {zone ? t.reportingAt.replace("{zone}", zoneDisplay!) : t.zoneUnknown}
      </div>

      {/* 🎤 누르고 있는 동안 녹음 → 떼면 자동 전송 */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          void startRecording();
        }}
        onPointerUp={() => void stopRecording()}
        onPointerLeave={() => void stopRecording()}
        onContextMenu={(e) => e.preventDefault()}
        disabled={sending}
        className={`flex min-h-32 select-none flex-col items-center justify-center gap-1 rounded-2xl text-xl font-extrabold transition-colors ${
          recording
            ? "mic-recording bg-risk-danger text-white"
            : "bg-risk-warning text-black active:brightness-110"
        } disabled:opacity-50`}
        style={{ touchAction: "none" }}
      >
        <span className="text-4xl">🎤</span>
        {recording ? t.recording : t.speak}
        <span className="text-xs font-medium opacity-75">{t.holdToRecord}</span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-2xl border border-console-border bg-console-panel font-bold active:bg-console-border">
          <span className="text-2xl">📷</span>
          <span className="text-sm">{t.photo}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void onPhotoPicked(e.target.files?.[0])}
          />
        </label>
        <button
          onClick={() => document.getElementById("nmr-text")?.focus()}
          className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-console-border bg-console-panel font-bold active:bg-console-border"
        >
          <span className="text-2xl">✍️</span>
          <span className="text-sm">{t.write}</span>
        </button>
      </div>

      {photo && (
        <div className="flex items-center gap-2 rounded-xl border border-console-border bg-console-panel p-2 text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <span className="text-console-muted">{t.photoAttached}</span>
          <button
            onClick={() => setPhoto(null)}
            className="ml-auto px-2 text-console-muted"
            aria-label="remove photo"
          >
            ✕
          </button>
        </div>
      )}

      <textarea
        id="nmr-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.textPlaceholder}
        rows={2}
        className="w-full rounded-xl border border-console-border bg-console-panel p-3 text-base placeholder:text-console-muted/60 focus:border-risk-warning focus:outline-none"
      />

      {/* 위험 유형 빠른 선택 (선택) */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-console-muted">
          {t.hazardOptional}
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {HAZARD_UI.map((h) => (
            <button
              key={h.type}
              onClick={() => setHazardHint(hazardHint === h.type ? null : h.type)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl border text-[10px] leading-tight ${
                hazardHint === h.type
                  ? "border-risk-warning bg-risk-warning/20 font-bold"
                  : "border-console-border bg-console-panel text-console-muted"
              }`}
            >
              <span className="text-lg">{h.icon}</span>
              {h.labels[lang]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex min-h-12 items-center justify-between rounded-xl border border-console-border bg-console-panel px-3.5 text-sm font-semibold">
        🕶️ {t.anonymous}
        <button
          role="switch"
          aria-checked={anonymous}
          onClick={() => setAnonymous((v) => !v)}
          className={`h-7 w-12 rounded-full p-1 transition-colors ${
            anonymous ? "bg-risk-safe" : "bg-console-border"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white transition-transform ${
              anonymous ? "translate-x-5" : ""
            }`}
          />
        </button>
      </label>

      {error && (
        <p className="rounded-lg bg-risk-danger/15 px-3 py-2 text-sm text-risk-danger">
          {error}
        </p>
      )}

      <button
        onClick={() => void submit({})}
        disabled={sending}
        className="min-h-14 rounded-xl bg-risk-warning text-lg font-extrabold text-black pressable disabled:opacity-60"
      >
        {sending ? t.sending : `${t.send} ➤`}
      </button>
    </main>,
  );
}
