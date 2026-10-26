import { useEffect, useState } from "react";
import { X, Crown, MessageCircle, Pencil, CalendarDays, Users, UserPlus, UserCheck, UserMinus, Clock } from "lucide-react";
import type { ProfileDTO } from "@cohle/shared";
import { api, assetUrl } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";

const since = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

/** A person's profile card: opened from chat, member lists, DMs and the call. */
export function UserProfile({ id, onClose, onMessage, onEdit, onFriendsChanged }: { id: string; onClose: () => void; onMessage: (u: ProfileDTO["user"]) => void; onEdit: () => void; onFriendsChanged: () => void }) {
  const [fbusy, setFbusy] = useState(false);
  const [fmsg, setFmsg] = useState("");
  const [p, setP] = useState<ProfileDTO>();
  const [err, setErr] = useState("");
  useEffect(() => {
    let dead = false; setP(undefined); setErr("");
    api.profile(id).then((r) => !dead && setP(r)).catch((e) => !dead && setErr(e.message));
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc); return () => { dead = true; window.removeEventListener("keydown", esc); };
  }, [id]);
  async function run(fn: () => Promise<unknown>) {
    setFbusy(true); setFmsg("");
    try { await fn(); onFriendsChanged(); setP(await api.profile(id)); } catch (x: any) { setFmsg(x.message); } finally { setFbusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Perfil" className="w-full max-w-sm rounded-[1.75rem] overflow-hidden border border-line bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <div className="relative h-28 bg-[radial-gradient(120%_140%_at_30%_0%,rgb(var(--accent-rgb)/0.55),transparent_70%),linear-gradient(135deg,#2a1018,#12080c)]">
          <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60"><X size={16} /></button>
        </div>
        <div className="px-6 pb-6 -mt-12 relative z-10">
          {err && <p className="pt-14 pb-6 text-center text-sm text-muted">{err}</p>}
          {!err && !p && <p className="pt-14 pb-6 text-center text-sm text-muted">Carregando perfil...</p>}
          {p && (<>
            <div className="ring-4 ring-surface rounded-full w-fit"><Avatar user={p.user} size={88} /></div>
            <div className="mt-3 flex items-center flex-wrap gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight"><span className="text-muted font-medium">@</span>{p.user.username}</h2>
              <DevBadge user={p.user} full />
            </div>
            {p.isSelf && <p className="text-xs text-muted mt-0.5">Este é o seu perfil</p>}
            <div className="mt-4 rounded-2xl bg-white/[0.04] border border-line p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-muted"><CalendarDays size={16} className="text-accent shrink-0" /> Membro do Cohle desde <b className="text-ink inline-block first-letter:uppercase">{since(p.createdAt)}</b></div>
              {p.user.badge === "DEV" && <div className="flex items-center gap-2.5 text-muted">Faz parte da equipe que desenvolve o Cohle.</div>}
              <div>
                <div className="flex items-center gap-2.5 text-muted"><Users size={16} className="text-accent shrink-0" /> {p.isSelf ? "Seus servidores" : "Servidores em comum"}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.mutual.length ? p.mutual.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-line pl-1 pr-2.5 py-1 text-xs">
                      {s.iconUrl ? <img src={assetUrl(s.iconUrl)!} alt="" className="size-5 rounded-full object-cover" /> : <span className="size-5 rounded-full grad grid place-items-center text-[10px] font-bold text-white">{s.name[0]?.toUpperCase()}</span>}
                      {s.name}{s.owner && <Crown size={11} className="text-amber-400" />}
                    </span>
                  )) : <span className="text-xs text-muted">Nenhum ainda.</span>}
                </div>
              </div>
            </div>
            {!p.isSelf && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {p.relation === "none" && <button disabled={fbusy} onClick={() => run(() => api.friendRequest(`@${p.user.username}`))} className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 transition"><UserPlus size={16} /> Adicionar amigo</button>}
                {p.relation === "incoming" && <button disabled={fbusy} onClick={() => run(() => api.friendAccept(p.requestId!))} className="rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 transition"><UserCheck size={16} /> Aceitar pedido</button>}
                {p.relation === "outgoing" && <button disabled={fbusy} onClick={() => run(() => api.friendDecline(p.requestId!))} className="rounded-xl bg-white/5 text-muted hover:bg-white/10 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 transition"><Clock size={16} /> Pedido enviado (cancelar)</button>}
                {p.relation === "friend" && <><span className="inline-flex items-center gap-2 text-sm text-emerald-300 font-semibold"><UserCheck size={16} /> Vocês são amigos</span><button disabled={fbusy} onClick={() => run(() => api.friendRemove(p.user.id))} className="text-xs text-muted hover:text-red-300 inline-flex items-center gap-1"><UserMinus size={14} /> remover</button></>}
                {fmsg && <span className="text-xs text-accent w-full">{fmsg}</span>}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              {p.isSelf
                ? <button onClick={() => { onClose(); onEdit(); }} className="grad flex-1 rounded-xl py-2.5 font-semibold text-white hover:brightness-110 inline-flex items-center justify-center gap-2 transition"><Pencil size={16} /> Editar perfil</button>
                : <button onClick={() => { onClose(); onMessage(p.user); }} className="grad flex-1 rounded-xl py-2.5 font-semibold text-white hover:brightness-110 inline-flex items-center justify-center gap-2 transition"><MessageCircle size={16} /> Enviar mensagem</button>}
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
