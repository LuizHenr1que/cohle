// The small pieces of the Natal scene. Everything is DOM/SVG moved with transform and opacity; nothing loops forever except the lights' opacity.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export const useVisible = () => {
  const [v, setV] = useState(!document.hidden);
  useEffect(() => { const f = () => setV(!document.hidden); document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f); }, []);
  return v;
};

export const Lights = ({ halloween = false, colors }: { halloween?: boolean; colors?: [string, string, string, string] }) => {
  const h = halloween ? " hw" : "";
  const v = colors ? ({ "--l1": colors[0], "--l2": colors[1], "--l3": colors[2], "--l4": colors[3] } as React.CSSProperties) : {};
  return (
    <>
      <div className={`fx-lights a${h}`} style={{ top: 0, ...v }} aria-hidden="true" /><div className={`fx-lights b alt${h}`} style={{ top: 0, ...v }} aria-hidden="true" />
      <div className={`fx-lights b${h}`} style={{ bottom: 0, ...v }} aria-hidden="true" /><div className={`fx-lights a alt${h}`} style={{ bottom: 0, ...v }} aria-hidden="true" />
    </>
  );
};

/** The corner icons of the themes are buttons: nothing happens on its own, the animation and the sound come when the person clicks. */
const tapCls = "fx-corner fixed right-3 bottom-3 z-[5] opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 transition cursor-pointer";
export const Tree = ({ onTap }: { onTap?: () => void }) => (
  <button type="button" onClick={onTap} title="Clique na árvore" aria-label="Árvore de Natal: clique para o Papai Noel passar" className={`fx-tree ${tapCls}`}>
  <svg width="92" height="116" viewBox="0 0 92 116" aria-hidden="true">
    <rect x="40" y="96" width="12" height="16" fill="#6b4a2f" />
    <path d="M46 6 L74 44 H18 Z" fill="#1f7a4d" /><path d="M46 26 L82 72 H10 Z" fill="#23905a" /><path d="M46 48 L88 100 H4 Z" fill="#2aa56a" />
    <path d="M46 0 L49 8 L58 9 L51 15 L53 24 L46 19 L39 24 L41 15 L34 9 L43 8 Z" fill="#ffd166" />
    {[[30, 50, "#e63946", "tw-a"], [60, 58, "#5cc8ff", "tw-b"], [40, 76, "#ffd166", "tw-a"], [66, 86, "#e63946", "tw-b"], [24, 90, "#5cc8ff", "tw-a"], [48, 92, "#ffd166", "tw-b"]].map(([x, y, c, g], i) => <circle key={i} className={g as string} cx={x as number} cy={y as number} r="3.6" fill={c as string} />)}
  </svg>
  </button>
);

export const PumpkinCorner = ({ onTap }: { onTap?: () => void }) => (
  <button type="button" onClick={onTap} title="Clique na abóbora" aria-label="Abóbora: clique para a bruxa passar" className={tapCls}>
  <svg width="104" height="104" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 24 C32 18 36 15 40 13" stroke="#2f8f4e" strokeWidth="4" fill="none" strokeLinecap="round" />
    <ellipse cx="20" cy="42" rx="16" ry="16" fill="#ff7a1a" /><ellipse cx="44" cy="42" rx="16" ry="16" fill="#ff7a1a" /><ellipse cx="32" cy="42" rx="12" ry="17" fill="#ff9a3d" />
    <path d="M20 36 l5 8 h-10 Z M44 36 l5 8 h-10 Z" fill="#2b1200" /><path d="M18 50 q14 11 28 0 l-4 -3 l-4 4 l-6 -4 l-6 4 l-4 -4 Z" fill="#2b1200" />
    <path className="tw-a" d="M20 38 l3 4 h-6 Z M44 38 l3 4 h-6 Z" fill="#ffd166" />
  </svg>
  </button>
);

