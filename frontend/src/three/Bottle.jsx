import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { S } from "./shared";
import { BOTTLE_SILHOUETTE_PX } from "./bottleSilhouette";

// ---------------------------------------------------------------------------
// The bottle is the real product photo (public/assets/klyr-bottle.webp) warped
// onto a 3D body of revolution. The body outline is traced from the photo's own
// alpha channel, and the photo is projected onto it from the front, so the
// label and liquid keep the exact artwork while the bottle still tilts, turns
// and catches light in 3D.
// ---------------------------------------------------------------------------

const IMG_W = 399;
const IMG_H = 1240;
const IMG_CX = 198.5; // horizontal centre of the bottle in the photo (px)
const ROW_BOTTOM = 1237; // last opaque row of the photo
const PX = 0.002226; // world units per photo pixel (bottle body ~2.7 units tall)
const Y0 = 0.03; // world y of the bottle base

const rowToY = (row) => Y0 + (ROW_BOTTOM - row) * PX;

// [radius, y] in world units, bottom to top. Platform.jsx also reads this.
export const BOTTLE_PROFILE = BOTTLE_SILHOUETTE_PX.map(([r, row]) => [r * PX, rowToY(row)]);

// Where things sit in the photo, as v coordinates (0 = bottom, 1 = top)
const V_FILL_LINE = 1 - 140 / IMG_H; // top of the liquid in the photo
const V_LABEL_BOTTOM = 1 - 1008 / IMG_H;
const V_LABEL_TOP = 1 - 600 / IMG_H;
const BLUE_HUE = 0.597; // hue of the Blue Lagoon accent, used to recolour for other flavours

// cap geometry, from klyr-cap.webp (234 x 131 px) at the same scale as the body
const CAP_R = 113.5 * PX;
const CAP_H = 127 * PX;
const CAP_BASE = rowToY(24) + CAP_H / 2;

