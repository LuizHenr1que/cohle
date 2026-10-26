import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Users, MessageCircle, Search, Send, Menu, ChevronUp } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { DirectMessageDTO, DmConversationDTO, UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import { sounds } from "../sounds";

/** Conversation list + unread counters for direct messages, kept live through the socket. */
export function useDms(getSocket: () => Socket | null | undefined, selfId: string, activePeer: string | undefined, visible: boolean) {
  const [convs, setConvs] = useState<DmConversationDTO[]>([]);
  const activeRef = useRef(activePeer); activeRef.current = activePeer;
  const visibleRef = useRef(visible); visibleRef.current = visible;
  const load = useCallback(() => api.dms().then(setConvs).catch(() => {}), []);
  const markRead = useCallback((peerId: string) => {
    setConvs((l) => l.map((c) => (c.peer.id === peerId && c.unread ? { ...c, unread: 0 } : c)));
    api.dmRead(peerId).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    let off = () => {};
    // the socket is created by the workspace right after mount: attach as soon as it exists
    const t = setInterval(() => {
      const s = getSocket(); if (!s) return; clearInterval(t);
      const onNew = (m: DirectMessageDTO) => {
        const peerId = m.fromId === selfId ? m.toId : m.fromId;
        const incoming = m.fromId !== selfId;
        const viewing = visibleRef.current && activeRef.current === peerId && document.hasFocus();
        setConvs((l) => {
          const known = l.find((c) => c.peer.id === peerId);
          if (!known) { load(); return l; }                            // first message from someone new: fetch their data
          const next = { ...known, last: m, unread: incoming && !viewing ? known.unread + 1 : known.unread };
          return [next, ...l.filter((c) => c.peer.id !== peerId)];
        });
        if (incoming) { if (viewing) api.dmRead(peerId).catch(() => {}); else sounds.message(); }
      };
      const onRead = (e: { peerId: string }) => setConvs((l) => l.map((c) => (c.peer.id === e.peerId ? { ...c, unread: 0 } : c)));
      s.on("dm:new", onNew); s.on("dm:read", onRead); s.on("connect", load);
      off = () => { s.off("dm:new", onNew); s.off("dm:read", onRead); s.off("connect", load); };
    }, 200);
    return () => { clearInterval(t); off(); };
  }, [selfId]);

  return { convs, load, markRead, unread: convs.reduce((n, c) => n + c.unread, 0) };
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const d = new Date(iso), t = new Date(), y = new Date(Date.now() - 864e5);
  if (d.toDateString() === t.toDateString()) return "Hoje";
  if (d.toDateString() === y.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

export function DmSidebar({ convs, online, peerId, onOpen, onFriends, friendsActive, pending }: {
  convs: DmConversationDTO[]; online: Set<string>; peerId?: string; onOpen: (u: UserDTO) => void; onFriends?: () => void; friendsActive?: boolean; pending?: number;
}) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<UserDTO[]>([]);
  useEffect(() => { api.dmPeople().then(setPeople).catch(() => {}); }, []);
  const f = q.trim().toLowerCase();
  const shownConvs = convs.filter((c) => !f || c.peer.username.toLowerCase().includes(f));
  const talking = new Set(convs.map((c) => c.peer.id));
  const others = people.filter((p) => !talking.has(p.id) && (!f || p.username.toLowerCase().includes(f)));
  const dot = (id: string) => <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online.has(id) ? "bg-emerald-400" : "bg-muted"}`} />;
  return (
    <>
      <div className="px-2 py-2 border-b border-line mb-2">
        {onFriends && <button onClick={onFriends} className={`w-full mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${friendsActive ? "bg-accent/15 text-ink" : "text-muted hover:bg-white/5 hover:text-ink"}`}>
          <Users size={18} className="text-accent" /> Amigos {!!pending && <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center">{pending}</span>}</button>}
        <h2 className="font-semibold flex items-center gap-2"><MessageCircle size={18} className="text-accent" /> Mensagens diretas</h2>
        <label className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 border border-line px-3 py-2 text-sm focus-within:border-accent">
          <Search size={14} className="text-muted shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoas" className="bg-transparent outline-none min-w-0 flex-1" />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {shownConvs.map((c) => (
          <button key={c.peer.id} onClick={() => onOpen(c.peer)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition ${peerId === c.peer.id ? "bg-accent/15" : "hover:bg-white/5"}`}>
            <span className="relative shrink-0"><Avatar user={c.peer} size={36} />{dot(c.peer.id)}</span>
            <span className="min-w-0 flex-1">
              <span className={`flex items-center gap-1.5 text-sm ${c.unread ? "font-semibold text-ink" : ""}`}><span className="truncate">{c.peer.username}</span><DevBadge user={c.peer} /></span>
              <span className={`block text-xs truncate ${c.unread ? "text-ink/80" : "text-muted"}`}>{c.last.fromId !== c.peer.id ? "Você: " : ""}{c.last.content}</span>
            </span>
            {c.unread > 0 && <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center">{c.unread > 99 ? "99+" : c.unread}</span>}
          </button>
        ))}
        {!shownConvs.length && !f && <p className="px-3 py-4 text-xs text-muted">Nenhuma conversa ainda. Escolha alguém abaixo para começar.</p>}
        {others.length > 0 && <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-widest text-muted">Pessoas dos seus servidores</div>}
        {others.map((p) => (
          <button key={p.id} onClick={() => onOpen(p)} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl text-left hover:bg-white/5 transition">
            <span className="relative shrink-0"><Avatar user={p} size={30} />{dot(p.id)}</span>
            <span className="text-sm truncate text-muted">{p.username}</span>
          </button>
        ))}
        {f && !shownConvs.length && !others.length && <p className="px-3 py-4 text-xs text-muted">Ninguém encontrado.</p>}
      </div>
    </>
  );
}

