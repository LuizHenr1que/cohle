import { useEffect, useRef, useState } from "react";
import { X, Crown, MessageCircle, Pencil, CalendarDays, Users, UserPlus, UserCheck, Clock, Heart, StickyNote, Mic, MonitorUp } from "lucide-react";
import { nameOf, NOTE_MAX, type ActivityDTO, type ProfileDTO } from "@cohle/shared";
import { api, assetUrl } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import { UserName, ItemBadge } from "../shop/UserName";
import { bannerBg, monthYear } from "../lib/profile";

/** What the person is doing right now. The place is only sent when the viewer is in that server too. */
function Activity({ a }: { a: ActivityDTO }) {
  const live = a.kind === "voice" || a.kind === "sharing";
  const label = a.kind === "sharing" ? "Compartilhando a tela" : a.kind === "voice" ? "Em chamada" : a.kind === "online" ? "Online" : "Offline";
  const Icon = a.kind === "sharing" ? MonitorUp : Mic;
  return (
    <div className="mt-1 flex items-center gap-2 text-sm min-w-0" aria-label="Atividade">
      {live ? <Icon size={15} className="text-emerald-300 shrink-0" /> : <span className={`size-2.5 rounded-full shrink-0 ${a.kind === "online" ? "bg-emerald-400" : "bg-muted"}`} />}
      <span className={live || a.kind === "online" ? "text-emerald-300 font-medium" : "text-muted"}>{label}</span>
      {a.where && <span className="text-muted truncate">· {a.where}</span>}
    </div>
  );
}

