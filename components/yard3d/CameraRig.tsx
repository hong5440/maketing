"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { getZone } from "@/data/zones";
import { m, toWorldV } from "./coords";

/** 기본(조감도) 시점: 남쪽 상공에서 북쪽 바다를 바라봄 */
export const HOME_POSITION = new THREE.Vector3(2, 62, 92);
export const HOME_TARGET = new THREE.Vector3(0, 0, -6);

/**
 * OrbitControls + 구역 선택 시 부드러운 플라이투.
 * selectedZoneId가 바뀌면 목표 시점을 설정하고 지수 감쇠로 이동한다.
 */
export function CameraRig({
  selectedZoneId,
  autoRotate = false,
}: {
  selectedZoneId: number | null;
  autoRotate?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const desired = useMemo(
    () => ({
      pos: HOME_POSITION.clone(),
      target: HOME_TARGET.clone(),
      active: false,
    }),
    [],
  );

  useEffect(() => {
    if (selectedZoneId == null) {
      desired.pos.copy(HOME_POSITION);
      desired.target.copy(HOME_TARGET);
      desired.active = true;
      return;
    }
    const zone = getZone(selectedZoneId);
    if (!zone) return;
    const t = toWorldV(zone.center.x, zone.center.z, m(zone.buildingHeight) * 0.5);
    desired.target.copy(t);
    // 남쪽 위에서 비스듬히 내려다보는 오프셋
    desired.pos.set(t.x + 2, t.y + 13, t.z + 17);
    desired.active = true;
  }, [selectedZoneId, desired]);

  useFrame((_, delta) => {
    if (!desired.active || !controlsRef.current) return;
    const k = 1 - Math.exp(-3.2 * delta);
    camera.position.lerp(desired.pos, k);
    controlsRef.current.target.lerp(desired.target, k);
    controlsRef.current.update();
    if (
      camera.position.distanceTo(desired.pos) < 0.08 &&
      controlsRef.current.target.distanceTo(desired.target) < 0.08
    ) {
      desired.active = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.55}
      target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
      minDistance={8}
      maxDistance={170}
      maxPolarAngle={Math.PI * 0.46}
      minPolarAngle={0.08}
      onStart={() => {
        desired.active = false; // 사용자가 직접 조작하면 플라이투 중단
      }}
    />
  );
}
