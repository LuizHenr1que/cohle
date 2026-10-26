import { useMemo, useState } from "react";
import { Users, UserPlus, Check, X, MessageCircle, UserRound, UserMinus, Copy, Clock, Menu, Send } from "lucide-react";
import type { FriendsDTO, UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";

type Tab = "online" | "all" | "pending" | "add";

/** Friends home: who is online, everyone, pending requests, and adding people by @name #code. */
export function FriendsPanel({ self, data, online, onMessage, onProfile, onChanged, onMenu }: {
  self: UserDTO; data: FriendsDTO; online: Set<string>; onMessage: (u: UserDTO) => void; onProfile: (id: string) => void; onChanged: () => void; onMenu?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("online");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const [confirm, setConfirm] = useState<string>();
  const [copied, setCopied] = useState(false);
  const withOnline = useMemo(() => data.friends.map((f) => ({ ...f, online: online.has(f.user.id) })), [data, online]);
  const onlineList = withOnline.filter((f) => f.online);
  const pending = data.incoming.length + data.outgoing.length;
  const mine = self.tag ? `@${self.username} #${self.tag}` : "";

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!handle.trim()) return;
    setBusy(true); setMsg(undefined);
    try { const r = await api.friendRequest(handle); setMsg({ ok: true, t: r.status === "accepted" ? `Você e ${r.user.username} agora são amigos.` : `Pedido enviado para ${r.user.username}.` }); setHandle(""); onChanged(); }
    catch (x: any) { setMsg({ ok: false, t: x.message }); } finally { setBusy(false); }
  }
  const act = (fn: () => Promise<unknown>) => fn().then(onChanged).catch(() => {});

  const tabBtn = (id: Tab, label: string, n?: number) => (
    <button onClick={() => { setTab(id); setMsg(undefined); }} className={`rounded-xl px-3.5 py-2 text-sm font-medium transition whitespace-nowrap ${tab === id ? (id === "add" ? "grad text-white" : "bg-white/10 text-ink") : id === "add" ? "text-accent hover:bg-accent/15" : "text-muted hover:bg-white/5 hover:text-ink"}`}>
      {label}{n ? <span className="ml-1.5 rounded-full bg-accent text-white text-[11px] font-bold px-1.5 py-0.5">{n}</span> : null}
    </button>
  );
  const Dot = ({ on }: { on: boolean }) => <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-surface ${on ? "bg-emerald-400" : "bg-muted"}`} />;
  const row = (u: UserDTO, status: string, on: boolean, actions: React.ReactNode, key: string) => (
    <div key={key} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.05] transition">
      <button onClick={() => onProfile(u.id)} className="relative shrink-0" title="Ver perfil"><Avatar user={u} size={42} /><Dot on={on} /></button>
      <button onClick={() => onProfile(u.id)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold min-w-0"><span className="truncate">{u.username}</span><span className="text-muted font-normal text-xs">#{u.tag}</span><DevBadge user={u} /></div>
        <div className="text-xs text-muted">{status}</div>
      </button>
      <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
    </div>
  );
  const iconBtn = (title: string, onClick: () => void, children: React.ReactNode, danger = false) => (
    <button title={title} aria-label={title} onClick={onClick} className={`size-9 rounded-full grid place-items-center bg-white/5 transition ${danger ? "hover:bg-red-500/20 hover:text-red-300" : "hover:bg-white/15 hover:text-ink"} text-muted`}>{children}</button>
  );
  const friendRow = (f: (typeof withOnline)[number]) => row(f.user, f.online ? "Online" : "Offline", f.online,
    confirm === f.user.id
      ? <><span className="text-xs text-muted mr-1">Remover amigo?</span><button onClick={() => { setConfirm(undefined); act(() => api.friendRemove(f.user.id)); }} className="rounded-full bg-red-600 text-white text-xs font-semibold px-3 py-1.5">Remover</button><button onClick={() => setConfirm(undefined)} className="text-xs text-muted px-2">Cancelar</button></>
      : <>{iconBtn("Enviar mensagem", () => onMessage(f.user), <MessageCircle size={17} />)}{iconBtn("Ver perfil", () => onProfile(f.user.id), <UserRound size={17} />)}{iconBtn("Remover amigo", () => setConfirm(f.user.id), <UserMinus size={17} />, true)}</>, f.user.id);
  const list = (items: typeof withOnline, empty: string) => items.length ? <div className="space-y-0.5">{items.map(friendRow)}</div> : <Empty text={empty} />;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header className="px-3 sm:px-6 py-3 border-b border-line flex items-center gap-3 flex-wrap">
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="shrink-0 -ml-1 p-2 rounded-xl hover:bg-white/10"><Menu size={18} /></button>}
        <span className="flex items-center gap-2 font-semibold"><Users size={18} className="text-accent" /> Amigos</span>
        <span className="hidden sm:block w-px h-5 bg-line" />
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabBtn("online", `Online (${onlineList.length})`)}{tabBtn("all", `Todos (${data.friends.length})`)}{tabBtn("pending", "Pendentes", pending)}{tabBtn("add", "Adicionar amigo")}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {tab === "online" && list(withOnline.filter((f) => f.online), data.friends.length ? "Ninguém online agora. Quando seus amigos entrarem, eles aparecem aqui." : "Você ainda não tem amigos. Use «Adicionar amigo» para começar.")}
        {tab === "all" && list(withOnline, "Você ainda não tem amigos. Use «Adicionar amigo» para começar.")}
        {tab === "pending" && (pending ? (<>
          {data.incoming.length > 0 && <><h3 className="text-[11px] uppercase tracking-widest text-muted px-3 mb-1">Recebidos ({data.incoming.length})</h3>
            {data.incoming.map((r) => row(r.user, "Quer ser seu amigo", online.has(r.user.id), <>{iconBtn("Aceitar", () => act(() => api.friendAccept(r.id)), <Check size={17} className="text-emerald-300" />)}{iconBtn("Recusar", () => act(() => api.friendDecline(r.id)), <X size={17} />, true)}</>, r.id))}</>}
          {data.outgoing.length > 0 && <><h3 className="text-[11px] uppercase tracking-widest text-muted px-3 mt-4 mb-1">Enviados ({data.outgoing.length})</h3>
            {data.outgoing.map((r) => row(r.user, "Aguardando resposta", online.has(r.user.id), iconBtn("Cancelar pedido", () => act(() => api.friendDecline(r.id)), <X size={17} />, true), r.id))}</>}
        </>) : <Empty text="Nenhum pedido pendente." icon={Clock} />)}
        {tab === "add" && (
          <div className="max-w-xl">
            <h2 className="text-xl font-bold">Adicionar amigo</h2>
            <p className="text-sm text-muted mt-1">Digite o nome de usuário e o código da pessoa, por exemplo <b className="text-ink">@luiz #br21</b>.</p>
            <form onSubmit={add} className="mt-4 flex gap-2">
              <input value={handle} onChange={(e) => { setHandle(e.target.value); setMsg(undefined); }} placeholder="@nome #código" autoFocus
                className="flex-1 min-w-0 rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent transition placeholder:text-muted" />
              <button disabled={busy || !handle.trim()} className="grad rounded-xl px-5 font-semibold text-white hover:brightness-110 inline-flex items-center gap-2 disabled:opacity-50 transition"><Send size={16} /> <span className="hidden sm:inline">{busy ? "Enviando..." : "Enviar pedido"}</span></button>
            </form>
            {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-accent"}`}>{msg.t}</p>}
            {mine && (
              <div className="mt-8 rounded-2xl border border-line bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-widest text-muted">Seu código de amigo</div>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <span className="text-lg font-bold">{mine}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(`${self.username}#${self.tag}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); }} className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm inline-flex items-center gap-2 transition">{copied ? <><Check size={15} className="text-emerald-300" /> Copiado</> : <><Copy size={15} /> Copiar</>}</button>
                </div>
                <p className="text-xs text-muted mt-2">Passe este código para quem quiser te adicionar.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text, icon: I = Users }: { text: string; icon?: typeof Users }) {
  return <div className="py-16 text-center text-muted"><div className="mx-auto size-14 rounded-2xl bg-white/5 grid place-items-center mb-3"><I size={26} className="text-accent" /></div><p className="text-sm max-w-xs mx-auto">{text}</p></div>;
}
