"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ZONES } from "@/data/zones";
import { BASE_PATH } from "@/lib/basePath";

/**
 * 구역별 보고 QR 패널 — 심사위원이 폰으로 직접 찍어 /report?zone=N 으로 들어가게.
 */
export function QrPanel({ onClose }: { onClose: () => void }) {
  const [codes, setCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const origin = window.location.origin;
      const out: Record<number, string> = {};
      for (const zone of ZONES) {
        out[zone.id] = await QRCode.toDataURL(`${origin}${BASE_PATH}/report?zone=${zone.id}`, {
          margin: 1,
          width: 160,
          color: { dark: "#0a0f1a", light: "#ffffff" },
        });
      }
      if (!cancelled) setCodes(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[86%] w-[min(880px,92%)] overflow-y-auto rounded-2xl border border-console-border bg-console-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center">
          <div>
            <h2 className="text-base font-bold">📱 구역별 보고 QR</h2>
            <p className="text-xs text-console-muted">
              휴대폰으로 스캔하면 해당 구역이 자동 입력된 보고 화면이 열립니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="pressable ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-console-muted hover:bg-console-border/40 hover:text-console-text"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {ZONES.map((zone) => (
            <div
              key={zone.id}
              className="flex flex-col items-center rounded-xl border border-console-border bg-console-bg/60 p-2.5 text-center"
            >
              {codes[zone.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={codes[zone.id]}
                  alt={`${zone.name} QR`}
                  className="w-full rounded-md bg-white p-1"
                />
              ) : (
                <div className="aspect-square w-full animate-pulse rounded-md bg-console-border" />
              )}
              <p className="mt-1.5 text-[11px] font-semibold leading-tight">
                <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-risk-warning text-[10px] font-bold text-black">
                  {zone.id}
                </span>
                {zone.name.split("·")[0].split(" 및 ")[0]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
