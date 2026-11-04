import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { S } from "./shared";
import { mulberry32 } from "./noise";

const SPILL_VERT = `
uniform float uTime;
uniform float uSpill;
uniform vec3 uMouth;
uniform vec2 uTilt;
uniform float uSize;
attribute vec3 aSeed;
attribute float aSpeed;
varying float vAlpha;
varying float vCore;
void main() {
  float life = fract(uTime * 0.28 * aSpeed + aSeed.x * 7.13);
  float t = life * 1.35;
  float core = step(aSeed.z, 0.45);
  vec3 tiltDir = vec3(-uTilt.x, 0.0, -uTilt.y);
  float tl = length(tiltDir);
  vec3 horiz = tl > 0.01 ? tiltDir / max(tl, 0.001) : vec3(1.0, 0.0, 0.0);
  float spread = mix(0.42, 0.07, core);
  vec3 dir = normalize(
    horiz * (0.55 + tl * 1.2) +
    vec3((aSeed.x - 0.5) * spread, 0.55 + (1.0 - core) * aSeed.y * 0.5, (aSeed.y - 0.5) * spread)
  );
  float speed = mix(2.3, 4.3, core) + aSeed.y * 1.7;
  vec3 pos = uMouth + dir * speed * t;
  pos.y -= 5.4 * t * t;
  float ground = 0.14;
  float landed = step(pos.y, ground);
  pos.y = mix(pos.y, ground + 0.015 + aSeed.y * 0.04, landed);
  pos.x += landed * (aSeed.x - 0.5) * 0.7;
  pos.z += landed * (aSeed.y - 0.5) * 0.7;
  pos = mix(uMouth, pos, pow(uSpill, 0.65));
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = uSize * mix(0.55, 0.95, core) * (0.5 + aSeed.z * 0.9);
  gl_PointSize = sz * (140.0 / -mv.z);
  vAlpha = uSpill * smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.78, 1.0, life)) * mix(0.85, 1.0, core);
  vCore = core;
}
`;

const SPILL_FRAG = `
uniform vec3 uAccent;
varying float vAlpha;
varying float vCore;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  if (a < 0.01) discard;
  float glint = smoothstep(0.22, 0.0, length(gl_PointCoord - vec2(0.38, 0.36)));
  vec3 col = mix(uAccent, vec3(1.0), 0.12 + glint * 0.5);
  col = mix(col, uAccent * 1.25, vCore * 0.4);
  gl_FragColor = vec4(col * 1.2, a);
}
`;

const FLY_VERT = `
uniform float uTime;
uniform float uFly;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec3 pos = position;
  pos.x += sin(uTime * 0.18 + aSeed * 20.0) * 1.6;
  pos.y += cos(uTime * 0.14 + aSeed * 14.0) * 0.9;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (30.0 + aSeed * 85.0) * (60.0 / -mv.z);
  vAlpha = uFly * (0.12 + aSeed * 0.16);
}
`;

const FLY_FRAG = `
uniform vec3 uAccent;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(vec3(1.0), uAccent, 0.35 * smoothstep(0.4, 0.0, d));
  gl_FragColor = vec4(col, a);
}
`;

export function SpillParticles() {
  const mat = useRef();
  const N = S.isMobile ? 500 : 1400;
  const [geo] = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = mulberry32(99);
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      seed[i * 3] = rand();
      seed[i * 3 + 1] = rand();
      seed[i * 3 + 2] = rand();
      speed[i] = 0.6 + rand() * 0.9;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 30);
    return [g];
  }, [N]);

  useFrame(() => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = S.time;
    mat.current.uniforms.uSpill.value = S.spill;
    mat.current.uniforms.uMouth.value.copy(S.mouthWorld);
    mat.current.uniforms.uTilt.value.set(S.tilt.x * 2.2, S.tilt.y * 2.2);
    mat.current.uniforms.uAccent.value.copy(S.accent);
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={SPILL_VERT}
        fragmentShader={SPILL_FRAG}
        uniforms={{
          uTime: { value: 0 },
          uSpill: { value: 0 },
          uMouth: { value: new THREE.Vector3(0, 2.4, 0) },
          uTilt: { value: new THREE.Vector2(0, 0) },
          uSize: { value: S.isMobile ? 6.5 : 8.5 },
          uAccent: { value: new THREE.Color("#2E8BFF") },
        }}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

export function FlyDrops() {
  const mat = useRef();
  const N = S.isMobile ? 40 : 70;
  const [geo] = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = mulberry32(55);
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() - 0.5) * 18;
      pos[i * 3 + 1] = rand() * 8;
      pos[i * 3 + 2] = -6 - rand() * 52;
      seed[i] = rand();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, -30), 60);
    return [g];
  }, [N]);

  useFrame(() => {
    if (!mat.current) return;
    const p = S.progress;
    const fly =
      THREE.MathUtils.smoothstep(p, 0.07, 0.12) * (1 - THREE.MathUtils.smoothstep(p, 0.19, 0.25));
    mat.current.uniforms.uTime.value = S.time;
    mat.current.uniforms.uFly.value = fly;
    mat.current.uniforms.uAccent.value.copy(S.accent);
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={FLY_VERT}
        fragmentShader={FLY_FRAG}
        uniforms={{
          uTime: { value: 0 },
          uFly: { value: 0 },
          uAccent: { value: new THREE.Color("#2E8BFF") },
        }}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