export function DmChat({ peer, self, online, getSocket, onRead, onMenu, onProfile }: {
  peer: UserDTO; self: UserDTO; online: boolean; getSocket: () => Socket | null | undefined; onRead: (peerId: string) => void; onMenu?: () => void; onProfile?: (id: string) => void;
}) {
  const [msgs, setMsgs] = useState<DirectMessageDTO[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [typing, setTyping] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const keep = useRef<number | null>(null);               // scroll height before loading older messages
  const lastTyping = useRef(0);

  useEffect(() => {
    let dead = false;
    setMsgs([]); setLoading(true); setMore(false); setText(""); setErr(""); setTyping(false);
    api.dmMessages(peer.id).then((r) => { if (dead) return; setMsgs(r.messages); setMore(r.more); setLoading(false); onRead(peer.id); }).catch(() => setLoading(false));
    return () => { dead = true; };
  }, [peer.id]);

  useEffect(() => {
    let off = () => {};
    let tm: number | undefined;
    const t = setInterval(() => {
      const s = getSocket(); if (!s) return; clearInterval(t);
      const onNew = (m: DirectMessageDTO) => {
        if (!((m.fromId === peer.id && m.toId === self.id) || (m.fromId === self.id && m.toId === peer.id))) return;
        setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
        if (m.fromId === peer.id) setTyping(false);
      };
      const onTyping = (e: { fromId: string }) => { if (e.fromId !== peer.id) return; setTyping(true); clearTimeout(tm); tm = window.setTimeout(() => setTyping(false), 3000); };
      s.on("dm:new", onNew); s.on("dm:typing", onTyping);
      off = () => { s.off("dm:new", onNew); s.off("dm:typing", onTyping); };
    }, 100);
    return () => { clearInterval(t); off(); clearTimeout(tm); };
  }, [peer.id, self.id]);

  // stay at the bottom for new messages; keep the position when older ones are prepended
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    if (keep.current != null) { el.scrollTop = el.scrollHeight - keep.current; keep.current = null; }
    else bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs, typing]);

  async function older() {
    if (!msgs.length || loading) return;
    keep.current = box.current?.scrollHeight ?? 0;
    const r = await api.dmMessages(peer.id, msgs[0].id).catch(() => null);
    if (!r) { keep.current = null; return; }
    setMsgs((l) => [...r.messages, ...l]); setMore(r.more);
  }
  function send() {
    const content = text.trim(); const s = getSocket();
    if (!content || !s) return;
    setText(""); setErr("");
    s.emit("dm:send", { toId: peer.id, content }, (a: { ok?: boolean; error?: boolean }) => { if (!a?.ok) { setErr("Não foi possível enviar. Tente de novo."); setText(content); } });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header className="px-3 sm:px-6 py-3 border-b border-line flex items-center gap-3 min-w-0">
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="shrink-0 -ml-1 p-2 rounded-xl hover:bg-white/10"><Menu size={18} /></button>}
        <button onClick={() => onProfile?.(peer.id)} className="flex items-center gap-3 min-w-0 text-left rounded-xl hover:bg-white/5 -m-1 p-1 transition" title="Ver perfil"><span className="relative shrink-0"><Avatar user={peer} size={36} /><span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online ? "bg-emerald-400" : "bg-muted"}`} /></span>
        <div className="min-w-0"><div className="font-semibold flex items-center gap-2 min-w-0"><span className="truncate">{peer.username}</span><DevBadge user={peer} full /></div><div className="text-[11px] text-muted">{online ? "Online" : "Offline"}</div></div></button>
      </header>
      <div ref={box} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
        {more && <button onClick={older} className="mx-auto mb-3 flex items-center gap-1.5 text-xs text-muted hover:text-ink rounded-full bg-white/5 px-3 py-1.5"><ChevronUp size={14} /> Ver mensagens anteriores</button>}
        {loading && <p className="text-center text-sm text-muted py-8">Carregando conversa...</p>}
        {!loading && !msgs.length && (
          <div className="text-center py-12">
            <div className="mx-auto mb-3 w-fit"><Avatar user={peer} size={72} /></div>
            <p className="font-semibold">{peer.username}</p>
            <p className="text-sm text-muted mt-1">Este é o começo da sua conversa com <b>{peer.username}</b>.</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1], mine = m.fromId === self.id;
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const head = newDay || prev.fromId !== m.fromId || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000;
          return (
            <div key={m.id}>
              {newDay && <div className="flex items-center gap-3 my-4 text-[11px] text-muted"><span className="flex-1 h-px bg-line" />{dayLabel(m.createdAt)}<span className="flex-1 h-px bg-line" /></div>}
              <div className={`flex gap-3 group ${head ? "mt-3" : ""}`}>
                <div className="w-9 shrink-0">{head && <Avatar user={mine ? self : peer} size={36} />}</div>
                <div className="min-w-0 flex-1">
                  {head && <div className="text-sm"><button onClick={() => onProfile?.(mine ? self.id : peer.id)} className="font-bold hover:underline">{mine ? self.username : peer.username}</button> <DevBadge user={mine ? self : peer} /> <span className="text-muted text-xs ml-1">{clock(m.createdAt)}</span></div>}
                  <p className="text-ink/90 whitespace-pre-wrap break-words relative">
                    {m.content}
                    {!head && <span className="absolute -left-12 top-0.5 text-[10px] text-muted opacity-0 group-hover:opacity-100">{clock(m.createdAt)}</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div className="h-5 text-xs text-muted mt-2">{typing && `${peer.username} está digitando...`}</div>
        <div ref={bottom} />
      </div>
      <div className="p-2 sm:p-4 border-t border-line">
        {err && <p className="text-xs text-accent mb-2">{err}</p>}
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-end">
          <textarea value={text} rows={1} maxLength={4000} placeholder={`Mensagem para ${peer.username}`}
            onChange={(e) => {
              setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              if (Date.now() - lastTyping.current > 2000) { lastTyping.current = Date.now(); getSocket()?.emit("dm:typing", peer.id); }
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            className="flex-1 resize-none rounded-2xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent max-h-36" />
          <button disabled={!text.trim()} className="grad rounded-2xl px-5 py-3 text-white disabled:opacity-40" aria-label="Enviar"><Send size={18} /></button>
        </form>
      </div>
    </div>
  );
}
