import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { INGREDIENTS, DROP_POSITIONS } from "@/data/ingredients";
import { makeMoleculeTexture } from "./molecules";
import { S } from "./shared";
import { useStore } from "@/state/store";
import { useScramble } from "@/hooks/useScramble";

const DROP_PROFILE = [
  [0.001, 0], [0.28, 0.06], [0.5, 0.3], [0.58, 0.62], [0.5, 0.95],
  [0.34, 1.25], [0.16, 1.5], [0.001, 1.66],
];

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const glowTex = { current: null };

function DropHUD({ ing, index, onOpen }) {
  const name = useScramble(ing.name);
  return (
    <Html center zIndexRange={[20, 0]} wrapperClass="drop-hud">
      <div className="drop-hud-inner" data-testid={`drop-hud-${ing.slug}`}>
        <span className="leader" />
        <span className="drop-corner" style={{ left: -14, top: -8, borderTopWidth: 1, borderLeftWidth: 1 }} />
        <span className="drop-corner" style={{ right: -14, bottom: -8, borderBottomWidth: 1, borderRightWidth: 1 }} />
        <div className="drop-tag">{ing.tag}</div>
        <div className="drop-name">{name}</div>
        <div className="drop-readout">{ing.readout}</div>
        <div className="drop-readout" style={{ opacity: 0.5 }}>{ing.code}</div>
        <button
          className="drop-cta"
          data-testid={`explore-${ing.slug}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(ing.slug);
          }}
        >
          [ CLICK TO EXPLORE ]
        </button>
        <div className="drop-tag" style={{ marginTop: 6 }}>{"46.8182° N / 8.2275° E — EST. 2026"}</div>
      </div>
    </Html>
  );
}

function IngredientDrop({ ing, index, position, active, onOpen }) {
  const group = useRef();
  const mol = useRef();
  const glow = useRef();

  const geo = useMemo(() => {
    const pts = DROP_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 40);
    g.translate(0, -0.83, 0);
    return g;
  }, []);
  const molTex = useMemo(() => makeMoleculeTexture(ing.molecule), [ing.molecule]);
  const gTex = useMemo(() => {
    if (!glowTex.current) glowTex.current = makeGlowTexture();
    return glowTex.current;
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const t = S.time;
    if (!S.reduced) {
      g.rotation.y += Math.min(dt, 0.05) * 0.35;
      g.position.y = position[1] + Math.sin(t * 0.6 + index * 1.7) * 0.28;
    }
    const target = active ? 1.72 : 1.5;
    const s = THREE.MathUtils.damp(g.scale.x, target, 4, Math.min(dt, 0.05));
    g.scale.setScalar(s);
    if (mol.current) mol.current.rotation.y -= Math.min(dt, 0.05) * 0.2;
    if (glow.current) glow.current.material.color.copy(S.accent);
  });

  return (
    <group position={position}>
      <group ref={group}>
        <mesh
          geometry={geo}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(ing.slug);
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        >
          <meshPhysicalMaterial
            color="#F3F7FC"
            transparent
            opacity={0.3}
            roughness={0.28}
            clearcoat={1}
            clearcoatRoughness={0.25}
            envMapIntensity={1.35}
            depthWrite={false}
          />
        </mesh>
        <mesh geometry={geo} scale={0.985}>
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.12}
            roughness={0.4}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
        <sprite ref={glow} scale={[2.6, 2.6, 1]}>
          <spriteMaterial map={gTex} transparent opacity={0.28} depthWrite={false} color="#2E8BFF" />
        </sprite>
        <mesh ref={mol}>
          <planeGeometry args={[1.45, 1.45]} />
          <meshBasicMaterial map={molTex} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {active && <DropHUD ing={ing} index={index} onOpen={onOpen} />}
      </group>
    </group>
  );
}

export function Ingredients({ onOpen }) {
  const sceneIndex = useStore((st) => st.sceneIndex);
  const ingredientIndex = useStore((st) => st.ingredientIndex);
  const overlayOpen = useStore((st) => !!st.overlaySlug);

  return (
    <group>
      {INGREDIENTS.map((ing, i) => (
        <IngredientDrop
          key={ing.slug}
          ing={ing}
          index={i}
          position={DROP_POSITIONS[i]}
          active={sceneIndex === 2 && ingredientIndex === i && !overlayOpen}
          onOpen={onOpen}
        />
      ))}
    </group>
  );
}
