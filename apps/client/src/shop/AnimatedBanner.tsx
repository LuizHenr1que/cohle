// Animated profile banners: layers of gradients moved with transform/opacity (no blur or filter animation). They move only while the profile is open (`live`);
// everywhere else (cards in the Loja, lists) the first frame is static.
import { memo } from "react";
import { BANNER_OF } from "./registry";
import "./banners.css";

export type BannerKind = "aurora" | "neonrain" | "waves" | "stars" | "lava" | "sakura" | "sunset" | "matrix";
export const BANNER_INFO: Record<BannerKind, { label: string; base: string }> = {
  aurora: { label: "Aurora", base: "linear-gradient(160deg,#071a2b,#0e3b4f 55%,#251a4a)" },
  neonrain: { label: "Chuva neon", base: "linear-gradient(180deg,#0a0716,#1a0f33)" },
  waves: { label: "Ondas", base: "linear-gradient(180deg,#0b2a55,#103e7a)" },
  stars: { label: "Estrelas", base: "linear-gradient(180deg,#05050f,#14123a)" },
  lava: { label: "Lava", base: "linear-gradient(180deg,#240808,#4a1208)" },
  sakura: { label: "Sakura", base: "linear-gradient(160deg,#2a1020,#5a2342)" },
  sunset: { label: "Pôr do sol", base: "linear-gradient(180deg,#2b1055,#c2410c 70%,#ffb347)" },
  matrix: { label: "Código verde", base: "linear-gradient(180deg,#020a05,#07210f)" },
};
const R = (n: number, f: (i: number) => React.ReactNode) => Array.from({ length: n }, (_, i) => f(i));

export const BannerArt = memo(function BannerArt({ bannerKey, live = false, className = "" }: { bannerKey?: string; live?: boolean; className?: string }) {
  const kind = bannerKey ? (BANNER_OF[bannerKey] as BannerKind | undefined) : undefined; if (!kind) return null;
  let layers: React.ReactNode;
  if (kind === "aurora") layers = <>{["#3dffb0", "#5b8cff", "#b57bff"].map((c, i) => <i key={i} className="bn-blob" style={{ background: `radial-gradient(60% 80% at 50% 50%, ${c}99, transparent 70%)`, left: `${-10 + i * 32}%`, animationDelay: `${-i * 2.4}s` }} />)}</>;
  else if (kind === "neonrain") layers = <>{R(16, (i) => <i key={i} className="bn-drop" style={{ left: `${4 + i * 6}%`, height: `${28 + (i % 4) * 14}%`, background: `linear-gradient(180deg, transparent, ${["#19e0ff", "#ff4fd8", "#b57bff"][i % 3]})`, animationDelay: `${-(i % 7) * 0.4}s`, animationDuration: `${1.6 + (i % 3) * 0.4}s` }} />)}</>;
  else if (kind === "waves") layers = <>{[0, 1, 2].map((i) => <svg key={i} className="bn-wave" style={{ bottom: `${-4 + i * 12}%`, animationDuration: `${7 + i * 3}s`, opacity: 0.55 - i * 0.12 }} viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C 50 0 100 60 150 30 S 250 0 300 30 S 350 60 400 30 V60 H0 Z M400 30 C 450 0 500 60 550 30 S 650 0 700 30 S 750 60 800 30 V60 H400 Z" fill={["#5cc8ff", "#3b8cff", "#1b5fbf"][i]} /></svg>)}</>;
  else if (kind === "stars") layers = <>{R(26, (i) => <i key={i} className="bn-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, width: 1.5 + (i % 3), height: 1.5 + (i % 3), animationDelay: `${-(i % 9) * 0.5}s` }} />)}<i className="bn-shoot" /></>;
  else if (kind === "lava") layers = <>{R(9, (i) => <i key={i} className="bn-lava" style={{ left: `${6 + i * 11}%`, width: 18 + (i % 4) * 10, height: 18 + (i % 4) * 10, animationDelay: `${-i * 0.9}s`, animationDuration: `${5 + (i % 3)}s` }} />)}</>;
  else if (kind === "sakura") layers = <>{R(14, (i) => <i key={i} className="bn-petal" style={{ left: `${(i * 29) % 100}%`, animationDelay: `${-i * 0.7}s`, animationDuration: `${6 + (i % 4)}s` }} />)}</>;
  else if (kind === "sunset") layers = <><i className="bn-sun" /><svg className="bn-hills" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 C80 10 140 50 220 28 S340 12 400 34 V60 H0 Z" fill="#1a0b2e" /></svg></>;
  else layers = <>{R(14, (i) => <i key={i} className="bn-code" style={{ left: `${3 + i * 7}%`, animationDelay: `${-(i % 6) * 0.6}s`, animationDuration: `${2.4 + (i % 4) * 0.5}s` }} />)}</>;
  return <div className={`bn bn-${kind} ${live ? "bn-live" : ""} ${className}`} style={{ background: BANNER_INFO[kind].base }} data-banner={bannerKey} aria-hidden="true">{layers}</div>;
});
