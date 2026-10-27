import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import type { ServerDTO, ServerGroup } from "@cohle/shared";
import { Modal, inputCls, primaryCls, ghostCls } from "./Modal";
import { ServerIcon } from "./ServerIcon";
import { GROUP_COLORS, GROUP_NAME_MAX, newGroupId } from "../lib/serverGroups";

/** Create or edit a folder of servers: name, colour and which servers go inside. */
export function ServerGroupModal({ servers, group, preselect, onSave, onDelete, onClose }: {
  servers: ServerDTO[]; group?: ServerGroup; preselect?: string[]; onSave: (g: ServerGroup) => void; onDelete?: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [color, setColor] = useState(group?.color ?? GROUP_COLORS[5]);
  const [picked, setPicked] = useState<string[]>(group?.serverIds ?? preselect ?? []);
  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const ok = name.trim().length > 0;
  return (
    <Modal title={group ? "Editar grupo" : "Novo grupo de servidores"} subtitle="Agrupe servidores para a barra lateral não crescer sem fim. Só você vê esta organização." onClose={onClose}>
      <label className="block space-y-1.5"><span className="text-xs text-muted">Nome do grupo</span>
        <input autoFocus value={name} maxLength={GROUP_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Jogos, Trabalho, Amigos" aria-label="Nome do grupo" className={inputCls}
          onKeyDown={(e) => { if (e.key === "Enter" && ok) onSave({ id: group?.id ?? newGroupId(), name: name.trim(), color, serverIds: picked, open: group?.open ?? true }); }} /></label>
      <div className="space-y-1.5" role="radiogroup" aria-label="Cor do grupo"><span className="text-xs text-muted">Cor</span>
        <div className="flex gap-2 flex-wrap">{GROUP_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Cor ${c}`} onClick={() => setColor(c)} style={{ background: c }} className={`size-8 rounded-full grid place-items-center ring-offset-2 ring-offset-surface transition ${color === c ? "ring-2 ring-white" : "hover:scale-110"}`}>{color === c && <Check size={15} className="text-white drop-shadow" />}</button>)}</div></div>
      <div className="space-y-1.5 min-h-0 flex flex-col"><span className="text-xs text-muted">Servidores neste grupo ({picked.length})</span>
        <ul className="overflow-y-auto max-h-[34dvh] rounded-2xl border border-line divide-y divide-line">
          {servers.map((s) => (
            <li key={s.id}><button type="button" onClick={() => toggle(s.id)} aria-pressed={picked.includes(s.id)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5">
              <ServerIcon server={s} size={32} /><span className="flex-1 truncate text-sm">{s.name}</span>
              <span className={`size-5 rounded-md border grid place-items-center ${picked.includes(s.id) ? "bg-accent border-accent text-white" : "border-line"}`}>{picked.includes(s.id) && <Check size={13} strokeWidth={3} />}</span></button></li>
          ))}
        </ul></div>
      <div className="flex gap-2 justify-end flex-wrap">
        {onDelete && <button onClick={onDelete} className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-3 text-sm text-accent hover:bg-accent/10"><Trash2 size={15} /> Desfazer grupo</button>}
        <button onClick={onClose} className={ghostCls}>Cancelar</button>
        <button disabled={!ok} onClick={() => onSave({ id: group?.id ?? newGroupId(), name: name.trim(), color, serverIds: picked, open: group?.open ?? true })} className={primaryCls}>{group ? "Salvar" : "Criar grupo"}</button>
      </div>
    </Modal>
  );
}
