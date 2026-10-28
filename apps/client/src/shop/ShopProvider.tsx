import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { ShopDTO, ShopItemDTO, Slot } from "@cohle/shared";
import { api } from "../api";
import { applyTheme, getTheme, SHOP_THEMES, type ThemeId } from "../lib/theme";
import { mergeRemote } from "./prefs";
import { setCategories } from "./categories";
import { THEME_OF } from "./registry";

export interface ShopCtx {
  shop?: ShopDTO; loading: boolean; error: string;
  /** equipped item KEYS by slot (e.g. { theme: "natal.theme" }) */ keys: Partial<Record<Slot, string>>;
  refresh: () => Promise<void>;
  claim: (item: ShopItemDTO) => Promise<void>;
  equip: (slot: Slot, item: ShopItemDTO | null) => Promise<void>;
  equipSet: (collectionId: string) => Promise<boolean>;
  /** a gift that arrived while the app was open: shown as a quiet toast, never as a window in the middle of a game or a call */ liveGift: { from: string; count: number } | null; dismissLive: () => void;
  /** the "Você ganhou um presente!" window (opens by itself once when the app opens with unopened gifts, or when the person clicks the toast / the Loja badge) */ giftOpen: boolean; setGiftOpen: (v: boolean) => void;
}
const Ctx = createContext<ShopCtx | null>(null);
export const useShop = () => useContext(Ctx);

/** Holds the person's shop state (catalog, what they own and wear) for the whole app and applies the equipped theme. One small request at start. */
export function ShopProvider({ socket, children }: { socket: () => Socket | null | undefined; children: React.ReactNode }) {
  const [shop, setShop] = useState<ShopDTO>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveGift, setLiveGift] = useState<{ from: string; count: number } | null>(null), [giftOpen, setGiftOpen] = useState(false), firstLoad = useRef(true);
  const prevTheme = useRef<ThemeId | null>(null);

  const refresh = useCallback(async () => {
    try { const s = await api.shop(); setShop(s); setCategories(s.items); mergeRemote(s.prefs); setError(""); if (firstLoad.current) { firstLoad.current = false; if (s.unseenGifts.length) setGiftOpen(true); } }
    catch (e: any) { setError(e?.message ?? "Não foi possível abrir a loja."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  // the equipped items changed on another device
  useEffect(() => {
    let off = () => {}; const t = setInterval(() => { const s = socket(); if (!s) return; clearInterval(t); const h = () => void refresh(); s.on("shop:equipped", h);
      const g = (e: { from?: string; count?: number }) => {
        void refresh(); const info = { from: String(e?.from ?? "Cohle"), count: Number(e?.count ?? 1) }; setLiveGift(info);
        try { if ((document.hidden || !document.hasFocus()) && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Você ganhou um presente!", { body: `${info.from} te enviou ${info.count} ${info.count === 1 ? "item" : "itens"} da Loja do Cohle.`, tag: "cohle-gift" }); } catch { /* the toast and the badge are enough */ }
      };
      s.on("shop:gift", g); off = () => { s.off("shop:equipped", h); s.off("shop:gift", g); }; }, 300);
    return () => { clearInterval(t); off(); };
  }, [refresh, socket]);

  const keys = useMemo(() => {
    const out: Partial<Record<Slot, string>> = {};
    if (shop) for (const [slot, id] of Object.entries(shop.equipped)) { const it = shop.items.find((i) => i.id === id); if (it) out[slot as Slot] = it.key; }
    return out;
  }, [shop]);

  // wearing a shop theme applies it; taking it off restores the one the person had
  useEffect(() => {
    if (!shop) return;
    const want = keys.theme ? THEME_OF[keys.theme] as ThemeId | undefined : undefined;
    const cur = getTheme();
    if (want && cur !== want) { if (!SHOP_THEMES.includes(cur)) prevTheme.current = cur;           // going from one shop theme to another keeps the person's own theme as the one to restore
       try { if (prevTheme.current) localStorage.setItem("cohle:theme-prev", prevTheme.current); } catch { /* ignore */ } applyTheme(want); }
    else if (!want && SHOP_THEMES.includes(cur)) { let prev: ThemeId = "cohle"; try { prev = (localStorage.getItem("cohle:theme-prev") as ThemeId) || "cohle"; } catch { /* ignore */ } applyTheme(SHOP_THEMES.includes(prev) ? "cohle" : prev); }
  }, [shop, keys.theme]);

  const meChanged = () => window.dispatchEvent(new CustomEvent("cohle:me-changed"));
  const claim = useCallback(async (item: ShopItemDTO) => { await api.claimItem(item.id); await refresh(); }, [refresh]);
  const equip = useCallback(async (slot: Slot, item: ShopItemDTO | null) => { await api.equipItem(slot, item?.id ?? null); await refresh(); meChanged(); }, [refresh]);
  const equipSet = useCallback(async (collectionId: string) => { const r = await api.equipSet(collectionId); await refresh(); meChanged(); return r.complete; }, [refresh]);
  const dismissLive = useCallback(() => setLiveGift(null), []);
  const value = useMemo<ShopCtx>(() => ({ shop, loading, error, keys, refresh, claim, equip, equipSet, liveGift, dismissLive, giftOpen, setGiftOpen }), [shop, loading, error, keys, refresh, claim, equip, equipSet, liveGift, dismissLive, giftOpen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
