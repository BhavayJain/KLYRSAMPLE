import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createNoise2D, fbm, mulberry32 } from "./noise";
import { S } from "./shared";
import { useStore, FLAVORS } from "@/state/store";

const noise = createNoise2D(2026);

const SNOW = new THREE.Color("#DFE6EE");
const ROCK = new THREE.Color("#5C6976");
const LOW = new THREE.Color("#8B98A6");
const tmpC = new THREE.Color();

export function groundHeight(x, z) {
  let h = fbm(noise, x * 0.008, z * 0.008, 4) * 8 + fbm(noise, x * 0.045 + 9, z * 0.045, 3) * 1.5;
  h *= THREE.MathUtils.smoothstep(Math.hypot(x, z), 5, 28);
  h *= THREE.MathUtils.smoothstep(Math.hypot(x, z + 478), 14, 46);
  return h;
}

function ridge(x, y, oct = 4) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) {
    let n = 1 - Math.abs(noise(x * f, y * f));
    n = n * n;
    sum += n * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

function paintByHeight(geo, maxY) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const hT = THREE.MathUtils.clamp(pos.getY(i) / maxY, 0, 1);
    const slope = THREE.MathUtils.clamp(nor.getY(i), 0, 1);
    const snowT = THREE.MathUtils.clamp(
      THREE.MathUtils.smoothstep(hT, 0.3, 0.58) * 0.75 + THREE.MathUtils.smoothstep(slope, 0.5, 0.8) * 0.5,
      0, 1,
    );
    tmpC.lerpColors(ROCK, SNOW, snowT);
    colors[i * 3] = tmpC.r;
    colors[i * 3 + 1] = tmpC.g;
    colors[i * 3 + 2] = tmpC.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function buildGround() {
  const geo = new THREE.PlaneGeometry(1000, 1000, 170, 170);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -240);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    const patch = noise(x * 0.02 + 4, z * 0.02) * 0.5 + 0.5;
    const t = THREE.MathUtils.clamp(0.42 + h * 0.055 + patch * 0.35 + noise(x * 0.09, z * 0.09) * 0.1, 0, 1);
    tmpC.lerpColors(LOW, SNOW, t);
    colors[i * 3] = tmpC.r;
    colors[i * 3 + 1] = tmpC.g;
    colors[i * 3 + 2] = tmpC.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function mountainGeo(s, h, seed) {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const r = 1 + (ridge(v.x * 2.1 + seed, (v.y * 1.15 + v.z * 1.5) - seed) - 0.45) * 0.85;
    pos.setXYZ(i, v.x * r * s, Math.max(v.y * r, -0.05) * h, v.z * r * s);
  }
  paintByHeight(geo, h);
  return geo;
}

function buildMountains() {
  const rand = mulberry32(7);
  const specs = [];
  const layers = [
    { n: 7, x0: 40, x1: 110, h0: 13, h1: 30, s0: 12, s1: 24 },
    { n: 9, x0: 95, x1: 210, h0: 26, h1: 60, s0: 20, s1: 42 },
    { n: 9, x0: 185, x1: 340, h0: 50, h1: 115, s0: 36, s1: 68 },
  ];
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const side = rand() > 0.5 ? 1 : -1;
      specs.push({
        x: side * (L.x0 + rand() * (L.x1 - L.x0)),
        z: 40 - rand() * 520,
        h: L.h0 + rand() * (L.h1 - L.h0),
        s: L.s0 + rand() * (L.s1 - L.s0),
        seed: rand() * 100,
      });
    }
  }
  for (let i = 0; i < 7; i++) {
    specs.push({
      x: -230 + i * 76 + rand() * 30,
      z: -540 - rand() * 110,
      h: 75 + rand() * 85,
      s: 50 + rand() * 46,
      seed: rand() * 100,
    });
  }
  return specs;
}

function makeRadialTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function buildTrees() {
  const rand = mulberry32(31);
  const N = S.isMobile ? 70 : 150;
  const arr = [];
  let guard = 0;
  while (arr.length < N && guard++ < N * 12) {
    const x = (rand() - 0.5) * 170;
    const z = 15 - rand() * 230;
    if (Math.hypot(x, z) < 15) continue;
    if (Math.hypot(x, z + 478) < 20) continue;
    if (Math.abs(x) < 7 && z > -30) continue;
    arr.push({
      x,
      z,
      y: groundHeight(x, z) - 0.08,
      s: 0.7 + rand() * rand() * 1.7,
      rot: rand() * Math.PI * 2,
    });
  }
  return arr;
}

