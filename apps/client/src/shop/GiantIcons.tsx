import { memo } from "react";
import { Flame, Gift, Heart, PartyPopper } from "lucide-react";
import type { GiantIcon } from "./registry";

const Snowman = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="45" r="15" fill="#f2f7ff" /><circle cx="32" cy="24" r="10.5" fill="#fff" />
    <rect x="22" y="9" width="20" height="5" rx="1.5" fill="#2b2b3a" /><rect x="25" y="2" width="14" height="9" rx="1.5" fill="#2b2b3a" /><rect x="25" y="8" width="14" height="2.4" fill="#e63946" />
    <circle cx="28" cy="22" r="1.4" fill="#222" /><circle cx="36" cy="22" r="1.4" fill="#222" /><path d="M32 25 L42 27 L32 28.5 Z" fill="#ff8a3d" />
    <circle cx="32" cy="41" r="1.7" fill="#2b2b3a" /><circle cx="32" cy="47" r="1.7" fill="#2b2b3a" /><path d="M20 38 L8 30 M44 38 L56 30" stroke="#6b4a2f" strokeWidth="2.4" strokeLinecap="round" /></svg>
);
const Reindeer = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><path d="M22 20 L14 6 M18 14 L10 12 M42 20 L50 6 M46 14 L54 12" stroke="#7a4b24" strokeWidth="3" strokeLinecap="round" fill="none" />
    <ellipse cx="32" cy="36" rx="15" ry="17" fill="#a8693a" /><ellipse cx="32" cy="44" rx="9" ry="7" fill="#d9a56d" /><circle cx="25" cy="31" r="2.2" fill="#2b1b10" /><circle cx="39" cy="31" r="2.2" fill="#2b1b10" />
    <circle cx="32" cy="46" r="4.4" fill="#e63946" /></svg>
);
const Pumpkin = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><path d="M32 14 C32 8 36 5 40 3" stroke="#2f8f4e" strokeWidth="4" fill="none" strokeLinecap="round" />
    <ellipse cx="20" cy="38" rx="16" ry="18" fill="#ff7a1a" /><ellipse cx="44" cy="38" rx="16" ry="18" fill="#ff7a1a" /><ellipse cx="32" cy="38" rx="12" ry="19" fill="#ff9a3d" />
    <path d="M20 31 l5 8 h-10 Z M44 31 l5 8 h-10 Z" fill="#2b1200" /><path d="M18 46 q14 12 28 0 l-4 -3 l-4 4 l-6 -4 l-6 4 l-4 -4 Z" fill="#2b1200" /></svg>
);
const GhostArt = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><path d="M12 56 V28 C12 14 21 6 32 6 C43 6 52 14 52 28 V56 L44 49 L38 56 L32 49 L26 56 L20 49 Z" fill="#f6efff" />
    <ellipse cx="25" cy="27" rx="3.4" ry="4.6" fill="#2b1b44" /><ellipse cx="39" cy="27" rx="3.4" ry="4.6" fill="#2b1b44" /><ellipse cx="32" cy="38" rx="4" ry="5.4" fill="#2b1b44" /></svg>
);
const Bat = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><path d="M32 20 C28 14 20 12 6 16 C10 22 10 30 8 38 C14 34 20 36 24 44 C26 40 29 38 32 42 C35 38 38 40 40 44 C44 36 50 34 56 38 C54 30 54 22 58 16 C44 12 36 14 32 20 Z" fill="#2b1b44" stroke="#a06bff" strokeWidth="2" strokeLinejoin="round" />
    <path d="M27 20 L29 12 L32 18 L35 12 L37 20" fill="#2b1b44" stroke="#a06bff" strokeWidth="2" strokeLinejoin="round" /><circle cx="29.5" cy="24" r="1.4" fill="#ff7a1a" /><circle cx="34.5" cy="24" r="1.4" fill="#ff7a1a" /></svg>
);
const Svg = ({ size, children }: { size: number; children: React.ReactNode }) => <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">{children}</svg>;
const Terminal64 = ({ size }: { size: number }) => <Svg size={size}><rect x="6" y="10" width="52" height="44" rx="6" fill="#04120a" stroke="#3dff7a" strokeWidth="3" /><path d="M16 26 l10 8 l-10 8" fill="none" stroke="#3dff7a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><rect x="30" y="40" width="16" height="4.4" fill="#3dff7a" /></Svg>;
const BugArt = ({ size }: { size: number }) => <Svg size={size}><ellipse cx="32" cy="38" rx="13" ry="16" fill="#3dff7a" stroke="#0b5a24" strokeWidth="2.4" /><circle cx="32" cy="18" r="8" fill="#3dff7a" stroke="#0b5a24" strokeWidth="2.4" /><path d="M32 24 V54 M19 32 H8 M19 42 H8 M45 32 H56 M45 42 H56 M24 12 L18 5 M40 12 L46 5" stroke="#0b5a24" strokeWidth="3" strokeLinecap="round" /><circle cx="29" cy="17" r="1.6" fill="#04120a" /><circle cx="35" cy="17" r="1.6" fill="#04120a" /></Svg>;
const LockArt = ({ size }: { size: number }) => <Svg size={size}><path d="M20 30 V22 C20 12 44 12 44 22 V30" fill="none" stroke="#19c2ff" strokeWidth="5" strokeLinecap="round" /><rect x="12" y="28" width="40" height="28" rx="6" fill="#0b2b17" stroke="#3dff7a" strokeWidth="3" /><circle cx="32" cy="41" r="4" fill="#3dff7a" /><rect x="30.4" y="43" width="3.2" height="8" rx="1.4" fill="#3dff7a" /></Svg>;
const Gamepad64 = ({ size }: { size: number }) => <Svg size={size}><path d="M14 20 H50 C58 20 62 30 60 42 C59 50 54 54 49 50 L43 43 H21 L15 50 C10 54 5 50 4 42 C2 30 6 20 14 20 Z" fill="#1a1338" stroke="#b57bff" strokeWidth="3" strokeLinejoin="round" /><path d="M18 27 v12 M12 33 h12" stroke="#19e0ff" strokeWidth="3.6" strokeLinecap="round" /><circle cx="44" cy="28" r="3" fill="#ff4fd8" /><circle cx="50" cy="34" r="3" fill="#ffd166" /><circle cx="38" cy="34" r="3" fill="#3dff7a" /><circle cx="44" cy="40" r="3" fill="#19e0ff" /></Svg>;
const TrophyArt = ({ size }: { size: number }) => <Svg size={size}><path d="M18 8 H46 V26 C46 36 40 42 32 42 C24 42 18 36 18 26 Z" fill="#ffd166" stroke="#b8860b" strokeWidth="2.6" strokeLinejoin="round" /><path d="M18 14 H8 C8 26 12 30 20 31 M46 14 H56 C56 26 52 30 44 31" fill="none" stroke="#e0b050" strokeWidth="3" strokeLinecap="round" /><rect x="29" y="42" width="6" height="8" fill="#e0b050" /><rect x="20" y="50" width="24" height="7" rx="2" fill="#b8860b" /><path d="M26 14 V24" stroke="#fff3c4" strokeWidth="3" strokeLinecap="round" opacity=".8" /></Svg>;
const PixelHeart = ({ size }: { size: number }) => <Svg size={size}><g shapeRendering="crispEdges" fill="#ff3b5c">{[[8, 12, 16, 8], [32, 12, 16, 8], [4, 20, 56, 12], [8, 32, 48, 8], [16, 40, 32, 8], [24, 48, 16, 6]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g><g shapeRendering="crispEdges" fill="#ffb3c0"><rect x="10" y="16" width="6" height="6" /><rect x="16" y="22" width="4" height="4" /></g></Svg>;
const ScissorsArt = ({ size }: { size: number }) => <Svg size={size}><path d="M22 36 L50 6 L54 10 L30 42 Z M42 36 L14 6 L10 10 L34 42 Z" fill="#f4e4b5" stroke="#b8860b" strokeWidth="2" strokeLinejoin="round" /><circle cx="19" cy="48" r="8" fill="none" stroke="#e0b050" strokeWidth="4" /><circle cx="45" cy="48" r="8" fill="none" stroke="#e0b050" strokeWidth="4" /><circle cx="32" cy="35" r="2.2" fill="#b8860b" /></Svg>;
const MustacheArt = ({ size }: { size: number }) => <Svg size={size}><path d="M32 30 C26 22 14 24 8 32 C4 38 6 46 12 44 C18 42 20 36 26 36 C28 36 30 36 32 38 C34 36 36 36 38 36 C44 36 46 42 52 44 C58 46 60 38 56 32 C50 24 38 22 32 30 Z" fill="#3a2214" stroke="#1a0f08" strokeWidth="2" strokeLinejoin="round" /><path d="M14 32 C20 28 26 30 30 34" stroke="#6b4a2f" strokeWidth="2" fill="none" strokeLinecap="round" /></Svg>;
const RazorArt = ({ size }: { size: number }) => <Svg size={size}><path d="M6 26 C12 18 30 14 42 18 L46 26 L10 34 Z" fill="#dfe6ee" stroke="#8793a1" strokeWidth="2.2" strokeLinejoin="round" /><path d="M10 34 L46 26 L50 30 L16 42 Z" fill="#2a2018" stroke="#1a0f08" strokeWidth="2" strokeLinejoin="round" /><path d="M14 24 C22 20 32 19 40 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" /><circle cx="48" cy="28" r="2.4" fill="#e0b050" /></Svg>;
const CrownArt = ({ size }: { size: number }) => <Svg size={size}><path d="M8 46 L6 18 L21 31 L32 12 L43 31 L58 18 L56 46 Z" fill="#ffd166" stroke="#b8860b" strokeWidth="2.6" strokeLinejoin="round" /><rect x="8" y="44" width="48" height="9" rx="2.6" fill="#e0b050" stroke="#b8860b" strokeWidth="2.2" /><circle cx="6" cy="16" r="4" fill="#ff8fcf" /><circle cx="32" cy="10" r="4" fill="#9fe8ff" /><circle cx="58" cy="16" r="4" fill="#ff8fcf" /></Svg>;
const FlowerArt = ({ size }: { size: number }) => <Svg size={size}>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="32" cy="17" rx="8.4" ry="12.4" fill={r % 144 ? "#ff8fcf" : "#ffb3d9"} stroke="#c2478e" strokeWidth="1.6" transform={`rotate(${r} 32 32)`} />)}<circle cx="32" cy="32" r="7.4" fill="#ffd166" stroke="#b8860b" strokeWidth="1.8" /></Svg>;
const DiamondArt = ({ size }: { size: number }) => <Svg size={size}><path d="M12 22 L22 10 H42 L52 22 L32 56 Z" fill="#bfeaff" stroke="#4aa8d8" strokeWidth="2.4" strokeLinejoin="round" /><path d="M12 22 H52 M22 10 L26 22 L32 56 L38 22 L42 10 M26 22 L32 10 L38 22" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" opacity=".9" /></Svg>;
const FireworkArt = ({ size }: { size: number }) => <Svg size={size}><g strokeLinecap="round">{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, c = ["#ffd166", "#ff4f6d", "#19c2ff", "#3ddc84"][i % 4]; return <g key={i}><path d={`M${32 + Math.cos(a) * 9} ${32 + Math.sin(a) * 9} L${32 + Math.cos(a) * 24} ${32 + Math.sin(a) * 24}`} stroke={c} strokeWidth="3.2" /><circle cx={32 + Math.cos(a) * 29} cy={32 + Math.sin(a) * 29} r="2.6" fill={c} /></g>; })}</g><circle cx="32" cy="32" r="4.4" fill="#fff3c9" /></Svg>;
const ChampagneArt = ({ size }: { size: number }) => <Svg size={size}><path d="M28 4 H36 V12 L40 20 V58 H24 V20 L28 12 Z" fill="#1f5b3a" stroke="#0f3a24" strokeWidth="2.4" strokeLinejoin="round" /><rect x="27" y="2" width="10" height="7" rx="2" fill="#ffd166" stroke="#b8860b" strokeWidth="1.6" /><rect x="24" y="30" width="16" height="16" fill="#fff3c9" stroke="#e0b050" strokeWidth="1.6" /><circle cx="32" cy="38" r="3.4" fill="#e0b050" />{[[46, 10], [52, 18], [44, 22], [54, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#fff3c9" stroke="#e0b050" strokeWidth="1" />)}</Svg>;
const ClockArt = ({ size }: { size: number }) => <Svg size={size}><circle cx="32" cy="32" r="27" fill="#10101c" stroke="#ffd166" strokeWidth="4" />{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <path key={i} d={`M${32 + Math.sin(a) * 21} ${32 - Math.cos(a) * 21} L${32 + Math.sin(a) * 24} ${32 - Math.cos(a) * 24}`} stroke="#ffd166" strokeWidth={i % 3 ? 1.6 : 3} strokeLinecap="round" />; })}<path d="M32 32 V13 M32 32 L32 32" stroke="#fff3c9" strokeWidth="3.6" strokeLinecap="round" /><path d="M32 32 L32 14" stroke="#fff3c9" strokeWidth="3.6" strokeLinecap="round" /><circle cx="32" cy="32" r="3" fill="#ff4f6d" /></Svg>;
/** The icons of the giant reaction. Original art (no brands, no characters, no emojis). */
export const GiantArt = memo(function GiantArt({ icon, size = 96 }: { icon: GiantIcon | string; size?: number }) {
  switch (icon) {
    case "heart": return <Heart size={size} fill="#ff3b5c" color="#ff3b5c" />;
    case "fire": return <Flame size={size} fill="#ff8a3d" color="#ff5c1f" />;
    case "party": return <PartyPopper size={size} color="#ffd166" />;
    case "gift": return <Gift size={size} color="#e63946" fill="#e6394655" />;
    case "snowman": return <Snowman size={size} />;
    case "reindeer": return <Reindeer size={size} />;
    case "pumpkin": return <Pumpkin size={size} />;
    case "ghost": return <GhostArt size={size} />;
    case "bat": return <Bat size={size} />;
    case "terminal": return <Terminal64 size={size} />;
    case "bug": return <BugArt size={size} />;
    case "lock": return <LockArt size={size} />;
    case "gamepad": return <Gamepad64 size={size} />;
    case "trophy": return <TrophyArt size={size} />;
    case "pixelheart": return <PixelHeart size={size} />;
    case "scissors": return <ScissorsArt size={size} />;
    case "mustache": return <MustacheArt size={size} />;
    case "razor": return <RazorArt size={size} />;
    case "crown": return <CrownArt size={size} />;
    case "flower": return <FlowerArt size={size} />;
    case "diamond": return <DiamondArt size={size} />;
    case "firework": return <FireworkArt size={size} />;
    case "champagne": return <ChampagneArt size={size} />;
    case "clock": return <ClockArt size={size} />;
    default: return null;
  }
});
export const GIANT_LABEL: Record<string, string> = { heart: "Coração", fire: "Fogo", party: "Festa", gift: "Presente", snowman: "Boneco de neve", reindeer: "Rena", pumpkin: "Abóbora", ghost: "Fantasma", bat: "Morcego", terminal: "Terminal", bug: "Bug", lock: "Cadeado", gamepad: "Controle", trophy: "Troféu", pixelheart: "Coração pixel", scissors: "Tesoura", mustache: "Bigode", razor: "Navalha", crown: "Coroa", flower: "Flor", diamond: "Diamante", firework: "Fogos", champagne: "Champanhe", clock: "Relógio" };
