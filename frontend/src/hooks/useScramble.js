import { useEffect, useState } from "react";
import { S } from "@/three/shared";

const CHARS = "!<>-_\\/[]{}=+*^?#";

export function useScramble(text) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (S.reduced) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = Math.max(10, Math.min(26, text.length * 1.6));
    const id = setInterval(() => {
      frame++;
      const reveal = Math.floor((frame / total) * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        s += i < reveal || text[i] === " " ? text[i] : CHARS[(Math.random() * CHARS.length) | 0];
      }
      setOut(s);
      if (reveal >= text.length) {
        setOut(text);
        clearInterval(id);
      }
    }, 24);
    return () => clearInterval(id);
  }, [text]);

  return out;
}
