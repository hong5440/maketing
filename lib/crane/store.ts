/**
 * 크레인 내비 공유 스토어 (B-5) — 클라이언트 전용 경량 pub/sub
 *
 * Dashboard(UI)·CraneNav(3D)·/projection(정사영 창)이 같은 상태를 본다.
 * /projection은 별도 창이므로 BroadcastChannel로도 중계한다.
 */

import type { CraneCommand } from "./command";

export interface CraneNavState {
  mode: "SIM" | "LIVE";
  /** LIVE 브리지 연결 상태 */
  connected: boolean;
  /** 크레인 상태 (단위: 미터) */
  crane: {
    travelM: number; // 레일 방향 위치 (0 = 초기)
    trolleyM: number; // 거더 방향 위치 (0 = 중앙)
    hookM: number; // 후크 높이 (지면 기준)
  };
  /** 목표값 (명령 Confirm 시 설정, 3D에서 트윈) */
  target: { travelM: number; trolleyM: number; hookM: number };
  /** 작업자 위치 (크레인 로컬 좌표 m) — SIM은 데모 보행자, LIVE는 브리지 수신 */
  workers: { id: string; xM: number; zM: number }[];
  /** 하중 이동 영역과 작업자 겹침 */
  overlap: boolean;
  /** 인터록 발동 (겹침 시 LIVE에 정지 송신) */
  interlock: boolean;
  /** 명령 타임라인 (최근 우선) */
  timeline: { at: number; text: string; source: "voice" | "text" | "bridge" }[];
}

const HOOK_MIN = 2;
const HOOK_MAX = 80;
export const TRAVEL_RANGE: [number, number] = [-80, 80];
export const TROLLEY_RANGE: [number, number] = [-70, 70];

export const craneNav: CraneNavState = {
  mode: "SIM",
  connected: false,
  crane: { travelM: 0, trolleyM: -14, hookM: 30 },
  target: { travelM: 0, trolleyM: -14, hookM: 30 },
  workers: [{ id: "sim-1", xM: 20, zM: 18 }],
  overlap: false,
  interlock: false,
  timeline: [],
};

type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

export function subscribeCrane(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitCrane(): void {
  for (const fn of listeners) fn();
  relayCrane();
}

/** /projection 창으로만 중계 (리스너 알림 없음 — 3D 루프에서 10Hz 호출) */
export function relayCrane(): void {
  if (typeof window === "undefined") return;
  channel ??= new BroadcastChannel("crane-nav");
  channel.postMessage({
    crane: craneNav.crane,
    target: craneNav.target,
    workers: craneNav.workers,
    overlap: craneNav.overlap,
    interlock: craneNav.interlock,
    mode: craneNav.mode,
  });
}

/** Confirm된 명령을 목표값에 반영 */
export function applyCommand(cmd: CraneCommand, source: "voice" | "text"): void {
  const t = craneNav.target;
  const d = cmd.direction * cmd.amountM;
  if (cmd.axis === "TRAVEL")
    t.travelM = Math.min(TRAVEL_RANGE[1], Math.max(TRAVEL_RANGE[0], t.travelM + d));
  if (cmd.axis === "TROLLEY")
    t.trolleyM = Math.min(TROLLEY_RANGE[1], Math.max(TROLLEY_RANGE[0], t.trolleyM + d));
  if (cmd.axis === "HOIST")
    t.hookM = Math.min(HOOK_MAX, Math.max(HOOK_MIN, t.hookM + d));
  pushTimeline(`명령 실행: ${cmd.axis} ${cmd.direction > 0 ? "+" : "-"}${cmd.amountM}m`, source);
  emitCrane();
}

export function pushTimeline(
  text: string,
  source: "voice" | "text" | "bridge",
): void {
  craneNav.timeline = [{ at: Date.now(), text, source }, ...craneNav.timeline].slice(0, 30);
}