const Section = ({ icon: I, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) => (
  <div><div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted"><I size={13} className="text-accent shrink-0" />{title}</div><div className="mt-2">{children}</div></div>
);

/** A person's profile card: opened from chat, member lists, DMs, friends and the call. Same card on web and desktop. */
export function UserProfile({ id, onClose, onMessage, onEdit, onFriendsChanged, onProfile }: { id: string; onClose: () => void; onMessage: (u: ProfileDTO["user"]) => void; onEdit: () => void; onFriendsChanged: () => void; onProfile?: (id: string) => void }) {
  const [fbusy, setFbusy] = useState(false);
  const [fmsg, setFmsg] = useState("");
  const [p, setP] = useState<ProfileDTO>();
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [noteState, setNoteState] = useState<"" | "saving" | "saved" | "error">("");
  const savedNote = useRef("");
  useEffect(() => {
    let dead = false; setP(undefined); setErr("");
    api.profile(id).then((r) => { if (dead) return; setP(r); setNote(r.note ?? ""); savedNote.current = r.note ?? ""; setNoteState(""); }).catch((e) => !dead && setErr(e.message));
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc); return () => { dead = true; window.removeEventListener("keydown", esc); };
  }, [id]);
  async function run(fn: () => Promise<unknown>) {
    setFbusy(true); setFmsg("");
    try { await fn(); onFriendsChanged(); setP(await api.profile(id)); } catch (x: any) { setFmsg(x.message); } finally { setFbusy(false); }
  }
  async function saveNote() {
    const t = note.trim();
    if (t === savedNote.current) return;
    setNoteState("saving");
    try { await api.saveNote(id, t); savedNote.current = t; setNoteState("saved"); setTimeout(() => setNoteState(""), 1800); } catch { setNoteState("error"); }
  }
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Perfil" className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-[1.75rem] border border-line bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <div className="relative h-28 shrink-0" style={{ background: bannerBg(p?.bannerColor) }}>
          <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60"><X size={16} /></button>
        </div>
        <div className="px-6 pb-6 -mt-12 relative z-10">
          {err && <p className="pt-14 pb-6 text-center text-sm text-muted">{err}</p>}
          {!err && !p && <p className="pt-14 pb-6 text-center text-sm text-muted">Carregando perfil...</p>}
          {p && (<>
            <div className="ring-4 ring-surface rounded-full w-fit"><Avatar user={p.user} size={88} live /></div>
            <div className="mt-3 flex items-center flex-wrap gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight break-words min-w-0"><UserName user={p.user} live /></h2>
              <DevBadge user={p.user} full /><ItemBadge user={p.user} full />
            </div>
            <p className="text-sm text-muted mt-0.5">@{p.user.username}{p.isSelf && " · este é o seu perfil"}</p>
            <Activity a={p.activity} />

            <div className="mt-4 rounded-2xl bg-white/[0.04] border border-line p-4 space-y-4 text-sm">
              {p.bio
                ? <Section icon={Heart} title="Sobre mim"><p className="whitespace-pre-wrap break-words leading-relaxed selectable">{p.bio}</p></Section>
                : p.isSelf && <p className="text-xs text-muted">Você ainda não escreveu uma descrição. Dá para adicionar em «Editar perfil».</p>}
              <div className="grid grid-cols-2 gap-3">
                <Section icon={CalendarDays} title="Membro desde"><b className="inline-block first-letter:uppercase">{monthYear(p.createdAt)}</b></Section>
                {p.friendSince && <Section icon={UserCheck} title="Amigos desde"><b className="inline-block first-letter:uppercase">{monthYear(p.friendSince)}</b></Section>}
              </div>
              {p.user.badge === "DEV" && <p className="text-muted">Faz parte da equipe que desenvolve o Cohle.</p>}
              <Section icon={Users} title={p.isSelf ? "Seus servidores" : "Servidores em comum"}>
                <div className="flex flex-wrap gap-1.5">
                  {p.mutual.length ? p.mutual.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-line pl-1 pr-2.5 py-1 text-xs">
                      {s.iconUrl ? <img src={assetUrl(s.iconUrl)!} alt="" className="size-5 rounded-full object-cover" /> : <span className="size-5 rounded-full grad grid place-items-center text-[10px] font-bold text-white">{s.name[0]?.toUpperCase()}</span>}
                      {s.name}{s.owner && <Crown size={11} className="text-amber-400" />}
                    </span>
                  )) : <span className="text-xs text-muted">Nenhum ainda.</span>}
                </div>
              </Section>
              {!p.isSelf && (
                <Section icon={Heart} title={`Amigos em comum${p.mutualFriendsCount ? ` (${p.mutualFriendsCount})` : ""}`}>
                  {p.mutualFriends.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.mutualFriends.map((u) => (
                        <button key={u.id} onClick={() => onProfile?.(u.id)} title={`${nameOf(u)} (@${u.username})`} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-line hover:border-accent/50 pl-1 pr-2.5 py-1 text-xs transition">
                          <Avatar user={u} size={20} /><span className="max-w-[8rem] truncate">{nameOf(u)}</span>
                        </button>
                      ))}
                      {p.mutualFriendsCount > p.mutualFriends.length && <span className="text-xs text-muted self-center">+{p.mutualFriendsCount - p.mutualFriends.length}</span>}
                    </div>
                  ) : <span className="text-xs text-muted">Nenhum ainda.</span>}
                </Section>
              )}
              {!p.isSelf && (
                <Section icon={StickyNote} title="Nota (só você vê)">
                  <textarea value={note} onChange={(e) => { setNote(e.target.value); setNoteState(""); }} onBlur={saveNote} maxLength={NOTE_MAX} rows={2} aria-label="Nota privada sobre esta pessoa" placeholder="Clique para adicionar uma nota"
                    className="w-full resize-none rounded-xl bg-white/5 border border-line px-3 py-2 text-sm outline-none focus:border-accent transition placeholder:text-muted" />
                  <div className="h-4 text-[11px] text-muted flex justify-between"><span>{noteState === "saving" ? "Salvando..." : noteState === "saved" ? "Nota salva" : noteState === "error" ? "Não foi possível salvar" : ""}</span><span>{note.length}/{NOTE_MAX}</span></div>
                </Section>
              )}
            </div>
            {!p.isSelf && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {p.relation === "none" && <button disabled={fbusy} onClick={() => run(() => api.friendRequest(`@${p.user.username}`))} className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 transition"><UserPlus size={16} /> Adicionar amigo</button>}
                {p.relation === "incoming" && <button disabled={fbusy} onClick={() => run(() => api.friendAccept(p.requestId!))} className="rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 transition"><UserCheck size={16} /> Aceitar pedido</button>}
                {p.relation === "outgoing" && <button disabled={fbusy} onClick={() => run(() => api.friendDecline(p.requestId!))} className="rounded-xl bg-white/5 text-muted hover:bg-white/10 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 transition"><Clock size={16} /> Pedido enviado (cancelar)</button>}
                {p.relation === "friend" && <><span className="inline-flex items-center gap-2 text-sm text-emerald-300 font-semibold"><UserCheck size={16} /> Vocês são amigos</span><button disabled={fbusy} onClick={() => run(() => api.friendRemove(p.user.id))} className="text-xs text-muted hover:text-red-300 underline-offset-2 hover:underline">Remover amizade</button></>}
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
