import { INGREDIENTS, MANIFESTO } from "@/data/ingredients";

// Static, no-WebGL fallback with simple fades.
export default function Fallback({ onRetry }) {
  return (
    <main data-testid="webgl-fallback" className="min-h-screen bg-[#E9EDF2] px-6 py-10 text-[#1B2330]" style={{ fontFamily: "'Space Mono', monospace" }}>
      <div className="fallback-item font-display text-4xl" data-testid="fallback-logo">KLYR</div>
      <p className="fallback-item mt-2 text-[10px] tracking-widest opacity-70" style={{ animationDelay: "0.1s" }}>
        {"// Copyright 2026 / KLYR. All Rights Reserved."}
      </p>
      <img
        src={`${process.env.PUBLIC_URL || ""}/assets/product-duo.webp`}
        alt="KLYR Blue Lagoon and Raspberry Rush bottles"
        className="fallback-item mt-8 w-56 max-w-full"
        style={{ animationDelay: "0.15s" }}
      />
      <p className="fallback-item mt-8 max-w-md text-xs leading-6" style={{ animationDelay: "0.2s" }}>
        {"////// Manifesto"}
        <br />
        {MANIFESTO}
      </p>
      <p className="fallback-item mt-8 text-[10px] tracking-widest opacity-60" style={{ animationDelay: "0.3s" }}>
        3D VIEW UNAVAILABLE — SHOWING STATIC VERSION
      </p>
      <p className="fallback-item mt-2 max-w-md text-[10px] leading-5 opacity-60" style={{ animationDelay: "0.32s" }}>
        Turn on hardware acceleration in your browser settings, or open this page in Chrome or Safari
        (not inside an app's built-in browser).
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          data-testid="retry-3d"
          className="fallback-item mt-4 border border-[#1B2330]/40 px-3 py-2 text-[10px] tracking-widest"
        >
          [ TRY 3D VIEW AGAIN ]
        </button>
      )}
      <ul className="mt-10 max-w-md space-y-6">
        {INGREDIENTS.map((ing, i) => (
          <li key={ing.slug} className="fallback-item border-t border-[#1B2330]/20 pt-3" style={{ animationDelay: `${0.35 + i * 0.08}s` }} data-testid={`fallback-ingredient-${ing.slug}`}>
            <div className="text-[9px] tracking-[0.24em] opacity-60">{ing.tag}</div>
            <div className="text-sm font-bold tracking-widest">{ing.name}</div>
            <div className="text-[10px] opacity-70">{ing.readout}</div>
            <p className="mt-2 text-[11px] leading-5 opacity-80">{ing.summary[0]}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
