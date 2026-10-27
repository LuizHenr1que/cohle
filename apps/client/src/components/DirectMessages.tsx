import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Users, MessageCircle, Search, Menu, ArrowDown } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { AttachmentDTO, DirectMessageDTO, DmConversationDTO, DmGoneEvent, DmReactionsEvent, ReactionKey, UserDTO } from "@cohle/shared";
import { nameOf, KEEP_MESSAGES } from "@cohle/shared";
import { api, friendlyError } from "../api";
import { Composer, type ComposerHandle } from "./chat/Composer";
import { MessageItem, type ChatItem } from "./chat/MessageItem";
import { DropZone } from "./chat/DropZone";
import { Lightbox } from "./chat/Lightbox";
import { RetentionNote } from "./chat/RetentionNote";
import { previewOf, toggled } from "../lib/chat";
import { useStickToBottom } from "../lib/stick";
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
      s.on("dm:new", onNew); s.on("dm:read", onRead); s.on("dm:gone", load); s.on("connect", load);        // a message erased by the 15 limit can have been the preview
      off = () => { s.off("dm:new", onNew); s.off("dm:read", onRead); s.off("dm:gone", load); s.off("connect", load); };
    }, 200);
    return () => { clearInterval(t); off(); };
  }, [selfId]);

  return { convs, load, markRead, unread: convs.reduce((n, c) => n + c.unread, 0) };
}

