"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZONES, type Zone } from "@/data/zones";
import { m, mulberry32, rotY, toWorld, type YardEnv } from "./coords";

/**
 * 공장동(박공지붕 다동 연결) + 사무동(유리 커튼월) + 특수 건물.
 * 재질은 공유, 밤에는 사무동 창문 emissive가 켜진다.
 */

function makeWindowTextures(): { map: THREE.Texture; emissive: THREE.Texture } {
  const size = 256;
  const cols = 10;
  const rows = 14;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#24303c";
  ctx.fillRect(0, 0, size, size);
  const em = document.createElement("canvas");
  em.width = size;
  em.height = size;
  const ectx = em.getContext("2d")!;
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, size, size);
  const rng = mulberry32(7);
  const cw = size / cols;
  const ch = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 2;
      const y = r * ch + 2;
      const w = cw - 4;
      const h = ch - 4;
      const glass = 0.35 + rng() * 0.3;
      ctx.fillStyle = `rgba(${90 * glass + 40}, ${130 * glass + 60}, ${
        170 * glass + 70
      }, 1)`;
      ctx.fillRect(x, y, w, h);
      if (rng() < 0.45) {
        ectx.fillStyle = rng() < 0.8 ? "#ffd984" : "#cfe4ff";
        ectx.fillRect(x, y, w, h);
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  const emissive = new THREE.CanvasTexture(em);
  map.colorSpace = THREE.SRGBColorSpace;
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function useSharedMaterials() {
  return useMemo(() => {
    const windowTex = makeWindowTextures();
    const wall = new THREE.MeshStandardMaterial({
      color: "#d4d9dd",
      roughness: 0.85,
    });
    const wallLower = new THREE.MeshStandardMaterial({
      color: "#9aa4ab",
      roughness: 0.9,
    });
    const roofCache = new Map<string, THREE.MeshStandardMaterial>();
    const roofMat = (color: string) => {
      let mat = roofCache.get(color);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.55,
          metalness: 0.35,
        });
        roofCache.set(color, mat);
      }
      return mat;
    };
    const office = new THREE.MeshStandardMaterial({
      map: windowTex.map,
      emissiveMap: windowTex.emissive,
      emissive: new THREE.Color("#ffb45e"),
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.5,
    });
    const blueGlass = new THREE.MeshStandardMaterial({
      color: "#4186ea",
      map: windowTex.map,
      emissiveMap: windowTex.emissive,
      emissive: new THREE.Color("#bcd9ff"),
      emissiveIntensity: 0,
      roughness: 0.25,
      metalness: 0.7,
    });
    const concrete = new THREE.MeshStandardMaterial({
      color: "#b8bcc0",
      roughness: 0.95,
    });
    return { wall, wallLower, roofMat, office, blueGlass, concrete };
  }, []);
}

type Mats = ReturnType<typeof useSharedMaterials>;

/** 박공지붕 프리즘 지오메트리 (폭 w, 상승 rise, 길이 len — 길이축 X) */
function gableGeometry(w: number, rise: number, len: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(-len / 2, 0, 0);
  return geo;
}

function FactoryBlock({ zone, mats }: { zone: Zone; mats: Mats }) {
  const { w, d, rotation } = zone.footprint;
  const rng = mulberry32(zone.id * 97 + 11);
  const alongX = w >= d;
  const length = (alongX ? w : d) * 0.96;
  const width = (alongX ? d : w) * 0.96;
  const nSheds = Math.max(1, Math.min(5, Math.round(width / 1.7)));
  const shedW = width / nSheds;
  const wallH = m(zone.buildingHeight) * 0.68;
  const rise = m(zone.buildingHeight) * 0.32;

  const sheds = [];
  for (let i = 0; i < nSheds; i++) {
    const off = (i - (nSheds - 1) / 2) * shedW;
    const shedLen = length * (0.88 + rng() * 0.12);
    const roofColor =
      rng() < 0.55 ? zone.roofColor : rng() < 0.5 ? "#5aa0e8" : "#3b82c4";
    sheds.push(
      <group key={i} position={[rng() * 0.4 - 0.2, 0, off]}>
        <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow material={mats.wall}>
          <boxGeometry args={[shedLen, wallH, shedW * 0.94]} />
        </mesh>
        {/* 하부 띠 (회색 하단벽) */}
        <mesh position={[0, m(2), 0]} material={mats.wallLower}>
          <boxGeometry args={[shedLen + 0.02, m(4), shedW * 0.945]} />
        </mesh>
        <mesh
          position={[0, wallH, 0]}
          castShadow
          geometry={gableGeometry(shedW * 0.94, rise, shedLen)}
          material={mats.roofMat(roofColor)}
        />
      </group>,
    );
  }

  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  return (
    <group
      position={[wx, 0.04, wz]}
      rotation={[0, rotY(rotation) * (alongX ? 1 : 1) + (alongX ? 0 : Math.PI / 2), 0]}
    >
      {sheds}
    </group>
  );
}

