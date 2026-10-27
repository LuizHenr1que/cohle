import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { GIANT_LABEL, GiantArt } from "./GiantIcons";
import { useShop } from "./ShopProvider";
import { REACTION_ICON_KEYS } from "./registry";

const BASE = ["heart", "fire", "party"];
/** "Reação gigante": an icon crosses the screen of everybody in the call. The base three for everyone; packs (e.g. Natal) add more. The server enforces the list and a 5 s cooldown. */
export function GiantButton({ onSend, btnCls, disabled }: { onSend: (icon: string) => void; btnCls: string; disabled?: boolean }) {
  const ctx = useShop(), [open, setOpen] = useState(false), [wait, setWait] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  const owned = new Set<string>(BASE);
  const shop = ctx?.shop;
  if (shop) for (const it of shop.items) if (it.tipo === "reaction" && shop.owned.includes(it.id)) for (const ic of ((it.meta as any)?.icons ?? []) as string[]) owned.add(ic);
  const icons = REACTION_ICON_KEYS.filter((k) => owned.has(k));
  return (
    <div ref={box} className="relative">
      <button title="Reação gigante" aria-label="Reação gigante" aria-expanded={open} className={btnCls} onClick={() => setOpen((v) => !v)}><Sparkles size={20} /></button>
      {open && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-60 max-w-[88vw] glass bg-surface rounded-2xl p-3 z-40 border border-line shadow-2xl" role="menu" aria-label="Reação gigante">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Reação gigante</p>
          <div className="grid grid-cols-3 gap-2">
            {icons.map((ic) => <button key={ic} role="menuitem" disabled={wait || disabled} title={GIANT_LABEL[ic]} aria-label={GIANT_LABEL[ic]} onClick={() => { onSend(ic); setWait(true); setTimeout(() => setWait(false), 5000); setOpen(false); }}
              className="rounded-xl bg-white/5 hover:bg-accent/20 disabled:opacity-40 p-2 grid place-items-center transition"><GiantArt icon={ic} size={38} /></button>)}
          </div>
        </div>
      )}
    </div>
  );
}
