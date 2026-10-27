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
  // ---- auras: energy around the avatar (the art box is 144% of it, so the avatar radius is ~35 here) ----
  if (kind?.startsWith("aura-")) return <Aura kind={kind} />;
  const ang = (n: number, i: number, off = 0) => (i / n) * 360 + off;
  if (kind === "code") {
    const glyphs = Array.from({ length: 22 }, (_, i) => ({ a: ang(22, i), c: i % 2 ? "1" : "0", g: i % 2 ? "tw-b" : "tw-a" }));
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#3dff7a" strokeWidth=".8" opacity=".55" strokeDasharray="1.5 3" />
        {glyphs.map((g, i) => <text key={i} className={g.g} transform={`rotate(${g.a} 50 50)`} x="50" y="5.5" fontSize="7" fontFamily="ui-monospace,Menlo,monospace" fontWeight="700" textAnchor="middle" fill={i % 3 ? "#3dff7a" : "#19c2ff"}>{g.c}</text>)}
      </svg>
    );
  }
  if (kind === "terminal") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <g fill="none" stroke="#3dff7a" strokeWidth="3" strokeLinecap="square">{[[6, 22, 6, 6, 22, 6], [78, 6, 94, 6, 94, 22], [6, 78, 6, 94, 22, 94], [94, 78, 94, 94, 78, 94]].map(([a, b, c, d, e, f], i) => <path key={i} d={`M${a} ${b} L${c} ${d} L${e} ${f}`} />)}</g>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#3dff7a" strokeWidth=".8" opacity=".4" />
        <rect className="tw-a" x="80" y="84" width="9" height="3.4" fill="#3dff7a" />
      </svg>
    );
  }
  if (kind === "pad") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#8b5cf6" strokeWidth="3" opacity=".85" /><circle cx="50" cy="50" r="46" fill="none" stroke="#19e0ff" strokeWidth="1" strokeDasharray="3 5" opacity=".9" />
        <g className="spin">{[["#19e0ff", 0], ["#ff4fd8", 90], ["#ffd166", 180], ["#3dff7a", 270]].map(([c, a]) => <circle key={a as number} cx="50" cy="4" r="5" fill={c as string} stroke="#0a0716" strokeWidth="1.2" transform={`rotate(${a} 50 50)`} />)}</g>
      </svg>
    );
  }
  if (kind === "pixel") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true" shapeRendering="crispEdges">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#19e0ff" strokeWidth="4" strokeDasharray="6 3" />
        {[[4, 4], [90, 4], [4, 90], [90, 90]].map(([x, y], i) => <rect key={i} className={i % 2 ? "tw-b" : "tw-a"} x={x} y={y} width="6" height="6" fill={i % 2 ? "#ff4fd8" : "#ffd166"} />)}
      </svg>
    );
  }
  if (kind === "pole") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <g className="spin"><circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="7" /><circle cx="50" cy="50" r="45" fill="none" stroke="#c8312f" strokeWidth="7" strokeDasharray="23.5 47.1" /><circle cx="50" cy="50" r="45" fill="none" stroke="#2a6fd6" strokeWidth="7" strokeDasharray="23.5 47.1" strokeDashoffset="-23.6" /></g>
        <circle cx="50" cy="50" r="48.8" fill="none" stroke="#e0b050" strokeWidth="1.2" /><circle cx="50" cy="50" r="41.2" fill="none" stroke="#e0b050" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "scissors") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#e0b050" strokeWidth="2.6" /><circle cx="50" cy="50" r="46" fill="none" stroke="#fff3c4" strokeWidth=".9" strokeDasharray="1.5 7" />
        <g transform="translate(64 66) rotate(-35)"><circle cx="-5" cy="14" r="4.6" fill="none" stroke="#e0b050" strokeWidth="2.2" /><circle cx="5" cy="14" r="4.6" fill="none" stroke="#e0b050" strokeWidth="2.2" /><path d="M-4 10 L8 -14 L10 -13 L0 10 Z M4 10 L-8 -14 L-10 -13 L0 10 Z" fill="#f4e4b5" stroke="#b8860b" strokeWidth=".8" strokeLinejoin="round" /></g>
      </svg>
    );
  }
  if (kind === "crown") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffd166" strokeWidth="1.6" opacity=".8" />
        <g transform="translate(50 9)"><path d="M-17 12 L-19 -6 L-9 2 L0 -10 L9 2 L19 -6 L17 12 Z" fill="#ffd166" stroke="#b8860b" strokeWidth="1.4" strokeLinejoin="round" /><rect x="-17" y="10" width="34" height="5" rx="1.6" fill="#e0b050" stroke="#b8860b" strokeWidth="1.2" />{[[-19, -8, "#ff8fcf"], [0, -12, "#9fe8ff"], [19, -8, "#ff8fcf"]].map(([x, y, c], i) => <circle key={i} className={i === 1 ? "tw-b" : "tw-a"} cx={x as number} cy={y as number} r="2.6" fill={c as string} stroke="#b8860b" strokeWidth=".8" />)}</g>
      </svg>
    );
  }
  if (kind === "flowers") {
    const fl = Array.from({ length: 16 }, (_, i) => ({ a: ang(16, i), c: ["#ff8fcf", "#ffe0f2", "#b794ff", "#ffb3d9"][i % 4] }));
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#3b9a5b" strokeWidth="2.2" opacity=".85" />
        <g className="spin">{fl.map((f, i) => <g key={i} transform={`rotate(${f.a} 50 50) translate(50 4)`}><ellipse cx="-3.4" cy="0" rx="2.6" ry="1.5" fill="#3b9a5b" /><ellipse cx="3.4" cy="0" rx="2.6" ry="1.5" fill="#3b9a5b" />{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-2.6" rx="1.7" ry="2.5" fill={f.c} transform={`rotate(${r})`} />)}<circle r="1.5" fill="#ffd166" /></g>)}</g>
      </svg>
    );
  }
  if (kind === "nygold") {
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#e0b050" strokeWidth="3.2" /><circle cx="50" cy="50" r="46" fill="none" stroke="#fff7c2" strokeWidth="1" strokeDasharray="1.5 6" />
        <g className="spin">{Array.from({ length: 8 }, (_, i) => <path key={i} transform={`rotate(${i * 45} 50 50) translate(50 4)`} d="M0 -3.4 L1 -1 L3.4 0 L1 1 L0 3.4 L-1 1 L-3.4 0 L-1 -1 Z" fill={i % 2 ? "#fff7c2" : "#ffd166"} />)}</g>
      </svg>
    );
  }
  if (kind === "nyconfetti") {
    const cs = ["#ff4f6d", "#ffd166", "#19c2ff", "#3ddc84", "#b57bff", "#ff8fcf"];
    return (
      <svg className="fx-art" viewBox="0 0 100 100" aria-hidden="true">
        <g className="spin">{Array.from({ length: 18 }, (_, i) => <rect key={i} transform={`rotate(${i * 20} 50 50) translate(50 ${3 + (i % 3) * 2}) rotate(${(i % 4) * 30})`} x="-2" y="-1" width={i % 2 ? 4 : 2.6} height={i % 2 ? 1.8 : 3.6} rx=".6" fill={cs[i % 6]} />)}</g>
      </svg>
    );
  }
  return null;
});

