# KLYR — PRD

## Original Problem Statement
Rebuild igloo.inc as KLYR: a scroll- and drag-driven WebGL experience. The igloo becomes a KLYR bottle; bricks breaking apart become liquid spilling; ice rocks/snow become water drops; crystal shards (one per portfolio company) become 7 glass ingredient drops containing molecules; keep the circular tunnel zoom; the particle penguin becomes a particle bottle/drop; loop back to the bottle at the end. LIGHT world (#E9EDF2–#C9D1DA), monospace HUD (logo, copyright, manifesto, scroll prompt, sound toggle, counters, bracketed Close), text scramble, drag inertia, smooth scroll (Lenis), pixel loader, sound toggle, overlay at /ingredient/:slug, mobile-first, prefers-reduced-motion, WebGL fallback, keyboard spill control.

## Architecture
- React (CRA + craco) frontend, FastAPI backend (unused beyond health), MongoDB unused.
- 3D: three.js 0.166 + @react-three/fiber v9 + @react-three/drei v10 + @react-three/postprocessing (Bloom, Noise, Vignette, DoF).
- Scroll: Lenis, 1000vh track, world progress 0→1 drives camera keyframes through 7 scenes (hero / spill / fly-through / 7 ingredient drops / tunnel / platform / loop).
- State: zustand store + mutable S (three/shared.js) for per-frame values.
- Sound: synthesized Web Audio (sound.js) — wind, water, blips, whoosh, platform hum.
- Molecules: procedural canvas line-art (molecules.js), incl. caffeine (card 07, drawn from scratch).

## User Personas
- Brand visitors exploring the drink's story (visual-first, scroll/drag).
- Accessibility users (keyboard spill, reduced motion, static fallback).

## Implemented (2026-11-03)
- Pixel loader on pale-grey screen; fade into misty mountain hero.
- Procedural terrain: layered ridged mountains (fbm + ridge noise), snow-capped vertex colors, rolling hills, plateau, drifting mist sprites, sun glow, snow-capped conifer trees (instanced), wet rocks, 130 refractive ground drops that ripple on spill.
- Procedural 3D bottle (lathe geometry, user's real silhouette), light-blue glass (MeshPhysicalMaterial), inner glowing accent liquid (custom GLSL), black label band (canvas texture), cap that pops on spill.
- Drag-to-spill with inertia + spring-back; realistic ballistic spill (core stream + splash, gravity, ground impact), droplet glints, droplets ripple ground drops; sustained spill triggers fly-through.
- Scroll fly-through with soft depth drops, 7 ingredient glass drops (lathe drop, frosted glass, molecule line-art inside, HUD labels, CLICK TO EXPLORE, counter 01/07).
- Overlay: light-grey fogged panel, //// Summary, /// Discover, [ CLOSE ], URL /ingredient/:slug, ESC, text scramble.
- Bright circular tunnel (custom GLSL bands) into final platform: concentric glowing rings, ceiling light ring, particle figure morphing bottle ⇄ drop (6k GPU points), accent-tinted.
- Platform DOM links (Instagram / X / LinkedIn / BUY) with ←/→; flavor toggle (Blue Lagoon #2E8BFF ⇄ Raspberry Rush #E91E5A) re-tints liquid/drops/rings/particles.
- Loop back to hero with white-flash wrap.
- HUD: KLYR logo (Unbounded 900), copyright, ////// Manifesto (scramble), Scroll down to discover, [ SOUND: ON/OFF ], [ HOLD TO SPILL ], coords/temp, counter, flavor readout.
- Accessibility: keyboard spill (Space/S + HOLD button), reduced-motion mode, no-WebGL static fallback, alt text, contrast-checked dark slate on light world.

## User decisions
- Keep React JS (not Vite/TS). Procedural 3D bottle (webp as label reference). Synthesized sound OK. No uploaded assets were attached; everything procedural.

## Backlog
- P0: Verify final spill feel & scene pacing with user feedback; Instagram handle (user provides tomorrow) into platform links.
- P1: Real webp label art on bottle if user uploads; tunnel glow polish; ingredient drop refraction upgrade (MeshTransmissionMaterial perf allowing).
- P2: Sound granular cues per interaction (igloo parity); VDB-style particle figure; mobile perf tuning; custom cursor.
