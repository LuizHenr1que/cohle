// The shop screen. A lazy chunk: nothing here is downloaded until someone opens the Loja. Framer Motion lives only here.
import { useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Check, Gift, Package, Play, Sliders, Sparkles, Store, Trophy, X } from "lucide-react";
import { BETA_LABEL, BETA_NOTE, ITEM_TYPES, RARITIES, RARITY_LABEL, SLOTS, TYPE_LABEL, type CollectionDTO, type ItemType, type Rarity, type ShopItemDTO, type Slot, type UserDTO } from "@cohle/shared";
import { Avatar } from "../components/Avatar";
import { Switch } from "../components/Switch";
import { useShop } from "./ShopProvider";
import { ItemBadge, UserName } from "./UserName";
import { GIANT_LABEL, GiantArt } from "./GiantIcons";
import { ENTRANCE_OF, RARITY_COLOR, THEME_OF, THEME_PREVIEW, SEASON_LOOK } from "./registry";
import { setPrefs, usePrefs } from "./prefs";

type Tab = "vitrine" | "itens" | "colecoes" | "inventario" | "prefs";
const TABS: [Tab, string, typeof Store][] = [["vitrine", "Vitrine", Sparkles], ["itens", "Itens", Package], ["colecoes", "Coleções", Trophy], ["inventario", "Inventário", Gift], ["prefs", "Preferências", Sliders]];

const BetaTag = ({ small = false }: { small?: boolean }) => (
  <span title={BETA_NOTE} className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#8b5cf6] to-[#e056d9] ${small ? "px-1.5 py-[1px] text-[9px]" : "px-2.5 py-0.5 text-[10px]"}`}>{BETA_LABEL}</span>
);
const Rarity = ({ r }: { r: Rarity }) => <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: RARITY_COLOR[r], background: `${RARITY_COLOR[r]}22`, border: `1px solid ${RARITY_COLOR[r]}55` }}>{RARITY_LABEL[r]}</span>;
const preview = (kind: "entrance" | "giant", p: object) => window.dispatchEvent(new CustomEvent("cohle:fx-preview", { detail: { kind, ...p } }));

/** The live preview of an item, on the person's own avatar and name. */
function Preview({ item, me }: { item: ShopItemDTO; me: UserDTO }) {
  const sample = { ...me, fx: undefined };
  if (item.tipo === "frame") return <div className="grid place-items-center h-28"><Avatar user={{ ...sample, fx: { frame: item.key } }} size={72} live /></div>;
  if (item.tipo === "name_effect") return <div className="grid place-items-center h-28 text-2xl"><UserName user={{ ...sample, fx: { nameEffect: item.key } }} live /></div>;
  if (item.tipo === "badge") return <div className="grid place-items-center h-28"><ItemBadge user={{ fx: { badge: item.key } }} full /></div>;
  if (item.tipo === "theme") {
    const vars = THEME_PREVIEW[THEME_OF[item.key]] ?? {};
    return (
      <div className="h-28 rounded-xl overflow-hidden border border-line p-2 flex gap-2" style={{ ...vars, background: "var(--color-bg)", color: "var(--color-ink)" } as React.CSSProperties} aria-label="Prévia do tema">
        <div className="w-5 rounded-md" style={{ background: "var(--color-surface)" }} /><div className="flex-1 rounded-md p-2 space-y-1.5" style={{ background: "var(--color-surface)" }}>
          <div className="h-2 w-2/3 rounded" style={{ background: "var(--color-accent)" }} /><div className="h-2 w-1/2 rounded" style={{ background: "var(--color-muted)", opacity: 0.5 }} /><div className="h-2 w-3/5 rounded" style={{ background: "var(--color-accent2)" }} />
          <div className="flex gap-1 pt-1">{Array.from({ length: 10 }, (_, i) => <span key={i} className="size-1.5 rounded-full bg-white/80" style={{ opacity: 0.4 + (i % 3) * 0.2 }} />)}</div>
        </div>
      </div>
    );
  }
  if (item.tipo === "entrance") {
    const meta = ENTRANCE_OF[item.key];
    return <div className="grid place-items-center h-28 gap-2"><span className="text-3xl font-black text-white drop-shadow-[0_4px_18px_rgba(230,57,70,0.7)]">{meta?.text ?? item.nome}</span>
      <button onClick={() => preview("entrance", { text: meta?.text ?? item.nome, who: me.username, look: meta?.kind })} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-semibold"><Play size={12} /> Ver ao vivo</button></div>;
  }
  if (item.tipo === "reaction") {
    const icons = ((item.meta as any)?.icons ?? []) as string[];
    return <div className="flex items-center justify-center gap-3 h-28">{icons.map((ic) => <button key={ic} onClick={() => preview("giant", { icon: ic })} title={`${GIANT_LABEL[ic] ?? ic}: ver ao vivo`} className="rounded-xl p-1.5 hover:bg-white/10 transition"><GiantArt icon={ic} size={44} /></button>)}</div>;
  }
  return <div className="h-28" />;
}

