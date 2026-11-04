import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/state/store";
import { INGREDIENTS } from "@/data/ingredients";
import { moleculeDataURL } from "@/three/molecules";
import { useScramble } from "@/hooks/useScramble";

const CORNERS = [
  { left: -1, top: -1, borderLeftWidth: 1, borderTopWidth: 1 },
  { right: -1, top: -1, borderRightWidth: 1, borderTopWidth: 1 },
  { left: -1, bottom: -1, borderLeftWidth: 1, borderBottomWidth: 1 },
  { right: -1, bottom: -1, borderRightWidth: 1, borderBottomWidth: 1 },
];

export function Overlay({ onClose }) {
  const slug = useStore((st) => st.overlaySlug);
  const ing = INGREDIENTS.find((i) => i.slug === slug);
  const idx = ing ? INGREDIENTS.indexOf(ing) : 0;
  const name = useScramble(ing ? ing.name : "");

  return (
    <AnimatePresence>
      {ing && (
        <motion.div
          className="klyr-overlay"
          data-testid="ingredient-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          <motion.div
            className="overlay-panel"
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${ing.name} ingredient summary`}
          >
            {CORNERS.map((c, i) => (
              <span key={i} className="corner" style={c} />
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.24em", opacity: 0.6 }}>{ing.tag}</span>
              <span style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.6 }}>
                {String(idx + 1).padStart(2, "0")} / 07
              </span>
              <button className="hud-btn" data-testid="overlay-close-button" onClick={onClose} autoFocus>
                [ CLOSE ]
              </button>
            </div>
            <h2 data-testid="overlay-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", margin: "18px 0 4px" }}>
              {name}
            </h2>
            <div className="hud-accent" style={{ fontSize: 10, letterSpacing: "0.2em" }}>{ing.readout}</div>
            <img
              src={moleculeDataURL(ing.molecule)}
              alt={`${ing.name} molecule, line diagram`}
              style={{ width: 150, height: 150, margin: "18px 0", mixBlendMode: "multiply" }}
            />
            <div className="hud-line" />
            <p style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.6, marginBottom: 10 }}>{"//// Summary"}</p>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 12px" }}>{ing.summary[0]}</p>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 20px" }}>{ing.summary[1]}</p>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.6, marginBottom: 10 }}>{"/// Discover"}</p>
            <div>
              {ing.discover.map((d) => (
                <span key={d} className="chip">{d}</span>
              ))}
            </div>
            <div className="hud-line" />
            <p style={{ fontSize: 9, letterSpacing: "0.16em", opacity: 0.45, margin: 0 }}>
              ESC TO CLOSE — /ingredient/{ing.slug} — {ing.code}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