function Trees() {
  const trunkRef = useRef();
  const coneRef = useRef();
  const capRef = useRef();
  const trees = useMemo(() => buildTrees(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const tr = trunkRef.current;
    const co = coneRef.current;
    const ca = capRef.current;
    if (!tr || !co || !ca) return;
    trees.forEach((t, i) => {
      dummy.position.set(t.x, t.y + 0.2 * t.s, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      tr.setMatrixAt(i, dummy.matrix);
      dummy.position.y = t.y + (0.45 + 1.0) * t.s;
      dummy.updateMatrix();
      co.setMatrixAt(i, dummy.matrix);
      dummy.position.y = t.y + (0.45 + 1.78) * t.s;
      dummy.updateMatrix();
      ca.setMatrixAt(i, dummy.matrix);
    });
    tr.instanceMatrix.needsUpdate = true;
    co.instanceMatrix.needsUpdate = true;
    ca.instanceMatrix.needsUpdate = true;
  }, [trees, dummy]);

  const N = trees.length;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, N]} key={`t${N}`} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.9, 5]} />
        <meshStandardMaterial color="#5B5044" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[undefined, undefined, N]} key={`c${N}`} castShadow>
        <coneGeometry args={[0.85, 2.0, 7]} />
        <meshStandardMaterial color="#43564B" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={capRef} args={[undefined, undefined, N]} key={`p${N}`}>
        <coneGeometry args={[0.5, 1.15, 7]} />
        <meshStandardMaterial color="#E9EEF4" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function GroundDrops() {
  const ref = useRef();
  const flavor = useStore((st) => st.flavor);
  const N = S.isMobile ? 60 : 130;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(() => {
    const rand = mulberry32(42);
    const arr = [];
    for (let i = 0; i < N; i++) {
      let x, z;
      if (i < N * 0.55) {
        const a = rand() * Math.PI * 2;
        const r = 2 + rand() * 13;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      } else {
        x = (rand() - 0.5) * 44;
        z = -20 - rand() * 320;
      }
      arr.push({ x, z, s: 0.07 + rand() * rand() * 0.42, ph: rand() * 10 });
    }
    return arr;
  }, [N]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const accent = new THREE.Color(FLAVORS[flavor].accent);
    drops.forEach((d, i) => {
      dummy.position.set(d.x, 0.03, d.z);
      dummy.scale.set(d.s, d.s * 0.42, d.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (i % 4 === 0) tmpC.copy(accent).lerp(new THREE.Color("#FFFFFF"), 0.55);
      else tmpC.set("#EAF2FB");
      mesh.setColorAt(i, tmpC);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [drops, flavor, dummy]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = S.time;
    const spill = S.spill;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const near = Math.hypot(d.x, d.z) < 15;
      const ripple = near ? spill * Math.sin(t * 9 + d.ph * 3) * 0.22 : 0;
      const breathe = Math.sin(t * 1.6 + d.ph) * 0.03;
      const s = d.s * (1 + breathe + ripple);
      dummy.position.set(d.x, 0.03, d.z);
      dummy.scale.set(s, s * 0.42, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} key={N} data-testid="ground-drops">
      <sphereGeometry args={[1, 20, 14]} />
      <meshPhysicalMaterial
        color="#FFFFFF"
        roughness={0.06}
        clearcoat={1}
        clearcoatRoughness={0.08}
        envMapIntensity={1.5}
        transparent
        opacity={0.94}
      />
    </instancedMesh>
  );
}

export function Terrain() {
  const ground = useMemo(() => buildGround(), []);
  const specs = useMemo(() => buildMountains(), []);
  const mountains = useMemo(() => specs.map((m) => ({ ...m, geo: mountainGeo(m.s, m.h, m.seed) })), [specs]);
  const mistTex = useMemo(() => makeRadialTexture("rgba(255,255,255,0.85)", "rgba(255,255,255,0)"), []);
  const sunTex = useMemo(() => makeRadialTexture("rgba(255,252,244,1)", "rgba(255,252,244,0)"), []);
  const mistRef = useRef();
  const rocks = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: 14 }, () => ({
      pos: [(rand() - 0.5) * 28, 0.05, -3 - rand() * 70],
      s: 0.3 + rand() * 0.9,
      rot: [rand() * 3, rand() * 3, rand() * 3],
    }));
  }, []);
  const mists = useMemo(() => {
    const rand = mulberry32(23);
    return Array.from({ length: S.isMobile ? 8 : 15 }, () => ({
      pos: [(rand() - 0.5) * 160, 1.5 + rand() * 7, 25 - rand() * 420],
      w: 45 + rand() * 70,
      speed: 0.3 + rand() * 0.7,
      ph: rand() * 10,
      op: 0.08 + rand() * 0.08,
    }));
  }, []);

  useFrame(() => {
    const g = mistRef.current;
    if (!g || S.reduced) return;
    g.children.forEach((sp, i) => {
      sp.position.x = mists[i].pos[0] + Math.sin(S.time * 0.05 * mists[i].speed + mists[i].ph) * 16;
    });
  });

  return (
    <group>
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
      {mountains.map((m, i) => (
        <mesh key={i} geometry={m.geo} position={[m.x, 0, m.z]}>
          <meshStandardMaterial vertexColors roughness={1} metalness={0} />
        </mesh>
      ))}
      {rocks.map((r, i) => (
        <mesh key={`r${i}`} position={r.pos} rotation={r.rot} scale={r.s} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7E8B99" roughness={0.6} />
        </mesh>
      ))}
      <Trees />
      <sprite position={[-55, 22, -170]} scale={[150, 90, 1]}>
        <spriteMaterial map={sunTex} transparent opacity={0.4} depthWrite={false} />
      </sprite>
      <group ref={mistRef}>
        {mists.map((m, i) => (
          <sprite key={`m${i}`} position={m.pos} scale={[m.w, m.w * 0.3, 1]}>
            <spriteMaterial map={mistTex} transparent opacity={m.op} depthWrite={false} />
          </sprite>
        ))}
      </group>
      <GroundDrops />
    </group>
  );
}
