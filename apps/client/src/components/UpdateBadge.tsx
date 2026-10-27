import { useState } from "react";
import { ArrowDownToLine, Check, RefreshCw } from "lucide-react";

// Update buttons of the side rail: the size of the other rail icons, a soft tint of the accent colour and a single icon. The details live in the tooltip.
const tile = "relative shrink-0 size-12 rounded-2xl grid place-items-center border transition";
const soft = "bg-accent/10 border-accent/25 text-accent hover:bg-accent/20 hover:border-accent/40";
const Dot = () => <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-surface" />;

/** "Nova versão" on the side rail: a quiet button that opens the download. */
export function UpdateBadge({ n, note, url }: { n: number; note: string; url: string }) {
  const [started, setStarted] = useState(false);
  const clean = note.replace(/^Versão( de teste)? \d+\s*[·-]\s*/, "");
  return (
    <button
      onClick={() => { window.cohle?.openExternal(url); setStarted(true); setTimeout(() => setStarted(false), 6000); }}
      title={`Nova versão ${n}${clean ? `: ${clean}` : ""}. Clique para baixar e atualizar`}
      aria-label={`Atualizar para a versão ${n}`}
      className={`update-badge group ${tile} ${soft}`}>
      <Dot />
      {started ? <Check size={18} strokeWidth={2.4} /> : <ArrowDownToLine size={18} strokeWidth={2.2} className="group-hover:translate-y-0.5 transition-transform" />}
    </button>
  );
}

/** Automatic update: downloads by itself; when ready, one click restarts into the new version. */
export function AutoUpdateBadge({ st }: { st: UpdateState }) {
  const ready = st.status === "ready";
  return (
    <button disabled={!ready} onClick={() => void window.cohle?.installUpdate()}
      title={ready ? `Versão ${st.version} pronta. Clique para reiniciar e atualizar` : `Baixando a atualização${st.version ? ` ${st.version}` : ""}...`}
      aria-label={ready ? "Reiniciar e atualizar" : "Baixando a atualização"}
      className={`${tile} ${ready ? soft : "bg-white/5 border-line text-muted cursor-default"}`}>
      {ready && <Dot />}
      {ready
        ? <RefreshCw size={18} strokeWidth={2.2} />
        : <span className="flex flex-col items-center gap-0.5"><ArrowDownToLine size={15} strokeWidth={2.2} className="animate-pulse" /><span className="text-[9px] font-semibold leading-none tabular-nums">{st.percent}%</span></span>}
    </button>
  );
}
