"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZONES, getZone } from "@/data/zones";
import type { HazardType } from "@/lib/domain";
import { HAZARD_COLORS, riskColor } from "@/lib/dashboardStats";
import { mulberry32, toWorld } from "./coords";

/**
 * 위험도 오버레이:
 * - RiskHeatmap: 구역 중심 방사형 그라디언트를 캔버스에 그려 바닥에 블렌딩
 * - AlertPillars: 경보 구역의 맥동하는 빨간 반투명 기둥
 * - ReportDots: 개별 보고 점 (위험유형 색), 타임라인 재생 시 하늘에서 낙하 + 파동
 * - RiskBars: 구역별 건수 3D 막대
 */

export interface OverlayDot {
  id: string;
  zoneId: number;
  hazardType: HazardType;
  /** createdAt (ms) */
  t: number;
}

export interface OverlayProps {
  mode: "heatmap" | "bars" | "off";
  riskByZone: Record<number, number>;
  alertZoneIds: number[];
  dots: OverlayDot[];
  simNowMs: number;
  windowMs: number;
  /** 구역별 표시 건수 (막대 모드) */
  countByZone: Record<number, number>;
}

/* ── 히트맵 ──────────────────────────────────────────── */

function RiskHeatmap({ riskByZone }: { riskByZone: Record<number, number> }) {
  const SIZE = 512;
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, texture };
  }, []);

  useEffect(() => {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const zone of ZONES) {
      const v = riskByZone[zone.id] ?? 0;
      if (v < 10) continue; // 저위험 구역은 바닥을 물들이지 않음
      // 정규화 좌표 → 캔버스 (z 북쪽이 위 = 캔버스 y 반전)
      const cx = (zone.center.x / 100) * SIZE;
      const cy = ((100 - zone.center.z) / 100) * SIZE;
      const radius =
        ((Math.max(zone.footprint.w, zone.footprint.d) * 0.9 + 3.5) / 100) * SIZE;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const color = riskColor(v);
      const alpha = 0.12 + (v / 100) * 0.62;
      g.addColorStop(0, color.replace("rgb", "rgba").replace(")", `,${alpha})`));
      g.addColorStop(0.65, color.replace("rgb", "rgba").replace(")", `,${alpha * 0.5})`));
      g.addColorStop(1, color.replace("rgb", "rgba").replace(")", ",0)"));
      ctx.fillStyle = g;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
    texture.needsUpdate = true;
  }, [riskByZone, canvas, texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} renderOrder={5}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
        opacity={0.85}
      />
    </mesh>
  );
}

/* ── 경보 기둥 ───────────────────────────────────────── */

