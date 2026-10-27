// Corner pictures of the new themes (the same art is used, bigger, on the collection banners). Static.
export function Corner2Svg({ k, size }: { k: string; size: number }): JSX.Element | null {
  const c = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true } as const;
  if (k === "ball") return (
    <svg {...c}><circle cx="32" cy="32" r="26" fill="#fff" stroke="#1f2937" strokeWidth="2.6" /><polygon points="32,20 42,27 38,39 26,39 22,27" fill="#1f2937" /><path d="M32 20 V8 M42 27 L53 22 M38 39 L46 49 M26 39 L18 49 M22 27 L11 22" stroke="#1f2937" strokeWidth="2.2" strokeLinecap="round" /><path d="M12 24 Q8 34 14 46 M52 24 Q56 34 50 46" fill="none" stroke="#009c3b" strokeWidth="3" strokeLinecap="round" opacity=".7" /><circle cx="46" cy="14" r="3" fill="#ffdf00" /></svg>
  );
  if (k === "mask") return (
    <svg {...c}><path d="M6 24 C6 8 58 8 58 24 C58 42 44 46 36 36 C34 34 30 34 28 36 C20 46 6 42 6 24 Z" fill="#b57bff" stroke="#4a1f94" strokeWidth="2.4" strokeLinejoin="round" /><ellipse cx="19" cy="24" rx="7" ry="4.6" fill="#12091f" /><ellipse cx="45" cy="24" rx="7" ry="4.6" fill="#12091f" /><path d="M12 14 q20 -10 40 0" stroke="#ffd166" strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M32 8 q-6 -6 -4 -6 M32 8 q6 -6 4 -6" stroke="#ff4fd8" strokeWidth="2.4" strokeLinecap="round" /><circle className="tw-a" cx="32" cy="16" r="2.4" fill="#ffd166" /><path d="M22 52 q10 8 20 0" stroke="#3ddc84" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M16 58 q16 -8 32 0" stroke="#ff8fcf" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
  );
  if (k === "stonks") return (
    <svg {...c}><rect x="6" y="8" width="52" height="48" rx="6" fill="#12091f" stroke="#a3e635" strokeWidth="2.4" /><path d="M12 46 L24 34 L32 40 L50 18" fill="none" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><polygon points="52,14 54,28 42,20" fill="#a3e635" /><text x="32" y="58" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="Impact, Arial Black, sans-serif" fill="#a3e635" opacity=".0">.</text><path className="tw-a" d="M12 16 h14 M12 22 h9" stroke="#b57bff" strokeWidth="2.4" strokeLinecap="round" /></svg>
  );
  if (k === "torii") return (
    <svg {...c}><path d="M6 14 Q32 6 58 14 L56 20 Q32 12 8 20 Z" fill="#e11d48" stroke="#7f1d1d" strokeWidth="1.8" strokeLinejoin="round" /><rect x="10" y="24" width="44" height="5" fill="#e11d48" stroke="#7f1d1d" strokeWidth="1.6" /><rect x="14" y="20" width="6" height="40" fill="#e11d48" stroke="#7f1d1d" strokeWidth="1.6" /><rect x="44" y="20" width="6" height="40" fill="#e11d48" stroke="#7f1d1d" strokeWidth="1.6" /><rect x="29" y="14" width="6" height="10" fill="#7f1d1d" />{[[22, 6], [50, 8], [40, 3]].map(([x, y], i) => <path key={i} className={i % 2 ? "tw-a" : "tw-b"} transform={`translate(${x} ${y})`} d="M0 0 C-2 -1.6 -2 -4 0 -5 C2 -4 2 -1.6 0 0 Z" fill="#ffb3d1" />)}</svg>
  );
  return null;
}
