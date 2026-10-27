import { lazy, Suspense } from "react";
import type { Socket } from "socket.io-client";
import type { UserDTO } from "@cohle/shared";
import { useShop } from "./ShopProvider";
import { usePrefs } from "./prefs";

const EffectsHost = lazy(() => import("./fx/EffectsHost"));
const ShopModal = lazy(() => import("./ShopModal"));

/** Sits inside the ShopProvider. Loads the effects only when something needs them, and the Shop screen only when it is opened. */
export function ShopLayer({ self, socket, voiceId, nameFor, open, onClose }: {
  self: UserDTO; socket: () => Socket | null | undefined; voiceId?: string; nameFor: (userId: string) => string; open: boolean; onClose: () => void;
}) {
  const ctx = useShop(), prefs = usePrefs();
  const shop = ctx?.shop, keys = ctx?.keys ?? {};
  const season = !!shop?.collections.some((c) => c.key === "natal" && c.visible);
  const need = open || !!voiceId || !!keys.theme || (season && prefs.seasonalAuto && !keys.theme);
  return (
    <>
      {need && !prefs.effectsOff && <Suspense fallback={null}><EffectsHost keys={keys} bonus={shop?.bonus ?? null} season={season} socket={socket} voiceId={voiceId} nameFor={nameFor} /></Suspense>}
      {open && <Suspense fallback={null}><ShopModal me={self} onClose={onClose} /></Suspense>}
    </>
  );
}
