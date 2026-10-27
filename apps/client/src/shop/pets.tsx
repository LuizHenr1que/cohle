// Interactive pets. A pet sits on the corner of your user card and does NOTHING by itself: hover makes it wiggle, a click makes it jump with hearts, a bubble and a little sound,
// five quick clicks make it dance (the rule in CLAUDE.md: no sound or big animation without a click). Others see it small and still on your profile card.
import { memo, useEffect, useRef, useState } from "react";
import { PET_OF } from "./registry";
import { playFx, soundboardOn, type FxSound } from "../lib/soundboard";
import { usePrefs } from "./prefs";
import "./pets.css";

export type PetKind = "cat" | "dog" | "fox" | "dragon" | "ghost" | "robot";
const O = "#2b1b10";                                                   // outline brown

/** One drawing per pet (viewBox 0 0 64 64). The class names are what pets.css animates, only on hover / click. */
export const PetArt = memo(function PetArt({ kind, size = 56 }: { kind: PetKind; size?: number }) {
  const eyes = (c = "#1b1b24", y = 30, dx = 9) => <g className="pet-eyes"><ellipse cx={32 - dx} cy={y} rx="2.6" ry="3.2" fill={c} /><ellipse cx={32 + dx} cy={y} rx="2.6" ry="3.2" fill={c} /><circle cx={32 - dx + 1} cy={y - 1.2} r=".9" fill="#fff" /><circle cx={32 + dx + 1} cy={y - 1.2} r=".9" fill="#fff" /></g>;
  const blush = (y = 36) => <><ellipse cx="19" cy={y} rx="3.4" ry="2" fill="#ff8fa3" opacity=".55" /><ellipse cx="45" cy={y} rx="3.4" ry="2" fill="#ff8fa3" opacity=".55" /></>;
  let body: React.ReactNode;
  if (kind === "cat") body = (<>
    <path className="pet-tail" d="M46 52 C58 50 58 36 52 34" fill="none" stroke="#e8923c" strokeWidth="5" strokeLinecap="round" />
    <ellipse className="pet-body" cx="32" cy="50" rx="15" ry="11" fill="#f0a24a" stroke={O} strokeWidth="2" />
    <path d="M13 26 L16 8 L28 18 Z M51 26 L48 8 L36 18 Z" fill="#f0a24a" stroke={O} strokeWidth="2" strokeLinejoin="round" /><path d="M17 20 L18 13 L24 18 Z M47 20 L46 13 L40 18 Z" fill="#ff9db0" />
    <circle cx="32" cy="32" r="18" fill="#f0a24a" stroke={O} strokeWidth="2" />
    <path d="M22 18 q3 4 0 8 M42 18 q-3 4 0 8" stroke="#c97a26" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {eyes()}{blush()}<path d="M30 36 h4 l-2 2.6 Z" fill="#ff7a93" /><path d="M32 38.6 v2.4 M32 41 q-3 3 -6 1 M32 41 q3 3 6 1" stroke={O} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M10 36 l9 1.6 M10 41 l9 -.6 M54 36 l-9 1.6 M54 41 l-9 -.6" stroke={O} strokeWidth="1.2" strokeLinecap="round" /></>);
  else if (kind === "dog") body = (<>
    <path className="pet-tail" d="M46 54 C56 52 58 44 54 40" fill="none" stroke="#b9824f" strokeWidth="5" strokeLinecap="round" />
    <ellipse className="pet-body" cx="32" cy="51" rx="15" ry="10.5" fill="#d9a066" stroke={O} strokeWidth="2" />
    <path d="M12 22 C4 26 6 44 14 44 C18 44 18 30 18 24 Z M52 22 C60 26 58 44 50 44 C46 44 46 30 46 24 Z" fill="#8c5a2e" stroke={O} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="32" cy="31" r="17.5" fill="#d9a066" stroke={O} strokeWidth="2" /><ellipse cx="32" cy="38" rx="9.5" ry="7" fill="#f4dcb8" />
    {eyes("#1b1b24", 29, 8.5)}<ellipse cx="32" cy="34.5" rx="3.6" ry="2.6" fill="#1b1b24" /><path d="M32 37 v3 M32 40 q-3 3 -6 .5 M32 40 q3 3 6 .5" stroke={O} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path className="pet-tongue" d="M30 41.5 q2 6 4 0 Z" fill="#ff7a93" /></>);
  else if (kind === "fox") body = (<>
    <path className="pet-tail" d="M44 54 C62 54 62 34 52 32 C54 40 50 46 44 48 Z" fill="#f07a2a" stroke={O} strokeWidth="2" strokeLinejoin="round" /><path d="M55 36 C58 40 56 46 52 48" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    <ellipse className="pet-body" cx="32" cy="51" rx="14" ry="10.5" fill="#f58a3a" stroke={O} strokeWidth="2" /><ellipse cx="32" cy="53" rx="7" ry="7" fill="#fff4e6" />
    <path d="M10 28 L12 6 L27 17 Z M54 28 L52 6 L37 17 Z" fill="#f58a3a" stroke={O} strokeWidth="2" strokeLinejoin="round" /><path d="M14 20 L14.5 11 L22 16 Z M50 20 L49.5 11 L42 16 Z" fill="#2b1b10" />
    <path d="M32 14 C16 14 10 28 12 34 C16 44 26 46 32 46 C38 46 48 44 52 34 C54 28 48 14 32 14 Z" fill="#f58a3a" stroke={O} strokeWidth="2" strokeLinejoin="round" /><path d="M12 34 C18 36 26 40 32 46 C38 40 46 36 52 34 C48 44 38 46 32 46 C26 46 16 44 12 34 Z" fill="#fff4e6" />
    {eyes("#1b1b24", 29, 9)}<ellipse cx="32" cy="38" rx="3" ry="2.2" fill="#1b1b24" /></>);
  else if (kind === "dragon") body = (<>
    <path className="pet-tail" d="M46 54 C60 54 60 42 54 38 L52 44 C54 48 50 50 46 50 Z" fill="#3bbf6e" stroke={O} strokeWidth="2" strokeLinejoin="round" />
    <path className="pet-wing" d="M16 38 C4 30 4 18 10 12 C14 20 20 22 24 26 Z M48 38 C60 30 60 18 54 12 C50 20 44 22 40 26 Z" fill="#8be0a8" stroke={O} strokeWidth="2" strokeLinejoin="round" />
    <ellipse className="pet-body" cx="32" cy="50" rx="14" ry="11" fill="#46c97a" stroke={O} strokeWidth="2" /><ellipse cx="32" cy="52" rx="8" ry="8" fill="#e8f7a8" />
    <path d="M20 14 L24 4 L28 14 Z M36 14 L40 4 L44 14 Z" fill="#ffd166" stroke={O} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="32" cy="30" r="17" fill="#46c97a" stroke={O} strokeWidth="2" /><ellipse cx="32" cy="37" rx="9" ry="6" fill="#8be0a8" /><circle cx="28.5" cy="36" r="1.1" fill={O} /><circle cx="35.5" cy="36" r="1.1" fill={O} />
    {eyes("#1b1b24", 27, 8)}<path className="pet-flame" d="M32 43 q-3 5 0 8 q3 -3 0 -8 Z" fill="#ff7a1a" /></>);
  else if (kind === "ghost") body = (<>
    <path className="pet-body" d="M12 56 V28 C12 14 21 6 32 6 C43 6 52 14 52 28 V56 L45 50 L38.5 56 L32 50 L25.5 56 L19 50 Z" fill="#f4f0ff" stroke="#8c7bd1" strokeWidth="2" strokeLinejoin="round" />
    {eyes("#2b1b44", 28, 9)}{blush(33)}<ellipse cx="32" cy="38" rx="3.6" ry="4.6" fill="#2b1b44" /><path d="M5 34 q7 -6 9 2 M59 34 q-7 -6 -9 2" stroke="#8c7bd1" strokeWidth="2" fill="none" strokeLinecap="round" /></>);
  else body = (<>
    <path d="M32 6 V12" stroke="#7d8798" strokeWidth="2.6" strokeLinecap="round" /><circle className="pet-led" cx="32" cy="5" r="3.2" fill="#ff4f6d" />
    <rect className="pet-body" x="14" y="38" width="36" height="20" rx="7" fill="#aeb8c8" stroke="#4a5568" strokeWidth="2" /><rect x="22" y="44" width="20" height="8" rx="3" fill="#4a5568" /><circle cx="28" cy="48" r="1.8" fill="#3ddc84" /><circle cx="36" cy="48" r="1.8" fill="#ffd166" />
    <rect x="10" y="12" width="44" height="28" rx="10" fill="#c9d2e0" stroke="#4a5568" strokeWidth="2" /><rect x="15" y="18" width="34" height="16" rx="7" fill="#1b2230" />
    <g className="pet-eyes"><rect x="21" y="23" width="7" height="6" rx="2" fill="#19e0ff" /><rect x="36" y="23" width="7" height="6" rx="2" fill="#19e0ff" /></g>
    <path d="M10 22 h-4 v8 h4 M54 22 h4 v8 h-4" stroke="#4a5568" strokeWidth="2" fill="none" strokeLinecap="round" /></>);
  return <svg className={`pet-svg pet-${kind}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">{body}</svg>;
});

export const PET_INFO: Record<PetKind, { name: string; sound: FxSound; say: string[] }> = {
  cat: { name: "Gatinho", sound: "pet-cat", say: ["Miau!", "Prrrr...", "Mais carinho?"] },
  dog: { name: "Cachorrinho", sound: "pet-dog", say: ["Au au!", "Brinca comigo!", "Te amo!"] },
  fox: { name: "Raposa", sound: "pet-fox", say: ["Quá!", "Fofoca?", "Oi, humano!"] },
  dragon: { name: "Dragãozinho", sound: "pet-dragon", say: ["Rawr!", "Fogo!", "Sou temido (não)."] },
  ghost: { name: "Fantasminha", sound: "pet-ghost", say: ["Buuu!", "Uuuuh...", "Eu assombro com carinho."] },
  robot: { name: "Robozinho", sound: "pet-robot", say: ["Bip bop!", "Processando carinho...", "Sistema feliz."] },
};
const HEARTS = 5, DANCE_CLICKS = 5, DANCE_WINDOW = 5000;

/** The pet on your own screen. Props `size` for where it sits; nothing runs until it is hovered or clicked. */
export function PetWidget({ petKey, className = "", size = 58 }: { petKey: string; className?: string; size?: number }) {
  const kind = PET_OF[petKey] as PetKind | undefined, prefs = usePrefs();
  const [anim, setAnim] = useState<"" | "jump" | "dance">(""), [bubble, setBubble] = useState(""), [hearts, setHearts] = useState<number[]>([]);
  const clicks = useRef<number[]>([]), timers = useRef<number[]>([]), seq = useRef(0);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  if (!kind) return null;
  const info = PET_INFO[kind];
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const pet = () => {
    const now = Date.now(); clicks.current = [...clicks.current.filter((t) => now - t < DANCE_WINDOW), now];
    const dance = clicks.current.length >= DANCE_CLICKS; if (dance) clicks.current = [];
    setAnim(""); requestAnimationFrame(() => setAnim(dance ? "dance" : "jump"));
    setBubble(dance ? "Eba! Dancinha!" : info.say[Math.floor(Math.random() * info.say.length)]);
    const ids = Array.from({ length: dance ? HEARTS + 4 : HEARTS }, () => ++seq.current); setHearts((h) => [...h, ...ids].slice(-14));
    later(() => setHearts((h) => h.filter((x) => !ids.includes(x))), 1400); later(() => setAnim(""), dance ? 1300 : 650); later(() => setBubble(""), 1900);
    if (!prefs.soundsOff && soundboardOn()) playFx(info.sound);
  };
  return (
    <div className={`pet-wrap ${className}`} style={{ width: size, height: size }}>
      <button type="button" onClick={pet} title={`${info.name}: clique para fazer carinho`} aria-label={`${info.name}: clique para fazer carinho`} data-pet={petKey} className={`pet-btn ${anim ? "pet-" + anim : ""}`}><PetArt kind={kind} size={size} /></button>
      {bubble && <span className="pet-bubble" role="status">{bubble}</span>}
      {hearts.map((h, i) => <span key={h} className="pet-heart" style={{ left: `${18 + ((i * 37) % 60)}%`, animationDelay: `${(i % 4) * 0.08}s` }} aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 21s-7.5-4.6-9.8-9.4C.5 8 2.4 4.6 5.9 4.6c2.2 0 3.7 1.1 4.6 2.6.9-1.5 2.4-2.6 4.6-2.6 3.5 0 5.4 3.4 3.7 7C19.5 16.4 12 21 12 21Z" fill="#ff4f6d" stroke="#fff" strokeWidth="1.2" /></svg></span>)}
    </div>
  );
}

/** Small and still, for other people's profile cards and lists. */
export function PetMini({ petKey, size = 26 }: { petKey: string; size?: number }) {
  const kind = PET_OF[petKey] as PetKind | undefined; if (!kind) return null;
  return <span className="pet-mini" title={PET_INFO[kind].name} data-pet-mini={petKey}><PetArt kind={kind} size={size} /></span>;
}
