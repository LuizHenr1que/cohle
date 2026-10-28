// "Presentear": only the owner account sees it (the server refuses anyone else). Pick a person, pick items or a whole collection, add a note, send.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Gift, Search, X } from "lucide-react";
import { GIFT_ITEMS_MAX, GIFT_NOTE_MAX, RARITY_LABEL, type CollectionDTO, type GiftTargetDTO, type ShopItemDTO, type UserDTO } from "@cohle/shared";
import { api } from "../api";
import { RARITY_COLOR } from "./registry";

export type GiftPre = { itemIds?: string[]; collectionId?: string; to?: GiftTargetDTO };

export function GiftModal({ me, pre, onClose, onDone }: { me: UserDTO; pre?: GiftPre; onClose: () => void; onDone: () => void }) {
  const [cat, setCat] = useState<{ items: ShopItemDTO[]; collections: CollectionDTO[] }>();
  const [q, setQ] = useState(""), [found, setFound] = useState<GiftTargetDTO[]>([]), [to, setTo] = useState<GiftTargetDTO | undefined>(pre?.to);
  const [picked, setPicked] = useState<Set<string>>(new Set(pre?.itemIds ?? []));
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [err, setErr] = useState("");
  const [filter, setFilter] = useState("");
  const timer = useRef<number>();
  useEffect(() => { api.adminCatalog().then((c) => { setCat(c); if (pre?.collectionId) setPicked((p) => new Set([...p, ...c.items.filter((i) => i.collectionId === pre.collectionId).map((i) => i.id)])); }).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (to || q.trim().replace(/^@/, "").length < 2) { setFound([]); return; }
    timer.current = window.setTimeout(() => { api.giftTargets(q).then(setFound).catch(() => setFound([])); }, 280);
    return () => window.clearTimeout(timer.current);
  }, [q, to]);
  const byCol = useMemo(() => (cat?.collections ?? []).map((c) => ({ c, items: (cat?.items ?? []).filter((i) => i.collectionId === c.id && (!filter || i.nome.toLowerCase().includes(filter.toLowerCase()))) })).filter((g) => g.items.length), [cat, filter]);
  const loose = (cat?.items ?? []).filter((i) => !i.collectionId && (!filter || i.nome.toLowerCase().includes(filter.toLowerCase())));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setMany = (ids: string[], on: boolean) => setPicked((p) => { const n = new Set(p); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const send = async () => {
    if (!to || !picked.size) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      const ids = [...picked]; let given = 0, skipped = 0;
      for (let i = 0; i < ids.length; i += GIFT_ITEMS_MAX) { const r = await api.gift({ to: to.id, itemIds: ids.slice(i, i + GIFT_ITEMS_MAX), note: note.trim() || undefined }); given += r.given; skipped += r.skipped; }
      setMsg(`Presente enviado para @${to.username}: ${given} ${given === 1 ? "item" : "itens"}${skipped ? ` (${skipped} já ${skipped === 1 ? "tinha" : "tinham"})` : ""}.`); setPicked(new Set()); setNote(""); onDone();
    } catch (e: any) { setErr(e?.message ?? "Não foi possível presentear."); } finally { setBusy(false); }
  };
  const row = (i: ShopItemDTO) => (
    <li key={i.id}><button type="button" onClick={() => toggle(i.id)} aria-pressed={picked.has(i.id)} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/5">
      <span className={`size-4 rounded border grid place-items-center shrink-0 ${picked.has(i.id) ? "bg-accent border-accent text-white" : "border-line"}`}>{picked.has(i.id) && <Check size={11} strokeWidth={3} />}</span>
      <span className="flex-1 truncate text-sm">{i.nome}</span><span className="text-[10px] font-bold uppercase" style={{ color: RARITY_COLOR[i.raridade] }}>{RARITY_LABEL[i.raridade]}</span></button></li>
  );
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 grid place-items-center p-3 sm:p-6" onMouseDown={onClose}>
      <div role="dialog" aria-label="Presentear" onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-xl max-h-[94dvh] overflow-y-auto rounded-3xl border border-line bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)] p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3"><span className="size-10 rounded-2xl grid place-items-center bg-accent/15 text-accent shrink-0"><Gift size={20} /></span>
          <div className="flex-1"><h2 className="text-xl font-bold">Presentear</h2><p className="text-sm text-muted">Só você (conta dona) pode dar itens. Funciona mesmo com o item trancado ou fora da temporada.</p></div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink"><X size={16} /></button></div>

        <div className="space-y-1.5"><span className="text-xs text-muted">Para quem</span>
          {to ? <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"><span className="size-8 rounded-full grad grid place-items-center text-white font-bold text-sm">{(to.displayName || to.username)[0]?.toUpperCase()}</span>
            <div className="min-w-0 flex-1"><div className="font-semibold truncate">{to.displayName || to.username}</div><div className="text-xs text-muted truncate">@{to.username}{to.email ? ` · ${to.email}` : ""}{to.id === me.id ? " (você)" : ""}</div></div>
            <button onClick={() => { setTo(undefined); setQ(""); }} className="text-xs text-accent2 hover:underline">trocar</button></div>
          : <div className="space-y-1.5"><button type="button" onClick={() => setTo({ id: me.id, username: me.username, displayName: me.displayName ?? null, email: "" })} aria-label="Presentear a mim mesmo" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25">Para mim</button>
          <div className="relative"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar pessoa" placeholder="@usuário, nome ou e-mail" className="w-full rounded-xl bg-white/5 border border-line pl-9 pr-3 py-2.5 outline-none focus:border-accent" />
            {found.length > 0 && <ul className="mt-1 rounded-xl border border-line divide-y divide-line overflow-hidden" role="listbox" aria-label="Pessoas encontradas">{found.map((u) => <li key={u.id}><button type="button" role="option" aria-selected={false} onClick={() => setTo(u)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5"><span className="size-7 rounded-full grad grid place-items-center text-white font-bold text-xs">{(u.displayName || u.username)[0]?.toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium truncate">{u.displayName || u.username}</span><span className="block text-xs text-muted truncate">@{u.username} · {u.email}</span></span></button></li>)}</ul>}</div></div>}
        </div>

        <div className="space-y-1.5"><div className="flex items-center gap-2"><span className="text-xs text-muted flex-1">O que dar ({picked.size} selecionado{picked.size === 1 ? "" : "s"})</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar itens" placeholder="filtrar" className="w-32 rounded-lg bg-white/5 border border-line px-2.5 py-1 text-xs outline-none focus:border-accent" /></div>
          <div className="max-h-[34dvh] overflow-y-auto rounded-2xl border border-line" aria-label="Itens para presentear">
            {!cat && !err && <p className="p-4 text-sm text-muted">Carregando o catálogo...</p>}
            {byCol.map(({ c, items }) => { const all = items.every((i) => picked.has(i.id)); return (
              <div key={c.id}><div className="sticky top-0 z-[1] flex items-center gap-2 px-3 py-1.5 bg-surface-2 border-b border-line"><span className="text-xs font-bold uppercase tracking-wider flex-1">{c.nome}</span>
                <button type="button" onClick={() => setMany(items.map((i) => i.id), !all)} className="text-[11px] text-accent2 hover:underline">{all ? "limpar" : "coleção inteira"}</button></div>
                <ul>{items.map(row)}</ul></div>); })}
            {loose.length > 0 && <div><div className="px-3 py-1.5 bg-surface-2 border-b border-line text-xs font-bold uppercase tracking-wider">Avulsos</div><ul>{loose.map(row)}</ul></div>}
          </div></div>

        <label className="block space-y-1.5"><span className="text-xs text-muted">Recado (opcional)</span>
          <input value={note} maxLength={GIFT_NOTE_MAX} onChange={(e) => setNote(e.target.value)} aria-label="Recado" placeholder="Ex.: bem-vindo ao Cohle!" className="w-full rounded-xl bg-white/5 border border-line px-3 py-2.5 outline-none focus:border-accent" /></label>
        {err && <p className="text-sm text-accent" role="alert">{err}</p>}
        {msg && <p className="text-sm text-emerald-300" role="status">{msg}</p>}
        <div className="flex gap-2 justify-end"><button onClick={onClose} className="rounded-xl px-5 py-2.5 bg-white/5 hover:bg-white/10 text-sm">Fechar</button>
          <button disabled={busy || !to || !picked.size} onClick={send} className="grad rounded-xl px-5 py-2.5 font-semibold text-white hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2"><Gift size={16} />{busy ? "Enviando..." : "Enviar presente"}</button></div>
      </div>
    </div>
  );
}
