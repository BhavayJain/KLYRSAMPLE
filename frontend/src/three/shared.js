import * as THREE from "three";

// Mutable per-frame state shared between the DOM layer and the R3F scene.
export const S = {
  progress: 0,
  time: 0,
  // drag / spill
  dragging: false,
  forceSpill: false,
  tiltTarget: new THREE.Vector2(0, 0),
  tilt: new THREE.Vector2(0, 0),
  tiltVel: new THREE.Vector2(0, 0),
  spill: 0,
  spillClock: 0,
  mouthWorld: new THREE.Vector3(0, 2.4, 0),
  // flavor
  accent: new THREE.Color("#2E8BFF"),
  accentTarget: new THREE.Color("#2E8BFF"),
  // pointer parallax
  mouse: new THREE.Vector2(0, 0),
  // fx
  loopFade: 0,
  wrapping: false,
  overlayOpen: false,
  reduced: false,
  isMobile: false,
};
