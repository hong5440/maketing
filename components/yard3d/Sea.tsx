"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { DAY, NIGHT, type YardEnv } from "./coords";

/**
 * three/examples Water 셰이더 기반 바다.
 * 노멀맵은 외부 텍스처 대신 절차적으로 생성한 DataTexture 사용
 * (네트워크 없이도 동작해야 하는 데모 규칙).
 */

function makeWaterNormals(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  // 여러 방향의 사인파를 겹쳐 잔물결 노멀맵 생성
  const waves = [
    { fx: 6, fz: 2, amp: 0.55, phase: 0.0 },
    { fx: -3, fz: 7, amp: 0.4, phase: 1.3 },
    { fx: 11, fz: -5, amp: 0.25, phase: 2.6 },
    { fx: -14, fz: -9, amp: 0.18, phase: 4.1 },
  ];
  const TWO_PI = Math.PI * 2;
  // 사인파 간섭무늬를 깨기 위한 결정적 노이즈
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dz = 0;
      for (const w of waves) {
        const t = TWO_PI * ((x / size) * w.fx + (y / size) * w.fz) + w.phase;
        dx += -w.amp * w.fx * 0.08 * Math.cos(t);
        dz += -w.amp * w.fz * 0.08 * Math.cos(t);
      }
      dx += hash(x, y) * 0.25;
      dz += hash(x + 57, y + 13) * 0.25;
      const n = new THREE.Vector3(dx, 1, dz).normalize();
      const i = (y * size + x) * 4;
      data[i] = Math.round((n.x * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((n.z * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((n.y * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // 원거리 앨리어싱(모아레) 방지: 밉맵 + 트라이리니어 필터링
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function Sea({
  env,
  sunRef,
  quality,
}: {
  env: YardEnv;
  sunRef: React.RefObject<THREE.DirectionalLight | null>;
  quality: "low" | "high";
}) {
  const gl = useThree((s) => s.gl);
  const waterRef = useRef<Water>(null);

  const water = useMemo(() => {
    const geo = new THREE.PlaneGeometry(500, 500);
    const w = new Water(geo, {
      textureWidth: quality === "high" ? 512 : 256,
      textureHeight: quality === "high" ? 512 : 256,
      waterNormals: makeWaterNormals(),
      sunDirection: new THREE.Vector3(0.3, 0.8, 0.5),
      sunColor: 0xffffff,
      waterColor: DAY.water.getHex(),
      distortionScale: 1.05,
      fog: true,
      alpha: 1,
    });
    w.material.uniforms.size.value = 2.2;
    w.rotation.x = -Math.PI / 2;
    w.position.y = -0.18;
    return w;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, gl]);

  const colorTmp = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const u = water.material.uniforms;
    u.time.value += delta * 0.6;
    // 낮/밤 보간
    colorTmp.lerpColors(DAY.water, NIGHT.water, env.night);
    (u.waterColor.value as THREE.Color).copy(colorTmp);
    u.distortionScale.value = 1.05 - env.night * 0.55; // 밤의 만 안쪽은 더 잔잔하게
    if (sunRef.current) {
      (u.sunDirection.value as THREE.Vector3)
        .copy(sunRef.current.position)
        .normalize();
    }
    u.sunColor.value.setScalar(1 - env.night * 0.75);
  });

  return <primitive object={water} ref={waterRef} />;
}
