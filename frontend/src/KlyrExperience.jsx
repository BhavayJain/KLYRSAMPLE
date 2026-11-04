import { Component, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useNavigate, useParams } from "react-router-dom";
import Lenis from "lenis";
import * as THREE from "three";
import { Scene } from "@/three/Scene";
import { S } from "@/three/shared";
import { useStore, FLAVORS } from "@/state/store";
import { INGREDIENTS } from "@/data/ingredients";
import { sound } from "@/audio/sound";
import { HUD } from "@/ui/HUD";
import { Loader } from "@/ui/Loader";
import { Overlay } from "@/ui/Overlay";
import Fallback from "@/ui/Fallback";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    // release the probe context so it doesn't count against the browser's WebGL context limit
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

// Catches any crash inside the 3D scene and switches to the static fallback
// instead of leaving a blank or half-rendered page.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.error("[KLYR] 3D scene crashed:", err);
    this.props.onFail?.(err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function KlyrExperience() {
  const [webgl, setWebgl] = useState(hasWebGL);
  const [crashed, setCrashed] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const navigate = useNavigate();
  const { slug } = useParams();
  const setStore = useStore((st) => st.set);
  const sceneIndex = useStore((st) => st.sceneIndex);
  const overlaySlug = useStore((st) => st.overlaySlug);
  const flavor = useStore((st) => st.flavor);
  const lenisRef = useRef(null);
  const faderRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    S.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    S.isMobile = window.innerWidth < 768;
  }, []);

  // scroll engine + per-frame DOM sync
  useEffect(() => {
    if (!webgl || crashed) return;
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenisRef.current = lenis;
    let raf;
    let lastScene = -1;
    let lastIdx = -1;
    let burstArmed = true;
    let spillHold = 0;
    let wrapDecay = 0;
    let wrapping = false;

    const loop = (t) => {
      lenis.raf(t);
      const limit = lenis.limit || 1;
      const p = THREE.MathUtils.clamp(lenis.scroll / limit, 0, 1);
      S.progress = p;

      const scene = p < 0.1 ? 0 : p < 0.22 ? 1 : p < 0.82 ? 2 : p < 0.9 ? 3 : 4;
      const idx = Math.min(6, Math.floor(Math.max(0, p - 0.22) / 0.6 * 7));
      if (scene !== lastScene || idx !== lastIdx) {
        lastScene = scene;
        lastIdx = idx;
        setStore({ sceneIndex: scene, ingredientIndex: idx });
        if (scene === 3) sound.whoosh();
        sound.setHum(scene === 4);
      }

      // sustained spill launches the fly-through
      if (S.spill > 0.85 && scene === 0) {
        spillHold += 1 / 60;
        if (spillHold > 1.5) {
          spillHold = -4;
          S.forceSpill = false;
          lenis.scrollTo(limit * 0.115, { duration: 2.4 });
        }
      } else if (spillHold >= 0) {
        spillHold = 0;
      }

      if (S.spill > 0.5 && burstArmed) {
        burstArmed = false;
        sound.waterBurst();
      } else if (S.spill < 0.15) {
        burstArmed = true;
      }

      // loop wrap + white flash at tunnel exit
      let fade = 0;
      if (p > 0.985) fade = Math.min(1, (p - 0.985) / 0.013);
      if (p >= 0.998 && !wrapping) {
        wrapping = true;
        wrapDecay = 1;
        lenis.scrollTo(0, { immediate: true, force: true });
      }
      if (wrapping) {
        wrapDecay -= 0.016;
        fade = Math.max(fade, wrapDecay);
        if (wrapDecay <= 0) wrapping = false;
      }
      const flash =
        THREE.MathUtils.smoothstep(p, 0.862, 0.885) * (1 - THREE.MathUtils.smoothstep(p, 0.885, 0.908));
      if (faderRef.current) {
        faderRef.current.style.opacity = Math.min(1, Math.max(fade, flash)).toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [webgl, crashed, setStore]);

  // URL <-> overlay sync
  useEffect(() => {
    if (slug && INGREDIENTS.some((i) => i.slug === slug)) {
      if (overlaySlug !== slug) {
        setStore({ overlaySlug: slug });
        sound.blip(true);
      }
      S.overlayOpen = true;
      S.forceSpill = false;
      S.dragging = false;
      lenisRef.current?.stop();
    } else {
      if (overlaySlug) {
        setStore({ overlaySlug: null });
        sound.blip(false);
      }
      S.overlayOpen = false;
      lenisRef.current?.start();
    }
  }, [slug, overlaySlug, setStore]);

  // keyboard
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Escape" && overlaySlug) navigate("/");
      if ((e.code === "Space" || e.code === "KeyS") && sceneIndex === 0 && !overlaySlug && e.target === document.body) {
        e.preventDefault();
        S.forceSpill = true;
      }
    };
    const up = (e) => {
      if (e.code === "Space" || e.code === "KeyS") S.forceSpill = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [overlaySlug, sceneIndex, navigate]);

  // pointer parallax
  useEffect(() => {
    const move = (e) => {
      S.mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  if (!webgl || crashed) {
    return (
      <Fallback
        onRetry={() => {
          setCrashed(false);
          setWebgl(true);
        }}
      />
    );
  }

  const onPointerDown = (e) => {
    if (sceneIndex !== 0 || S.overlayOpen || e.pointerType !== "mouse") return;
    if (e.target.closest("button") || e.target.closest("a")) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    S.dragging = true;
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || !S.dragging) return;
    S.tiltTarget.set(
      THREE.MathUtils.clamp((e.clientX - d.x) * 0.0045, -1.1, 1.1),
      THREE.MathUtils.clamp((e.clientY - d.y) * 0.0045, -1.1, 1.1),
    );
  };
  const onPointerUp = () => {
    if (!S.dragging) return;
    S.dragging = false;
    dragRef.current = null;
    S.tiltTarget.set(0, 0);
    S.tiltVel.set(-S.tilt.x * 5, -S.tilt.y * 5);
  };

  return (
    <>
      <div style={{ height: "1000vh" }} aria-hidden="true" />
      <div
        className="fixed inset-0 z-0"
        data-testid="klyr-experience"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <SceneBoundary onFail={() => setCrashed(true)}>
          <Canvas
            shadows={!isMobile}
            dpr={isMobile ? [1, 1.25] : [1, 1.75]}
            gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
            camera={{ fov: 42, near: 0.1, far: 900, position: [0, 2.7, 13.5] }}
            onCreated={() => setTimeout(() => setStore({ ready: true }), 500)}
          >
            <Scene onOpenIngredient={(s) => navigate(`/ingredient/${s}`)} />
          </Canvas>
        </SceneBoundary>
        <div ref={faderRef} className="fader" />
        <HUD />
        <Overlay onClose={() => navigate("/")} />
        <Loader />
        <p className="sr-only">
          KLYR functional hydration. An interactive 3D experience: a bottle on a mountain plateau.
          Drag it to spill, scroll to explore seven ingredients, and reach the platform.
        </p>
      </div>
    </>
  );
}
