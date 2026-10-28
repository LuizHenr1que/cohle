import { lazy, Suspense } from "react";
import { Gift, X } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { UserDTO } from "@cohle/shared";
import { useShop } from "./ShopProvider";
import { usePrefs } from "./prefs";

const EffectsHost = lazy(() => import("./fx/EffectsHost"));
const ShopModal = lazy(() => import("./ShopModal"));
const GiftReceived = lazy(() => import("./GiftReceived"));

/** Sits inside the ShopProvider. Loads the effects only when something needs them, and the Shop screen only when it is opened. */
export function ShopLayer({ self, socket, voiceId, nameFor, open, onClose, onOpenShop }: {
  self: UserDTO; socket: () => Socket | null | undefined; voiceId?: string; nameFor: (userId: string) => string; open: boolean; onClose: () => void; onOpenShop: () => void;
}) {
  const ctx = useShop(), prefs = usePrefs();
  const shop = ctx?.shop, keys = ctx?.keys ?? {};
  const season = !!shop?.collections.some((c) => c.key === "natal" && c.visible);
  const need = open || !!voiceId || !!keys.theme || (season && prefs.seasonalAuto && !keys.theme);
  return (
    <>
      {need && !prefs.effectsOff && <Suspense fallback={null}><EffectsHost keys={keys} bonus={shop?.bonus ?? null} season={season} socket={socket} voiceId={voiceId} nameFor={nameFor} /></Suspense>}
      {open && <Suspense fallback={null}><ShopModal me={self} onClose={onClose} /></Suspense>}
      {ctx?.giftOpen && !!shop?.unseenGifts?.length && <Suspense fallback={null}><GiftReceived gifts={shop.unseenGifts} onOpenShop={onOpenShop} /></Suspense>}
      {ctx?.liveGift && !ctx.giftOpen && (
        <div role="status" aria-label="Novo presente" className="fixed z-[85] right-4 bottom-4 max-w-[min(92vw,340px)] flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-surface shadow-[0_16px_50px_rgba(0,0,0,0.55)] pl-3 pr-2 py-2.5">
          <span className="size-9 rounded-xl grid place-items-center bg-amber-400/15 text-amber-200 shrink-0"><Gift size={18} /></span>
          <div className="min-w-0 flex-1"><div className="text-sm font-bold leading-tight">Você ganhou um presente!</div><div className="text-xs text-muted truncate">{ctx.liveGift.from} te enviou {ctx.liveGift.count} {ctx.liveGift.count === 1 ? "item" : "itens"}</div></div>
          <button onClick={() => { ctx.dismissLive(); ctx.setGiftOpen(true); }} className="rounded-lg px-3 py-1.5 text-xs font-bold bg-amber-400/20 text-amber-100 hover:bg-amber-400/30 shrink-0">Abrir</button>
          <button onClick={ctx.dismissLive} aria-label="Dispensar aviso" className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/10 shrink-0"><X size={14} /></button>
        </div>
      )}
    </>
  );
}

/** A count on the Loja button in the rail while there are gifts not opened yet (same look as the unread badge of the messages). */
export function ShopRailBadge({ railOpen }: { railOpen: boolean }) {
  const ctx = useShop(), n = ctx?.shop?.unseenGifts?.length ?? 0; if (!n) return null;
  return <span data-gift-badge={n} aria-label={`${n} presente${n === 1 ? "" : "s"} para abrir`} onClick={(e) => { e.stopPropagation(); ctx?.setGiftOpen(true); }} className={`${railOpen ? "" : "absolute -bottom-1 -right-1 border-2 border-surface"} min-w-5 h-5 px-1 rounded-full bg-amber-400 text-black text-[11px] font-bold grid place-items-center cursor-pointer`}>{n > 99 ? "99+" : n}</span>;
}
