"use client";

/**
 * 콘텐츠 5종의 3D 오버레이 (B-6)
 * - TransportRoute: 15번 적치장 → 1도크 블록 운송 경로 + 트랜스포터 이동
 *   + 보행 교차 경고 링
 * - MemoryMarkers: 사고 기억 지도 — 유형별 대표 8건 마커
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { toWorld } from "./coords";
import {
  MEMORY_INCIDENTS,
  TRANSPORT_CROSSINGS,
  TRANSPORT_ROUTE,
  type MemoryIncident,
} from "@/lib/contents";
import { ZONES } from "@/data/zones";

/* ── ③ 블록 운송 내비 ────────────────────────────── */

export function TransportRoute() {
  const transporterRef = useRef<THREE.Group>(null);
  const ringMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const dashMat = useRef<THREE.MeshBasicMaterial>(null);

  // 경로 세그먼트 (월드 좌표, 누적 길이 포함)
  const path = useMemo(() => {
    const pts = TRANSPORT_ROUTE.map((p) => {
      const [x, , z] = toWorld(p.x, p.z);
      return new THREE.Vector2(x, z);
    });
    const segs: { a: THREE.Vector2; b: THREE.Vector2; len: number; acc: number }[] = [];
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = pts[i].distanceTo(pts[i + 1]);
      segs.push({ a: pts[i], b: pts[i + 1], len, acc });
      acc += len;
    }
    return { segs, total: acc };
  }, []);

  // 점선 경로 텍스처
  const dashTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 8;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 8);
    ctx.fillStyle = "#58d6ff";
    ctx.fillRect(0, 1, 38, 6);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // 경로 점선 흐름
    if (dashMat.current?.map) dashMat.current.map.offset.x = -t * 0.35;
    // 트랜스포터 왕복
    if (transporterRef.current) {
      const period = 26;
      const phase = (t % period) / period;
      const fwd = phase < 0.5;
      const d = (fwd ? phase * 2 : (1 - phase) * 2) * path.total;
      const seg = path.segs.find((s) => d >= s.acc && d <= s.acc + s.len) ?? path.segs[0];
      const k = THREE.MathUtils.clamp((d - seg.acc) / seg.len, 0, 1);
      const x = THREE.MathUtils.lerp(seg.a.x, seg.b.x, k);
      const z = THREE.MathUtils.lerp(seg.a.y, seg.b.y, k);
      transporterRef.current.position.set(x, 0.14, z);
      const ang = Math.atan2(-(seg.b.y - seg.a.y), seg.b.x - seg.a.x);
      transporterRef.current.rotation.y = fwd ? ang : ang + Math.PI;
    }
    // 교차 경고 링 점멸
    ringMats.current.forEach((m, i) => {
      if (m) m.opacity = 0.35 + 0.3 * Math.sin(t * 3 + i * 1.4);
    });
  });

  return (
    <group>
      {/* 경로 점선 */}
      {path.segs.map((s, i) => {
        const cx = (s.a.x + s.b.x) / 2;
        const cz = (s.a.y + s.b.y) / 2;
        const ang = Math.atan2(-(s.b.y - s.a.y), s.b.x - s.a.x);
        return (
          <mesh key={i} position={[cx, 0.12, cz]} rotation={[-Math.PI / 2, 0, ang]} renderOrder={6}>
            <planeGeometry args={[s.len, 0.22]} />
            <meshBasicMaterial
              ref={i === 0 ? dashMat : undefined}
              map={dashTex}
              transparent
              opacity={0.85}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      {/* 트랜스포터 + 블록 */}
      <group ref={transporterRef}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.9, 0.12, 0.42]} />
          <meshStandardMaterial color="#d8481f" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.7, 0.3, 0.36]} />
          <meshStandardMaterial color="#5a768c" roughness={0.8} />
        </mesh>
      </group>
      {/* 보행 교차 경고 */}
      {TRANSPORT_CROSSINGS.map((c, i) => {
        const [x, , z] = toWorld(c.x, c.z);
        return (
          <group key={i}>
            <mesh position={[x, 0.13, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
              <ringGeometry args={[0.5, 0.75, 28]} />
              <meshBasicMaterial
                ref={(n) => void (ringMats.current[i] = n)}
                color="#ffb020"
                transparent
                opacity={0.5}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <Html position={[x, 1.1, z]} center zIndexRange={[18, 0]}>
              <span className="transport-warn">⚠ {c.label}</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* ── ⑤ 사고 기억 지도 ────────────────────────────── */

export function MemoryMarkers({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (incident: MemoryIncident) => void;
}) {
  return (
    <group>
      {MEMORY_INCIDENTS.map((inc) => {
        const zone = ZONES.find((z) => z.id === inc.zoneId);
        if (!zone) return null;
        const [x, , z] = toWorld(zone.center.x + 0.8, zone.center.z + 0.8);
        return (
          <Html key={inc.id} position={[x, 1.2, z]} center zIndexRange={[18, 0]} style={{ pointerEvents: "auto" }}>
            <button
              onClick={() => onSelect?.(inc)}
              className={`memory-pin ${selectedId === inc.id ? "memory-pin-selected" : ""}`}
              title={`${inc.type} — ${inc.summary}`}
              aria-label={`사고 기억: ${inc.type}`}
            >
              ◈ {inc.type}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
