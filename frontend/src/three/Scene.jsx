import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Noise, Vignette, DepthOfField } from "@react-three/postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { S } from "./shared";
import { DROP_POSITIONS } from "@/data/ingredients";
import { Terrain } from "./Terrain";
import { Bottle } from "./Bottle";
import { SpillParticles, FlyDrops } from "./LiquidParticles";
import { Ingredients } from "./Ingredients";
import { Tunnel } from "./Tunnel";
import { Platform } from "./Platform";

const KEYS = [
  { p: 0.0, pos: [0, 2.5, 10.8], look: [0, 2.1, 0] },
  { p: 0.1, pos: [0, 2.1, 6.2], look: [0, 1.5, -8] },
  { p: 0.22, pos: [0, 4.0, -44], look: [DROP_POSITIONS[0][0], DROP_POSITIONS[0][1], DROP_POSITIONS[0][2]] },
  ...DROP_POSITIONS.map((d, i) => ({
    p: 0.22 + (i + 0.5) * (0.6 / 7),
    pos: [d[0] * 0.3, d[1] + 0.9, d[2] + 14.5],
    look: [d[0], d[1], d[2]],
  })),
  { p: 0.82, pos: [0, 4.2, -352], look: [0, 4.0, -400] },
  { p: 0.9, pos: [0, 4.5, -457], look: [0, 3.2, -478] },
  { p: 1.0, pos: [0, 4.7, -458], look: [0, 3.0, -478] },
];

const ENVS = [
  { until: 0.1, near: 18, far: 85, bg: new THREE.Color("#C6CFD9") },
  { until: 0.22, near: 5, far: 50, bg: new THREE.Color("#BCC6D1") },
  { until: 0.82, near: 14, far: 95, bg: new THREE.Color("#C9D1DB") },
  { until: 0.9, near: 8, far: 140, bg: new THREE.Color("#E4EAF2") },
  { until: 1.01, near: 14, far: 130, bg: new THREE.Color("#D3DAE3") },
];

function sampleKeys(p, outPos, outLook) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].p < p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1), 0, 1);
  outPos.set(
    a.pos[0] + (b.pos[0] - a.pos[0]) * t,
    a.pos[1] + (b.pos[1] - a.pos[1]) * t,
    a.pos[2] + (b.pos[2] - a.pos[2]) * t,
  );
  outLook.set(
    a.look[0] + (b.look[0] - a.look[0]) * t,
    a.look[1] + (b.look[1] - a.look[1]) * t,
    a.look[2] + (b.look[2] - a.look[2]) * t,
  );
}

export function Scene({ onOpenIngredient }) {
  const { scene, gl, camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 2.7, 13.5));
  const look = useRef(new THREE.Vector3(0, 1.8, 0));
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tLook = useMemo(() => new THREE.Vector3(), []);
  const bg = useMemo(() => new THREE.Color("#C6CFD9"), []);

  useEffect(() => {
    scene.fog = new THREE.Fog("#C6CFD9", 18, 85);
    scene.background = bg;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    return () => {
      scene.environment = null;
      env.texture.dispose();
      pmrem.dispose();
    };
  }, [scene, gl, bg]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    S.time += dt;
    S.accent.lerp(S.accentTarget, 1 - Math.exp(-3 * dt));

    const p = S.progress;
    sampleKeys(p, tPos, tLook);
    if (p < 0.1 && !S.reduced) {
      tPos.x += Math.sin(S.time * 0.24) * 0.5 + S.mouse.x * 0.7;
      tPos.y += Math.sin(S.time * 0.31) * 0.22 - S.mouse.y * 0.4;
    }
    const lambda = S.reduced ? 7 : 3.1;
    pos.current.x = THREE.MathUtils.damp(pos.current.x, tPos.x, lambda, dt);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, tPos.y, lambda, dt);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, tPos.z, lambda, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, tLook.x, lambda, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, tLook.y, lambda, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, tLook.z, lambda, dt);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);

    const env = ENVS.find((e) => p < e.until) || ENVS[ENVS.length - 1];
    if (scene.fog) {
      scene.fog.near = THREE.MathUtils.damp(scene.fog.near, env.near, 2.2, dt);
      scene.fog.far = THREE.MathUtils.damp(scene.fog.far, env.far, 2.2, dt);
    }
    bg.lerp(env.bg, 1 - Math.exp(-2 * dt));
    if (scene.fog) scene.fog.color.copy(bg);
  });

  return (
    <>
      <hemisphereLight args={["#FFFFFF", "#AEB9C6", 0.55]} />
      <directionalLight
        castShadow
        position={[-20, 14, 8]}
        intensity={1.6}
        color="#FFE9CE"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
      />
      <Terrain />
      <Suspense fallback={null}>
        <Bottle />
      </Suspense>
      <SpillParticles />
      <FlyDrops />
      <Ingredients onOpen={onOpenIngredient} />
      <Tunnel />
      <Platform />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.4} luminanceThreshold={1.05} luminanceSmoothing={0.2} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette offset={0.24} darkness={0.34} />
        {S.isMobile ? <></> : <DepthOfField focusDistance={0.02} focalLength={0.045} bokehScale={1.6} />}
      </EffectComposer>
    </>
  );
}
