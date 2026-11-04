import { useEffect, useState } from "react";
import { useStore } from "@/state/store";

const CELLS = 26;

export function Loader() {
  const ready = useStore((st) => st.ready);
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => Math.min(100, p + (ready ? 12 + Math.random() * 8 : 1.2)));
    }, 70);
    return () => clearInterval(id);
  }, [ready]);

  const done = pct >= 100 && ready;

  // safety net: never let the loader hang forever if the 3D scene is slow to start
  useEffect(() => {
    const t = setTimeout(() => useStore.getState().set({ ready: true }), 12000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setGone(true), 950);
      return () => clearTimeout(t);
    }
  }, [done]);

  if (gone) return null;

  return (
    <div className={`klyr-loader ${done ? "done" : ""}`} data-testid="loader" role="status" aria-label="Loading KLYR experience">
      <div className="font-display" style={{ fontSize: 30, color: "var(--klyr-ink)" }}>KLYR</div>
      <div className="pixel-row" data-testid="loader-pixels">
        {Array.from({ length: CELLS }, (_, i) => (
          <span key={i} className={`pixel-cell ${i / CELLS < pct / 100 ? "on" : ""}`} />
        ))}
      </div>
      <div className="hud-small" style={{ color: "var(--klyr-ink)" }}>
        {String(Math.floor(pct)).padStart(3, "0")} %
      </div>
      <div className="hud-small" style={{ color: "var(--klyr-ink)", opacity: 0.45 }}>
        HYDRATE. FOCUS. PERFORM.
      </div>
    </div>
  );
}
