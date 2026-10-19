"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import * as THREE from "three";
import { DAY, NIGHT, type YardEnv } from "./coords";

/**
 * 태양·하늘·안개 리그. env.night(0~1)를 매 프레임 nightTarget으로 트윈(2초)하고
 * 태양 고도/방위, 조명 강도, 안개 색을 함께 보간한다.
 * 밤에는 태양이 수평선 아래로 내려가 Sky 셰이더가 자연스럽게 어두워진다.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
  const skyRef = useRef<THREE.Mesh>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const starsRef = useRef<THREE.Group>(null);

  const fog = useMemo(() => new THREE.Fog(DAY.fog.clone(), 140, 330), []);
  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  const sunDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    // 2초 트윈
    const step = delta / 2;
    if (env.night < env.nightTarget) env.night = Math.min(env.nightTarget, env.night + step);
    else if (env.night > env.nightTarget)
      env.night = Math.max(env.nightTarget, env.night - step);
    const n = env.night;
    // 부드러운 보간 커브
    const t = n * n * (3 - 2 * n);

    const elevation = lerp(DAY.sunElevation, NIGHT.sunElevation, t);
    const azimuth = lerp(DAY.sunAzimuth, NIGHT.sunAzimuth, t);
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sunDir.setFromSphericalCoords(1, phi, theta);

    if (skyRef.current) {
      const uniforms = (skyRef.current.material as THREE.ShaderMaterial).uniforms;
      uniforms.sunPosition.value.copy(sunDir);
      uniforms.turbidity.value = lerp(6, 2, t);
      uniforms.rayleigh.value = lerp(1.8, 0.1, t);
      uniforms.mieCoefficient.value = lerp(0.005, 0.002, t);
    }
    if (sunRef.current) {
      sunRef.current.position.copy(sunDir).multiplyScalar(150);
      sunRef.current.intensity = lerp(3.2, 0, Math.min(1, t * 1.6));
      sunRef.current.color.lerpColors(
        new THREE.Color("#fff4e0"),
        new THREE.Color("#405070"),
        t,
      );
    }
    if (moonRef.current) moonRef.current.intensity = t * 0.55;
    if (ambientRef.current) ambientRef.current.intensity = lerp(0.55, 0.08, t);
    if (hemiRef.current) hemiRef.current.intensity = lerp(0.65, 0.06, t);
    fog.color.lerpColors(DAY.fog, NIGHT.fog, t);
    fog.near = lerp(140, 70, t);
    fog.far = lerp(330, 240, t);
    if (starsRef.current) starsRef.current.visible = n > 0.45;
  });

  const shadowSize = quality === "high" ? 2048 : 1024;

  return (
    <>
      <Sky
        ref={skyRef as never}
        distance={4000}
        sunPosition={[0.3, 0.6, -0.6]}
        turbidity={6}
        rayleigh={1.8}
      />
      <group ref={starsRef} visible={false}>
        <Stars radius={320} depth={40} count={2400} factor={5} saturation={0} fade />
      </group>
      <ambientLight ref={ambientRef} intensity={0.55} color="#dfe8f2" />
      <hemisphereLight
        ref={hemiRef}
        intensity={0.65}
        color="#cfe0f0"
        groundColor="#4a5248"
      />
      <directionalLight
        ref={sunRef}
        position={[60, 100, 60]}
        intensity={3.2}
        castShadow={quality === "high"}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-95}
        shadow-camera-right={95}
        shadow-camera-top={95}
        shadow-camera-bottom={-95}
        shadow-camera-near={10}
        shadow-camera-far={320}
        shadow-bias={-0.0004}
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
