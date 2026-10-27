import { History } from "lucide-react";
import { KEEP_MESSAGES } from "@cohle/shared";

/** The free plan keeps only the last messages of each conversation. Said plainly, so nobody is surprised when old ones disappear. */
export function RetentionNote({ what = "desta conversa" }: { what?: string }) {
  return (
    <div role="note" className="mx-auto mb-3 flex max-w-xl items-start gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-xs text-muted leading-relaxed">
      <History size={14} className="mt-0.5 shrink-0 text-accent2" />
      <span><b className="text-ink/90">Plano grátis:</b> o Cohle guarda só as últimas {KEEP_MESSAGES} mensagens {what}. Ao enviar novas, as mais antigas (e os arquivos delas) são apagadas.</span>
    </div>
  );
}