/** "Faltam N dias para o Natal". Recomputed every 10 minutes, only while the tab is visible. */
export function Countdown({ month = 11, day: dayOfMonth = 25, soon = "Faltam {n} dias para o Natal", tomorrow = "O Natal é amanhã!", today = "Hoje é Natal!", after = "Feliz Natal e boas festas!", tag = "xmas" }: { month?: number; day?: number; soon?: string; tomorrow?: string; today?: string; after?: string; tag?: string }) {
  const vis = useVisible();
  const [now, setNow] = useState(() => new Date());
  const day = () => `cohle:${tag}-hide:${new Date().toDateString()}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(day()) === "1"; } catch { return false; } });
  useEffect(() => { if (!vis) return; setNow(new Date()); const t = setInterval(() => setNow(new Date()), 10 * 60_000); return () => clearInterval(t); }, [vis]);
  if (hidden) return null;
  const y = now.getFullYear(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate()), xmas = new Date(y, month, dayOfMonth);
  const d = Math.round((xmas.getTime() - start.getTime()) / 86_400_000);
  const text = d > 1 ? soon.replace("{n}", String(d)) : d === 1 ? tomorrow : d === 0 ? today : after;
  return (
    <div role="status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[45] flex items-center gap-2 rounded-full border border-line bg-surface/90 pl-4 pr-1.5 py-1 text-xs font-semibold shadow-[0_6px_24px_rgba(0,0,0,0.4)]">
      <span className="text-accent2">{text}</span>
      <button onClick={() => { try { localStorage.setItem(day(), "1"); } catch { /* ignore */ } setHidden(true); }} aria-label="Esconder a contagem de hoje" className="size-6 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-white/10"><X size={13} /></button>
    </div>
  );
}

/** Something crossing the screen ONLY when the person clicks (`run` goes up by one per click): Santa's sleigh, the witch on her broom. Web Animations, transform only, once per click. With the set bonus it leaves a trail. */
function Crosser({ run, children, w, h }: { run: number; children: React.ReactNode; w: number; h: number }) {
  const [shown, setShown] = useState(0);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => { if (run > 0) setShown(run); }, [run]);
  useEffect(() => {
    const node = el.current; if (!shown || !node) return;
    const y = 8 + Math.random() * 22;                                   // vh
    const a = node.animate([{ transform: `translate3d(-24vw, ${y}vh, 0)` }, { transform: `translate3d(124vw, ${y - 7}vh, 0)` }], { duration: 7000, easing: "linear" });
    a.onfinish = () => setShown(0);                                     // gone until the next click
    return () => a.cancel();
  }, [shown]);
  if (!shown) return null;
  return (
    <div ref={el} className="fx-cross fixed left-0 top-0 z-[6] pointer-events-none" style={{ transform: "translate3d(-24vw,0,0)" }} aria-hidden="true">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>{children}</svg>
    </div>
  );
}

const TRAIL = ["#ffd166", "#ff5c5c", "#5cc8ff"], SPARKS = ["#ff7a1a", "#a06bff", "#ffd166"];
const Trail = ({ colors, x0 = -6, y0 = 36 }: { colors: string[]; x0?: number; y0?: number }) => <>{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={x0 - i * 11} cy={y0 + (i % 2) * 5} r={3.6 - i * 0.4} fill={colors[i % 3]} opacity={0.9 - i * 0.12} />)}</>;

/** Santa Claus in his sleigh: red suit, white beard, hat with a pompom, waving, a sack of gifts, a reindeer with a red nose. */
export function Sleigh({ run, trail }: { run: number; trail: boolean }) {
  return (
    <Crosser run={run} w={190} h={78}>
      {trail && <Trail colors={TRAIL} x0={-4} y0={46} />}
      <path d="M22 52 C40 60 110 60 138 50" stroke="#ffd166" strokeWidth="3.4" fill="none" strokeLinecap="round" /><path d="M30 50 H124 C136 50 138 34 126 34 H44 Z" fill="#c1121f" /><path d="M44 34 H126" stroke="#8f0d17" strokeWidth="2" />
      <path d="M30 34 C48 20 66 22 72 34 Z" fill="#2aa56a" /><rect x="40" y="18" width="16" height="14" rx="3" fill="#e63946" /><rect x="46.5" y="18" width="3" height="14" fill="#ffd166" /><circle cx="48" cy="16" r="3.2" fill="#ffd166" />
      <rect x="84" y="20" width="24" height="18" rx="7" fill="#e63946" /><rect x="84" y="31" width="24" height="3.4" fill="#2b1b10" /><rect x="93" y="30.6" width="6" height="4.2" rx="1" fill="#ffd166" />
      <path d="M106 24 L121 12" stroke="#e63946" strokeWidth="5.4" strokeLinecap="round" /><circle cx="122.5" cy="10.5" r="3.6" fill="#fff" />
      <circle cx="96" cy="14" r="8" fill="#f2d3b3" /><path d="M88.5 16 C88 29 104 29 103.5 16 C101 21 91 21 88.5 16 Z" fill="#fff" /><circle cx="93.4" cy="13" r="1.1" fill="#222" /><circle cx="98.8" cy="13" r="1.1" fill="#222" /><circle cx="96" cy="15.6" r="1.6" fill="#e9a58a" />
      <path d="M87.6 11 C88 -1 104 -2 105 10 C100 5 93 5 87.6 11 Z" fill="#e63946" /><rect x="86.4" y="9.6" width="19.4" height="4.2" rx="2" fill="#fff" /><circle cx="106" cy="2" r="3.4" fill="#fff" />
      <path d="M136 44 L160 38 M136 50 L162 46" stroke="#7a4b24" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="166" cy="38" rx="9" ry="6.4" fill="#a8693a" /><circle cx="173" cy="32" r="5.4" fill="#a8693a" /><path d="M171 28 L169 22 M175 28 L178 22" stroke="#7a4b24" strokeWidth="1.8" strokeLinecap="round" /><circle cx="178" cy="33" r="2.2" fill="#e63946" />
    </Crosser>
  );
}

/** A witch on her broom: pointed hat, purple cloak, a black cat behind her, a trail of sparks with the set bonus. */
export function Witch({ run, trail }: { run: number; trail: boolean }) {
  return (
    <Crosser run={run} w={170} h={70}>
      {trail && <Trail colors={SPARKS} x0={8} y0={44} />}
      <path d="M14 46 L142 40" stroke="#6b4a2f" strokeWidth="4" strokeLinecap="round" />
      <path d="M142 36 L166 30 M142 40 L168 40 M142 44 L166 50" stroke="#e0a64a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 40 C30 26 40 24 46 30 L40 42 Z" fill="#1b1128" /><path d="M36 26 L34 18 L41 24" fill="#1b1128" /><path d="M43 26 L46 18 L47 27" fill="#1b1128" /><circle cx="37.4" cy="28.4" r="1.3" fill="#ffd166" /><circle cx="43" cy="28.8" r="1.3" fill="#ffd166" /><path d="M26 41 C16 36 14 28 20 24" stroke="#1b1128" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M76 42 C76 30 84 26 94 28 C104 30 108 38 110 44 Z" fill="#6b2fc9" /><path d="M94 28 C98 36 100 40 110 44" stroke="#4a1f94" strokeWidth="2" fill="none" />
      <path d="M108 38 L122 40" stroke="#6b2fc9" strokeWidth="5" strokeLinecap="round" /><circle cx="124" cy="40" r="2.8" fill="#8bd17c" />
      <circle cx="86" cy="20" r="7.4" fill="#8bd17c" /><circle cx="83.6" cy="19" r="1.1" fill="#222" /><circle cx="88.8" cy="19" r="1.1" fill="#222" /><path d="M84 23 q2.4 2 4.8 0" stroke="#222" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M78 15 C80 14 92 14 94 15 C92 10 88 4 86 -2 C84 4 80 10 78 15 Z" fill="#1b1128" transform="translate(0 2)" /><path d="M74 17 H98 C96 20 76 20 74 17 Z" fill="#1b1128" /><rect x="80.4" y="12" width="11" height="2.6" fill="#ff7a1a" />
      <path d="M92 20 C100 22 104 26 102 32" stroke="#e0a64a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </Crosser>
  );
}
