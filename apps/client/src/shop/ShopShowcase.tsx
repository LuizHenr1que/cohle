// The "sales window" of the Loja: the big preview (click an item or a whole set, see it live on your own avatar, close) and the collection banner.
// Part of the lazy shop chunk. Everything here is static art or CSS; only the preview stage animates (hover/live classes), and only while it is open.
import { useEffect, useMemo } from "react";
import { m } from "framer-motion";
import { Check, Play, X } from "lucide-react";
import { BETA_LABEL, BETA_NOTE, type CollectionDTO, type ShopItemDTO, type UserDTO } from "@cohle/shared";
import { Avatar } from "../components/Avatar";
import { ItemBadge, UserName } from "./UserName";
import { GIANT_LABEL, GiantArt } from "./GiantIcons";
import { ENTRANCE_OF, THEME_OF, THEME_PREVIEW } from "./registry";
import { CornerArt } from "./art";
import { useShop } from "./ShopProvider";

export type PreviewReq = { title: string; subtitle?: string; items: ShopItemDTO[]; collection?: CollectionDTO };

const fire = (kind: "entrance" | "giant", p: object) => window.dispatchEvent(new CustomEvent("cohle:fx-preview", { detail: { kind, ...p } }));
const first = (items: ShopItemDTO[], tipo: string) => items.find((i) => i.tipo === tipo);

/** Colours, art and words of each season: what makes a collection look like a product. */
export const SEASON_STYLE: Record<string, { bg: string; ring: string; kicker: string; headline: string; pitch: string }> = {
  natal: { bg: "radial-gradient(120% 140% at 15% 0%, rgba(230,57,70,.45), transparent 62%), radial-gradient(90% 120% at 100% 100%, rgba(61,220,132,.22), transparent 60%), linear-gradient(135deg,#0d2038,#06101c)", ring: "#e63946", kicker: "Edição de Natal", headline: "O Natal chegou no Cohle", pitch: "Neve caindo, luzinhas nas bordas e uma árvore no canto: clique nela e o Papai Noel passa no trenó." },
  auras: { bg: "radial-gradient(110% 130% at 10% 0%, rgba(255,122,26,.38), transparent 58%), radial-gradient(100% 120% at 100% 20%, rgba(90,168,255,.34), transparent 60%), radial-gradient(90% 120% at 60% 110%, rgba(160,107,255,.32), transparent 60%), linear-gradient(135deg,#0d1020,#070812)", ring: "#8fb8ff", kicker: "Coleção de Auras", headline: "Energia em volta de você", pitch: "Fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon girando ao redor do seu avatar. Passe o mouse e veja." },
  hacker: { bg: "radial-gradient(110% 130% at 15% 0%, rgba(61,255,122,.3), transparent 60%), linear-gradient(135deg,#06150b,#030a05)", ring: "#3dff7a", kicker: "Coleção Hacker", headline: "Modo terminal", pitch: "Verde fosforescente, código em chuva e a entrada ACCESS GRANTED. Para quem vive no teclado." },
  gamer: { bg: "radial-gradient(110% 130% at 15% 0%, rgba(181,123,255,.42), transparent 60%), radial-gradient(90% 120% at 100% 100%, rgba(25,224,255,.26), transparent 60%), linear-gradient(135deg,#150d2e,#0a0716)", ring: "#b57bff", kicker: "Coleção Gamer", headline: "Aperte start", pitch: "Arena neon, controle girando, borda pixel e a entrada GAME ON!" },
  barbearia: { bg: "radial-gradient(110% 130% at 15% 0%, rgba(224,176,80,.34), transparent 60%), radial-gradient(90% 120% at 100% 100%, rgba(200,49,47,.24), transparent 60%), linear-gradient(135deg,#2a190d,#150d08)", ring: "#e0b050", kicker: "Coleção Barbearia", headline: "Na régua", pitch: "Poste de barbeiro girando, tesoura de ouro, bigode e a entrada Na régua!" },
  rainha: { bg: "radial-gradient(110% 130% at 15% 0%, rgba(255,143,207,.4), transparent 60%), radial-gradient(90% 120% at 100% 100%, rgba(183,148,255,.3), transparent 60%), linear-gradient(135deg,#2a1226,#170a14)", ring: "#ff8fcf", kicker: "Coleção Rainha", headline: "Reino rosé", pitch: "Coroa, flores, brilho de diamante e a entrada Chegou a Rainha!" },
  halloween: { bg: "radial-gradient(120% 140% at 15% 0%, rgba(255,122,26,.42), transparent 62%), radial-gradient(90% 120% at 100% 100%, rgba(160,107,255,.3), transparent 60%), linear-gradient(135deg,#1b0f2e,#0d0716)", ring: "#ff7a1a", kicker: "Edição de Halloween", headline: "Noite de Halloween", pitch: "Lua cheia, luzes laranja e uma abóbora no canto: clique nela e a bruxa de vassoura passa." },
};