/** The eight auras. Groups marked spin / spin2 / puls / flick / zap-* only move while the avatar is hovered or live (see shop.css). */
function Aura({ kind }: { kind: string }) {
  const R = 35, ring = (n: number, off = 0) => Array.from({ length: n }, (_, i) => (i / n) * 360 + off);
  const at = (a: number, r: number, extra = "") => `rotate(${a} 50 50) translate(50 ${50 - r}) ${extra}`;
  const star = (s: number) => `M0 ${-s} L${s * 0.28} ${-s * 0.28} L${s} 0 L${s * 0.28} ${s * 0.28} L0 ${s} L${-s * 0.28} ${s * 0.28} L${-s} 0 L${-s * 0.28} ${-s * 0.28} Z`;
  const flame = (len: number, w: number) => `M0 0 C${-w} ${-len * 0.35} ${-w * 0.45} ${-len * 0.72} 0 ${-len} C${w * 0.45} ${-len * 0.72} ${w} ${-len * 0.35} 0 0 Z`;
  const cls = "fx-art fx-aura";
  if (kind === "aura-fire") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fxFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3a0" /><stop offset=".45" stopColor="#ff9a1f" /><stop offset="1" stopColor="#e6391a" /></linearGradient></defs>
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="#ff7a1a" strokeWidth="2.4" opacity=".55" />
      <g className="flick">{ring(14).map((a, i) => <path key={i} transform={at(a, R, "")} d={flame(i % 2 ? 11 : 16, 5.2)} fill="url(#fxFire)" />)}</g>
      <g className="flick b">{ring(14, 360 / 28).map((a, i) => <path key={i} transform={at(a, R, "")} d={flame(i % 2 ? 8 : 12, 4)} fill="url(#fxFire)" opacity=".85" />)}</g>
      <g className="spin">{ring(7, 10).map((a, i) => <circle key={i} transform={at(a, 46)} r={1.1 + (i % 3) * 0.5} fill="#ffd166" />)}</g>
    </svg>
  );
  if (kind === "aura-ice") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="#8fdcff" strokeWidth="2.2" opacity=".6" />
      <g className="spin">{ring(12).map((a, i) => <path key={i} transform={at(a, R)} d={i % 2 ? "M0 0 L3.4 -8 L0 -17 L-3.4 -8 Z" : "M0 0 L2.8 -6 L0 -11 L-2.8 -6 Z"} fill="#cdefff" stroke="#6fd0ff" strokeWidth=".9" strokeLinejoin="round" />)}</g>
      <g className="spin2">{ring(8, 12).map((a, i) => <path key={i} transform={at(a, 47)} d="M0 -3 L2 0 L0 3 L-2 0 Z" fill="#ffffff" stroke="#8fdcff" strokeWidth=".7" />)}</g>
      {[[20, 28], [78, 24], [84, 74], [18, 76]].map(([x, y], i) => <path key={i} className={i % 2 ? "tw-b" : "tw-a"} transform={`translate(${x} ${y})`} d={star(3.4)} fill="#ffffff" />)}
    </svg>
  );
  if (kind === "aura-lightning") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="#5aa8ff" strokeWidth="2.4" opacity=".65" />
      {[0, 1].map((g) => <g key={g} className={g ? "zap-b" : "zap-a"}>{ring(8, g ? 22.5 : 0).map((a, i) => <polyline key={i} transform={at(a, R)} points="0,0 -3.2,-5 2.4,-8.4 -2.8,-12.6 3,-17" fill="none" stroke={g ? "#9fd0ff" : "#e4f1ff"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />)}</g>)}
      <g className="spin2">{ring(6, 8).map((a, i) => <circle key={i} transform={at(a, 47)} r="1.4" fill="#bfe0ff" />)}</g>
    </svg>
  );
  if (kind === "aura-sakura") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true">
      <g className="spin">{ring(10).map((a, i) => <path key={i} transform={at(a, 40, `rotate(${(i % 3) * 14 - 14})`)} d="M0 0 C-5 -3 -5 -9 0 -11 C5 -9 5 -3 0 0 Z" fill={i % 2 ? "#ffb3d1" : "#ff8fb8"} />)}</g>
      <g className="spin2">{ring(7, 20).map((a, i) => <path key={i} transform={at(a, 47, `rotate(${(i % 2) * 40})`)} d="M0 0 C-3.4 -2 -3.4 -6 0 -7.6 C3.4 -6 3.4 -2 0 0 Z" fill="#ffe0ec" opacity=".95" />)}</g>
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="#ffb3d1" strokeWidth="1.2" opacity=".55" strokeDasharray="2 4" />
    </svg>
  );
  if (kind === "aura-shadow") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fxShadow" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#5b1fd6" /><stop offset=".6" stopColor="#8a4cff" /><stop offset="1" stopColor="#8a4cff" stopOpacity="0" /></linearGradient></defs>
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="#6d2ee0" strokeWidth="2.6" opacity=".7" />
      <g className="puls">{ring(10).map((a, i) => <path key={i} transform={at(a, R)} d={`M0 0 C-6 -6 5 -11 ${i % 2 ? 2 : -2} -${i % 2 ? 19 : 14} C-1 -12 -4 -6 0 0 Z`} fill="url(#fxShadow)" />)}</g>
      <g className="spin2">{ring(6, 14).map((a, i) => <circle key={i} transform={at(a, 47)} r="1.7" fill="#c8a8ff" />)}</g>
      <g className="flick b">{ring(5, 36).map((a, i) => <circle key={i} transform={at(a, 43)} r="1" fill="#ff4fd8" />)}</g>
    </svg>
  );
  if (kind === "aura-gold") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fxGold" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff9f1a" /><stop offset=".55" stopColor="#ffd84a" /><stop offset="1" stopColor="#fffbe0" /></linearGradient></defs>
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="#ffd84a" strokeWidth="2.4" opacity=".85" />
      <g className="puls">{ring(16).map((a, i) => <path key={i} transform={at(a, R - 1)} d={i % 2 ? "M-3.4 0 L0 -17 L3.4 0 Z" : "M-2.8 0 L0 -11 L2.8 0 Z"} fill="url(#fxGold)" />)}</g>
      <g className="spin2">{ring(8, 11).map((a, i) => <path key={i} transform={at(a, 47)} d={star(2.6)} fill="#fff3a0" />)}</g>
    </svg>
  );
  if (kind === "aura-cosmic") return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fxNeb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7a3cff" /><stop offset=".5" stopColor="#2a6fd6" /><stop offset="1" stopColor="#ff4fd8" /></linearGradient></defs>
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#fxNeb)" strokeWidth="9" opacity=".3" />
      <circle cx="50" cy="50" r={R + 1} fill="none" stroke="url(#fxNeb)" strokeWidth="1.6" opacity=".8" />
      <g className="spin">{ring(5, 6).map((a, i) => <path key={i} transform={at(a, 41)} d={star(4.4)} fill={i % 2 ? "#fff3a0" : "#ffffff"} />)}</g>
      <g className="spin2">{ring(8, 20).map((a, i) => <path key={i} className={i % 2 ? "tw-a" : "tw-b"} transform={at(a, 47)} d={star(2.2)} fill="#c8d8ff" />)}</g>
    </svg>
  );
  return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="none" stroke="#19e0ff" strokeWidth="5" opacity=".18" /><circle cx="50" cy="50" r="44" fill="none" stroke="#ff4fd8" strokeWidth="5" opacity=".15" />
      <g className="spin"><circle cx="50" cy="50" r="38" fill="none" stroke="#19e0ff" strokeWidth="2.2" strokeDasharray="14 6" strokeLinecap="round" /></g>
      <g className="spin2"><circle cx="50" cy="50" r="44" fill="none" stroke="#ff4fd8" strokeWidth="2.2" strokeDasharray="5 8" strokeLinecap="round" /></g>
    </svg>
  );
}
