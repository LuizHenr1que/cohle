import { useRef, useState } from "react";
import { Camera, X, Trash2 } from "lucide-react";
import type { UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Avatar } from "./Avatar";
import { fileToSquareDataUrl } from "../lib/image";

export function ProfileModal({ user, onClose, onSaved }: { user: UserDTO; onClose: () => void; onSaved: (u: UserDTO) => void }) {
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl ?? null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { setAvatar(await fileToSquareDataUrl(f)); setErr(""); } catch (x: any) { setErr(x.message); }
  }
  async function save() {
    setBusy(true); setErr("");
    try {
      const u = await api.updateProfile({ username, ...(avatar !== (user.avatarUrl ?? null) ? { avatarUrl: avatar } : {}) }); // resend the image only if it changed
      onSaved(u); onClose();
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass w-full max-w-sm rounded-3xl p-6 space-y-5 bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Seu perfil</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button onClick={() => file.current?.click()} className="relative group">
            <Avatar user={{ username, avatarUrl: avatar }} size={96} />
            <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center"><Camera size={22} /></span>
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
          <div className="flex gap-3 text-xs">
            <button onClick={() => file.current?.click()} className="text-accent2 hover:underline">Trocar foto</button>
            {avatar && <button onClick={() => setAvatar(null)} className="text-muted hover:text-ink inline-flex items-center gap-1"><Trash2 size={12} /> Remover</button>}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">Nome de usuário</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent" />
        </label>
        {err && <p className="text-accent text-sm">{err}</p>}
        <button onClick={save} disabled={busy} className="grad w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60">
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