function Card({ item, me }: { item: ShopItemDTO; me: UserDTO }) {
  const ctx = useShop()!, shop = ctx.shop!;
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const owned = shop.owned.includes(item.id), worn = (SLOTS as readonly string[]).includes(item.tipo) && shop.equipped[item.tipo as Slot] === item.id;
  const col = shop.collections.find((c) => c.id === item.collectionId);
  const act = async () => {
    setBusy(true); setErr("");
    try { if (!owned) await ctx.claim(item); else if (item.tipo !== "reaction") await ctx.equip(item.tipo as Slot, worn ? null : item); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível."); } finally { setBusy(false); }
  };
  return (
    <m.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 26 }} className="rounded-2xl border border-line bg-white/[0.03] p-3.5 flex flex-col gap-2 h-full" data-item={item.key}>
      <div className="flex items-center gap-1.5 flex-wrap"><Rarity r={item.raridade} /><BetaTag small />{col?.sazonal && col.daysLeft !== null && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">Edição Limitada</span>}</div>
      <Preview item={item} me={me} />
      <div><div className="font-semibold">{item.nome}</div><p className="text-xs text-muted leading-relaxed mt-0.5">{item.descricao}</p></div>
      {col?.sazonal && col.daysLeft !== null && <p className="text-[11px] text-amber-300">{col.daysLeft === 0 ? "Último dia" : `${col.daysLeft} dia${col.daysLeft === 1 ? "" : "s"} restante${col.daysLeft === 1 ? "" : "s"}`}</p>}
      {err && <p className="text-xs text-accent" role="alert">{err}</p>}
      <div className="mt-auto pt-1">
        {item.tipo === "reaction" && owned
          ? <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-semibold"><Check size={14} /> Você tem</div>
          : <button disabled={busy} onClick={act} className={`w-full rounded-xl py-2 text-sm font-semibold transition disabled:opacity-60 ${worn ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30" : owned ? "bg-white/10 hover:bg-white/15" : "grad text-white hover:brightness-110"}`}>
            {busy ? "Aguarde..." : worn ? "Equipado (tirar)" : owned ? "Equipar" : "Pegar grátis (Beta)"}
          </button>}
      </div>
    </m.div>
  );
}

/** A grid that only renders the rows on screen (the catalog grows with every collection). */
function VirtualGrid({ items, me, scroller }: { items: ShopItemDTO[]; me: UserDTO; scroller: React.RefObject<HTMLDivElement> }) {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const f = () => setCols(Math.max(1, Math.min(4, Math.floor(el.clientWidth / 250))));
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, [scroller]);
  const rows = Math.ceil(items.length / cols);
  const v = useVirtualizer({ count: rows, getScrollElement: () => scroller.current, estimateSize: () => 372, overscan: 2 });
  if (!items.length) return <p className="text-center text-muted py-16 text-sm">Nada por aqui ainda.</p>;
  return (
    <div style={{ height: v.getTotalSize(), position: "relative" }}>
      {v.getVirtualItems().map((r) => (
        <div key={r.key} className="absolute left-0 right-0 grid gap-3" style={{ transform: `translateY(${r.start}px)`, height: r.size - 12, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.slice(r.index * cols, r.index * cols + cols).map((it) => <Card key={it.id} item={it} me={me} />)}
        </div>
      ))}
    </div>
  );
}

