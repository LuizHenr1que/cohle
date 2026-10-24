import { useState } from "react";
import { Hash, Volume2 } from "lucide-react";
import { api } from "../api";
import { Modal, inputCls, primaryCls } from "./Modal";

export function ChannelModal({ serverId, initialType, onClose }: { serverId: string; initialType: "TEXT" | "VOICE"; onClose: () => void }) {
  const [type, setType] = useState(initialType);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api.createChannel(serverId, name.trim(), type); onClose(); } catch (x: any) { setErr(x.message); }
  }
  const opt = (t: "TEXT" | "VOICE", label: string, Icon: typeof Hash) => (
    <button type="button" onClick={() => setType(t)}
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm transition ${type === t ? "border-accent bg-accent/15" : "border-line bg-white/5 text-muted hover:bg-white/10"}`}>
      <Icon size={16} /> {label}
    </button>
  );
  return (
    <Modal title="Novo canal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">{opt("TEXT", "Texto", Hash)}{opt("VOICE", "Voz", Volume2)}</div>
        <input autoFocus className={inputCls} placeholder="nome-do-canal" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        {err && <p className="text-accent text-sm">{err}</p>}
        <button disabled={!name.trim()} className={`${primaryCls} w-full`}>Criar canal</button>
      </form>
    </Modal>
  );
}
