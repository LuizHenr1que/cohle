// Frames of the Brasil, Carnaval, Memes and Anime collections. FrameArt delegates here; every drawing is static, the .spin / .tw-a groups only move on hover or live (shop.css).
const ring = (n: number, off = 0) => Array.from({ length: n }, (_, i) => (i / n) * 360 + off);
const star5 = (r: number) => Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`; }).join(" ");

export function Frame2Art({ kind }: { kind: string }): JSX.Element | null {
  const v = { className: "fx-art", viewBox: "0 0 100 100", "aria-hidden": true } as const;
  if (kind === "laurel") {
    const leaves = Array.from({ length: 9 }, (_, i) => { const phi = (100 + i * 20) * Math.PI / 180, x = 50 + Math.cos(phi) * 45, y = 50 + Math.sin(phi) * 45; return { x, y, rot: (100 + i * 20) + 90, c: i % 2 ? "#17a34a" : "#22c55e" }; });
    return (
      <svg {...v}>{[false, true].map((mirror) => <g key={String(mirror)} transform={mirror ? "translate(100 0) scale(-1 1)" : undefined}>{leaves.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx="6.8" ry="2.8" fill={l.c} stroke="#0b5a24" strokeWidth=".7" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />)}</g>)}
        <g className="tw-a">{[[50, 4], [10, 32], [90, 32]].map(([x, y], i) => <polygon key={i} points={star5(3.6)} transform={`translate(${x} ${y})`} fill="#ffdf00" stroke="#b8860b" strokeWidth=".6" />)}</g></svg>
    );
  }
  if (kind === "bflag") return (
    <svg {...v}><circle cx="50" cy="50" r="46" fill="none" stroke="#009c3b" strokeWidth="5" strokeDasharray="36 21.9" /><circle cx="50" cy="50" r="46" fill="none" stroke="#ffdf00" strokeWidth="5" strokeDasharray="21.9 36" strokeDashoffset="-36" />
      <g className="spin"><circle cx="50" cy="4" r="4.6" fill="#002776" stroke="#fff" strokeWidth="1.2" /><polygon points={star5(2.6)} transform="translate(50 4)" fill="#fff" /></g></svg>
  );
  if (kind === "cmask") return (
    <svg {...v}><circle cx="50" cy="50" r="46" fill="none" stroke="#ff4fd8" strokeWidth="2.4" /><circle cx="50" cy="50" r="46" fill="none" stroke="#ffd166" strokeWidth="1.2" strokeDasharray="1.5 6" />
      <g transform="translate(56 6) rotate(14)"><path d="M0 8 C0 -2 28 -2 28 8 C28 18 20 20 14 14 C8 20 0 18 0 8 Z" fill="#b57bff" stroke="#4a1f94" strokeWidth="1.6" strokeLinejoin="round" /><ellipse cx="8" cy="8" rx="3.6" ry="2.4" fill="#12091f" /><ellipse cx="20" cy="8" rx="3.6" ry="2.4" fill="#12091f" /><path d="M6 3 q8 -4 16 0" stroke="#ffd166" strokeWidth="1.4" fill="none" strokeLinecap="round" /><circle className="tw-a" cx="14" cy="2" r="1.4" fill="#ffd166" /></g></svg>
  );
  if (kind === "cfeather") return (
    <svg {...v}><g className="spin">{ring(9, 0).map((a, i) => <path key={i} transform={`rotate(${a} 50 50) translate(50 6)`} d="M0 0 C-4 -3 -4 -12 0 -16 C4 -12 4 -3 0 0 Z" fill={["#ff4f6d", "#ffd166", "#19c2ff", "#3ddc84", "#b57bff", "#ff8fcf"][i % 6]} stroke="#fff" strokeWidth=".6" opacity=".95" />)}</g><circle cx="50" cy="50" r="46" fill="none" stroke="#ffd166" strokeWidth="1.6" /></svg>
  );
  if (kind === "shades") return (
    <svg {...v} shapeRendering="crispEdges"><circle cx="50" cy="50" r="46" fill="none" stroke="#a3e635" strokeWidth="3" strokeDasharray="6 3" />
      <g transform="translate(30 30)"><rect x="0" y="0" width="16" height="9" fill="#111" /><rect x="22" y="0" width="16" height="9" fill="#111" /><rect x="16" y="2" width="6" height="3" fill="#111" /><rect x="-4" y="1" width="4" height="3" fill="#111" /><rect x="38" y="1" width="4" height="3" fill="#111" /><rect x="2" y="2" width="5" height="2" fill="#a3e635" /><rect x="24" y="2" width="5" height="2" fill="#a3e635" /></g></svg>
  );
  if (kind === "plus1000") return (
    <svg {...v}><circle cx="50" cy="50" r="46" fill="none" stroke="#a3e635" strokeWidth="3" /><circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 7" />
      <g transform="translate(54 80)"><rect x="-2" y="-8" width="40" height="16" rx="8" fill="#16a34a" stroke="#052e16" strokeWidth="1.6" /><text x="18" y="4" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="Impact, Arial Black, sans-serif" fill="#fff">+1000</text></g></svg>
  );
  if (kind === "charms") return (
    <svg {...v}><circle cx="50" cy="50" r="46" fill="none" stroke="#ff8fb8" strokeWidth="1.6" opacity=".8" /><g className="spin">{ring(6, 10).map((a, i) => <g key={i} transform={`rotate(${a} 50 50) translate(50 4)`}><rect x="-3.6" y="-5" width="7.2" height="12" rx="1.4" fill="#fff4f8" stroke="#e11d48" strokeWidth="1" /><path d="M0 -2.6 V4.6" stroke="#e11d48" strokeWidth="1.4" /></g>)}</g></svg>
  );
  if (kind === "glint") return (
    <svg {...v}><circle cx="50" cy="50" r="46" fill="none" stroke="#a5b4fc" strokeWidth="1.6" /><g>{[[18, 20, 7], [82, 24, 5], [90, 62, 6], [12, 66, 5], [50, 94, 6]].map(([x, y, s], i) => <path key={i} className={i % 2 ? "tw-a" : "tw-b"} transform={`translate(${x} ${y})`} d={`M0 ${-s} L${s * 0.28} ${-s * 0.28} L${s} 0 L${s * 0.28} ${s * 0.28} L0 ${s} L${-s * 0.28} ${s * 0.28} L${-s} 0 L${-s * 0.28} ${-s * 0.28} Z`} fill="#fff" stroke="#a5b4fc" strokeWidth=".6" />)}</g></svg>
  );
  return null;
}
