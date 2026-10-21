"use client";

/**
 * 바닥 투영용 정사영 출력 창 (B-5)
 * 프로젝터로 도크 바닥에 쏘는 "위에서 본 화면" — 위험 영역과 경로만 그린다.
 * 데이터는 관제 대시보드가 BroadcastChannel("crane-nav")로 중계한다.
 */

import { useEffect, useRef } from "react";

interface Relay {
  crane: { travelM: number; trolleyM: number; hookM: number };
  target: { travelM: number; trolleyM: number; hookM: number };
  workers: { id: string; xM: number; zM: number }[];
  overlap: boolean;
  interlock: boolean;
  mode: "SIM" | "LIVE";
}

export default function ProjectionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<Relay | null>(null);

  useEffect(() => {
    const ch = new BroadcastChannel("crane-nav");
    ch.onmessage = (ev) => {
      dataRef.current = ev.data as Relay;
    };

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const W = (canvas.width = canvas.clientWidth * devicePixelRatio);
      const H = (canvas.height = canvas.clientHeight * devicePixelRatio);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      const d = dataRef.current;
      const cx = W / 2;
      const cy = H / 2;
      // 스케일: 가로 ±90m
      const s = W / 180;
      const toPx = (xM: number, zM: number): [number, number] => [cx + xM * s, cy - zM * s];

      if (!d) {
        ctx.fillStyle = "#555";
        ctx.font = `${16 * devicePixelRatio}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("관제 대시보드 연결 대기 중…", cx, cy);
        return;
      }

      const t = performance.now() / 1000;

      // ── 하중 이동 영역 (현재 → 목표 경로 사각형) ──
      const [x0, y0] = toPx(d.crane.trolleyM, d.crane.travelM);
      const [x1, y1] = toPx(d.target.trolleyM, d.target.travelM);
      const r = 8 * s; // 위험 반경 8m
      ctx.save();
      ctx.strokeStyle = d.overlap ? "#ff2a1e" : "#ffaa28";
      ctx.fillStyle = d.overlap ? "rgba(255,42,30,0.22)" : "rgba(255,170,40,0.14)";
      ctx.lineWidth = 3 * devicePixelRatio;
      ctx.setLineDash([16 * devicePixelRatio, 10 * devicePixelRatio]);
      ctx.lineDashOffset = (-t * 40 * devicePixelRatio) % 1000;
      // 경로 캡슐: 두 원 + 연결 선분
      const ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.arc(x0, y0, r, ang + Math.PI / 2, ang - Math.PI / 2);
      ctx.arc(x1, y1, r, ang - Math.PI / 2, ang + Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 진행 방향 화살표
      if (Math.hypot(x1 - x0, y1 - y0) > 8 * devicePixelRatio) {
        ctx.save();
        ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
        ctx.rotate(ang);
        ctx.fillStyle = "#ffcf50";
        const a = 14 * devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(a, 0);
        ctx.lineTo(-a * 0.6, a * 0.7);
        ctx.lineTo(-a * 0.6, -a * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 후크 현재 위치 십자
      ctx.strokeStyle = "#8ddcff";
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(x0 - 12 * devicePixelRatio, y0);
      ctx.lineTo(x0 + 12 * devicePixelRatio, y0);
      ctx.moveTo(x0, y0 - 12 * devicePixelRatio);
      ctx.lineTo(x0, y0 + 12 * devicePixelRatio);
      ctx.stroke();

      // ── 작업자 ──
      for (const w of d.workers) {
        const [wx, wy] = toPx(w.xM, w.zM);
        ctx.fillStyle = d.overlap ? "#ff2a1e" : "#ffd84d";
        ctx.beginPath();
        ctx.arc(wx, wy, 7 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
        // 안전 반경 링
        ctx.strokeStyle = d.overlap
          ? `rgba(255,42,30,${0.5 + 0.4 * Math.sin(t * 6)})`
          : "rgba(255,216,77,0.5)";
        ctx.beginPath();
        ctx.arc(wx, wy, 3 * s, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── 인터록 플래시 ──
      if (d.interlock) {
        ctx.fillStyle = `rgba(255,42,30,${0.1 + 0.08 * Math.sin(t * 8)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ff5a4e";
        ctx.font = `bold ${26 * devicePixelRatio}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("⛔ STOP — WORKER UNDER LOAD", cx, 50 * devicePixelRatio);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ch.close();
    };
  }, []);

  return (
    <main style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </main>
  );
}
