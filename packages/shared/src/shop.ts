import { z } from "zod";

// ---- The visual-items shop (Preview Beta: everything is free for now; price/isFreeBeta are ready for charging later) ----
export const BETA_LABEL = "Preview Beta";
export const BETA_NOTE = "Loja em breve: os itens estão trancados por enquanto. Só o dono do Cohle libera e presenteia.";

export const ITEM_TYPES = ["frame", "badge", "theme", "entrance", "name_effect", "banner", "pet", "status", "reaction"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
/** Things a person wears at once, one per slot. (Reaction packs are owned, not equipped.) */
export const SLOTS = ["frame", "badge", "theme", "entrance", "name_effect", "banner", "pet", "status"] as const;
export type Slot = (typeof SLOTS)[number];
export const RARITIES = ["comum", "raro", "epico", "lendario"] as const;
export type Rarity = (typeof RARITIES)[number];
export const RARITY_LABEL: Record<Rarity, string> = { comum: "Comum", raro: "Raro", epico: "Épico", lendario: "Lendário" };
export const TYPE_LABEL: Record<ItemType, string> = { frame: "Molduras", badge: "Badges", theme: "Temas", entrance: "Entradas", name_effect: "Nomes", banner: "Banners", pet: "Pets", status: "Status", reaction: "Reações" };
/** Categories an owner can block inside a server. */
export const BLOCKABLE_CATEGORIES = ["politica"] as const;

export interface ShopItemDTO {
  id: string; key: string; tipo: ItemType; nome: string; descricao: string; raridade: Rarity; categoria: string;
  price: number; isFreeBeta: boolean; /** "Em breve": cannot be claimed yet (gifts only) */ locked: boolean; collectionId: string | null; meta: Record<string, unknown>;
}
export interface CollectionDTO {
  id: string; key: string; nome: string; descricao: string; categoria: string; sazonal: boolean;
  inicio: string | null; fim: string | null; ativo: boolean;
  /** in season right now (and active): shown on the storefront */ visible: boolean;
  /** days until the season ends, for "Edição Limitada" */ daysLeft: number | null; bonus: string | null; itemIds: string[];
}
/** A folder of servers in the side rail (the person's own organisation; only they see it). */
export interface ServerGroup { id: string; name: string; color: string; serverIds: string[]; open: boolean; }
export const GROUP_COLORS = ["#ff3b5c", "#ff8a3d", "#ffd166", "#3ddc84", "#19c2ff", "#5b8cff", "#a06bff", "#ff8fcf"] as const;
export const GROUP_NAME_MAX = 24, GROUPS_MAX = 30;
export interface PrefsDTO { effectsOff: boolean; soundsOff: boolean; seasonalAuto: boolean; hidePolitical: boolean; lite: "auto" | "on" | "off"; serverGroups: ServerGroup[]; }
export const DEFAULT_PREFS: PrefsDTO = { effectsOff: false, soundsOff: false, seasonalAuto: true, hidePolitical: false, lite: "auto", serverGroups: [] };
export interface ShopDTO {
  items: ShopItemDTO[]; collections: CollectionDTO[]; owned: string[];
  equipped: Partial<Record<Slot, string>>; /** item ids */ bonus: string | null; prefs: PrefsDTO; now: string; betaTester: boolean;
  /** only the owner account can give gifts */ canGift: boolean;
  /** admin and owner can claim any item, even while the shop is locked */ canTake: boolean;
  /** gifts not opened yet */ unseenGifts: GiftDTO[];
}
export interface GiftDTO { itemId: string; from: string; note: string | null; }
export interface GiftTargetDTO { id: string; username: string; displayName: string | null; email: string; }
export interface GiftResultDTO { ok: true; given: number; skipped: number; to: GiftTargetDTO; }
/** What others see of a person's equipped items: only keys (tiny), resolved by the client registry. */
export interface FxDTO { frame?: string; badge?: string; nameEffect?: string; pet?: string; status?: string; banner?: string; }

export const equipSchema = z.object({ slot: z.enum(SLOTS), itemId: z.string().max(40).nullable() });
export const equipSetSchema = z.object({ collectionId: z.string().max(40) });
export const prefsSchema = z.object({
  effectsOff: z.boolean().optional(), soundsOff: z.boolean().optional(), seasonalAuto: z.boolean().optional(), hidePolitical: z.boolean().optional(),
  lite: z.enum(["auto", "on", "off"]).optional(),
  serverGroups: z.array(z.object({
    id: z.string().min(1).max(40), name: z.string().trim().min(1).max(GROUP_NAME_MAX), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    serverIds: z.array(z.string().min(1).max(40)).max(200), open: z.boolean(),
  })).max(GROUPS_MAX).optional(),
});
export const GIFT_NOTE_MAX = 140, GIFT_ITEMS_MAX = 80;
/** `to`: @username, e-mail or user id. Items by id, or a whole collection. */
export const giftSchema = z.object({
  to: z.string().trim().min(2).max(120), itemIds: z.array(z.string().max(40)).max(GIFT_ITEMS_MAX).optional(), collectionId: z.string().max(40).optional(),
  note: z.string().trim().max(GIFT_NOTE_MAX).optional(),
}).refine((g) => (g.itemIds?.length ?? 0) > 0 || !!g.collectionId, { message: "no items" });
export const lockSchema = z.object({ locked: z.boolean(), itemIds: z.array(z.string().max(40)).max(400).optional(), collectionId: z.string().max(40).optional() }).refine((g) => (g.itemIds?.length ?? 0) > 0 || !!g.collectionId, { message: "nothing" });
export const serverSettingsSchema = z.object({ blockedCategories: z.array(z.enum(BLOCKABLE_CATEGORIES)).max(BLOCKABLE_CATEGORIES.length) });

type Season = { sazonal: boolean; ativo: boolean; inicio?: string | Date | null; fim?: string | Date | null };
const ms = (v?: string | Date | null) => (v ? new Date(v).getTime() : null);
/** A collection is on the storefront when active and (not seasonal, or now is inside its season). Owners keep what they got afterwards. */
export function seasonActive(c: Season, now: Date = new Date()): boolean {
  if (!c.ativo) return false;
  if (!c.sazonal) return true;
  const a = ms(c.inicio), b = ms(c.fim), t = now.getTime();
  return (a === null || t >= a) && (b === null || t < b);
}
export function daysLeft(c: Season, now: Date = new Date()): number | null {
  const b = ms(c.fim);
  return c.sazonal && b !== null ? Math.max(0, Math.ceil((b - now.getTime()) / 86_400_000)) : null;
}