const BODY_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const BODY_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uLevel;
uniform float uHue;
uniform vec3 uAccent;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 t = texture2D(uMap, vUv);
  vec3 c = t.rgb;

  // recolour the liquid for other flavours (only saturated blue/cyan pixels move)
  vec3 hsv = rgb2hsv(c);
  float blueMask = smoothstep(0.12, 0.3, hsv.y) * smoothstep(0.42, 0.5, hsv.x) * (1.0 - smoothstep(0.62, 0.72, hsv.x));
  hsv.x = fract(hsv.x + uHue * blueMask);
  c = hsv2rgb(hsv);

  float facing = abs(dot(normalize(vN), normalize(vV)));
  float fres = pow(1.0 - facing, 2.0);

  // label stays opaque; liquid above the current level turns into clear glass
  float inLabel = smoothstep(${V_LABEL_BOTTOM.toFixed(4)} - 0.004, ${V_LABEL_BOTTOM.toFixed(4)} + 0.004, vUv.y)
                * (1.0 - smoothstep(${V_LABEL_TOP.toFixed(4)} - 0.004, ${V_LABEL_TOP.toFixed(4)} + 0.004, vUv.y));
  float glassAmt = smoothstep(uLevel, uLevel + 0.015, vUv.y)
                 * (1.0 - smoothstep(${V_FILL_LINE.toFixed(4)}, ${(V_FILL_LINE + 0.004).toFixed(4)}, vUv.y))
                 * (1.0 - inLabel);
  vec3 glassCol = vec3(0.72, 0.86, 0.95) * (0.55 + 0.9 * fres);
  c = mix(c, glassCol, glassAmt);
  float alpha = mix(t.a, 0.22 + 0.5 * fres, glassAmt);

  // gentle 3D shading + accent rim so the bottle reads as a volume when it turns
  c *= 0.7 + 0.3 * facing;
  c += uAccent * pow(1.0 - facing, 3.0) * 0.35;
  if (!gl_FrontFacing) c *= 0.8;

  gl_FragColor = vec4(c * 1.05, alpha);
  #include <colorspace_fragment>
}
`;

function hueDelta(color) {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  let d = hsl.h - BLUE_HUE;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

export function Bottle() {
  const group = useRef();
  const cap = useRef();
  const bodyMat = useRef();
  const glow = useRef();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const capBase = useMemo(() => new THREE.Vector3(0, CAP_BASE, 0), []);
  const capPop = useMemo(() => new THREE.Vector3(1.05, CAP_BASE + 1.1, 0.45), []);

  const base = process.env.PUBLIC_URL || "";
  const [bottleTex, capTex] = useLoader(THREE.TextureLoader, [
    `${base}/assets/klyr-bottle.webp`,
    `${base}/assets/klyr-cap.webp`,
  ]);

  useMemo(() => {
    bottleTex.colorSpace = THREE.SRGBColorSpace;
    bottleTex.anisotropy = 8;
    bottleTex.needsUpdate = true;
    capTex.colorSpace = THREE.SRGBColorSpace;
    capTex.anisotropy = 8;
    capTex.wrapS = THREE.RepeatWrapping;
    capTex.repeat.set(2, 1);
    capTex.needsUpdate = true;
  }, [bottleTex, capTex]);

  // body of revolution from the photo's outline, with the photo projected on from the front
  const bodyGeo = useMemo(() => {
    const pts = BOTTLE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 64);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const row = ROW_BOTTOM - (y - Y0) / PX;
      uv.setXY(i, (IMG_CX + x / PX) / IMG_W, 1 - row / IMG_H);
    }
    uv.needsUpdate = true;
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uMap: { value: bottleTex },
      uLevel: { value: V_FILL_LINE },
      uHue: { value: 0 },
      uAccent: { value: new THREE.Color("#2E8BFF") },
    }),
    [bottleTex],
  );

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    // tilt physics
    if (S.dragging) {
      S.tilt.x = THREE.MathUtils.damp(S.tilt.x, S.tiltTarget.x, 10, dt);
      S.tilt.y = THREE.MathUtils.damp(S.tilt.y, S.tiltTarget.y, 10, dt);
      S.tiltVel.set(0, 0);
    } else {
      S.tiltVel.x += (-S.tilt.x * 150 - S.tiltVel.x * 13) * dt;
      S.tiltVel.y += (-S.tilt.y * 150 - S.tiltVel.y * 13) * dt;
      S.tilt.x += S.tiltVel.x * dt;
      S.tilt.y += S.tiltVel.y * dt;
    }
    S.tilt.x = THREE.MathUtils.clamp(S.tilt.x, -1.15, 1.15);
    S.tilt.y = THREE.MathUtils.clamp(S.tilt.y, -1.15, 1.15);

    S.spilling = S.forceSpill || S.tilt.length() > 0.3;
    S.spill = THREE.MathUtils.damp(S.spill, S.spilling ? 1 : 0, S.spilling ? 1.7 : 2.4, dt);

    const g = group.current;
    if (!g) return;
    g.rotation.z = -S.tilt.x + Math.sin(S.time * 0.5) * 0.008;
    g.rotation.x = S.tilt.y;
    g.rotation.y = Math.sin(S.time * 0.18) * 0.12;

    const e = 1 - Math.pow(1 - S.spill, 3);
    if (cap.current) {
      cap.current.position.lerpVectors(capBase, capPop, e);
      cap.current.rotation.z = e * 1.1;
      cap.current.rotation.x = e * 0.5;
    }
    if (bodyMat.current) {
      // the liquid level drops as the bottle spills
      bodyMat.current.uniforms.uLevel.value = V_FILL_LINE - S.spill * 0.4;
      bodyMat.current.uniforms.uAccent.value.copy(S.accent);
      bodyMat.current.uniforms.uHue.value = hueDelta(S.accent);
    }
    if (glow.current) {
      glow.current.color.copy(S.accent);
      glow.current.intensity = 2.4 + Math.sin(S.time * 1.4) * 0.6 + S.spill * 3;
    }
    tmp.set(0, 2.66, 0).applyMatrix4(g.matrixWorld);
    S.mouthWorld.copy(tmp);
  });

  return (
    <group ref={group} position={[0, 0.02, 0]}>
      <mesh geometry={bodyGeo} castShadow>
        <shaderMaterial
          ref={bodyMat}
          vertexShader={BODY_VERT}
          fragmentShader={BODY_FRAG}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={cap} position={[0, CAP_BASE, 0]} castShadow>
        <cylinderGeometry args={[CAP_R * 0.985, CAP_R, CAP_H, 64]} />
        <meshStandardMaterial attach="material-0" map={capTex} roughness={0.4} metalness={0.05} />
        <meshStandardMaterial attach="material-1" color="#EDF1F6" roughness={0.35} />
        <meshStandardMaterial attach="material-2" color="#DCE3EA" roughness={0.5} />
      </mesh>
      <pointLight ref={glow} position={[0, 1.1, 0]} intensity={2} distance={5} color="#2E8BFF" />
    </group>
  );
}
