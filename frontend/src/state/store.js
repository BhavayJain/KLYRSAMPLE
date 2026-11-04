import { create } from "zustand";

export const FLAVORS = [
  { name: "BLUE LAGOON", accent: "#2E8BFF" },
  { name: "RASPBERRY RUSH", accent: "#E91E5A" },
];

export const useStore = create((set) => ({
  ready: false,
  soundOn: false,
  flavor: 0,
  sceneIndex: 0,
  ingredientIndex: 0,
  overlaySlug: null,
  set: (partial) => set(partial),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  toggleFlavor: () => set((s) => ({ flavor: (s.flavor + 1) % FLAVORS.length })),
}));
