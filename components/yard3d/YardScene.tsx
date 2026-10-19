"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import type { YardEnv } from "./coords";
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
import { RiskOverlays, type OverlayProps } from "./Overlays";

export interface YardSceneProps {
  night?: boolean;
  quality?: "low" | "high";
  selectedZoneId?: number | null;
  onZoneSelect?: (id: number | null) => void;
  /** 위험도 오버레이 (히트맵/막대/보고 점/경보 기둥) */
  overlay?: OverlayProps;
  /** 경보 중인 구역 — 마커가 빨갛게 깜빡임 */
  alertZoneIds?: number[];
}

export default function YardScene({
  night = false,
  quality = "high",
  selectedZoneId = null,
  onZoneSelect,
  overlay,
  alertZoneIds = [],
}: YardSceneProps) {
  // 낮/밤 보간 상태 (리렌더 없이 useFrame에서 공유)
  const envRef = useRef<YardEnv>({ night: 0, nightTarget: 0 });
  const sunRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    envRef.current.nightTarget = night ? 1 : 0;
  }, [night]);

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
      }}
    >
      <Suspense fallback={null}>
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
        <ZoneMarkers
          onZoneSelect={onZoneSelect}
          selectedZoneId={selectedZoneId}
          alertZoneIds={alertZoneIds}
        />
        <CameraRig selectedZoneId={selectedZoneId ?? null} />
        {quality === "high" && (
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom
              intensity={0.75}
              luminanceThreshold={0.85}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