/** search matches the display name and the @username */
const matches = (u: { username: string; displayName?: string | null }, f: string) => nameOf(u).toLowerCase().includes(f) || u.username.includes(f.replace(/^@/, ""));
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
  const shownConvs = convs.filter((c) => !f || matches(c.peer, f));
  const talking = new Set(convs.map((c) => c.peer.id));
  const others = people.filter((p) => !talking.has(p.id) && (!f || matches(p, f)));
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
              <span className={`flex items-center gap-1.5 text-sm ${c.unread ? "font-semibold text-ink" : ""}`}><span className="truncate">{nameOf(c.peer)}</span><DevBadge user={c.peer} /></span>
              <span className={`block text-xs truncate ${c.unread ? "text-ink/80" : "text-muted"}`}>{c.last.fromId !== c.peer.id ? "Você: " : ""}{previewOf(c.last)}</span>
            </span>
            {c.unread > 0 && <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center">{c.unread > 99 ? "99+" : c.unread}</span>}
          </button>
        ))}
        {!shownConvs.length && !f && <p className="px-3 py-4 text-xs text-muted">Nenhuma conversa ainda. Escolha alguém abaixo para começar.</p>}
        {others.length > 0 && <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-widest text-muted">Pessoas dos seus servidores</div>}
        {others.map((p) => (
          <button key={p.id} onClick={() => onOpen(p)} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl text-left hover:bg-white/5 transition">
            <span className="relative shrink-0"><Avatar user={p} size={30} />{dot(p.id)}</span>
            <span className="text-sm truncate text-muted">{nameOf(p)}</span>
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
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; text: string }>();
  const [lightbox, setLightbox] = useState<AttachmentDTO>();
  const composer = useRef<ComposerHandle>(null);
  const lastTyping = useRef(0);
  const mine = (m: DirectMessageDTO) => m.fromId === self.id;
  const between = (m: { fromId: string; toId: string }) => (m.fromId === peer.id && m.toId === self.id) || (m.fromId === self.id && m.toId === peer.id);

  useEffect(() => {
    let dead = false;
    setMsgs([]); setLoading(true); setTyping(false); setReplyTo(undefined);
    api.dmMessages(peer.id).then((r) => { if (dead) return; setMsgs(r.messages); setLoading(false); onRead(peer.id); }).catch(() => setLoading(false));
    return () => { dead = true; };
  }, [peer.id]);

  useEffect(() => {
    let off = () => {};
    let tm: number | undefined;
    const t = setInterval(() => {
      const s = getSocket(); if (!s) return; clearInterval(t);
      const onNew = (m: DirectMessageDTO) => {
        if (!between(m)) return;
        setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m].slice(-KEEP_MESSAGES)));
        if (m.fromId === peer.id) setTyping(false);
      };
      const onGone = (e: DmGoneEvent) => { if (between(e)) setMsgs((l) => l.filter((m) => !e.ids.includes(m.id))); };            // erased by the 15-message limit, or deleted
      const onReactions = (e: DmReactionsEvent) => { if (between(e)) setMsgs((l) => l.map((m) => (m.id === e.id ? { ...m, reactions: e.reactions } : m))); };
      const onTyping = (e: { fromId: string }) => { if (e.fromId !== peer.id) return; setTyping(true); clearTimeout(tm); tm = window.setTimeout(() => setTyping(false), 3000); };
      s.on("dm:new", onNew); s.on("dm:gone", onGone); s.on("dm:reactions", onReactions); s.on("dm:typing", onTyping);
      off = () => { s.off("dm:new", onNew); s.off("dm:gone", onGone); s.off("dm:reactions", onReactions); s.off("dm:typing", onTyping); };
    }, 100);
    return () => { clearInterval(t); off(); clearTimeout(tm); };
  }, [peer.id, self.id]);

  const stick = useStickToBottom(msgs.at(-1)?.id, peer.id, msgs.at(-1)?.fromId === self.id);

  // what the composer calls: sends over the socket and answers with an error text, or null when it went through
  const send = (p: { content: string; replyToId?: string; attachmentIds: string[] }) => new Promise<string | null>((resolve) => {
    const s = getSocket();
    if (!s?.connected) return resolve("Sem conexão com o servidor. Tente de novo em instantes.");
    const t = setTimeout(() => resolve("O servidor demorou a responder. Tente de novo."), 15_000);
    s.emit("dm:send", { toId: peer.id, ...p }, (a: { ok?: boolean; error?: string; message?: DirectMessageDTO }) => {
      clearTimeout(t);
      if (a?.ok && a.message) setMsgs((l) => (l.some((x) => x.id === a.message!.id) ? l : [...l, a.message!].slice(-KEEP_MESSAGES)));
      resolve(a?.ok ? null : friendlyError(a?.error));
    });
  });
  const reactTo = (m: ChatItem, key: ReactionKey) => {
    setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, reactions: toggled(x.reactions, key, self.id) } : x)));
    api.reactDm(m.id, key).then((r) => setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, reactions: r.reactions } : x)))).catch(() => api.dmMessages(peer.id).then((r) => setMsgs(r.messages)).catch(() => {}));
  };
  const remove = (m: ChatItem) => { setMsgs((l) => l.filter((x) => x.id !== m.id)); api.deleteDm(m.id).catch(() => api.dmMessages(peer.id).then((r) => setMsgs(r.messages)).catch(() => {})); };

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header className="px-3 sm:px-6 py-3 border-b border-line flex items-center gap-3 min-w-0">
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="shrink-0 -ml-1 p-2 rounded-xl hover:bg-white/10"><Menu size={18} /></button>}
        <button onClick={() => onProfile?.(peer.id)} className="flex items-center gap-3 min-w-0 text-left rounded-xl hover:bg-white/5 -m-1 p-1 transition" title="Ver perfil"><span className="relative shrink-0"><Avatar user={peer} size={36} /><span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online ? "bg-emerald-400" : "bg-muted"}`} /></span>
        <div className="min-w-0"><div className="font-semibold flex items-center gap-2 min-w-0"><span className="truncate">{nameOf(peer)}</span><DevBadge user={peer} full /></div><div className="text-[11px] text-muted">{online ? "Online" : "Offline"}</div></div></button>
      </header>
      <DropZone onFiles={(f) => composer.current?.addFiles(f)} className="flex-1 flex flex-col min-h-0">
        <div ref={stick.scroller} onScroll={stick.onScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4">
         <div ref={stick.content}>
          <RetentionNote what="desta conversa" />
          {loading && <p className="text-center text-sm text-muted py-8">Carregando conversa...</p>}
          {!loading && !msgs.length && (
            <div className="text-center py-12">
              <div className="mx-auto mb-3 w-fit"><Avatar user={peer} size={72} /></div>
              <p className="font-semibold">{nameOf(peer)}</p>
              <p className="text-sm text-muted mt-1">Este é o começo da sua conversa com <b>{nameOf(peer)}</b>.</p>
            </div>
          )}
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const head = newDay || prev.fromId !== m.fromId || !!m.replyTo || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000;
            const item: ChatItem = { id: m.id, author: mine(m) ? self : peer, content: m.content, createdAt: m.createdAt, replyTo: m.replyTo, attachments: m.attachments ?? [], reactions: m.reactions ?? [] };
            return (
              <div key={m.id}>
                {newDay && <div className="flex items-center gap-3 my-4 text-[11px] text-muted"><span className="flex-1 h-px bg-line" />{dayLabel(m.createdAt)}<span className="flex-1 h-px bg-line" /></div>}
                <MessageItem item={item} selfId={self.id} head={head} canDelete={mine(m)} onProfile={(id) => onProfile?.(id)}
                  onReply={(x) => setReplyTo({ id: x.id, authorName: nameOf(x.author), text: (x.content || (x.attachments[0] ? "Anexo" : "")).replace(/\s+/g, " ").slice(0, 120) })}
                  onReact={reactTo} onDelete={remove} onOpenImage={setLightbox} onJump={stick.jumpTo} />
              </div>
            );
          })}
          <div className="h-5 text-xs text-muted mt-2">{typing && `${nameOf(peer)} está digitando...`}</div>
         </div>
        </div>
        {stick.away > 0 && <button type="button" onClick={() => stick.toBottom(true)} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 rounded-full grad px-4 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]"><ArrowDown size={14} /> {stick.away === 1 ? "1 nova mensagem" : `${stick.away} novas mensagens`}</button>}
        <Composer ref={composer} placeholder={`Mensagem para ${nameOf(peer)}`} reply={replyTo} onCancelReply={() => setReplyTo(undefined)} onSend={send}
          onTyping={() => { if (Date.now() - lastTyping.current > 2000) { lastTyping.current = Date.now(); getSocket()?.emit("dm:typing", peer.id); } }} />
      </DropZone>
      {lightbox && <Lightbox att={lightbox} onClose={() => setLightbox(undefined)} />}
    </div>
  );
}
