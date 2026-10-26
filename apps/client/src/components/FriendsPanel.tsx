import { useEffect, useMemo, useState } from "react";
import { Users, Check, X, MessageCircle, UserRound, UserMinus, Copy, Clock, Menu, Send, Search, AtSign, Mail, UserPlus, Sparkles } from "lucide-react";
import { nameOf, type FriendSuggestionDTO, type FriendsDTO, type UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import { Switch } from "./Switch";

type Tab = "all" | "online" | "pending" | "add";
const isEmail = (v: string) => !v.trim().startsWith("@") && /^\S+@\S+\.\S+$/.test(v.trim());
const pending0 = (d: FriendsDTO) => d.incoming.length + d.outgoing.length;
const since = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

/** Friends home: everyone in one place (online, all, pending) and adding people by @username or e-mail. */
export function FriendsPanel({ self, data, online, onMessage, onProfile, onChanged, onMenu }: {
  self: UserDTO; data: FriendsDTO; online: Set<string>; onMessage: (u: UserDTO) => void; onProfile: (id: string) => void; onChanged: () => void; onMenu?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [handle, setHandle] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const [confirm, setConfirm] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [find, setFind] = useState<boolean>();
  const [sugg, setSugg] = useState<FriendSuggestionDTO[]>();          // people from my servers who are not friends yet
  const [sbusy, setSbusy] = useState("");                       // "let people find me by e-mail"
  useEffect(() => { if (tab === "add" && find === undefined) api.account().then((a) => setFind(a.findByEmail)).catch(() => {}); }, [tab, find]);

  useEffect(() => { if (tab === "add") api.friendSuggestions().then(setSugg).catch(() => setSugg([])); }, [tab, data.friends.length, pending0(data)]);
  const withOnline = useMemo(() => data.friends.map((f) => ({ ...f, online: online.has(f.user.id) })), [data, online]);
  const needle = q.trim().replace(/^@/, "").toLowerCase();
  const shown = useMemo(() => withOnline.filter((f) => !needle || f.user.username.includes(needle) || nameOf(f.user).toLowerCase().includes(needle)), [withOnline, needle]);
  const onlineCount = withOnline.filter((f) => f.online).length;
  const pending = data.incoming.length + data.outgoing.length;
  const byEmail = isEmail(handle);

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!handle.trim()) return;
    setBusy(true); setMsg(undefined);
    try {
      const r = await api.friendRequest(handle.trim());
      setMsg({ ok: true, t: !r.user ? "Se existir uma conta com esse e-mail que aceite ser encontrada, o pedido foi enviado." : r.status === "accepted" ? `Você e ${nameOf(r.user)} (@${r.user.username}) agora são amigos.` : `Pedido enviado para ${nameOf(r.user)} (@${r.user.username}).` });
      setHandle(""); onChanged();
    } catch (x: any) { setMsg({ ok: false, t: x.message }); } finally { setBusy(false); }
  }
  const act = (fn: () => Promise<unknown>) => fn().then(onChanged).catch(() => {});

  const tabBtn = (id: Tab, label: string, n?: number, badge = false) => (
    <button onClick={() => { setTab(id); setMsg(undefined); }} className={`rounded-xl px-3.5 py-2 text-sm font-medium transition whitespace-nowrap ${tab === id ? (id === "add" ? "grad text-white" : "bg-white/10 text-ink") : id === "add" ? "text-accent hover:bg-accent/15" : "text-muted hover:bg-white/5 hover:text-ink"}`}>
      {label}{n !== undefined ? (badge ? (n ? <span className="ml-1.5 rounded-full bg-accent text-white text-[11px] font-bold px-1.5 py-0.5">{n}</span> : null) : <span className="ml-1.5 text-xs opacity-70">{n}</span>) : null}
    </button>
  );
  const Dot = ({ on }: { on: boolean }) => <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-surface ${on ? "bg-emerald-400" : "bg-muted"}`} />;
  const row = (u: UserDTO, status: string, on: boolean, actions: React.ReactNode, key: string) => (
    <div key={key} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.05] transition">
      <button onClick={() => onProfile(u.id)} className="relative shrink-0" title="Ver perfil"><Avatar user={u} size={42} /><Dot on={on} /></button>
      <button onClick={() => onProfile(u.id)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold min-w-0"><span className="truncate">{nameOf(u)}</span><DevBadge user={u} /></div>
        <div className="text-xs text-muted truncate">@{u.username} · {status}</div>
      </button>
      <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
    </div>
  );
  const iconBtn = (title: string, onClick: () => void, children: React.ReactNode, danger = false) => (
    <button title={title} aria-label={title} onClick={onClick} className={`size-9 rounded-full grid place-items-center bg-white/5 transition ${danger ? "hover:bg-red-500/20 hover:text-red-300" : "hover:bg-white/15 hover:text-ink"} text-muted`}>{children}</button>
  );
  const friendRow = (f: (typeof withOnline)[number]) => row(f.user, `${f.online ? "Online" : "Offline"} · amigos desde ${since(f.since)}`, f.online,
    confirm === f.user.id
      ? <><span className="text-xs text-muted mr-1">Remover amigo?</span><button onClick={() => { setConfirm(undefined); act(() => api.friendRemove(f.user.id)); }} className="rounded-full bg-red-600 text-white text-xs font-semibold px-3 py-1.5">Remover</button><button onClick={() => setConfirm(undefined)} className="text-xs text-muted px-2">Cancelar</button></>
      : <>{iconBtn("Enviar mensagem", () => onMessage(f.user), <MessageCircle size={17} />)}{iconBtn("Ver perfil", () => onProfile(f.user.id), <UserRound size={17} />)}{iconBtn("Remover amigo", () => setConfirm(f.user.id), <UserMinus size={17} />, true)}</>, f.user.id);
  const section = (title: string, items: typeof withOnline) => items.length ? <section className="mb-4"><h3 className="text-[11px] uppercase tracking-widest text-muted px-3 mb-1">{title} ({items.length})</h3><div className="space-y-0.5">{items.map(friendRow)}</div></section> : null;

  const search = (
    <div className="relative mb-4">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar amigo pelo nome ou @usuário" aria-label="Buscar amigo" className="w-full rounded-xl bg-white/5 border border-line pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent transition placeholder:text-muted" />
    </div>
  );
  const none = !data.friends.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header className="px-3 sm:px-6 py-3 border-b border-line flex items-center gap-3 flex-wrap">
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="shrink-0 -ml-1 p-2 rounded-xl hover:bg-white/10"><Menu size={18} /></button>}
        <span className="flex items-center gap-2 font-semibold"><Users size={18} className="text-accent" /> Amigos</span>
        <span className="hidden sm:block w-px h-5 bg-line" />
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabBtn("all", "Todos", data.friends.length)}{tabBtn("online", "Online", onlineCount)}{tabBtn("pending", "Pendentes", pending, true)}{tabBtn("add", "Adicionar amigo")}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {(tab === "all" || tab === "online") && (none
          ? <Empty text="Você ainda não tem amigos. Use «Adicionar amigo» com o @usuário ou o e-mail de quem você quer chamar." />
          : <>
              {search}
              {tab === "online"
                ? (shown.some((f) => f.online) ? <div className="space-y-0.5">{shown.filter((f) => f.online).map(friendRow)}</div> : <Empty text={needle ? "Ninguém online com esse nome." : "Ninguém online agora. Quando seus amigos entrarem, eles aparecem aqui."} />)
                : (shown.length ? <>{section("Online", shown.filter((f) => f.online))}{section("Offline", shown.filter((f) => !f.online))}</> : <Empty text="Nenhum amigo com esse nome." />)}
            </>)}
        {tab === "pending" && (pending ? (<>
          {data.incoming.length > 0 && <><h3 className="text-[11px] uppercase tracking-widest text-muted px-3 mb-1">Recebidos ({data.incoming.length})</h3>
            {data.incoming.map((r) => row(r.user, "Quer ser seu amigo", online.has(r.user.id), <>{iconBtn("Aceitar", () => act(() => api.friendAccept(r.id)), <Check size={17} className="text-emerald-300" />)}{iconBtn("Recusar", () => act(() => api.friendDecline(r.id)), <X size={17} />, true)}</>, r.id))}</>}
          {data.outgoing.length > 0 && <><h3 className="text-[11px] uppercase tracking-widest text-muted px-3 mt-4 mb-1">Enviados ({data.outgoing.length})</h3>
            {data.outgoing.map((r) => row(r.user, "Aguardando resposta", online.has(r.user.id), iconBtn("Cancelar pedido", () => act(() => api.friendDecline(r.id)), <X size={17} />, true), r.id))}</>}
        </>) : <Empty text="Nenhum pedido pendente." icon={Clock} />)}
        {tab === "add" && (
          <div className="max-w-xl">
            <h2 className="text-xl font-bold">Adicionar amigo</h2>
            <p className="text-sm text-muted mt-1">Digite o <b className="text-ink">@usuário</b> da pessoa (por exemplo <b className="text-ink">@luiz</b>) ou o <b className="text-ink">e-mail</b> dela.</p>
            <form onSubmit={add} className="mt-4 flex gap-2">
              <div className="relative flex-1 min-w-0">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{byEmail ? <Mail size={16} /> : <AtSign size={16} />}</span>
                <input value={handle} onChange={(e) => { setHandle(e.target.value); setMsg(undefined); }} placeholder="@usuário ou e-mail" aria-label="@usuário ou e-mail" autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  className="w-full rounded-xl bg-white/5 border border-line pl-10 pr-4 py-3 outline-none focus:border-accent transition placeholder:text-muted" />
              </div>
              <button disabled={busy || !handle.trim()} className="grad rounded-xl px-5 font-semibold text-white hover:brightness-110 inline-flex items-center gap-2 disabled:opacity-50 transition"><Send size={16} /> <span className="hidden sm:inline">{busy ? "Enviando..." : "Enviar pedido"}</span></button>
            </form>
            {handle.trim() && <p className="mt-2 text-xs text-muted">{byEmail ? "Procurando pelo e-mail. Por privacidade, não dizemos se o endereço tem conta." : "Procurando pelo @usuário."}</p>}
            {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-accent"}`}>{msg.t}</p>}

            {sugg && sugg.length > 0 && (
              <section className="mt-8" aria-label="Pessoas que você talvez conheça">
                <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted"><Sparkles size={13} className="text-accent" />Pessoas que você talvez conheça</h3>
                <div className="mt-2 space-y-0.5">
                  {sugg.map((x) => row(x.user, `${x.count > 1 ? `${x.count} servidores em comum` : "Servidor em comum"}: ${x.shared.join(", ")}`, online.has(x.user.id),
                    <button disabled={sbusy === x.user.id} onClick={async () => { setSbusy(x.user.id); try { await api.friendRequest(`@${x.user.username}`); setSugg((l) => l?.filter((y) => y.user.id !== x.user.id)); onChanged(); } catch { /* shown by reloading the list */ } finally { setSbusy(""); } }}
                      className="rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition"><UserPlus size={14} /> Adicionar</button>, `s-${x.user.id}`))}
                </div>
              </section>
            )}
            <div className="mt-8 rounded-2xl border border-line bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-widest text-muted">Seu @usuário</div>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-lg font-bold selectable">@{self.username}</span>
                <button onClick={() => { navigator.clipboard?.writeText(`@${self.username}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); }} className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm inline-flex items-center gap-2 transition">{copied ? <><Check size={15} className="text-emerald-300" /> Copiado</> : <><Copy size={15} /> Copiar</>}</button>
              </div>
              <p className="text-xs text-muted mt-2">Passe este @ para quem quiser te adicionar.</p>
            </div>
            <div className="mt-3 rounded-2xl border border-line bg-white/[0.03] p-4 flex items-center gap-4">
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">Permitir que me achem pelo e-mail</div><div className="text-xs text-muted mt-0.5 leading-relaxed">Desligue se prefere ser encontrado só pelo @usuário.</div></div>
              <Switch on={!!find} disabled={find === undefined} onChange={(v) => { setFind(v); api.setPrivacy(v).catch(() => setFind(!v)); }} label="Permitir que me achem pelo e-mail" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text, icon: I = Users }: { text: string; icon?: typeof Users }) {
  return <div className="py-16 text-center text-muted"><div className="mx-auto size-14 rounded-2xl bg-white/5 grid place-items-center mb-3"><I size={26} className="text-accent" /></div><p className="text-sm max-w-xs mx-auto">{text}</p></div>;
}