function Collection({ c, items, hero = false }: { c: CollectionDTO; items: ShopItemDTO[]; hero?: boolean }) {
  const ctx = useShop()!, shop = ctx.shop!;
  const mine = items.filter((i) => shop.owned.includes(i.id)), complete = mine.length === items.length;
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState("");
  const wearable = items.filter((i) => (SLOTS as readonly string[]).includes(i.tipo));
  const wornAll = wearable.length > 0 && wearable.every((i) => shop.equipped[i.tipo as Slot] === i.id);
  const claimAll = async () => { setBusy("claim"); setMsg(""); try { for (const i of items) if (!shop.owned.includes(i.id)) await ctx.claim(i); } catch (e: any) { setMsg(e?.message ?? "Não foi possível."); } finally { setBusy(""); } };
  const wear = async () => { setBusy("wear"); setMsg(""); try { const done = await ctx.equipSet(c.id); setMsg(done && c.bonus ? "Conjunto completo equipado: bônus liberado!" : "Equipei o que você tem desta coleção."); } catch (e: any) { setMsg(e?.message ?? "Não foi possível."); } finally { setBusy(""); } };
  return (
    <section style={hero ? { background: `radial-gradient(120% 140% at 20% 0%, ${SEASON_LOOK[c.key]?.tint ?? "rgba(230,57,70,0.28)"}, transparent 70%), linear-gradient(135deg, var(--color-surface-2), var(--color-surface))` } : undefined} className={`rounded-3xl border border-line overflow-hidden ${hero ? "" : "bg-white/[0.03]"}`} aria-label={`Coleção ${c.nome}`}>
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap"><h3 className="text-xl font-extrabold">{c.nome}</h3><BetaTag />{c.sazonal && c.daysLeft !== null && <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">Edição Limitada · {c.daysLeft} dia{c.daysLeft === 1 ? "" : "s"}</span>}</div>
          <p className="text-sm text-muted mt-1 max-w-2xl">{c.descricao}</p>
          <div className="mt-3 flex items-center gap-3"><div className="h-2 w-40 rounded-full bg-white/10 overflow-hidden"><div className="h-full grad" style={{ width: `${(mine.length / Math.max(items.length, 1)) * 100}%` }} /></div><span className="text-xs font-semibold tabular-nums" aria-label="Progresso da coleção">{mine.length}/{items.length} itens</span></div>
        </div>
        <div className="flex flex-col gap-2 sm:w-64 shrink-0">
          {!complete && <button disabled={!!busy} onClick={claimAll} className="grad rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">{busy === "claim" ? "Pegando..." : "Pegar o conjunto (Beta)"}</button>}
          {mine.length > 0 && <button disabled={!!busy || wornAll} onClick={wear} className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-60">{wornAll ? "Conjunto equipado" : "Equipar conjunto completo"}</button>}
          {c.bonus && <p className="text-[11px] text-muted leading-snug">Bônus do conjunto completo (tema + moldura + entrada): {SEASON_LOOK[c.key]?.bonus ?? "um extra no tema"}{shop.bonus === c.bonus ? <b className="text-emerald-300"> · ativo agora</b> : ""}.</p>}
          {msg && <p className="text-xs text-emerald-300" role="status">{msg}</p>}
        </div>
      </div>
    </section>
  );
}

function Prefs() {
  const p = usePrefs();
  const Row = ({ t, h, children }: { t: string; h: string; children: React.ReactNode }) => <div className="flex items-center gap-4 py-3.5 border-b border-line last:border-0"><div className="min-w-0 flex-1"><div className="text-sm font-medium">{t}</div><div className="text-xs text-muted mt-0.5 leading-relaxed">{h}</div></div>{children}</div>;
  return (
    <div className="max-w-2xl rounded-2xl border border-line bg-white/[0.03] px-4">
      <Row t="Desligar efeitos" h="Para de mostrar neve, entradas, reações gigantes e cenas, os seus e os dos outros. Molduras e nomes ficam estáticos."><Switch on={p.effectsOff} onChange={(v) => setPrefs({ effectsOff: v })} label="Desligar efeitos" /></Row>
      <Row t="Desligar sons dos efeitos" h="Silencia os sons das entradas, do trenó e das reações gigantes."><Switch on={p.soundsOff} onChange={(v) => setPrefs({ soundsOff: v })} label="Desligar sons dos efeitos" /></Row>
      <Row t="Tema sazonal automático" h="Neve leve durante a temporada, mesmo sem equipar um tema. Dá para desligar."><Switch on={p.seasonalAuto} onChange={(v) => setPrefs({ seasonalAuto: v })} label="Tema sazonal automático" /></Row>
      <Row t="Ocultar itens políticos dos outros" h="Mostra a versão neutra no lugar de molduras, nomes e badges da categoria política."><Switch on={p.hidePolitical} onChange={(v) => setPrefs({ hidePolitical: v })} label="Ocultar itens políticos dos outros" /></Row>
      <Row t="Modo leve" h="Menos efeitos e sem animações. Automático liga sozinho em aparelhos fracos.">
        <div className="flex gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label="Modo leve">
          {([["auto", "Automático"], ["on", "Ligado"], ["off", "Desligado"]] as const).map(([v, l]) => <button key={v} role="radio" aria-checked={p.lite === v} onClick={() => setPrefs({ lite: v })} className={`px-3 py-1.5 rounded-lg text-xs transition ${p.lite === v ? "bg-accent/20 text-ink font-semibold" : "text-muted hover:text-ink"}`}>{l}</button>)}
        </div>
      </Row>
    </div>
  );
}

