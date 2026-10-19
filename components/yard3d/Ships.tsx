"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32, toWorld } from "./coords";

/**
 * 절차적 선박 모델링.
 * 선체는 BoxGeometry 정점을 조작해 선수/선미 테이퍼를 만든다 (외부 모델 다운로드 없음).
 */

/** 선체 지오메트리: 길이 L(X축), 높이 H, 폭 B. 선수(+X)는 뾰족, 선미는 둥글게 */
function hullGeometry(L: number, H: number, B: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(L, H, B, 16, 1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = x / L; // -0.5 ~ 0.5
    let scale = 1;
    if (t > 0.28) {
      // 선수: 곡선 테이퍼로 뾰족하게
      const k = (t - 0.28) / 0.22;
      scale = Math.cos(k * Math.PI * 0.5) * 0.96 + 0.04;
    } else if (t < -0.34) {
      // 선미: 완만한 라운드
      const k = (-t - 0.34) / 0.16;
      scale = 1 - k * k * 0.55;
    }
    pos.setZ(i, z * scale);
    // 선저 라이즈(끝으로 갈수록 바닥이 올라옴)
    if (y < 0) {
      const edge = Math.max(0, Math.abs(t) - 0.3) / 0.2;
      pos.setY(i, y + edge * edge * H * 0.35);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.6, metal = 0.2): THREE.MeshStandardMaterial {
  const key = `${color}-${rough}-${metal}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    matCache.set(key, m);
  }
  return m;
}

function Superstructure({
  x,
  w = 0.9,
  h = 0.8,
  b = 1.2,
}: {
  x: number;
  w?: number;
  h?: number;
  b?: number;
}) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow material={mat("#f0f2f4")}>
        <boxGeometry args={[w, h, b]} />
      </mesh>
      <mesh position={[0, h + 0.06, 0]} material={mat("#c8ccd0")}>
        <boxGeometry args={[w * 0.7, 0.12, b * 0.8]} />
      </mesh>
      {/* 연돌 */}
      <mesh position={[-w * 0.9, h * 0.55, 0]} castShadow material={mat("#d33")}>
        <boxGeometry args={[0.3, h * 0.9, 0.35]} />
      </mesh>
    </group>
  );
}

/** LNG 운반선: 흰 상부, 멤브레인형 트렁크 데크 */
export function LNGCarrier({
  position,
  rotation = 0,
  L = 11,
}: {
  position: [number, number, number];
  rotation?: number;
  L?: number;
}) {
  const B = L * 0.16;
  const geo = useMemo(() => hullGeometry(L, 1.0, B), [L, B]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={geo} position={[0, 0.22, 0]} castShadow material={mat("#aeb6bd")} />
      {/* 트렁크 데크 */}
      <mesh position={[L * 0.06, 0.95, 0]} castShadow material={mat("#dde2e6", 0.45, 0.4)}>
        <boxGeometry args={[L * 0.62, 0.5, B * 0.72]} />
      </mesh>
      <mesh position={[L * 0.06, 1.22, 0]} material={mat("#eef1f3", 0.45, 0.4)}>
        <boxGeometry args={[L * 0.62, 0.06, B * 0.5]} />
      </mesh>
      <Superstructure x={-L * 0.38} b={B * 0.85} />
      {/* 선수 마스트 */}
      <mesh position={[L * 0.44, 0.95, 0]} material={mat("#e8971e")}>
        <cylinderGeometry args={[0.03, 0.05, 0.5, 6]} />
      </mesh>
    </group>
  );
}

/** 컨테이너선 */
export function ContainerShip({
  position,
  rotation = 0,
  L = 9.5,
  seed = 3,
}: {
  position: [number, number, number];
  rotation?: number;
  L?: number;
  seed?: number;
}) {
  const B = L * 0.15;
  const geo = useMemo(() => hullGeometry(L, 1.0, B), [L, B]);
  const boxes = useRef<THREE.InstancedMesh>(null);
  const COLORS = ["#b6443c", "#2d6fae", "#3f7a4f", "#c9821f", "#777f86", "#9c3f78"];
  const count = 70;
  const setup = useMemo(() => {
    const rng = mulberry32(seed * 101);
    const items: { pos: [number, number, number]; color: THREE.Color }[] = [];
    const bayCount = 9;
    for (let bay = 0; bay < bayCount; bay++) {
      const bx = (bay - bayCount / 2 + 0.9) * (L * 0.075);
      const rows = 3;
      for (let row = 0; row < rows; row++) {
        const bz = (row - 1) * (B * 0.3);
        const stack = 1 + Math.floor(rng() * 3);
        for (let s = 0; s < stack && items.length < count; s++) {
          items.push({
            pos: [bx, 0.82 + s * 0.17, bz],
            color: new THREE.Color(COLORS[Math.floor(rng() * COLORS.length)]),
          });
        }
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, B, seed]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={geo} position={[0, 0.22, 0]} castShadow material={mat("#1f4a5e")} />
      <mesh position={[0, 0.74, 0]} material={mat("#333b41")}>
        <boxGeometry args={[L * 0.8, 0.08, B * 0.9]} />
      </mesh>
      <instancedMesh
        ref={(node) => {
          boxes.current = node;
          if (node) {
            const tmp = new THREE.Object3D();
            setup.forEach((it, i) => {
              tmp.position.set(...it.pos);
              tmp.updateMatrix();
              node.setMatrixAt(i, tmp.matrix);
              node.setColorAt(i, it.color);
            });
            node.count = setup.length;
            node.instanceMatrix.needsUpdate = true;
            if (node.instanceColor) node.instanceColor.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, count]}
        castShadow
      >
        <boxGeometry args={[L * 0.068, 0.16, B * 0.28]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <Superstructure x={-L * 0.3} b={B * 0.9} h={1.0} w={0.7} />
    </group>
  );
}

/** VLCC: 빨간 선체, 녹색 갑판 */
export function Tanker({
  position,
  rotation = 0,
  L = 12.5,
}: {
  position: [number, number, number];
  rotation?: number;
  L?: number;
}) {
  const B = L * 0.18;
  const geo = useMemo(() => hullGeometry(L, 1.0, B), [L, B]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={geo} position={[0, 0.22, 0]} castShadow material={mat("#9c2f26")} />
      <mesh position={[L * 0.03, 0.74, 0]} material={mat("#3f7a4f", 0.8)}>
        <boxGeometry args={[L * 0.82, 0.07, B * 0.88]} />
      </mesh>
      {/* 중앙 파이프라인 + 매니폴드 */}
      <mesh position={[L * 0.03, 0.82, 0]} material={mat("#c8ccd0", 0.5, 0.4)}>
        <boxGeometry args={[L * 0.75, 0.06, 0.1]} />
      </mesh>
      <Superstructure x={-L * 0.37} b={B * 0.8} />
    </group>
  );
}

/** 드릴십: 중앙 데릭 타워 + 헬리데크 */
export function Drillship({
  position,
  rotation = 0,
  L = 9,
}: {
  position: [number, number, number];
  rotation?: number;
  L?: number;
}) {
  const B = L * 0.18;
  const geo = useMemo(() => hullGeometry(L, 1.0, B), [L, B]);
  const derrickH = 2.6;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={geo} position={[0, 0.25, 0]} castShadow material={mat("#27405c")} />
      <mesh position={[0, 0.78, 0]} material={mat("#8a2f27")}>
        <boxGeometry args={[L * 0.8, 0.08, B * 0.9]} />
      </mesh>
      {/* 데릭 (사다리꼴 격자 타워) */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * 0.25, 0.8 + derrickH / 2, sz * 0.25]}
            rotation={[sz * -0.09, 0, sx * 0.09]}
            castShadow
            material={mat("#d8b23a", 0.5, 0.4)}
          >
            <boxGeometry args={[0.09, derrickH, 0.09]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.8 + derrickH, 0]} castShadow material={mat("#d8b23a", 0.5, 0.4)}>
        <boxGeometry args={[0.4, 0.18, 0.4]} />
      </mesh>
      {/* 헬리데크 (선수) */}
      <mesh position={[L * 0.42, 0.95, 0]} material={mat("#3a7f3f")}>
        <cylinderGeometry args={[0.65, 0.65, 0.06, 8]} />
      </mesh>
      <Superstructure x={L * 0.28} b={B * 0.8} h={0.7} w={0.8} />
    </group>
  );
}

/** 반잠수식 리그 */
export function SemiSubRig({
  position,
  rotation = 0,
  s = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  s?: number;
}) {
  const deckW = 3.4 * s;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 폰툰 (수면) */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.12, side * deckW * 0.36]} material={mat("#8a2f27")}>
          <boxGeometry args={[deckW * 1.15, 0.3, 0.7 * s]} />
        </mesh>
      ))}
      {/* 컬럼 4개 */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * deckW * 0.36, 0.75, sz * deckW * 0.36]}
            castShadow
            material={mat("#d8dce0")}
          >
            <cylinderGeometry args={[0.32 * s, 0.32 * s, 1.3, 10]} />
          </mesh>
        )),
      )}
      {/* 데크 + 데릭 */}
      <mesh position={[0, 1.55, 0]} castShadow material={mat("#c9b26a", 0.7)}>
        <boxGeometry args={[deckW * 1.1, 0.35, deckW * 1.05]} />
      </mesh>
      <mesh position={[0, 1.75 + 1.1, 0]} castShadow material={mat("#d8b23a", 0.5, 0.4)}>
        <cylinderGeometry args={[0.1, 0.4, 2.2, 4]} />
      </mesh>
      <mesh position={[deckW * 0.4, 1.85, deckW * 0.3]} material={mat("#3a7f3f")}>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 8]} />
      </mesh>
    </group>
  );
}

/** 외해 항행 선박 (천천히 이동) */
function SailingShips() {
  const g1 = useRef<THREE.Group>(null);
  const g2 = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g1.current) {
      const x = ((t * 1.1) % 220) - 110;
      g1.current.position.set(x, 0, -72);
    }
    if (g2.current) {
      const x = 110 - ((t * 0.8 + 60) % 220);
      g2.current.position.set(x, 0, -85);
      g2.current.rotation.y = Math.PI;
    }
  });
  const B = 0.9;
  const geo = useMemo(() => hullGeometry(5.5, 0.8, B), [B]);
  return (
    <>
      <group ref={g1}>
        <mesh geometry={geo} position={[0, 0.2, 0]} material={mat("#44525e")} />
        <mesh position={[-1.8, 0.75, 0]} material={mat("#eef1f3")}>
          <boxGeometry args={[0.5, 0.6, 0.7]} />
        </mesh>
        <mesh position={[0.4, 0.62, 0]} material={mat("#2d6fae")}>
          <boxGeometry args={[2.6, 0.3, 0.7]} />
        </mesh>
      </group>
      <group ref={g2}>
        <mesh geometry={geo} position={[0, 0.2, 0]} material={mat("#6e5544")} />
        <mesh position={[-1.8, 0.7, 0]} material={mat("#e8e5da")}>
          <boxGeometry args={[0.5, 0.5, 0.6]} />
        </mesh>
      </group>
    </>
  );
}

export function Ships() {
  return (
    <group>
      {/* 의장안벽(9) 계류 */}
      <LNGCarrier position={toWorld(48.5, 57.4)} rotation={0} />
      <ContainerShip position={toWorld(59.5, 57.2)} rotation={Math.PI} />
      {/* 하역안벽 동쪽 끝 VLCC */}
      <Tanker position={toWorld(72, 57.8)} rotation={0} />
      {/* 서쪽 해안 (2도크 게이트 북쪽) */}
      <LNGCarrier position={toWorld(36.5, 70)} rotation={Math.PI / 2 - 0.24} L={9.5} />
      {/* 동측 안벽 */}
      <ContainerShip
        position={toWorld(85, 72)}
        rotation={Math.PI / 2 + 0.14}
        L={8.5}
        seed={9}
      />
      {/* 해양플랜트 옥외 조립장(21) 앞 해상 */}
      <Drillship position={toWorld(84.5, 81)} rotation={Math.PI / 2 + 0.12} />
      <SemiSubRig position={toWorld(81, 89)} rotation={0.4} />
      {/* 외해 항행 */}
      <SailingShips />
    </group>
  );
}
