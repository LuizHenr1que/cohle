// Which category each equipped key belongs to (filled from the catalog), so "hide political items" can hide them everywhere.
import { useSyncExternalStore } from "react";
import type { FxDTO, ShopItemDTO } from "@cohle/shared";
import { getPrefs, usePrefs } from "./prefs";

const cat = new Map<string, string>();
let version = 0;
const subs = new Set<() => void>();
export function setCategories(items: ShopItemDTO[]) { let changed = false; for (const i of items) if (cat.get(i.key) !== i.categoria) { cat.set(i.key, i.categoria); changed = true; } if (changed) { version++; subs.forEach((f) => f()); } }
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** What of someone's equipped items this viewer should see (the neutral version replaces political ones when they asked to hide them). */
export function useFxView(fx?: FxDTO): FxDTO | undefined {
  const prefs = usePrefs(); useSyncExternalStore(sub, () => version);
  if (!fx || !prefs.hidePolitical) return fx;
  const out: FxDTO = {}; for (const [k, v] of Object.entries(fx)) if (cat.get(v as string) !== "politica") (out as any)[k] = v;
  return Object.keys(out).length ? out : undefined;
}
export const hidesPolitical = () => getPrefs().hidePolitical;
