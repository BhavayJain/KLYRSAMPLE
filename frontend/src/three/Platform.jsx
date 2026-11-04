import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { S } from "./shared";
import { BOTTLE_PROFILE } from "./Bottle";
import { mulberry32 } from "./noise";
import { useStore } from "@/state/store";

const CENTER = [0, 0, -478];

const VERT = `
uniform float uMorph;
uniform float uTime;
uniform float uSize;
attribute vec3 aDrop;
attribute float aSeed;
varying float vTw;
void main() {
  vec3 pos = mix(position, aDrop, uMorph);
  float amp = sin(uMorph * 3.14159);
  pos += vec3(
    sin(uTime * 0.8 + aSeed * 40.0),
    cos(uTime * 0.6 + aSeed * 31.0),
    sin(uTime * 0.7 + aSeed * 23.0)
  ) * amp * 0.5;
  pos.y += sin(uTime * 0.4 + aSeed * 10.0) * 0.04;
  vTw = 0.55 + 0.45 * sin(uTime * 2.0 + aSeed * 80.0);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uSize * (120.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = `
uniform vec3 uAccent;
varying float vTw;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vTw;
  if (a < 0.02) discard;
  vec3 col = mix(uAccent, vec3(1.0), 0.3) * 1.4;
  gl_FragColor = vec4(col, a);
}
`;

function radiusAt(y) {
  for (let i = 0; i < BOTTLE_PROFILE.length - 1; i++) {
    const [r0, y0] = BOTTLE_PROFILE[i];
    const [r1, y1] = BOTTLE_PROFILE[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / Math.max(y1 - y0, 1e-5);
      return r0 + (r1 - r0) * t;
    }
  }
  return 0.3;
}

function buildFigure(N) {
  const rand = mulberry32(77);
  const bottle = new Float32Array(N * 3);
  const drop = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // bottle silhouette (scaled up)
    const y = rand() * 2.6;
    const r = (y > 2.38 ? 0.3 : radiusAt(y)) * 1.45 * Math.sqrt(rand());
    const th = rand() * Math.PI * 2;
    bottle[i * 3] = Math.cos(th) * r;
    bottle[i * 3 + 1] = y * 1.45 + 0.3;
    bottle[i * 3 + 2] = Math.sin(th) * r;
    // drop silhouette
    const t = rand();
    const rr = Math.sin(Math.PI * Math.pow(t, 0.75)) * 1.15 * (1 - t * 0.3) * Math.sqrt(rand());
    const th2 = rand() * Math.PI * 2;
    drop[i * 3] = Math.cos(th2) * rr;
    drop[i * 3 + 1] = 0.4 + t * 3.6;
    drop[i * 3 + 2] = Math.sin(th2) * rr;
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(bottle, 3));
  g.setAttribute("aDrop", new THREE.BufferAttribute(drop, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2.4, 0), 8);
  return g;
}

export function Platform() {
  const group = useRef();
  const figureMat = useRef();
  const ringsRef = useRef([]);
  const hoverLock = useRef(0);
  const toggleFlavor = useStore((st) => st.toggleFlavor);
  const N = S.isMobile ? 2600 : 6000;
  const figGeo = useMemo(() => buildFigure(N), [N]);

  const rings = useMemo(
    () => [2.2, 4.4, 6.6, 8.8].map((r, i) => ({ r, tube: 0.1 + i * 0.012 })),
    [],
  );

  useFrame(() => {
    const p = S.progress;
    const vis = p > 0.855;
    if (group.current) group.current.visible = vis;
    if (!vis) return;
    const t = S.time;
    if (figureMat.current) {
      figureMat.current.uniforms.uTime.value = t;
      figureMat.current.uniforms.uAccent.value.copy(S.accent);
      figureMat.current.uniforms.uMorph.value = S.reduced ? 0.4 : 0.5 + 0.5 * Math.sin(t * 0.3);
    }
    ringsRef.current.forEach((m, i) => {
      if (m) {
        m.material.color.copy(S.accent).lerp(new THREE.Color("#FFFFFF"), 0.45).multiplyScalar(1.5);
        m.material.opacity = 0.55 + 0.3 * Math.sin(t * 1.2 + i * 1.4);
      }
    });
  });

  const tryToggle = () => {
    const now = performance.now();
    if (now - hoverLock.current < 900) return;
    hoverLock.current = now;
    toggleFlavor();
  };

  return (
    <group ref={group} position={CENTER} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[17, 64]} />
        <meshStandardMaterial color="#DFE4EB" roughness={0.9} />
      </mesh>
      {rings.map((r, i) => (
        <mesh
          key={i}
          ref={(el) => (ringsRef.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03 + i * 0.006, 0]}
        >
          <ringGeometry args={[r.r, r.r + r.tube, 96]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, 11, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6, 0.12, 16, 80]} />
        <meshBasicMaterial color={new THREE.Color(2, 2, 2)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 9.5, 0]} intensity={26} distance={42} color="#FFFFFF" />
      <pointLight position={[0, 1.6, 0]} intensity={7} distance={13} color="#2E8BFF" ref={(l) => { if (l) l.userData.accent = true; }} />
      <points geometry={figGeo} frustumCulled={false}>
        <shaderMaterial
          ref={figureMat}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={{
            uMorph: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: S.isMobile ? 2.6 : 3.2 },
            uAccent: { value: new THREE.Color("#2E8BFF") },
          }}
          transparent
          depthWrite={false}
        />
      </points>
      <mesh
        position={[0, 2.2, 0]}
        onPointerOver={tryToggle}
        onClick={tryToggle}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <cylinderGeometry args={[2.4, 2.4, 5.4, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