function AlertPillars({ zoneIds }: { zoneIds: number[] }) {
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    zoneIds.forEach((_, i) => {
      const mat = mats.current[i];
      const mesh = meshes.current[i];
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2 + i);
      if (mat) mat.opacity = 0.1 + pulse * 0.16;
      if (mesh) {
        const s = 1 + pulse * 0.1;
        mesh.scale.set(s, 1, s);
      }
    });
  });

  return (
    <group>
      {zoneIds.map((zoneId, i) => {
        const zone = getZone(zoneId);
        if (!zone) return null;
        const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
        const radius = Math.max(1.4, Math.min(zone.footprint.w, zone.footprint.d) * 0.55);
        return (
          <mesh
            key={zoneId}
            position={[wx, 3.5, wz]}
            ref={(n) => void (meshes.current[i] = n)}
            renderOrder={6}
          >
            <cylinderGeometry args={[radius, radius * 1.15, 7, 24, 1, true]} />
            <meshBasicMaterial
              ref={(n) => void (mats.current[i] = n)}
              color="#ef4444"
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── 보고 점 + 낙하/파동 ─────────────────────────────── */

const DROP_WALL_SEC = 0.75;
const RING_POOL = 20;

function ReportDots({
  dots,
  simNowMs,
  windowMs,
}: {
  dots: OverlayDot[];
  simNowMs: number;
  windowMs: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  /** 점이 처음 보이기 시작한 월클럭 시각 (낙하 애니메이션 기준) */
  const appearWall = useRef(new Map<string, number>());
  const ringMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const ringMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const ringState = useRef<{ start: number; x: number; z: number }[]>(
    Array.from({ length: RING_POOL }, () => ({ start: -10, x: 0, z: 0 })),
  );
  const ringCursor = useRef(0);
  const simNowRef = useRef(simNowMs);
  simNowRef.current = simNowMs;
  const windowRef = useRef(windowMs);
  windowRef.current = windowMs;

  // 결정적 점 위치 (구역 footprint 내부 산포)
  const positions = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const d of dots) {
      const zone = getZone(d.zoneId);
      if (!zone) continue;
      let h = 0;
      for (let i = 0; i < d.id.length; i++) h = (h * 33 + d.id.charCodeAt(i)) >>> 0;
      const rng = mulberry32(h);
      const { w, d: fd, rotation } = zone.footprint;
      const lx = (rng() - 0.5) * w * 0.85;
      const lz = (rng() - 0.5) * fd * 0.85;
      const rad = (rotation * Math.PI) / 180;
      const px = zone.center.x + lx * Math.cos(rad) - lz * Math.sin(rad);
      const pz = zone.center.z + lx * Math.sin(rad) + lz * Math.cos(rad);
      const [wx, , wz] = toWorld(px, pz);
      map.set(d.id, [wx, wz]);
    }
    return map;
  }, [dots]);

  const colorArray = useMemo(() => {
    const c = new THREE.Color();
    const arr = new Float32Array(dots.length * 3);
    dots.forEach((d, i) => {
      c.set(HAZARD_COLORS[d.hazardType] ?? "#8a93a3");
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [dots]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
    mesh.instanceColor.needsUpdate = true;
  }, [colorArray]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const wall = clock.elapsedTime;
    const tmp = new THREE.Object3D();
    const simNow = simNowRef.current;
    const win = windowRef.current;
    dots.forEach((d, i) => {
      const pos = positions.get(d.id);
      const visible = pos && d.t <= simNow && d.t > simNow - win;
      if (!visible) {
        appearWall.current.delete(d.id);
        tmp.position.set(0, -100, 0);
        tmp.scale.setScalar(0.0001);
      } else {
        let start = appearWall.current.get(d.id);
        if (start === undefined) {
          start = wall;
          appearWall.current.set(d.id, start);
          // 파동 링 발사 (시뮬레이션이 "지금" 지나간 보고만 — 과거 일괄 표시는 제외)
          if (simNow - d.t < win * 0.04) {
            const idx = ringCursor.current % RING_POOL;
            ringCursor.current++;
            ringState.current[idx] = { start: wall, x: pos![0], z: pos![1] };
          }
        }
        const age = wall - start;
        const k = Math.min(1, age / DROP_WALL_SEC);
        const ease = 1 - Math.pow(1 - k, 3);
        const y = 0.22 + (1 - ease) * 9;
        tmp.position.set(pos![0], y, pos![1]);
        tmp.scale.setScalar(0.11);
      }
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.count = dots.length;
    mesh.instanceMatrix.needsUpdate = true;

    // 파동 링 갱신
    ringState.current.forEach((r, i) => {
      const m = ringMeshes.current[i];
      const mat = ringMats.current[i];
      if (!m || !mat) return;
      const age = wall - r.start;
      if (age < 0 || age > 1.3) {
        m.visible = false;
        return;
      }
      m.visible = true;
      m.position.set(r.x, 0.12, r.z);
      const s = 0.4 + age * 3.2;
      m.scale.set(s, s, s);
      mat.opacity = 0.55 * (1 - age / 1.3);
    });
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(dots.length, 1)]}
        frustumCulled={false}
        renderOrder={7}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {Array.from({ length: RING_POOL }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(n) => void (ringMeshes.current[i] = n)}
          renderOrder={7}
        >
          <ringGeometry args={[0.85, 1, 32]} />
          <meshBasicMaterial
            ref={(n) => void (ringMats.current[i] = n)}
            color="#ffffff"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── 3D 막대 ─────────────────────────────────────────── */

function RiskBars({
  countByZone,
  riskByZone,
}: {
  countByZone: Record<number, number>;
  riskByZone: Record<number, number>;
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const targets = useRef<number[]>(ZONES.map(() => 0.05));

  useEffect(() => {
    ZONES.forEach((zone, i) => {
      const count = countByZone[zone.id] ?? 0;
      targets.current[i] = 0.08 + count * 0.22;
    });
  }, [countByZone]);

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-6 * delta);
    ZONES.forEach((_, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const h = THREE.MathUtils.lerp(mesh.scale.y, targets.current[i], k);
      mesh.scale.y = h;
      mesh.position.y = h / 2 + 0.1;
    });
  });

  return (
    <group>
      {ZONES.map((zone, i) => {
        const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
        const w = Math.min(zone.footprint.w, zone.footprint.d) * 0.45;
        const side = Math.max(0.8, Math.min(1.6, w));
        return (
          <mesh
            key={zone.id}
            position={[wx, 0.1, wz]}
            scale={[1, 0.05, 1]}
            ref={(n) => void (meshes.current[i] = n)}
            renderOrder={6}
          >
            <boxGeometry args={[side, 1, side]} />
            <meshStandardMaterial
              color={riskColor(riskByZone[zone.id] ?? 0)}
              transparent
              opacity={0.82}
              emissive={riskColor(riskByZone[zone.id] ?? 0)}
              emissiveIntensity={0.25}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── 조립 ────────────────────────────────────────────── */

export function RiskOverlays({ overlay }: { overlay: OverlayProps }) {
  if (overlay.mode === "off") return null;
  return (
    <group>
      {overlay.mode === "heatmap" && <RiskHeatmap riskByZone={overlay.riskByZone} />}
      {overlay.mode === "heatmap" && (
        <ReportDots
          dots={overlay.dots}
          simNowMs={overlay.simNowMs}
          windowMs={overlay.windowMs}
        />
      )}
      {overlay.mode === "bars" && (
        <RiskBars countByZone={overlay.countByZone} riskByZone={overlay.riskByZone} />
      )}
      <AlertPillars zoneIds={overlay.alertZoneIds} />
    </group>
  );
}
