"use client";

/**
 * 크레인 내비 3D 구동부 (B-5)
 * - craneNav 스토어의 목표값으로 1도크 라이브 골리앗(liveGoliath)을 트윈
 * - SIM 모드 데모 작업자 보행 + 하중 하부 겹침 판정 → 인터록
 * - 겹침 지점은 바닥에 진한 빨강 데칼 (A-6 규칙: 겹침만 진하게)
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZONES, UNIT_METERS } from "@/data/zones";
import { toWorld, rotY } from "./coords";
import { liveGoliath } from "./Cranes";
import { craneNav, emitCrane, relayCrane } from "@/lib/crane/store";
import { sendInterlock } from "@/lib/crane/bridge";

const M = 1 / UNIT_METERS; // m → 씬 유닛

export function CraneNav() {
  const workerRef = useRef<THREE.Mesh>(null);
  const overlapRef = useRef<THREE.Mesh>(null);
  const overlapMat = useRef<THREE.MeshBasicMaterial>(null);
  const wasInterlock = useRef(false);
  const simPhase = useRef(0);
  const relayAcc = useRef(0);

  // 크레인 로컬 → 월드 변환 기준 (1도크 골리앗 포즈)
  const pose = useMemo(() => {
    const dock1 = ZONES.find((z) => z.id === 1)!;
    return {
      pos: toWorld(dock1.center.x + 1.2, dock1.center.z - 1.5),
      rot: rotY(dock1.footprint.rotation) + Math.PI,
    };
  }, []);

  useFrame((_, delta) => {
    const s = craneNav;
    // 정사영 출력 창(/projection) 10Hz 중계
    relayAcc.current += delta;
    if (relayAcc.current > 0.1) {
      relayAcc.current = 0;
      relayCrane();
    }
    // ── 목표값 트윈 (지수 수렴, LIVE는 crane_state가 직접 지배) ──
    if (s.mode === "SIM") {
      const k = 1 - Math.exp(-delta * 1.6);
      s.crane.travelM += (s.target.travelM - s.crane.travelM) * k;
      s.crane.trolleyM += (s.target.trolleyM - s.crane.trolleyM) * k;
      s.crane.hookM += (s.target.hookM - s.crane.hookM) * k;

      // 데모 작업자: 도크 바닥을 천천히 왕복
      simPhase.current += delta * 0.12;
      const w = s.workers[0];
      if (w) {
        w.xM = Math.sin(simPhase.current) * 40 - 10;
        w.zM = Math.cos(simPhase.current * 0.7) * 25;
      }
    }

    // ── liveGoliath 핸들 구동 ──
    if (liveGoliath.travel) liveGoliath.travel.position.z = s.crane.travelM * M;
    if (liveGoliath.trolley) {
      liveGoliath.trolley.position.x = THREE.MathUtils.clamp(
        s.crane.trolleyM * M,
        -liveGoliath.span / 2 + 0.3,
        liveGoliath.span / 2 - 0.3,
      );
    }
    if (liveGoliath.hook) {
      // hook_m(지면 높이) → 로컬 y: 트롤리(height)에서 내려온 거리
      const drop = THREE.MathUtils.clamp(
        liveGoliath.height - s.crane.hookM * M,
        0.4,
        liveGoliath.height - 0.1,
      );
      liveGoliath.hook.position.y = -drop;
      // 와이어 길이도 함께 (첫 자식 = 케이블 실린더)
      const cable = liveGoliath.hook.children[0] as THREE.Mesh | undefined;
      if (cable) {
        cable.scale.y = drop / (liveGoliath.height * 0.45);
        cable.position.y = drop / 2;
      }
    }

    // ── 하중 하부(후크 바로 아래) × 작업자 겹침 판정 ──
    const w = s.workers[0];
    let overlap = false;
    let ox = 0;
    let oz = 0;
    if (w) {
      // 후크 지면 투영 (크레인 로컬 m): x = 트롤리, z = 주행
      const dx = w.xM - s.crane.trolleyM;
      const dz = w.zM - s.crane.travelM;
      overlap = Math.hypot(dx, dz) < 8; // 반경 8m 위험 영역
      ox = (s.crane.trolleyM + w.xM) / 2;
      oz = (s.crane.travelM + w.zM) / 2;
    }
    if (overlap !== s.overlap) {
      s.overlap = overlap;
      s.interlock = overlap;
      if (s.mode === "LIVE") sendInterlock(overlap, "worker_under_load");
      emitCrane();
    }
    if (overlap !== wasInterlock.current) wasInterlock.current = overlap;

    // ── 시각화: 작업자 점 + 겹침 데칼 (크레인 로컬 → 월드) ──
    const cos = Math.cos(pose.rot);
    const sin = Math.sin(pose.rot);
    const toWorldLocal = (lxM: number, lzM: number): [number, number] => {
      const lx = lxM * M;
      const lz = lzM * M;
      return [pose.pos[0] + lx * cos + lz * sin, pose.pos[2] - lx * sin + lz * cos];
    };
    if (workerRef.current && w) {
      const [wx, wz] = toWorldLocal(w.xM, w.zM);
      workerRef.current.position.set(wx, 0.16, wz);
    }
    if (overlapRef.current && overlapMat.current) {
      overlapRef.current.visible = overlap;
      if (overlap) {
        const [cx, cz] = toWorldLocal(ox, oz);
        overlapRef.current.position.set(cx, 0.12, cz);
        overlapMat.current.opacity = 0.5 + 0.25 * Math.sin(performance.now() / 160);
      }
    }
  });

  return (
    <group>
      {/* 작업자 (SIM 데모/LIVE 태그) */}
      <mesh ref={workerRef} castShadow>
        <capsuleGeometry args={[0.05, 0.1, 3, 8]} />
        <meshStandardMaterial color="#ffd84d" emissive="#ffb300" emissiveIntensity={0.6} />
      </mesh>
      {/* 겹침 경고 데칼 — 겹친 부분만 진한 빨강 */}
      <mesh ref={overlapRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8} visible={false}>
        <circleGeometry args={[8 * M, 32]} />
        <meshBasicMaterial
          ref={overlapMat}
          color="#ff2a1e"
          transparent
          opacity={0.6}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
