"use client";

import { withBase } from "@/lib/basePath";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getZone } from "@/data/zones";
import type { ReporterLang } from "@/lib/domain";
import { LANG_LABELS } from "@/lib/domain";
import { HAZARD_UI, LANG_META } from "@/lib/reportI18n";
import { apiGenerateTbm } from "@/lib/clientApi";
import { MiniMap } from "./MiniMap";

/**
 * 구역별 TBM(작업 전 안전미팅) 자료 — A4 인쇄용 밝은 레이아웃.
 * 한국어 + 선택한 근로자 언어 좌우 병기, 안전관리자 편집/승인(Human-in-the-loop).
 */

type LocalizedText = Record<string, string>;

interface TBMDocument {
  zoneId: number;
  date: string;
  keyRisks: { hazardType: string; title: LocalizedText; detail: LocalizedText }[];
  cases: LocalizedText[];
  checklist: LocalizedText[];
  slogan: LocalizedText;
}

/** 작업 예정 협력사 (데모 더미 — 구역 id로 결정적 선택) */
const PARTNERS = [
  "한빛중공업(주)",
  "거제산업개발",
  "대양기공",
  "세명ENG",
  "협성테크",
  "동남해양기술",
  "우주산업안전",
  "금호도장(주)",
];
function partnersFor(zoneId: number): string[] {
  return [PARTNERS[zoneId % PARTNERS.length], PARTNERS[(zoneId * 3 + 2) % PARTNERS.length]].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
}