/** Static decorative art on the right of a banner (no animation, no cost). */
export function SeasonDeco({ k }: { k: string }) {
  if (k === "auras") return (
    <svg className="absolute right-0 top-0 h-[185px] w-[40%] pointer-events-none hidden sm:block opacity-90 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" viewBox="0 0 300 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      {[[190, 100, 70, "#ff7a1a"], [235, 70, 48, "#8fdcff"], [250, 140, 40, "#a06bff"], [150, 60, 28, "#ffd84a"]].map(([x, y, r, c], i) => <g key={i}><circle cx={x as number} cy={y as number} r={r as number} fill="none" stroke={c as string} strokeWidth="5" opacity=".55" /><circle cx={x as number} cy={y as number} r={(r as number) - 12} fill="none" stroke={c as string} strokeWidth="1.5" strokeDasharray="3 7" opacity=".9" /></g>)}
    </svg>
  );
  if (k === "hacker" || k === "gamer" || k === "barbearia" || k === "rainha") return (
    <div className="absolute right-8 top-4 pointer-events-none hidden sm:block opacity-95"><CornerArt k={k === "hacker" ? "terminal" : k === "gamer" ? "gamepad" : k === "barbearia" ? "pole" : "crown"} size={128} /></div>
  );
  if (k === "halloween") return (
    <svg className="absolute right-0 top-0 h-[185px] w-[46%] opacity-90 pointer-events-none hidden sm:block [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" viewBox="0 0 300 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <circle cx="220" cy="58" r="34" fill="#f6efff" opacity=".92" /><circle cx="234" cy="50" r="30" fill="#1b0f2e" opacity=".25" />
      {[[120, 40, 1], [170, 100, 0.8], [90, 120, 0.7], [260, 130, 0.9]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 8 C-4 0 -12 -2 -26 2 C-22 8 -22 16 -24 22 C-18 18 -12 20 -8 28 C-6 24 -3 22 0 26 C3 22 6 24 8 28 C12 20 18 18 24 22 C22 16 22 8 26 2 C12 -2 4 0 0 8 Z" fill="#2b1b44" stroke="#a06bff" strokeWidth="1.6" /></g>)}
      <g transform="translate(150 150)"><ellipse cx="0" cy="22" rx="42" ry="40" fill="#ff7a1a" /><ellipse cx="-24" cy="22" rx="24" ry="38" fill="#ff8a2a" /><ellipse cx="24" cy="22" rx="24" ry="38" fill="#ff8a2a" /><ellipse cx="0" cy="22" rx="16" ry="40" fill="#ff9a3d" /><path d="M-22 10 l8 14 h-16 Z M22 10 l8 14 h-16 Z" fill="#2b1200" /><path d="M-26 40 q26 22 52 0 l-8 -6 l-8 8 l-10 -8 l-10 8 l-8 -8 Z" fill="#2b1200" /><path d="M0 -20 C0 -34 8 -40 16 -44" stroke="#2f8f4e" strokeWidth="7" fill="none" strokeLinecap="round" /></g>
    </svg>
  );
  return (
    <svg className="absolute right-0 top-0 h-[185px] w-[46%] opacity-90 pointer-events-none hidden sm:block [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" viewBox="0 0 300 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 47) % 300} cy={(i * 83) % 200} r={1 + (i % 3)} fill="#fff" opacity={0.35 + (i % 4) * 0.15} />)}
      <path d="M0 190 C70 150 150 170 300 140 V200 H0 Z" fill="#e8f1ff" opacity=".9" />
      {[[210, 150, 1.25], [265, 160, 0.9], [150, 164, 0.75]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><rect x="-5" y="-4" width="10" height="16" fill="#6b4a2f" /><path d="M0 -92 L28 -52 H-28 Z" fill="#1f7a4d" /><path d="M0 -72 L36 -26 H-36 Z" fill="#23905a" /><path d="M0 -50 L42 2 H-42 Z" fill="#2aa56a" /><path d="M0 -100 L3 -92 L12 -91 L5 -85 L7 -76 L0 -81 L-7 -76 L-5 -85 L-12 -91 L-3 -92 Z" fill="#ffd166" />{[[-14, -30, "#e63946"], [14, -22, "#5cc8ff"], [-4, -52, "#ffd166"]].map(([cx, cy, c], j) => <circle key={j} cx={cx as number} cy={cy as number} r="3.6" fill={c as string} />)}</g>)}
    </svg>
  );
}

/** The real art of the collection's items in a row: the person sees what they are getting before opening anything. */
export function Showcase({ items, me }: { items: ShopItemDTO[]; me: UserDTO }) {
  const frame = first(items, "frame"), name = first(items, "name_effect"), badge = first(items, "badge"), ent = first(items, "entrance"), react = first(items, "reaction"), theme = first(items, "theme");
  const icons = ((react?.meta as any)?.icons ?? []) as string[];
  const frames = items.filter((i) => i.tipo === "frame");
  const tile = "rounded-2xl border border-white/10 bg-black/25 p-3 flex flex-col items-center justify-center gap-2 min-h-[112px] text-center";
  const label = (t: string) => <span className="text-[10px] uppercase tracking-wider text-white/55">{t}</span>;
  const vars = theme ? THEME_PREVIEW[THEME_OF[theme.key]] : undefined;
  if (frames.length > 3 && !theme) return (                                      // a collection that is only frames (the auras): every one of them, big enough to see
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="Todas as auras">
      {frames.map((f) => <div key={f.id} className={tile + " min-h-[148px]"}><div className="p-3.5"><Avatar user={{ ...me, fx: { frame: f.key } }} size={52} /></div><span className="text-xs font-semibold">{f.nome}</span>{label("Passe o mouse")}</div>)}
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5" aria-label="O que vem no conjunto">
      {theme && <div className={tile} style={vars as React.CSSProperties}><div className="w-full h-14 rounded-lg border border-white/10 p-1.5 flex gap-1" style={{ background: "var(--color-bg)" }}><div className="w-3 rounded" style={{ background: "var(--color-surface)" }} /><div className="flex-1 rounded p-1 space-y-1" style={{ background: "var(--color-surface)" }}><div className="h-1.5 w-2/3 rounded" style={{ background: "var(--color-accent)" }} /><div className="h-1.5 w-1/2 rounded" style={{ background: "var(--color-accent2)" }} /></div></div>{label("Tema")}</div>}
      {frame && <div className={tile}><Avatar user={{ ...me, fx: { frame: frame.key } }} size={56} />{label("Moldura")}</div>}
      {name && <div className={tile}><span className="text-lg"><UserName user={{ ...me, fx: { nameEffect: name.key } }} /></span>{label("Nome")}</div>}
      {badge && <div className={tile}><ItemBadge user={{ fx: { badge: badge.key } }} full />{label("Emblema")}</div>}
      {ent && <div className={tile}><span className="text-xl font-black text-white drop-shadow-[0_3px_12px_rgba(255,140,60,.7)]">{ENTRANCE_OF[ent.key]?.text ?? ent.nome}</span>{label("Entrada")}</div>}
      {icons.length > 0 && <div className={tile}><div className="flex gap-1">{icons.map((ic) => <GiantArt key={ic} icon={ic} size={30} />)}</div>{label("Reações")}</div>}
    </div>
  );
}

/** The big preview: your own avatar and name wearing the item (or the whole set), live, with the entrance and the reactions one click away. Click, see, leave. */
export function PreviewModal({ req, me, onClose }: { req: PreviewReq; me: UserDTO; onClose: () => void }) {
  const ctx = useShop()!, shop = ctx.shop!;
  const { items, collection } = req;
  const frame = first(items, "frame"), name = first(items, "name_effect"), badge = first(items, "badge"), ent = first(items, "entrance"), theme = first(items, "theme"), react = first(items, "reaction");
  const icons = ((react?.meta as any)?.icons ?? []) as string[];
  const vars = theme ? THEME_PREVIEW[THEME_OF[theme.key]] : undefined;
  const sample = useMemo(() => ({ ...me, fx: { ...(frame ? { frame: frame.key } : {}), ...(name ? { nameEffect: name.key } : {}), ...(badge ? { badge: badge.key } : {}) } }), [me, frame, name, badge]);
  const missing = items.filter((i) => !shop.owned.includes(i.id));
  const look = collection ? SEASON_STYLE[collection.key] : undefined;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  const entranceOf = ent ? ENTRANCE_OF[ent.key] : undefined;
  useEffect(() => { if (!entranceOf) return; const t = setTimeout(() => fire("entrance", { key: ent!.key, who: me.username }), 450); return () => clearTimeout(t); }, [entranceOf, me.username]);       // the entrance plays by itself when the preview opens
  const act = async () => {
    try { for (const i of missing) await ctx.claim(i); } catch { /* the shop screen shows the error on retry */ }
  };
  const wear = async () => {
    try {
      if (collection) await ctx.equipSet(collection.id);
      else if (items[0] && items[0].tipo !== "reaction") await ctx.equip(items[0].tipo as any, items[0]);
    } catch { /* idem */ }
  };
  return (
    <div className="fixed inset-0 z-[65] bg-black/70 grid place-items-center p-3 sm:p-6" onMouseDown={onClose}>
      <m.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.18 }} role="dialog" aria-label={`Prévia: ${req.title}`} onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[94dvh] overflow-y-auto rounded-3xl border border-line bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <div className="relative px-5 sm:px-7 pt-5 pb-4" style={{ background: look?.bg }}>
          <button onClick={onClose} aria-label="Fechar prévia" className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60"><X size={16} /></button>
          <div className="flex items-center gap-2 flex-wrap"><span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#8b5cf6] to-[#e056d9]" title={BETA_NOTE}>{BETA_LABEL}</span>{collection?.sazonal && collection.daysLeft !== null && <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40">Edição limitada · {collection.daysLeft} dia{collection.daysLeft === 1 ? "" : "s"}</span>}</div>
          <h2 className="mt-2 text-2xl font-extrabold">{req.title}</h2>
          {req.subtitle && <p className="text-sm text-white/70 mt-1 max-w-xl">{req.subtitle}</p>}
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-line p-5 sm:p-6 flex flex-col items-center gap-3" style={{ ...(vars ?? {}), background: vars ? "var(--color-bg)" : "rgba(255,255,255,.03)", color: vars ? "var(--color-ink)" : undefined } as React.CSSProperties} aria-label="Como fica em você">
            <Avatar user={sample} size={104} live />
            <div className="text-xl font-bold flex items-center gap-2 flex-wrap justify-center"><UserName user={sample} live />{badge && <ItemBadge user={sample} full />}</div>
            {!frame && !name && !badge && !theme && !ent && !icons.length && <p className="text-sm text-muted">Sem prévia visual para este item.</p>}
            {theme && <p className="text-xs text-muted text-center">O tema muda as cores do app inteiro{(theme.meta as any)?.sleigh || (theme.meta as any)?.witch ? " e deixa um ícone no canto: " + (collection?.key === "halloween" ? "clique na abóbora e a bruxa passa, com som." : "clique na árvore e o Papai Noel passa no trenó, com o ho ho ho.") : (theme.meta as any)?.corner ? ". Clique no ícone do canto para ver a animação com som." : "."}</p>}
            {entranceOf && <button onClick={() => fire("entrance", { key: ent!.key, who: me.username })} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-semibold"><Play size={13} /> Ver a entrada de novo</button>}
            {icons.length > 0 && <div className="flex items-center gap-2 flex-wrap justify-center">{icons.map((ic) => <button key={ic} onClick={() => fire("giant", { icon: ic })} title={`${GIANT_LABEL[ic] ?? ic}: ver ao vivo`} className="rounded-xl p-2 hover:bg-white/10 transition"><GiantArt icon={ic} size={52} /></button>)}<span className="text-[11px] text-muted w-full text-center">Clique para ver cada reação atravessar a tela.</span></div>}
          </div>
          {collection && <Showcase items={items} me={me} />}
          <div className="flex flex-col sm:flex-row gap-2">
            {missing.length > 0 ? <button onClick={act} className="grad flex-1 rounded-xl py-3 font-semibold text-white hover:brightness-110">{collection ? `Pegar o conjunto grátis (${missing.length})` : "Pegar grátis (Beta)"}</button>
              : <div className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm text-emerald-300 font-semibold rounded-xl bg-emerald-500/10 py-3"><Check size={16} /> {collection ? "Você tem o conjunto completo" : "Você já tem este item"}</div>}
            {missing.length === 0 && (collection || items[0]?.tipo !== "reaction") && <button onClick={wear} className="flex-1 rounded-xl py-3 font-semibold bg-white/10 hover:bg-white/15">{collection ? "Equipar conjunto completo" : "Equipar"}</button>}
            <button onClick={onClose} className="rounded-xl py-3 px-5 font-semibold text-muted hover:text-ink hover:bg-white/5">Sair</button>
          </div>
          <p className="text-[11px] text-muted text-center">{BETA_NOTE}</p>
        </div>
      </m.div>
    </div>
  );
}

