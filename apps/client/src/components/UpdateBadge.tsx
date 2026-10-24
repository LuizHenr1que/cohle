import { useState } from "react";
import { ArrowDownToLine, Check } from "lucide-react";

/** "Nova versão" card on the side rail: obvious but cheap (only one tiny ping dot animates; none in lite mode). */
export function UpdateBadge({ n, note, url }: { n: number; note: string; url: string }) {
  const [started, setStarted] = useState(false);
  const clean = note.replace(/^Versão de teste \d+\s*[·-]\s*/, "");
  return (
    <button
      onClick={() => { window.cohle?.openExternal(url); setStarted(true); setTimeout(() => setStarted(false), 6000); }}
      title={`Versão de teste ${n}${clean ? `: ${clean}` : ""}. Clique para baixar e atualizar`}
      className="update-badge group relative shrink-0 w-[62px] rounded-2xl grad text-white px-1 pt-2 pb-1.5 flex flex-col items-center gap-1 shadow-[0_6px_18px_rgba(255,59,92,0.45)] ring-1 ring-white/25 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition">
      <span className="absolute -top-1 -right-1 size-3">
        <span className="update-ping absolute inset-0 rounded-full bg-emerald-300 opacity-70 animate-ping" />
        <span className="relative block size-3 rounded-full bg-emerald-400 border-2 border-surface" />
      </span>
      <span className="size-8 rounded-xl bg-white/20 grid place-items-center">
        {started ? <Check size={17} strokeWidth={3} /> : <ArrowDownToLine size={17} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />}
      </span>
      <span className="text-[9px] font-extrabold leading-none tracking-tight">{started ? "BAIXANDO" : "ATUALIZAR"}</span>
      <span className="text-[9px] font-semibold leading-none text-white/80 bg-black/20 rounded-full px-1.5 py-0.5">Teste {n}</span>
    </button>
  );
}
