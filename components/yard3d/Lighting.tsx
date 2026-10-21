"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SKY_KEYS, sampleSky, type SkyKey, type YardEnv } from "./coords";

/**
 * 시간대 리그 (A-1):
 * - env.t(0 낮 ~ 0.55 해질녘 ~ 1 밤)를 목표로 트윈하고 SKY_KEYS를 보간
 * - 태양 DirectionalLight 1개 — 그림자 범위가 카메라 타깃을 따라다녀
 *   (±HALF 유닛) 가까운 곳 그림자가 선명함. 텍셀 격자에 스냅해 떨림 방지
 * - FogExp2 거리 안개, 톤매핑 노출, HDRI env/배경 강도도 함께 보간
 * - 하늘 배경은 YardScene의 <Environment>(HDRI)가 담당 (Sky/Stars 제거)
 */

const SHADOW_HALF = 34; // ±34유닛 ≈ 850m 박스

export function Lighting({
  env,
  sunRef,
  quality,
}: {
  env: YardEnv;
  sunRef: React.RefObject<THREE.DirectionalLight | null>;
  quality: "low" | "high";
}) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  const fog = useMemo(() => new THREE.FogExp2("#b9cfdf", 0.0052), []);
  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  const sample = useMemo<SkyKey>(
    () => ({
      ...SKY_KEYS[0],
      sunColor: new THREE.Color(),
      fog: new THREE.Color(),
      water: new THREE.Color(),
    }),
    [],
  );
  const sunDir = useMemo(() => new THREE.Vector3(), []);
  const anchor = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    // ── 시간대 트윈 ──
    if (env.t !== env.target) {
      const step = env.speed * delta;
      env.t =
        env.t < env.target
          ? Math.min(env.target, env.t + step)
          : Math.max(env.target, env.t - step);
    }
    // 파생 야간도 (창문 발광·램프·수면 반사 소비)
    const nRaw = THREE.MathUtils.clamp((env.t - 0.25) / 0.75, 0, 1);
    env.night = nRaw * nRaw * (3 - 2 * nRaw);

    const s = sampleSky(env.t, sample);

    // ── 태양 + 카메라 추적 그림자 ──
    const phi = THREE.MathUtils.degToRad(90 - s.sunEl);
    const theta = THREE.MathUtils.degToRad(s.sunAz);
    sunDir.setFromSphericalCoords(1, phi, theta);
    const sun = sunRef.current;
    if (sun) {
      // 그림자 박스를 컨트롤 타깃 주변에 고정 + 텍셀 격자 스냅 (떨림 방지)
      anchor.copy(controls?.target ?? ORIGIN);
      const texel = (SHADOW_HALF * 2) / (quality === "high" ? 2048 : 1024);
      anchor.x = Math.round(anchor.x / texel) * texel;
      anchor.z = Math.round(anchor.z / texel) * texel;
      sun.position.copy(anchor).addScaledVector(sunDir, 160);
      if (targetRef.current) {
        targetRef.current.position.copy(anchor);
        sun.target = targetRef.current;
      }
      sun.intensity = s.sunInt;
      sun.color.copy(s.sunColor);
    }
    if (moonRef.current) moonRef.current.intensity = env.night * 0.4;
    if (ambientRef.current) ambientRef.current.intensity = s.ambient;
    if (hemiRef.current) hemiRef.current.intensity = s.hemi;

    // ── 안개·노출·IBL 강도·수면색 ──
    fog.color.copy(s.fog);
    fog.density = s.fogDensity;
    gl.toneMappingExposure = s.exposure * env.exposureMul;
    scene.environmentIntensity = s.envIntensity;
    scene.backgroundIntensity = s.bgIntensity;
    env.waterColor.copy(s.water);
  });

  const shadowSize = quality === "high" ? 2048 : 1024;

  return (
    <>
      <object3D ref={targetRef} />
      <ambientLight ref={ambientRef} intensity={0.1} color="#dfe8f2" />
      <hemisphereLight
        ref={hemiRef}
        intensity={0.28}
        color="#cfe0f0"
        groundColor="#4a5248"
      />
      <directionalLight
        ref={sunRef}
        position={[60, 100, 60]}
        intensity={3.0}
        castShadow={quality === "high"}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={10}
        shadow-camera-far={340}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {/* 달빛 (밤 보조광) */}
      <directionalLight
        ref={moonRef}
        position={[-50, 80, 30]}
        intensity={0}
        color="#9ab4d8"
      />
    </>
  );
}

const ORIGIN = new THREE.Vector3(0, 0, 0);
