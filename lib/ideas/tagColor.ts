import type { CSSProperties } from "react";

/**
 * Deterministic hue from tag text so the same tag always gets the same chip color.
 */
export function tagHue(tag: string): number {
  let h = 7;
  for (let i = 0; i < tag.length; i++) {
    h = (h + tag.charCodeAt(i) * (i + 3) * 17) % 360;
  }
  return h;
}

/** Inline style object for tag pills (avoids huge Tailwind safelist). */
export function tagPillStyle(tag: string): CSSProperties {
  const h = tagHue(tag);
  return {
    backgroundColor: `hsla(${h}, 48%, 36%, 0.42)`,
    borderColor: `hsla(${h}, 55%, 55%, 0.45)`,
    color: "rgba(250,250,250,0.95)",
  };
}
