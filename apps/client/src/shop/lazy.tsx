// Pets, animated statuses and animated banners are drawn only for the people who wear one, so their code is loaded on demand (nothing here costs the others a byte).
import { lazy, Suspense } from "react";
import { useShop } from "./ShopProvider";

const PetWidget = lazy(() => import("./pets").then((m) => ({ default: m.PetWidget })));
const PetMini = lazy(() => import("./pets").then((m) => ({ default: m.PetMini })));
const StatusChip = lazy(() => import("./StatusChip").then((m) => ({ default: m.StatusChip })));
const BannerArt = lazy(() => import("./AnimatedBanner").then((m) => ({ default: m.BannerArt })));

/** Your own pet, perched on the corner of your user card. */
export function OwnPet({ className = "" }: { className?: string }) {
  const k = useShop()?.keys.pet; if (!k) return null;
  return <Suspense fallback={null}><PetWidget petKey={k} className={className} /></Suspense>;
}
export function PetMiniLazy({ petKey, size }: { petKey?: string; size?: number }) { if (!petKey) return null; return <Suspense fallback={null}><PetMini petKey={petKey} size={size} /></Suspense>; }
export function StatusLazy({ statusKey, live, compact }: { statusKey?: string; live?: boolean; compact?: boolean }) { if (!statusKey) return null; return <Suspense fallback={null}><StatusChip statusKey={statusKey} live={live} compact={compact} /></Suspense>; }
export function BannerLazy({ bannerKey, live }: { bannerKey?: string; live?: boolean }) { if (!bannerKey) return null; return <Suspense fallback={null}><BannerArt bannerKey={bannerKey} live={live} /></Suspense>; }