export default function ShopModal({ me, onClose }: { me: UserDTO; onClose: () => void }) {
  const ctx = useShop(), shop = ctx?.shop;
  const [tab, setTab] = useState<Tab>("vitrine");
  const [type, setType] = useState<ItemType | "all">("all"), [rar, setRar] = useState<Rarity | "all">("all"), [colF, setColF] = useState("all");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const filtered = useMemo(() => (shop?.items ?? []).filter((i) => (type === "all" || i.tipo === type) && (rar === "all" || i.raridade === rar) && (colF === "all" || i.collectionId === colF)), [shop, type, rar, colF]);
  const owned = useMemo(() => (shop?.items ?? []).filter((i) => shop!.owned.includes(i.id)), [shop]);
  const featured = shop?.collections.filter((c) => c.visible && c.sazonal) ?? [];
  const itemsOf = (c: CollectionDTO) => (shop?.items ?? []).filter((i) => i.collectionId === c.id);
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-medium border transition ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:text-ink"}`;

  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} role="dialog" aria-label="Loja" className="fixed inset-0 z-[60] bg-bg flex flex-col">
        <div className="titlebar-drag hidden electron-mac:block" />
        <header className="shrink-0 border-b border-line px-3 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={onClose} aria-label="Voltar" className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink"><ArrowLeft size={18} /></button>
          <Store size={22} className="text-accent" />
          <div className="min-w-0"><div className="font-bold leading-tight flex items-center gap-2">Loja <BetaTag /></div><div className="text-xs text-muted truncate">{BETA_NOTE}</div></div>
          <button onClick={onClose} aria-label="Fechar" className="ml-auto p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink"><X size={18} /></button>
        </header>
        <nav className="shrink-0 border-b border-line px-3 sm:px-6 flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${tab === id ? "border-accent text-ink font-semibold" : "border-transparent text-muted hover:text-ink"}`}><Icon size={16} className={tab === id ? "text-accent" : ""} />{label}</button>)}
        </nav>
        <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto"><div className="max-w-6xl mx-auto p-3 sm:p-6">
          {ctx?.loading && <p className="text-center text-muted py-20">Abrindo a loja...</p>}
          {ctx?.error && <p className="text-center text-accent py-20" role="alert">{ctx.error}</p>}
          {shop && tab === "vitrine" && (
            <div className="space-y-5">
              {featured.length ? featured.map((c) => <Collection key={c.id} c={c} items={itemsOf(c)} hero />) : <p className="text-muted text-sm">Nenhuma coleção de temporada agora. Volte em breve.</p>}
              <h3 className="text-[11px] uppercase tracking-widest text-muted pt-2">Itens em destaque</h3>
              <VirtualGrid items={shop.items.filter((i) => (featured.length ? featured.some((c) => c.id === i.collectionId) : true))} me={me} scroller={scroller} />
            </div>
          )}
          {shop && tab === "itens" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo">{(["all", ...ITEM_TYPES] as const).map((t) => <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={chip(type === t)}>{t === "all" ? "Todos" : TYPE_LABEL[t]}</button>)}</div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Raridade">{(["all", ...RARITIES] as const).map((r) => <button key={r} onClick={() => setRar(r)} aria-pressed={rar === r} className={chip(rar === r)}>{r === "all" ? "Qualquer raridade" : RARITY_LABEL[r]}</button>)}</div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Coleção"><button onClick={() => setColF("all")} aria-pressed={colF === "all"} className={chip(colF === "all")}>Todas as coleções</button>{shop.collections.map((c) => <button key={c.id} onClick={() => setColF(c.id)} aria-pressed={colF === c.id} className={chip(colF === c.id)}>{c.nome}</button>)}</div>
              <VirtualGrid items={filtered} me={me} scroller={scroller} />
            </div>
          )}
          {shop && tab === "colecoes" && <div className="space-y-4">{shop.collections.length ? shop.collections.map((c) => <Collection key={c.id} c={c} items={itemsOf(c)} />) : <p className="text-muted text-sm">Sem coleções por enquanto.</p>}</div>}
          {shop && tab === "inventario" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">{owned.length} item{owned.length === 1 ? "" : "s"}. Os que você pegou continuam seus mesmo depois que a temporada acaba.</p>
              <VirtualGrid items={owned} me={me} scroller={scroller} />
            </div>
          )}
          {tab === "prefs" && <Prefs />}
        </div></div>
      </m.div>
    </LazyMotion>
  );
}
