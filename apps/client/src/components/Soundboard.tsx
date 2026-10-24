import { useEffect, useRef, useState } from "react";
import { Siren, Sparkles, Laugh, PhoneCall, Swords, Music } from "lucide-react";
import { SOUNDS, setSoundboardOn, soundboardOn, type SoundId } from "../lib/soundboard";

const ICON: Record<SoundId, typeof Siren> = { scare: Siren, fireworks: Sparkles, laugh: Laugh, call: PhoneCall, tatakae: Swords };

/** Button + panel in the call bar: click a sound and everyone in the call hears it. */
export function Soundboard({ onPlay, btnCls, disabled }: { onPlay: (id: SoundId) => void; btnCls: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [wait, setWait] = useState(false);                    // short cooldown, same rule as the server
  const [hear, setHear] = useState(soundboardOn());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button title="Sons para a sala: susto, fogos, risos..." aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={`h-11 sm:h-12 px-3 sm:px-4 rounded-2xl flex items-center gap-2 text-sm font-semibold transition ring-1 ring-accent/40 ${open ? "grad text-white" : "bg-accent/20 text-accent hover:bg-accent/30"}`}><Music size={20} /> Sons</button>
      {open && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 max-w-[88vw] glass bg-surface rounded-2xl p-3 z-40 border border-line shadow-2xl">
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Sons para a sala</p>
          <div className="grid grid-cols-2 gap-2">
            {SOUNDS.map((s) => { const I = ICON[s.id]; return (
              <button key={s.id} disabled={wait || disabled} onClick={() => { onPlay(s.id); setWait(true); setTimeout(() => setWait(false), 2500); }}
                className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-accent/20 disabled:opacity-40 px-3 py-2.5 text-sm text-left transition">
                <I size={16} className="text-accent shrink-0" /> {s.label}
              </button>
            ); })}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" checked={hear} onChange={(e) => { setHear(e.target.checked); setSoundboardOn(e.target.checked); }} className="accent-[var(--color-accent,#ff3b5c)]" />
            Ouvir os sons que os outros tocam
          </label>
        </div>
      )}
    </div>
  );
}
