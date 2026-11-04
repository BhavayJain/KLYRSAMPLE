import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { S } from "./shared";

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uAccent;
varying vec2 vUv;
void main() {
  float v = vUv.y;
  float band = pow(0.5 + 0.5 * sin(v * 55.0 - uTime * 2.2), 7.0);
  float band2 = pow(0.5 + 0.5 * sin(v * 13.0 - uTime * 0.9 + 2.0), 3.0);
  vec3 col = mix(vec3(1.18), uAccent * 1.35, band * 0.16 + band2 * 0.08);
  float a = uOpacity * (0.10 + band * 0.5 + band2 * 0.12);
  gl_FragColor = vec4(col, a);
}
`;

const GLOW_FRAG = `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(smoothstep(1.0, 0.0, d), 2.2) * uOpacity;
  gl_FragColor = vec4(vec3(1.35), a);
}
`;

export function Tunnel() {
  const group = useRef();
  const mat = useRef();
  const glowMat = useRef();

  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(7, 7, 130, 48, 1, true);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  useFrame(() => {
    const p = S.progress;
    const vis = p > 0.76 && p < 0.945;
    if (group.current) group.current.visible = vis;
    if (!vis || !mat.current) return;
    const op =
      THREE.MathUtils.smoothstep(p, 0.78, 0.83) * (1 - THREE.MathUtils.smoothstep(p, 0.905, 0.94));
    mat.current.uniforms.uTime.value = S.time;
    mat.current.uniforms.uOpacity.value = op;
    mat.current.uniforms.uAccent.value.copy(S.accent);
    if (glowMat.current) {
      glowMat.current.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(p, 0.84, 0.9);
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={geo} position={[0, 4.2, -400]}>
        <shaderMaterial
          ref={mat}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uAccent: { value: new THREE.Color("#2E8BFF") },
          }}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 4.2, -463]}>
        <planeGeometry args={[26, 26]} />
        <shaderMaterial
          ref={glowMat}
          vertexShader={VERT}
          fragmentShader={GLOW_FRAG}
          uniforms={{ uOpacity: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