function OfficeBlock({ zone, mats }: { zone: Zone; mats: Mats }) {
  const { w, d, rotation } = zone.footprint;
  const h = m(zone.buildingHeight);
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  return (
    <group position={[wx, 0.04, wz]} rotation={[0, rotY(rotation), 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={mats.office}>
        <boxGeometry args={[w * 0.8, h, d * 0.8]} />
      </mesh>
      <mesh position={[0, h + m(1), 0]} material={mats.concrete}>
        <boxGeometry args={[w * 0.82, m(2), d * 0.82]} />
      </mesh>
    </group>
  );
}

/** 오션플라자(7): 파란 유리 커튼월 고층 3개 동 */
function OceanPlaza({ zone, mats }: { zone: Zone; mats: Mats }) {
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const h = m(zone.buildingHeight);
  return (
    <group position={[wx, 0.04, wz]} rotation={[0, rotY(zone.footprint.rotation), 0]}>
      <mesh position={[-1.2, h / 2, 0]} castShadow material={mats.blueGlass}>
        <boxGeometry args={[1.4, h, 1.6]} />
      </mesh>
      <mesh position={[0.5, (h * 0.72) / 2, 0.3]} castShadow material={mats.blueGlass}>
        <boxGeometry args={[1.2, h * 0.72, 1.4]} />
      </mesh>
      <mesh position={[1.7, (h * 0.45) / 2, -0.3]} castShadow material={mats.blueGlass}>
        <boxGeometry args={[1.1, h * 0.45, 1.3]} />
      </mesh>
      {/* 저층 포디움 */}
      <mesh position={[0.3, m(6) / 2, 0]} castShadow material={mats.office}>
        <boxGeometry args={[3.8, m(6), 2.2]} />
      </mesh>
    </group>
  );
}

/** 맑은물관리센터(8): 원형 처리조 */
function WaterTreatment({ zone, mats }: { zone: Zone; mats: Mats }) {
  const [wx, , wz] = toWorld(zone.center.x, zone.center.z);
  const tanks = [
    [-0.9, -0.8],
    [0.9, -0.8],
    [-0.9, 0.8],
    [0.9, 0.8],
  ] as const;
  return (
    <group position={[wx, 0.04, wz]}>
      {tanks.map(([tx, tz], i) => (
        <mesh key={i} position={[tx, m(5) / 2, tz]} castShadow material={mats.concrete}>
          <cylinderGeometry args={[0.65, 0.65, m(5), 20]} />
        </mesh>
      ))}
      <mesh position={[0, m(zone.buildingHeight) / 2, 0]} castShadow material={mats.wall}>
        <boxGeometry args={[1.2, m(zone.buildingHeight), 1.2]} />
      </mesh>
    </group>
  );
}

export function Buildings({ env }: { env: YardEnv }) {
  const mats = useSharedMaterials();

  useFrame(() => {
    mats.office.emissiveIntensity = env.night * 1.0;
    mats.blueGlass.emissiveIntensity = env.night * 0.8;
  });

  const zones = useMemo(
    () => ({
      factories: ZONES.filter(
        (z) => z.kind === "factory" && z.id !== 8,
      ),
      offices: ZONES.filter((z) => z.kind === "office" && z.id !== 7),
      plaza: ZONES.find((z) => z.id === 7)!,
      water: ZONES.find((z) => z.id === 8)!,
    }),
    [],
  );

  return (
    <group>
      {zones.factories.map((z) => (
        <FactoryBlock key={z.id} zone={z} mats={mats} />
      ))}
      {zones.offices.map((z) => (
        <OfficeBlock key={z.id} zone={z} mats={mats} />
      ))}
      <OceanPlaza zone={zones.plaza} mats={mats} />
      <WaterTreatment zone={zones.water} mats={mats} />
    </group>
  );
}
