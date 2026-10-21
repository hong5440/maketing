"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZONES, getZone } from "@/data/zones";
import type { HazardType } from "@/lib/domain";
import { HAZARD_COLORS, riskColor } from "@/lib/dashboardStats";
import { mulberry32, rotY, toWorld } from "./coords";

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
      // 바닥 데칼: 25~35% 불투명, 가장자리 부드럽게
      const alpha = 0.22 + (v / 100) * 0.13;
      g.addColorStop(0, color.replace("rgb", "rgba").replace(")", `,${alpha})`));
      g.addColorStop(0.6, color.replace("rgb", "rgba").replace(")", `,${alpha * 0.55})`));
      g.addColorStop(1, color.replace("rgb", "rgba").replace(")", ",0)"));
      ctx.fillStyle = g;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      // 위험 단계 경계: 얇은 등고선 2개
      for (const k of [0.5, 0.82]) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * k, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace("rgb", "rgba").replace(")", ",0.4)");
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
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
  const mats = useRef<(THREE.ShaderMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    zoneIds.forEach((_, i) => {
      const mat = mats.current[i];
      // 천천히 맥동 (약 0.25Hz)
      if (mat) mat.uniforms.uOpacity.value = 0.26 + 0.1 * Math.sin(t * 1.6 + i * 1.7);
    });
  });

  return (
    <group>
      {zoneIds.map((zoneId, i) => {
        const zone = getZone(zoneId);
        if (!zone) return null;
        const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
        const radius = Math.max(1.1, Math.min(zone.footprint.w, zone.footprint.d) * 0.48);
        const H = 1.7; // 낮춘 높이 (~42m)
        return (
          <mesh key={zoneId} position={[wx, H / 2, wz]} renderOrder={6}>
            <cylinderGeometry args={[radius * 0.96, radius * 1.08, H, 28, 1, true]} />
            <shaderMaterial
              ref={(n) => void (mats.current[i] = n)}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              uniforms={{
                uOpacity: { value: 0.3 },
                uColor: { value: new THREE.Color("#ef4444") },
              }}
              vertexShader={`
                varying float vY;
                void main() {
                  vY = uv.y;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={`
                uniform float uOpacity;
                uniform vec3 uColor;
                varying float vY;
                void main() {
                  float a = uOpacity * pow(1.0 - vY, 1.7);
                  gl_FragColor = vec4(uColor, a);
                }
              `}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** 경보/선택 구역 바닥 윤곽선 — 건물 색은 그대로, 테두리만 강조 */
export function ZoneOutlines({
  alertZoneIds,
  selectedZoneId,
}: {
  alertZoneIds: number[];
  selectedZoneId: number | null;
}) {
  const items = useMemo(() => {
    const list: { zoneId: number; color: string }[] = alertZoneIds.map((id) => ({
      zoneId: id,
      color: "#ff5a4e",
    }));
    if (selectedZoneId != null && !alertZoneIds.includes(selectedZoneId))
      list.push({ zoneId: selectedZoneId, color: "#3cc7ff" });
    return list;
  }, [alertZoneIds, selectedZoneId]);

  return (
    <group>
      {items.map(({ zoneId, color }) => {
        const zone = getZone(zoneId);
        if (!zone) return null;
        const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
        const { w, d, rotation } = zone.footprint;
        const T = 0.07;
        const edges: [number, number, number, number][] = [
          [0, d / 2, w + T, T],
          [0, -d / 2, w + T, T],
          [w / 2, 0, T, d + T],
          [-w / 2, 0, T, d + T],
        ];
        return (
          <group
            key={`${zoneId}-${color}`}
            position={[wx, 0.11, wz]}
            rotation={[0, (rotation * Math.PI) / 180, 0]}
          >
            {edges.map(([ex, ez, ew, ed], i) => (
              <mesh key={i} position={[ex, 0, ez]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
                <planeGeometry args={[ew, ed]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.9}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** 크레인 하중 이동 영역 바닥 데칼 (1도크 골리앗) + 진행 방향 화살표 */
export function CraneSweptDecal() {
  // Cranes.tsx의 라이브 골리앗과 같은 포즈 (dock1 기준)
  const { position, rotation, span } = useMemo(() => {
    const dock1 = ZONES.find((z) => z.id === 1)!;
    return {
      position: toWorld(dock1.center.x + 1.2, dock1.center.z - 1.5),
      rotation: rotY(dock1.footprint.rotation) + Math.PI,
      span: 7,
    };
  }, []);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 256);
    // 영역 채움 + 테두리
    ctx.fillStyle = "rgba(255,170,40,0.14)";
    ctx.fillRect(8, 8, 496, 240);
    ctx.setLineDash([18, 12]);
    ctx.strokeStyle = "rgba(255,170,40,0.85)";
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 496, 240);
    // 진행 방향 화살표 (주행축 = 세로)
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,200,80,0.8)";
    for (let y = 48; y < 256; y += 80) {
      ctx.beginPath();
      ctx.moveTo(256, y - 22);
      ctx.lineTo(234, y + 10);
      ctx.lineTo(248, y + 10);
      ctx.lineTo(248, y + 26);
      ctx.lineTo(264, y + 26);
      ctx.lineTo(264, y + 10);
      ctx.lineTo(278, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texRef.current = t;
    return t;
  }, []);

  useFrame((_, delta) => {
    if (texRef.current) texRef.current.offset.y -= delta * 0.06; // 느린 진행 암시
  });

  return (
    <group position={[position[0], 0.1, position[2]]} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <planeGeometry args={[span + 1.2, 9]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
          opacity={0.85}
        />
      </mesh>
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
      {overlay.mode === "heatmap" && <CraneSweptDecal />}
      <AlertPillars zoneIds={overlay.alertZoneIds} />
    </group>
  );
}
