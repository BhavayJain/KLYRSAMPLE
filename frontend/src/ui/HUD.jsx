import { useEffect, useState } from "react";
import { useStore, FLAVORS } from "@/state/store";
import { useScramble } from "@/hooks/useScramble";
import { MANIFESTO, SOCIAL_LINKS, INGREDIENTS } from "@/data/ingredients";
import { S } from "@/three/shared";
import { sound } from "@/audio/sound";

const PROMPTS = [
  "Scroll down to discover",
  "///",
  "Click a drop to explore",
  "///",
  "Scroll to loop back",
];

export function HUD() {
  const ready = useStore((st) => st.ready);
  const soundOn = useStore((st) => st.soundOn);
  const toggleSound = useStore((st) => st.toggleSound);
  const flavor = useStore((st) => st.flavor);
  const toggleFlavor = useStore((st) => st.toggleFlavor);
  const sceneIndex = useStore((st) => st.sceneIndex);
  const ingredientIndex = useStore((st) => st.ingredientIndex);
  const overlayOpen = useStore((st) => !!st.overlaySlug);
  const [linkIdx, setLinkIdx] = useState(0);

  const prompt = useScramble(PROMPTS[sceneIndex] || "");
  const manifesto = useScramble(ready ? MANIFESTO : "");
  const counter = useScramble(
    sceneIndex === 2 ? `${String(ingredientIndex + 1).padStart(2, "0")} / 07` : "",
  );
  const flavorName = FLAVORS[flavor].name;
  const nextFlavor = FLAVORS[(flavor + 1) % FLAVORS.length].name;

  useEffect(() => {
    document.documentElement.style.setProperty("--klyr-accent", FLAVORS[flavor].accent);
    S.accentTarget.set(FLAVORS[flavor].accent);
  }, [flavor]);

  useEffect(() => {
    sound.setEnabled(soundOn);
  }, [soundOn]);

  if (!ready) return null;

  return (
    <div className="hud" data-testid="hud" style={{ opacity: overlayOpen ? 0.25 : 1, transition: "opacity 0.4s" }}>
      <div className="hud-corner hud-tl">
        <div className="hud-logo font-display" data-testid="hud-logo">KLYR</div>
        <div className="hud-small" style={{ marginTop: 8 }}>
          {"// Copyright 2026 / KLYR."}
          <br />
          {"All Rights Reserved."}
        </div>
      </div>

      <div className="hud-corner hud-tr" data-testid="hud-manifesto">
        <div className="hud-label">{"////// Manifesto"}</div>
        <div className="hud-small" style={{ whiteSpace: "normal", textAlign: "right" }}>{manifesto}</div>
        <div className="hud-small" style={{ marginTop: 10, opacity: 0.5 }}>EST. 2026 — 46.8182° N</div>
      </div>

      <div className="hud-corner hud-bl">
        <div className="hud-small" data-testid="scroll-prompt" style={{ marginBottom: 6 }}>
          {prompt} {sceneIndex === 0 && <span aria-hidden>↓</span>}
        </div>
        {sceneIndex === 0 && !S.isMobile && (
          <div className="hud-small" style={{ opacity: 0.5, marginBottom: 6 }}>Drag the bottle to spill</div>
        )}
        <div className="hud-line" style={{ width: 90 }} />
        <button
          className="hud-btn"
          data-testid="sound-toggle"
          onClick={toggleSound}
          aria-pressed={soundOn}
        >
          [ SOUND: {soundOn ? "ON" : "OFF"} ]
        </button>
        {sceneIndex === 0 && (
          <button
            className="hud-btn"
            data-testid="spill-button"
            style={{ display: "block" }}
            onPointerDown={() => { S.forceSpill = true; }}
            onPointerUp={() => { S.forceSpill = false; }}
            onPointerLeave={() => { S.forceSpill = false; }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                S.forceSpill = true;
              }
            }}
            onKeyUp={() => { S.forceSpill = false; }}
          >
            [ HOLD TO SPILL ]
          </button>
        )}
      </div>

      <div className="hud-corner hud-br">
        {sceneIndex === 2 ? (
          <>
            <div className="hud-label hud-accent">{INGREDIENTS[ingredientIndex]?.tag || ""}</div>
            <div className="font-display" data-testid="hud-counter" style={{ fontSize: 20 }}>{counter}</div>
          </>
        ) : (
          <div className="hud-small" data-testid="hud-coords">
            {"46.8182° N / 8.2275° E"}
            <br />
            TEMP 04.2°C / ALT 2,041 M
          </div>
        )}
        <div className="hud-small" style={{ marginTop: 8, opacity: 0.6 }} data-testid="hud-flavor">
          FLVR // <span className="hud-accent">{flavorName}</span>
        </div>
      </div>

      {sceneIndex === 4 && (
        <div className="hud-corner hud-bc" data-testid="platform-links" style={{ paddingBottom: 26 }}>
          <button
            className="hud-btn"
            data-testid="social-prev"
            aria-label="Previous link"
            onClick={() => setLinkIdx((linkIdx + SOCIAL_LINKS.length - 1) % SOCIAL_LINKS.length)}
          >
            [ ← ]
          </button>
          <a
            href={SOCIAL_LINKS[linkIdx].url || "#"}
            className="hud-btn"
            data-testid="social-link"
            style={{ margin: "0 14px", textDecoration: "none", letterSpacing: "0.24em" }}
            target={SOCIAL_LINKS[linkIdx].url ? "_blank" : undefined}
            rel="noreferrer"
            onClick={(e) => { if (!SOCIAL_LINKS[linkIdx].url) e.preventDefault(); }}
          >
            {SOCIAL_LINKS[linkIdx].name}
          </a>
          <button
            className="hud-btn"
            data-testid="social-next"
            aria-label="Next link"
            onClick={() => setLinkIdx((linkIdx + 1) % SOCIAL_LINKS.length)}
          >
            [ → ]
          </button>
          <div>
            <button className="hud-btn" data-testid="flavor-switch" style={{ marginTop: 8, opacity: 0.75 }} onClick={toggleFlavor}>
              [ SWITCH TO {nextFlavor} ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
