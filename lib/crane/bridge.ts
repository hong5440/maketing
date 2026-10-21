/**
 * LIVE 모드 Python 브리지 클라이언트 (B-5) — docs/protocol.md 기준
 *
 * WebSocket으로 실물 크레인 모형(라즈베리파이 등)의 브리지와 통신한다.
 * 수신: crane_state / worker / operator_input
 * 송신: command / interlock / heartbeat(1초)
 * 연결이 끊기면 상태에 표시하고 3초 간격으로 재접속을 시도한다.
 */

import { craneNav, emitCrane, pushTimeline } from "./store";
import { parseCraneCommandDemo } from "./command";

const WS_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CRANE_WS) ||
  "ws://localhost:8765";

let ws: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wantLive = false;

export function startBridge(): void {
  wantLive = true;
  connect();
}

export function stopBridge(): void {
  wantLive = false;
  cleanup();
  craneNav.connected = false;
  emitCrane();
}

function cleanup(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  heartbeatTimer = reconnectTimer = null;
  ws?.close();
  ws = null;
}

function connect(): void {
  if (!wantLive || typeof window === "undefined") return;
  try {
    ws = new WebSocket(WS_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    craneNav.connected = true;
    pushTimeline("LIVE 브리지 연결됨", "bridge");
    emitCrane();
    heartbeatTimer = setInterval(() => {
      send({ type: "heartbeat", ts: Date.now() });
    }, 1000);
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        type: string;
        [k: string]: unknown;
      };
      if (msg.type === "crane_state") {
        const s = msg as unknown as { travel_m: number; trolley_m: number; hook_m: number };
        craneNav.crane = { travelM: s.travel_m, trolleyM: s.trolley_m, hookM: s.hook_m };
        craneNav.target = { ...craneNav.crane };
        emitCrane();
      } else if (msg.type === "worker") {
        const w = msg as unknown as { id: string; x_m: number; z_m: number };
        const rest = craneNav.workers.filter((v) => v.id !== w.id);
        craneNav.workers = [...rest, { id: w.id, xM: w.x_m, zM: w.z_m }];
        emitCrane();
      } else if (msg.type === "operator_input") {
        const o = msg as unknown as { text: string; lang?: string };
        const cmd = parseCraneCommandDemo(o.text, o.lang);
        pushTimeline(
          `조작반 입력: ${o.text}${cmd ? "" : " (해석 불가)"}`,
          "bridge",
        );
        emitCrane();
      }
    } catch {
      /* 잘못된 메시지 무시 */
    }
  };

  ws.onclose = ws.onerror = () => {
    if (craneNav.connected) {
      craneNav.connected = false;
      pushTimeline("LIVE 브리지 연결 끊김", "bridge");
      emitCrane();
    }
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    scheduleReconnect();
  };
}

function scheduleReconnect(): void {
  if (!wantLive) return;
  reconnectTimer = setTimeout(connect, 3000);
}

export function send(obj: Record<string, unknown>): void {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

/** Confirm된 명령을 브리지로 전달 (LIVE 모드) */
export function sendCommand(axis: string, direction: number, amountM: number): void {
  send({ type: "command", axis, direction, amount_m: amountM, ts: Date.now() });
}

/** 인터록: 작업자 겹침 시 즉시 정지 */
export function sendInterlock(active: boolean, reason: string): void {
  send({ type: "interlock", active, reason, ts: Date.now() });
}
