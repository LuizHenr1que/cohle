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
    default: return null;
  }
});
export const GIANT_LABEL: Record<string, string> = { heart: "Coração", fire: "Fogo", party: "Festa", gift: "Presente", snowman: "Boneco de neve", reindeer: "Rena", pumpkin: "Abóbora", ghost: "Fantasma", bat: "Morcego" };
