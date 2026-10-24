import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { ServerDTO } from "@cohle/shared";
import { Modal } from "./Modal";

export function InviteModal({ server, onClose }: { server: ServerDTO; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(server.inviteCode);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }
  return (
    <Modal title="Convidar pessoas" subtitle={`Quem tiver este código entra em ${server.name}.`} onClose={onClose}>
      <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-line p-2 pl-4">
        <code className="flex-1 font-mono text-lg tracking-wider selectable truncate">{server.inviteCode}</code>
        <button onClick={copy} className="grad rounded-xl px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-2">
          {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
        </button>
      </div>
      <p className="text-xs text-muted">Na tela inicial, a pessoa usa o botão de convite (ícone de link) e cola o código. O dono pode gerar um código novo nas configurações do servidor.</p>
    </Modal>
  );
}
