"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { withBase } from "@/lib/basePath";
import { TOD_T, makeYardEnv, type TimeOfDay, type YardEnv } from "./coords";
import { Terrain, SitePavement } from "./Terrain";
import { Sea } from "./Sea";
import { Buildings } from "./Buildings";
import { Docks } from "./Docks";
import { Cranes } from "./Cranes";
import { Ships } from "./Ships";
import { CityBlocks, Greenery, NightLamps, Parking, Quays, Roads, StockYards } from "./Props";
import { Lighting } from "./Lighting";
import { ZoneMarkers } from "./ZoneMarkers";
import { CameraRig, HOME_POSITION } from "./CameraRig";
import { RiskOverlays, ZoneOutlines, type OverlayProps } from "./Overlays";

export interface YardSceneProps {
  /** 시간대 프리셋 — 전환 시 2초 트윈 */
  timeOfDay?: TimeOfDay;
  quality?: "low" | "high";
  /** 개발용 노출 배율 (?dev=1 슬라이더) */
  exposure?: number;
  /** 데모 오프닝용 느린 자동 회전 */
  autoRotate?: boolean;
  selectedZoneId?: number | null;
  onZoneSelect?: (id: number | null) => void;
  /** 위험도 오버레이 (히트맵/막대/보고 점/경보 기둥) */
  overlay?: OverlayProps;
  /** 경보 중인 구역 — 마커가 빨갛게 깜빡임 */
  alertZoneIds?: number[];
}

export default function YardScene({
  timeOfDay = "dusk",
  quality = "high",
  exposure = 1,
  autoRotate = false,
  selectedZoneId = null,
  onZoneSelect,
  overlay,
  alertZoneIds = [],
}: YardSceneProps) {
  // 시간대 보간 상태 (리렌더 없이 useFrame에서 공유)
  const envRef = useRef<YardEnv>(makeYardEnv(timeOfDay));
  const sunRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const env = envRef.current;
    env.target = TOD_T[timeOfDay];
    // 어떤 전환이든 2초
    env.speed = Math.max(0.05, Math.abs(env.target - env.t)) / 2;
  }, [timeOfDay]);

  useEffect(() => {
    envRef.current.exposureMul = exposure;
  }, [exposure]);

  return (
    <Canvas
      shadows={quality === "high"}
      dpr={quality === "high" ? [1, 1.75] : 1}
      camera={{
        position: [HOME_POSITION.x, HOME_POSITION.y, HOME_POSITION.z],
        fov: 42,
        near: 0.5,
        far: 900,
      }}
      gl={{
        antialias: quality === "low", // high는 SMAA 후처리 사용
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      <Suspense fallback={null}>
        {/* HDRI 환경 조명 + 블러 배경 (public/hdri/*.hdr — 절차 생성, 교체 가능) */}
        <Environment
          files={withBase(`/hdri/${timeOfDay}.hdr`)}
          background
          backgroundBlurriness={0.07}
        />
        <Lighting env={envRef.current} sunRef={sunRef} quality={quality} />
        <Terrain />
        <SitePavement />
        <Sea env={envRef.current} sunRef={sunRef} quality={quality} />
        <Roads />
        <Quays />
        <Docks />
        <Buildings env={envRef.current} />
        <Cranes />
        <Ships />
        <StockYards />
        <CityBlocks />
        <Parking />
        <Greenery />
        <NightLamps env={envRef.current} />
        {overlay && <RiskOverlays overlay={overlay} />}
        <ZoneOutlines alertZoneIds={alertZoneIds} selectedZoneId={selectedZoneId} />
        <ZoneMarkers
          onZoneSelect={onZoneSelect}
          selectedZoneId={selectedZoneId}
          alertZoneIds={alertZoneIds}
        />
        <CameraRig selectedZoneId={selectedZoneId ?? null} autoRotate={autoRotate} />
        {quality === "high" && (
          <EffectComposer multisampling={0}>
            <SMAA />
            <N8AO
              aoRadius={1.6}
              intensity={2.2}
              distanceFalloff={0.6}
              quality="performance"
              halfRes
            />
            <Bloom
              intensity={0.6}
              luminanceThreshold={1.0}
              luminanceSmoothing={0.25}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.22} darkness={0.55} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
