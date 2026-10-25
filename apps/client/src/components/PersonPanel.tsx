import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, Ban, UserX, PhoneMissed, ShieldAlert, Maximize2, MessageSquare, UserRound } from "lucide-react";

// Per-person listening settings (only affect me). v/s: 0..2 = 0%..200%; m: muted for me.
export type Vol = { v: number; s: number; m: boolean };
export const DEFAULT_VOL: Vol = { v: 1, s: 1, m: false };
export const VOL_KEY = "cohle:volumes";
export const loadVols = (): Record<string, Vol> => { try { return JSON.parse(localStorage.getItem(VOL_KEY) ?? "{}"); } catch { return {}; } };

export type Moderation = { muted: boolean; toggleMute: () => void; disconnect: () => void; kick: () => void; ban: () => void };

export function Slider({ label, value, onChange, compact }: { label: string; value: number; onChange: (v: number) => void; compact?: boolean }) {
  return (
    <label className={compact ? "flex items-center gap-2" : "block space-y-1"}>
      <span className={`flex justify-between text-xs text-muted ${compact ? "gap-2" : ""}`}><span>{label}</span><span className="tabular-nums">{Math.round(value * 100)}%</span></span>
      <input type="range" min={0} max={200} step={5} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)}
        className={`accent-[#ff3b5c] ${compact ? "w-28 sm:w-40" : "w-full"}`} />
    </label>
  );
}

// Listening controls for one remote person + (for the server owner) moderation actions.
// Rendered in a portal with fixed positioning so tiles/scroll areas can never clip it.
export type PanelPos = { top: number; left: number; width: number };
export function panelAt(x: number, y: number, alignRight = false): PanelPos {
  const width = Math.min(256, window.innerWidth - 16);
  return { width, left: Math.max(8, Math.min(alignRight ? x - width : x, window.innerWidth - width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - 400)) };
}
export function PersonPanel({ name, vol, onVol, sharing, mod, pos, onClose, onExpand, expandLabel, onMessage, onProfile, ignore }: {
  name: string; vol: Vol; onVol: (patch: Partial<Vol>) => void; sharing: boolean; mod?: Moderation; pos: PanelPos; onClose: () => void;
  onExpand?: () => void; expandLabel?: string; onMessage?: () => void; onProfile?: () => void; ignore?: React.RefObject<HTMLElement>;
}) {
  const [confirm, setConfirm] = useState<string>();
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (!pop.current?.contains(e.target as Node) && !ignore?.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", away); window.addEventListener("keydown", esc); window.addEventListener("resize", onClose); window.addEventListener("blur", onClose);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", esc); window.removeEventListener("resize", onClose); window.removeEventListener("blur", onClose); };
  }, []);
  const act = (key: string, label: string, Icon: typeof Ban, run: () => void, danger = true) => (
    <button key={key} onClick={() => (confirm === key ? (run(), setConfirm(undefined), onClose()) : setConfirm(key))}
      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition ${confirm === key ? "bg-red-600 text-white" : danger ? "text-red-300 hover:bg-red-500/15" : "hover:bg-white/10"}`}>
      <Icon size={14} /> {confirm === key ? `Confirmar: ${label}` : label}
    </button>
  );
  const item = (label: string, Icon: typeof Ban, run: () => void) => (
    <button onClick={() => { run(); onClose(); }} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-white/10 transition"><Icon size={14} /> {label}</button>
  );
  return createPortal(
    <div ref={pop} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      className="z-[60] max-h-[min(70vh,460px)] overflow-y-auto rounded-2xl bg-surface border border-line shadow-2xl p-3 space-y-3 text-sm">
      <div className="font-medium truncate">{name}</div>
      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input type="checkbox" checked={vol.m} onChange={(e) => onVol({ m: e.target.checked })} className="accent-[#ff3b5c]" /> Mutar para mim
      </label>
      <Slider label="Volume da voz" value={vol.v} onChange={(v) => onVol({ v })} />
      {sharing && <Slider label="Volume do ao vivo" value={vol.s} onChange={(s) => onVol({ s })} />}
      {(onExpand || onMessage || onProfile) && (
        <div className="pt-2 border-t border-line space-y-0.5">
          {onProfile && item("Ver perfil", UserRound, onProfile)}
          {onExpand && item(expandLabel ?? "Ampliar", Maximize2, onExpand)}
          {onMessage && item("Enviar mensagem", MessageSquare, onMessage)}
        </div>
      )}
      {mod && (
        <div className="pt-2 border-t border-line space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1"><ShieldAlert size={11} /> Ações do dono</p>
          {act("mute", mod.muted ? "Liberar o microfone" : "Silenciar para todos", mod.muted ? Mic : MicOff, mod.toggleMute, false)}
          {act("dc", "Desconectar da chamada", PhoneMissed, mod.disconnect)}
          {act("kick", "Expulsar do servidor", UserX, mod.kick)}
          {act("ban", "Banir do servidor", Ban, mod.ban)}
        </div>
      )}
    </div>, document.body);
}


/** Changes one person's saved listening settings without a call open (applied the next time that person is heard). */
export function saveVol(id: string, patch: Partial<Vol>) {
  const next = { ...loadVols(), [id]: { ...(loadVols()[id] ?? DEFAULT_VOL), ...patch } };
  try { localStorage.setItem(VOL_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}
