import { useEffect, useState } from "react";
import { X, Monitor, AppWindow, RefreshCw, Volume2 } from "lucide-react";

export type Quality = "light" | "balanced" | "high";
// Lower presets use less CPU/GPU/bandwidth on the sharer — important when sharing a game.
export const QUALITY_PRESETS: Record<Quality, { label: string; hint: string; width: number; height: number; fps: number; bitrate: number }> = {
  light:    { label: "Leve",        hint: "720p · 15 fps — mínimo impacto no jogo", width: 1280, height: 720,  fps: 15, bitrate: 1_000_000 },
  balanced: { label: "Equilibrada", hint: "720p · 30 fps",                           width: 1280, height: 720,  fps: 30, bitrate: 2_000_000 },
  high:     { label: "Alta",        hint: "1080p · 30 fps — exige mais do PC",       width: 1920, height: 1080, fps: 30, bitrate: 4_000_000 },
};

export function ScreenPicker({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (id: string, audio: boolean, quality: Quality) => void }) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [access, setAccess] = useState("granted");
  const [tab, setTab] = useState<"screen" | "window">("screen");
  const [sel, setSel] = useState<string>();
  const [audio, setAudio] = useState(false);
  const [quality, setQuality] = useState<Quality>("balanced");
  const [loading, setLoading] = useState(true);
  const canAudio = window.cohle?.platform === "win32";

  async function load() {
    setLoading(true);
    try {
      const r = await window.cohle!.listSources();
      setSources(r.sources); setAccess(r.screenAccess);
      setSel((cur) => cur && r.sources.some((s) => s.id === cur) ? cur : r.sources.find((s) => s.type === tab)?.id);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  // the user grants the permission in System Settings and comes back: refresh by itself
  useEffect(() => { const h = () => { if (access !== "granted") void load(); }; window.addEventListener("focus", h); return () => window.removeEventListener("focus", h); }, [access]);

  const shown = sources.filter((s) => s.type === tab);
  const tabBtn = (t: "screen" | "window", label: string, Icon: typeof Monitor) => (
    <button onClick={() => { setTab(t); setSel(sources.find((s) => s.type === t)?.id); }}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${tab === t ? "bg-accent/20 text-ink" : "text-muted hover:bg-white/5"}`}>
      <Icon size={16} /> {label} <span className="text-xs opacity-60">{sources.filter((s) => s.type === t).length}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="glass bg-surface w-full max-w-3xl max-h-[92dvh] rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Compartilhar tela</h2>
            <p className="text-sm text-muted">Escolha o que você quer mostrar na chamada.</p>
          </div>
          <button onClick={onCancel} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-2">
          {tabBtn("screen", "Tela inteira", Monitor)}
          {tabBtn("window", "Janela", AppWindow)}
          <button onClick={load} title="Atualizar" className="ml-auto text-muted hover:text-ink p-2"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
        </div>

        {access !== "granted" && (
          <div className="text-sm bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 space-y-2">
            <p>O macOS ainda não liberou a <b>Gravação de Tela</b> para o Cohle. Ative uma única vez e o Cohle passa a lembrar.</p>
            <ol className="list-decimal pl-5 text-muted space-y-0.5">
              <li>Clique em <b className="text-ink">Abrir Ajustes do Sistema</b>.</li>
              <li>Ligue a chave do <b className="text-ink">Cohle</b> em Gravação de Tela e Áudio do Sistema.</li>
              <li>Volte para cá. Se o macOS pedir, escolha <b className="text-ink">Sair e Reabrir</b>.</li>
            </ol>
            <button onClick={() => window.cohle?.openScreenSettings()} className="grad rounded-lg px-4 py-2 font-semibold text-white">Abrir Ajustes do Sistema</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start min-h-[200px]">
          {shown.map((s) => (
            <button key={s.id} onClick={() => setSel(s.id)} onDoubleClick={() => onConfirm(s.id, audio, quality)}
              className={`text-left rounded-2xl p-2 border transition ${sel === s.id ? "border-accent bg-accent/10 shadow-[0_0_24px_rgba(255,59,92,0.25)]" : "border-line bg-white/5 hover:bg-white/10"}`}>
              <img src={s.thumbnail} alt={s.name} className="w-full aspect-video object-cover rounded-xl bg-black/40" />
              <div className="flex items-center gap-2 mt-2 px-1">
                {s.appIcon && <img src={s.appIcon} className="size-4" />}
                <span className="text-sm truncate">{s.name}</span>
              </div>
            </button>
          ))}
          {!loading && shown.length === 0 && <p className="text-muted text-sm col-span-full py-8 text-center">Nada disponível aqui.</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted mr-1">Qualidade</span>
          {(Object.keys(QUALITY_PRESETS) as Quality[]).map((q) => (
            <button key={q} onClick={() => setQuality(q)} title={QUALITY_PRESETS[q].hint}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${quality === q ? "bg-accent/25 text-ink border border-accent/50" : "bg-white/5 text-muted border border-line hover:bg-white/10"}`}>
              {QUALITY_PRESETS[q].label}
            </button>
          ))}
          <span className="text-[11px] text-muted ml-1">{QUALITY_PRESETS[quality].hint}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
          {canAudio ? (
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} className="accent-[#ff3b5c]" />
              <Volume2 size={14} /> Compartilhar áudio do sistema
            </label>
          ) : (
            <span className="text-xs text-muted">Áudio do sistema indisponível neste sistema.</span>
          )}
          <button onClick={onCancel} className="ml-auto px-4 sm:px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm">Cancelar</button>
          <button disabled={!sel} onClick={() => sel && onConfirm(sel, audio, quality)}
            className="grad px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40">Compartilhar</button>
        </div>
      </div>
    </div>
  );
}
