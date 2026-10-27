// "Você ganhou um presente!": shown once to the person who received items from the owner. Closing it marks the gifts as seen.
import { useMemo, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { SLOTS, type GiftDTO, type ShopItemDTO, type Slot } from "@cohle/shared";
import { RARITY_COLOR } from "./registry";
import { useShop } from "./ShopProvider";
import { api } from "../api";

export default function GiftReceived({ gifts, onOpenShop }: { gifts: GiftDTO[]; onOpenShop: () => void }) {
  const ctx = useShop()!, shop = ctx.shop!;
  const [busy, setBusy] = useState(false);
  const items = useMemo(() => gifts.map((g) => ({ g, it: shop.items.find((i) => i.id === g.itemId) })).filter((x): x is { g: GiftDTO; it: ShopItemDTO } => !!x.it), [gifts, shop.items]);
  const from = gifts[0]?.from ?? "Cohle", note = gifts.find((g) => g.note)?.note;
  const close = async (then?: () => void) => { setBusy(true); try { await api.giftsSeen(); await ctx.refresh(); } catch { /* it comes back next time */ } setBusy(false); then?.(); };
  const wearAll = async () => {
    setBusy(true);
    try { const seen = new Set<string>(); for (const { it } of items) { if (!(SLOTS as readonly string[]).includes(it.tipo) || seen.has(it.tipo)) continue; seen.add(it.tipo); await api.equipItem(it.tipo as Slot, it.id); } window.dispatchEvent(new CustomEvent("cohle:me-changed")); } catch { /* the Loja screen shows details */ }
    await close();
  };
  return (
    <div className="fixed inset-0 z-[90] bg-black/75 grid place-items-center p-3 sm:p-6">
      <div role="dialog" aria-label="Você ganhou um presente" className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl border border-line bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="px-6 pt-7 pb-5 text-center" style={{ background: "radial-gradient(120% 140% at 50% 0%, rgba(255,209,102,.35), transparent 65%), linear-gradient(135deg,#2a1a14,#14090c)" }}>
          <span className="mx-auto size-14 rounded-2xl grid place-items-center bg-white/15 text-amber-200"><Gift size={28} /></span>
          <h2 className="mt-3 text-2xl font-extrabold">Você ganhou um presente!</h2>
          <p className="text-sm text-white/75 mt-1">de <b>{from}</b></p>
          {note && <p className="mt-3 text-sm italic text-white/85">“{note}”</p>}
        </div>
        <div className="px-5 py-4 space-y-3">
          <ul className="rounded-2xl border border-line divide-y divide-line max-h-[36dvh] overflow-y-auto" aria-label="Itens do presente">
            {items.map(({ it }) => <li key={it.id} className="flex items-center gap-3 px-3 py-2"><Sparkles size={15} style={{ color: RARITY_COLOR[it.raridade] }} /><span className="flex-1 text-sm font-medium truncate">{it.nome}</span><span className="text-[10px] uppercase text-muted">{it.tipo.replace("_", " ")}</span></li>)}
          </ul>
          <div className="flex flex-col sm:flex-row gap-2">
            <button disabled={busy} onClick={() => void wearAll()} className="grad flex-1 rounded-xl py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60">Equipar agora</button>
            <button disabled={busy} onClick={() => void close(onOpenShop)} className="flex-1 rounded-xl py-3 font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-60">Ver na Loja</button>
          </div>
          <button disabled={busy} onClick={() => void close()} className="w-full text-sm text-muted hover:text-ink py-1">Fechar</button>
        </div>
      </div>
    </div>
  );
}