function formatDateKo(date: string): string {
  const d = new Date(`${date}T09:00:00+09:00`);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.replace(/-/g, ". ")} (${days[d.getDay()]})`;
}

/** ko + 선택 언어 좌우 병기 (편집 모드에선 textarea) */
function Bilingual({
  text,
  lang,
  editing,
  onChange,
  koClass = "",
  langClass = "",
}: {
  text: LocalizedText;
  lang: ReporterLang;
  editing: boolean;
  onChange: (next: LocalizedText) => void;
  koClass?: string;
  langClass?: string;
}) {
  const hasLang = lang !== "ko" && text[lang];
  if (editing) {
    return (
      <div className={`grid gap-2 ${hasLang ? "sm:grid-cols-2" : ""}`}>
        <textarea
          value={text.ko}
          onChange={(e) => onChange({ ...text, ko: e.target.value })}
          rows={2}
          className="w-full rounded border border-amber-400 bg-amber-50 p-1.5 text-sm"
        />
        {hasLang && (
          <textarea
            value={text[lang]}
            onChange={(e) => onChange({ ...text, [lang]: e.target.value })}
            rows={2}
            className="w-full rounded border border-amber-400 bg-amber-50 p-1.5 text-sm"
          />
        )}
      </div>
    );
  }
  return (
    <div className={`grid gap-x-4 gap-y-0.5 ${hasLang ? "sm:grid-cols-2" : ""}`}>
      <p className={koClass}>{text.ko}</p>
      {hasLang && <p className={`text-gray-600 ${langClass}`}>{text[lang]}</p>}
    </div>
  );
}

export function TbmView({ zoneId }: { zoneId: number }) {
  const zone = getZone(zoneId);
  const [tbm, setTbm] = useState<TBMDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lang, setLang] = useState<ReporterLang>("vi");
  const [editing, setEditing] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    apiGenerateTbm(zoneId)
      .then((d) => {
        setTbm(d.tbm as TBMDocument);
        // 생성된 언어 중 첫 외국어를 기본 선택
        const langs = Object.keys(d.tbm.slogan).filter((l) => l !== "ko");
        if (langs.length > 0) setLang(langs[0] as ReporterLang);
      })
      .catch(() => setLoadError("TBM 자료를 불러오지 못했습니다. 새로고침 해주세요."));
  }, [zoneId]);

  const availableLangs = useMemo(
    () =>
      tbm
        ? (Object.keys(tbm.slogan).filter((l) => l !== "ko") as ReporterLang[])
        : [],
    [tbm],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // ── TTS: 한국어 → 선택 언어 순서로 핵심 위험/체크리스트/구호 낭독 ──
  const speak = useCallback(() => {
    if (!tbm) return;
    const synth = window.speechSynthesis;
    if (!synth) {
      showToast("이 브라우저는 음성 읽기를 지원하지 않습니다");
      return;
    }
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const parts: { text: string; code: ReporterLang }[] = [];
    const push = (t: LocalizedText) => {
      parts.push({ text: t.ko, code: "ko" });
      if (lang !== "ko" && t[lang]) parts.push({ text: t[lang], code: lang });
    };
    tbm.keyRisks.forEach((r) => {
      push(r.title);
      push(r.detail);
    });
    tbm.checklist.forEach(push);
    push(tbm.slogan);

    setSpeaking(true);
    let i = 0;
    const next = () => {
      if (i >= parts.length) {
        setSpeaking(false);
        return;
      }
      const p = parts[i++];
      const u = new SpeechSynthesisUtterance(p.text);
      u.lang = LANG_META.find((l) => l.code === p.code)?.speech ?? "ko-KR";
      u.rate = 0.95;
      u.onend = next;
      u.onerror = next;
      synth.speak(u);
    };
    synth.cancel();
    next();
  }, [tbm, lang, speaking]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!zone) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-100 text-gray-500">
        존재하지 않는 구역입니다: {zoneId}
      </main>
    );
  }

  const partners = partnersFor(zoneId);

  return (
    <div className="min-h-dvh bg-gray-200 py-6 text-gray-900 print:bg-white print:py-0">
      {/* ── 컨트롤 바 (인쇄 제외) ── */}
      <div className="no-print mx-auto mb-4 flex w-[min(210mm,94%)] flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 shadow-sm">
          병기 언어
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as ReporterLang)}
            className="rounded border border-gray-300 px-1.5 py-0.5"
          >
            {availableLangs.map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setEditing((v) => !v)}
          disabled={!!approvedAt}
          className={`pressable rounded-lg px-3 py-2 font-semibold shadow-sm ${
            editing ? "bg-amber-400 text-black" : "bg-white hover:bg-gray-50"
          } disabled:opacity-40`}
        >
          {editing ? "✔ 편집 완료" : "✏️ 편집"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setApprovedAt(new Date().toLocaleString("ko-KR"));
            showToast("안전관리자 승인 완료");
          }}
          disabled={!!approvedAt || !tbm}
          className="pressable rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
        >
          ✅ 승인
        </button>
        <button
          onClick={speak}
          disabled={!tbm}
          className={`pressable rounded-lg px-3 py-2 font-semibold shadow-sm ${
            speaking ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          {speaking ? "⏹ 읽기 중지" : "🔊 읽어주기"}
        </button>
        <button
          onClick={() => window.print()}
          className="pressable rounded-lg bg-white px-3 py-2 font-semibold shadow-sm hover:bg-gray-50"
        >
          🖨️ 인쇄
        </button>
        <button
          onClick={() =>
            showToast(`${zone.headcount}명의 근로자 휴대폰으로 전송했습니다 (데모)`)
          }
          className="pressable rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          📲 근로자 휴대폰으로 보내기
        </button>
      </div>

      {/* ── A4 본문 ── */}
      <main className="tbm-page mx-auto w-[min(210mm,94%)] rounded-lg bg-white p-[12mm] shadow-lg print:w-full print:rounded-none print:p-0 print:shadow-none">
        {!tbm && !loadError && (
          <p className="animate-pulse py-20 text-center text-gray-400">
            AI가 이 구역의 최근 아차사고를 바탕으로 TBM 자료를 만드는 중…
          </p>
        )}
        {loadError && <p className="py-20 text-center text-red-600">{loadError}</p>}

        {tbm && (
          <>
            {/* 헤더 */}
            <header className="border-b-2 border-gray-900 pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={withBase("/brand/logo.webp")}
                    alt=""
                    className="mt-0.5 h-12 w-12 rounded-xl"
                  />
                  <div>
                    <p className="text-sm text-gray-500">{formatDateKo(tbm.date)} · TBM 작업 전 안전미팅</p>
                    <h1 className="text-2xl font-extrabold">
                      {zone.id}. {zone.name}
                    </h1>
                    <p className="text-xs text-gray-500">{zone.nameEn}</p>
                  </div>
                </div>
                <div className="text-right">
                  {approvedAt ? (
                    <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      ✅ 안전관리자 승인됨 · {approvedAt}
                    </span>
                  ) : (
                    <span className="inline-block rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      ⚠ AI 자동 생성 · 안전관리자 검토 필요
                    </span>
                  )}
                  <p className="mt-1.5 text-xs text-gray-600">
                    작업 예정 협력사:{" "}
                    {partners.map((p) => (
                      <span
                        key={p}
                        className="ml-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </header>

            {/* 1. 오늘의 핵심 위험 */}
            <section className="mt-4">
              <h2 className="mb-2 text-sm font-extrabold tracking-wide text-red-700">
                ① 오늘의 핵심 위험
              </h2>
              <div className="space-y-2.5">
                {tbm.keyRisks.map((risk, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-red-200 bg-red-50/60 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xl">
                        {HAZARD_UI.find((h) => h.type === risk.hazardType)?.icon ?? "⚠️"}
                      </span>
                      <Bilingual
                        text={risk.title}
                        lang={lang}
                        editing={editing}
                        onChange={(next) =>
                          setTbm((t) => {
                            if (!t) return t;
                            const keyRisks = [...t.keyRisks];
                            keyRisks[i] = { ...keyRisks[i], title: next };
                            return { ...t, keyRisks };
                          })
                        }
                        koClass="font-bold"
                        langClass="font-semibold"
                      />
                    </div>
                    <Bilingual
                      text={risk.detail}
                      lang={lang}
                      editing={editing}
                      onChange={(next) =>
                        setTbm((t) => {
                          if (!t) return t;
                          const keyRisks = [...t.keyRisks];
                          keyRisks[i] = { ...keyRisks[i], detail: next };
                          return { ...t, keyRisks };
                        })
                      }
                      koClass="text-sm"
                      langClass="text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 2. 실제 아차사고 사례 */}
            {tbm.cases.length > 0 && (
              <section className="mt-4">
                <h2 className="mb-2 text-sm font-extrabold tracking-wide text-gray-700">
                  ② 우리 구역에서 실제 있었던 아차사고 (익명)
                </h2>
                <div className="space-y-2.5">
                  {tbm.cases.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <MiniMap zoneId={zoneId} size={104} />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[11px] font-bold text-gray-400">
                          사례 {i + 1} · {zone.name} 내 발생 위치
                        </p>
                        <Bilingual
                          text={c}
                          lang={lang}
                          editing={editing}
                          onChange={(next) =>
                            setTbm((t) => {
                              if (!t) return t;
                              const cases = [...t.cases];
                              cases[i] = next;
                              return { ...t, cases };
                            })
                          }
                          koClass="text-sm"
                          langClass="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. 작업 전 체크리스트 */}
            <section className="mt-4">
              <h2 className="mb-2 text-sm font-extrabold tracking-wide text-gray-700">
                ③ 작업 전 체크리스트
              </h2>
              <ul className="space-y-1.5">
                {tbm.checklist.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() =>
                        setChecked((s) => {
                          const n = new Set(s);
                          if (n.has(i)) n.delete(i);
                          else n.add(i);
                          return n;
                        })
                      }
                      className="mt-0.5 h-5 w-5 accent-emerald-600"
                      aria-label={`체크리스트 ${i + 1}`}
                    />
                    <div className={`flex-1 ${checked.has(i) ? "opacity-50" : ""}`}>
                      <Bilingual
                        text={item}
                        lang={lang}
                        editing={editing}
                        onChange={(next) =>
                          setTbm((t) => {
                            if (!t) return t;
                            const checklist = [...t.checklist];
                            checklist[i] = next;
                            return { ...t, checklist };
                          })
                        }
                        koClass="text-sm"
                        langClass="text-sm"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* 4. 구호 */}
            <section className="mt-5 rounded-xl bg-gray-900 px-4 py-4 text-center text-white print:border print:border-gray-900 print:bg-white print:text-gray-900">
              {editing ? (
                <Bilingual
                  text={tbm.slogan}
                  lang={lang}
                  editing
                  onChange={(next) => setTbm((t) => (t ? { ...t, slogan: next } : t))}
                />
              ) : (
                <>
                  <p className="text-lg font-extrabold">“{tbm.slogan.ko}”</p>
                  {lang !== "ko" && tbm.slogan[lang] && (
                    <p className="mt-1 text-sm opacity-80">“{tbm.slogan[lang]}”</p>
                  )}
                </>
              )}
            </section>

            {/* 5. 서명란 */}
            <section className="mt-5 grid grid-cols-3 gap-4 border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
              {["안전관리자", "작업반장", "참석자 대표"].map((role) => (
                <div key={role}>
                  <p className="mb-7 font-semibold text-gray-700">{role}</p>
                  <p className="border-t border-gray-400 pt-1">(서명)</p>
                </div>
              ))}
            </section>

            <footer className="mt-3 text-center text-[10px] text-gray-400">
              아차사고 레이더 · 최근 8주 보고 데이터 기반 자동 생성 ·{" "}
              {approvedAt ? `승인 ${approvedAt}` : "승인 전 배포 금지"}
            </footer>
          </>
        )}
      </main>

      {/* 토스트 */}
      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
