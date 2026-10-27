import { memo } from "react";
import { FRAME_OF } from "./registry";

const LIGHT = ["#ff5c5c", "#ffd166", "#3ddc84", "#5cc8ff"];
/** The art around an avatar. Plain SVG (viewBox 0..100, the avatar fills the middle), nothing animates unless the wrapper is hovered / live. */
export const FrameArt = memo(function FrameArt({ frame }: { frame: string }) {
  const kind = FRAME_OF[frame];
  if (kind === "garland") {
    const n = 16, lights = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return { x: 50 + Math.cos(a) * 46, y: 50 + Math.sin(a) * 46, c: LIGHT[i % 4], g: i % 2 ? "tw-b" : "tw-a" }; });
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#1f7a4d" strokeWidth="3.2" strokeDasharray="5 2.4" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#3ddc84" strokeWidth="1" strokeDasharray="1.5 6" opacity=".7" />
        {lights.map((l, i) => <circle key={i} className={l.g} cx={l.x} cy={l.y} r="3.1" fill={l.c} />)}
      </svg>
    );
  }
  if (kind === "santahat") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <g transform="rotate(24 70 22)">
          <path d="M46 30 C50 6 78 2 92 24 C80 20 64 22 46 30 Z" fill="#e63946" />
          <path d="M44 31 C60 22 80 20 94 26 L92 36 C76 30 58 33 42 41 Z" fill="#fff" />
          <circle cx="93" cy="26" r="7" fill="#fff" />
        </g>
      </svg>
    );
  }
  if (kind === "pumpkin") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ff7a1a" strokeWidth="2.4" strokeDasharray="2 5" opacity=".75" />
        <g transform="translate(66 62)">
          <path d="M14 4 C14 -2 18 -4 20 -6" stroke="#2f8f4e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="9" cy="15" rx="12" ry="11" fill="#ff7a1a" /><ellipse cx="19" cy="15" rx="9" ry="10.5" fill="#ff9a3d" /><ellipse cx="14" cy="15" rx="6" ry="11" fill="#ff8a2a" />
          <path d="M6 12 l3 4 l-6 0 Z M17 12 l3 4 l-6 0 Z" fill="#2b1200" /><path d="M5 20 q9 6 18 0" stroke="#2b1200" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  if (kind === "web") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <g stroke="#e6e0f2" strokeWidth="1.1" fill="none" opacity=".85" strokeLinecap="round">
          <path d="M4 4 L52 4 M4 4 L4 52 M4 4 L40 40" /><path d="M16 4 Q18 18 4 16 M28 4 Q30 30 4 28 M40 4 Q42 42 4 40" />
        </g>
        <path d="M40 40 L40 56" stroke="#e6e0f2" strokeWidth="1" opacity=".7" />
        <g transform="translate(40 60)"><ellipse cx="0" cy="0" rx="4.2" ry="3.6" fill="#1b1128" stroke="#a06bff" strokeWidth=".8" /><circle cx="0" cy="-4" r="2.4" fill="#1b1128" stroke="#a06bff" strokeWidth=".8" />
          <path d="M-4 -1 L-9 -4 M-4 1 L-9 4 M4 -1 L9 -4 M4 1 L9 4" stroke="#a06bff" strokeWidth=".9" strokeLinecap="round" /></g>
      </svg>
    );
  }
  return null;
});
