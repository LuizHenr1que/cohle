// Small static scenery of the themes without a season: the picture in the corner of the screen (and the same art, bigger, on the collection banner). No animation, no cost.
const G = "#3dff7a";
export function CornerArt({ k, className, size = 104, onTap, label }: { k: string; className?: string; size?: number; onTap?: () => void; label?: string }) {
  const art = CornerSvg({ k, size });
  if (!art) return null;
  if (!onTap) return <span className={className}>{art}</span>;
  return <button type="button" onClick={onTap} title="Clique" aria-label={label ?? "Clique para ver a animação"} className={`${className ?? ""} cursor-pointer hover:opacity-100 hover:scale-105 active:scale-95 transition`}>{art}</button>;
}
function CornerSvg({ k, size }: { k: string; size: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true } as const;
  if (k === "terminal") return (
    <svg {...common}><rect x="4" y="10" width="56" height="44" rx="5" fill="#04120a" stroke={G} strokeWidth="2" /><rect x="4" y="10" width="56" height="9" rx="5" fill="#0b2b17" /><circle cx="11" cy="14.5" r="1.8" fill="#ff5c5c" /><circle cx="17" cy="14.5" r="1.8" fill="#ffd166" /><circle cx="23" cy="14.5" r="1.8" fill={G} />
      <path d="M11 28 l7 5 l-7 5" fill="none" stroke={G} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><rect className="tw-a" x="22" y="37" width="10" height="3.4" fill={G} /><path d="M36 28 h16 M36 44 h12" stroke="#19c2ff" strokeWidth="2.4" strokeLinecap="round" opacity=".8" /></svg>
  );
  if (k === "gamepad") return (
    <svg {...common}><path d="M16 20 H48 C56 20 60 28 58 40 C57 48 52 52 47 48 L42 42 H22 L17 48 C12 52 7 48 6 40 C4 28 8 20 16 20 Z" fill="#1a1338" stroke="#b57bff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M19 28 v10 M14 33 h10" stroke="#19e0ff" strokeWidth="3" strokeLinecap="round" /><circle cx="43" cy="29" r="2.6" fill="#ff4fd8" /><circle cx="49" cy="34" r="2.6" fill="#ffd166" /><circle cx="37" cy="34" r="2.6" fill="#3dff7a" /><circle cx="43" cy="39" r="2.6" fill="#19e0ff" /></svg>
  );
  if (k === "pole") return (
    <svg {...common}><rect x="22" y="8" width="20" height="6" rx="3" fill="#e0b050" /><rect x="22" y="50" width="20" height="6" rx="3" fill="#e0b050" />
      <rect x="24" y="14" width="16" height="36" rx="3" fill="#fff" stroke="#e0b050" strokeWidth="1.6" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M24 ${18 + i * 9} L40 ${12 + i * 9} L40 ${19 + i * 9} L24 ${25 + i * 9} Z`} fill={i % 2 ? "#2a6fd6" : "#c8312f"} />)}</svg>
  );
  if (k === "crown") return (
    <svg {...common}><path d="M8 44 L6 18 L21 30 L32 12 L43 30 L58 18 L56 44 Z" fill="#ffd166" stroke="#b8860b" strokeWidth="2.2" strokeLinejoin="round" /><rect x="8" y="42" width="48" height="9" rx="2.6" fill="#e0b050" stroke="#b8860b" strokeWidth="2" />
      {[[6, 16, "#ff8fcf"], [32, 10, "#9fe8ff"], [58, 16, "#ff8fcf"]].map(([x, y, c], i) => <circle key={i} className={i === 1 ? "tw-b" : "tw-a"} cx={x as number} cy={y as number} r="4" fill={c as string} stroke="#b8860b" strokeWidth="1.4" />)}<circle cx="32" cy="46.5" r="2.4" fill="#ff8fcf" /><circle cx="19" cy="46.5" r="2" fill="#9fe8ff" /><circle cx="45" cy="46.5" r="2" fill="#9fe8ff" /></svg>
  );
  if (k === "newyear") return (
    <svg {...common}><path d="M26 18 H38 V24 L43 32 V58 H21 V32 L26 24 Z" fill="#1f5b3a" stroke="#0f3a24" strokeWidth="2.2" strokeLinejoin="round" /><rect x="21" y="38" width="22" height="14" fill="#fff3c9" stroke="#e0b050" strokeWidth="1.6" /><path d="M27 45 h10" stroke="#b8860b" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="25" y="14" width="14" height="6" rx="2" fill="#ffd166" stroke="#b8860b" strokeWidth="1.6" />
      <g className="tw-a">{[[46, 8, "#ffd166"], [54, 16, "#ff4f6d"], [50, 4, "#19c2ff"], [58, 8, "#3ddc84"], [44, 14, "#ff8fcf"]].map(([x, y, c], i) => <circle key={i} cx={x as number} cy={y as number} r="2.2" fill={c as string} />)}</g>
      <g className="tw-b" stroke="#ffd166" strokeWidth="1.8" strokeLinecap="round"><path d="M12 12 l4 4 M20 6 v5 M8 22 h5" /></g></svg>
  );
  return null;
}
