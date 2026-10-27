import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, MessageCircle, Hash, Volume2, Plus, LogOut, Send, Link2, Settings, ScreenShare, Sparkles, UserPlus, Crown, SlidersHorizontal, Zap, Menu, Compass } from "lucide-react";
import type { ServerDTO, ChannelDTO, MessageDTO, UserDTO, VoiceStateDTO, AttachmentDTO, ReactionKey, MessageGoneEvent, MessageReactionsEvent } from "@cohle/shared";
import { nameOf, KEEP_MESSAGES } from "@cohle/shared";
import { api, connectSocket, friendlyError } from "../api";
// The call UI (and the LiveKit SDK, the heaviest dependency) loads only when you join a voice channel.
import type { VoiceApi } from "./VoiceRoom";
import { PersonRow } from "./PersonRow";
import { useAutoUpdate, useUpdate } from "../lib/update";
import { AutoUpdateBadge, UpdateBadge } from "./UpdateBadge";
import { DmChat, DmSidebar, useDms } from "./DirectMessages";
import { Tour } from "./Tour";
import { DevBadge } from "./Badge";
import { SettingsModal } from "./SettingsModal";
import { Composer, type ComposerHandle } from "./chat/Composer";
import { MessageItem, type ChatItem } from "./chat/MessageItem";
import { DropZone } from "./chat/DropZone";
import { Lightbox } from "./chat/Lightbox";
import { RetentionNote } from "./chat/RetentionNote";
import { toggled } from "../lib/chat";
import { useStickToBottom } from "../lib/stick";
import { ArrowDown } from "lucide-react";
const AdminPanel = lazy(() => import("./AdminPanel"));
import { UserProfile } from "./UserProfile";
import { FriendsPanel } from "./FriendsPanel";
import { useFriends } from "../lib/friends";
import { NoServerHome, NoChannelHome } from "./EmptyStates";
const VoiceRoom = lazy(() => import("./VoiceRoom").then((m) => ({ default: m.VoiceRoom })));
import { Avatar } from "./Avatar";
import { ProfileModal } from "./ProfileModal";
import { sounds } from "../sounds";
import { playSound, soundLabel, soundboardOn } from "../lib/soundboard";
import { useMedia } from "../lib/hooks";
import { ServerIcon } from "./ServerIcon";
import { Logo } from "./Logo";
import { ServerModal } from "./ServerModal";
import { InviteModal } from "./InviteModal";
import { ChannelModal } from "./ChannelModal";
import { ServerSettings } from "./ServerSettings";

/** The free plan keeps 15 messages per channel: never hold more on screen either. */
const keepLast = (l: MessageDTO[]): MessageDTO[] => { const n = new Map<string, number>(); for (const m of l) n.set(m.channelId, (n.get(m.channelId) ?? 0) + 1); const over = new Map([...n].map(([c, k]) => [c, k - KEEP_MESSAGES])); return l.filter((m) => { const o = over.get(m.channelId) ?? 0; if (o > 0) { over.set(m.channelId, o - 1); return false; } return true; }); };

export function Workspace({ me, onLogout, fx, onToggleFx, lite, onToggleLite }: { me: UserDTO; onLogout: () => void; fx: boolean; onToggleFx: () => void; lite: boolean; onToggleLite: () => void }) {
  const [self, setSelf] = useState<UserDTO>(me);
  const [servers, setServers] = useState<ServerDTO[]>([]);
  const [serverId, setServerId] = useState<string>();
  const [channel, setChannel] = useState<ChannelDTO>();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; text: string }>();
  const [lightbox, setLightbox] = useState<AttachmentDTO>();
  const composer = useRef<ComposerHandle>(null);
  const [voice, setVoice] = useState<ChannelDTO>();
  const [voiceUsers, setVoiceUsers] = useState<Record<string, UserDTO[]>>({});
  const [speakers, setSpeakers] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [profileOpen, setProfileOpen] = useState(false);
  const [serverModal, setServerModal] = useState<"create" | "join">();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [newChannelType, setNewChannelType] = useState<"TEXT" | "VOICE">();
  const [notice, setNotice] = useState<string>();
  // the call keeps running while you read/write in text channels: `view` only decides what is on screen
  const [view, setView] = useState<"call" | "text">("call");
  const [chatOpen, setChatOpen] = useState(false);          // chat side panel inside the call view
  const [unread, setUnread] = useState(0);
  const viewRef = useRef(view), chatOpenRef = useRef(chatOpen);
  viewRef.current = view; chatOpenRef.current = chatOpen;
  useEffect(() => { if (chatOpen || view === "text") setUnread(0); }, [chatOpen, view]);
  // while in a call, decorative effects pause (see ParticleField): the call gets the CPU
  useEffect(() => { document.documentElement.classList.toggle("in-call", !!voice); return () => document.documentElement.classList.remove("in-call"); }, [!!voice]);
  const wide = useMedia("(min-width: 1000px)");   // below this the server/channel panels become a slide-over menu
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { if (wide) setNavOpen(false); }, [wide]);
  const [rev, setRev] = useState(0); // bumps when the server list/members change, so open modals refetch
  const socket = useRef<ReturnType<typeof connectSocket>>();
  const update = useUpdate();
  // first-run tour: AuthScreen marks brand-new accounts as "pending"
  const tourKey = `cohle:tour:${me.id}`;
  const [tour, setTour] = useState(() => { try { return localStorage.getItem(tourKey) === "pending"; } catch { return false; } });
  const closeTour = (next?: "create" | "join") => { setTour(false); try { localStorage.setItem(tourKey, "done"); } catch { /* private mode */ } if (next) setServerModal(next); };
  const auto = useAutoUpdate();
  const [prefsOpen, setPrefsOpen] = useState(false);          // settings screen
  const [profileId, setProfileId] = useState<string>();         // whose profile card is open
  const [home, setHome] = useState(true);                  // the welcome screen: what every sign-in starts on, until the person picks something
  const [dmOpen, setDmOpen] = useState(false);              // "home": direct messages instead of a server
  const [dmPeer, setDmPeer] = useState<UserDTO>();
  const deafRef = useRef(false);
  const [soundToast, setSoundToast] = useState<string>();
  const voiceApi = useRef<VoiceApi | null>(null);
  const [autoWatch, setAutoWatch] = useState<string>();     // a live clicked on the sidebar before we were in that call
  const friends = useFriends(() => socket.current);
  const dms = useDms(() => socket.current, self.id, dmPeer?.id, dmOpen);
  const voiceRef = useRef<ChannelDTO>();
  voiceRef.current = voice;
  const sharingRef = useRef(false);

  const server = servers.find((s) => s.id === serverId);
  const isOwner = server?.ownerId === self.id;
  // Left rail: icons only, or expanded with names and labels (remembered)
  const [rail, setRail] = useState(() => { try { return localStorage.getItem("cohle:rail") === "open"; } catch { return false; } });
  const toggleRail = (v: boolean) => { setRail(v); try { localStorage.setItem("cohle:rail", v ? "open" : "closed"); } catch { /* private mode */ } };
  const railOpen = wide && rail;
  const rb = (o: { title: string; label?: string; icon: React.ReactNode; onClick: () => void; cls: string; badge?: React.ReactNode }) => (
    <button key={o.title} onClick={o.onClick} title={o.title}
      className={`relative shrink-0 rounded-2xl transition ${railOpen ? "w-full h-12 flex items-center gap-3 px-3.5" : "size-12 grid place-items-center"} ${o.cls}`}>
      {o.icon}
      {railOpen && <span className="truncate text-sm font-medium flex-1 text-left">{o.label ?? o.title}</span>}
      {o.badge}
    </button>
  );

  // Reload servers and reconcile the selection (a server/channel may have been deleted or renamed).
  const reload = () => api.servers().then((l) => {
    setServers(l);
    setServerId((cur) => (cur && l.some((s) => s.id === cur) ? cur : l[0]?.id));
    const channels = l.flatMap((s) => s.channels);
    setChannel((c) => (c ? channels.find((x) => x.id === c.id) : c));
    setVoice((v) => (v ? channels.find((x) => x.id === v.id) : v));
    setRev((r) => r + 1);
  }).catch(() => {});

  useEffect(() => {
    reload();
    api.me().then((u) => { setSelf(u); localStorage.setItem("me", JSON.stringify(u)); }).catch(() => {});
    const s = connectSocket();
    socket.current = s;
    // Server-side presence lives in memory: after a reconnect/restart, say again which voice channel I am in.
    s.on("connect", () => {
      if (!voiceRef.current) return;
      s.emit("voice:join", voiceRef.current.id);
      if (sharingRef.current) s.emit("voice:sharing", true);
    });
    s.on("presence:snapshot", (ids: string[]) => setOnline(new Set(ids)));
    s.on("presence", (p: { userId: string; online: boolean }) =>
      setOnline((o) => { const n = new Set(o); p.online ? n.add(p.userId) : n.delete(p.userId); return n; }));
    s.on("message:gone", (e: MessageGoneEvent) => setMessages((l) => l.filter((m) => !e.ids.includes(m.id))));         // erased by the 15-message limit, or deleted
    s.on("message:reactions", (e: MessageReactionsEvent) => setMessages((l) => l.map((m) => (m.id === e.id ? { ...m, reactions: e.reactions } : m))));
    s.on("message:new", (m: MessageDTO) => {
      setMessages((l) => (l.some((x) => x.id === m.id) ? l : keepLast([...l, m])));
      if (m.author.id !== me.id) { sounds.message(); if (voiceRef.current && viewRef.current === "call" && !chatOpenRef.current) setUnread((n) => n + 1); }
    });
    s.on("voice:sound", (e: { id: string; name: string; channelId: string }) => {
      if (voiceRef.current?.id !== e.channelId) return;
      if (soundboardOn() && !deafRef.current) playSound(e.id);
      setSoundToast(`${e.name} tocou ${soundLabel(e.id)}`); setTimeout(() => setSoundToast(undefined), 2500);
    });
    s.on("server:updated", () => reload());
    s.on("server:deleted", () => reload());
    s.on("server:removed", (e: { reason?: string }) => {
      if (e?.reason === "ban") setNotice("Você foi banido de um servidor.");
      else if (e?.reason === "kick") setNotice("Você foi expulso de um servidor.");
      reload();
    });
    s.on("voice:disconnected", () => { setVoice(undefined); setNotice("O dono do servidor desconectou você da chamada."); });
    s.on("voice:snapshot", (l: VoiceStateDTO[]) => setVoiceUsers(Object.fromEntries(l.map((v) => [v.channelId, v.users]))));
    s.on("voice:state", (v: VoiceStateDTO) => setVoiceUsers((o) => ({ ...o, [v.channelId]: v.users })));
    // keep the voice-room lists honest even if a push was missed: ask again when the window comes back and every 30 s
    const sync = () => { if (!document.hidden && s.connected) s.emit("voice:sync"); };
    const timer = setInterval(sync, 30_000);
    window.addEventListener("focus", sync); document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(timer); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); s.disconnect(); };
  }, []);

  useEffect(() => {
    if (!channel) return;
    setMessages([]); setReplyTo(undefined);
    api.messages(channel.id).then(setMessages);
    socket.current?.emit("channel:join", channel.id);
  }, [channel?.id]);

  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(undefined), 7000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { if (server && !channel) setChannel(server.channels.find((c) => c.type === "TEXT")); }, [server]);

  const msgs = messages.filter((m) => m.channelId === channel?.id);
  const stick = useStickToBottom(msgs.at(-1)?.id, channel?.id ?? "", msgs.at(-1)?.author.id === me.id);
  const roomUsers = voice ? voiceUsers[voice.id] ?? [] : [];

  // what the composer calls: sends over the socket and answers with an error text, or null when it went through
  const sendMessage = (p: { content: string; replyToId?: string; attachmentIds: string[] }) => new Promise<string | null>((resolve) => {
    const sk = socket.current;
    if (!sk?.connected || !channel) return resolve("Sem conexão com o servidor. Tente de novo em instantes.");
    const t = setTimeout(() => resolve("O servidor demorou a responder. Tente de novo."), 15_000);
    sk.emit("message:send", { channelId: channel.id, ...p }, (a: { ok?: boolean; error?: string }) => { clearTimeout(t); resolve(a?.ok ? null : friendlyError(a?.error)); });
  });
  const reactTo = (m: ChatItem, key: ReactionKey) => {
    setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, reactions: toggled(x.reactions, key, self.id) } : x)));           // at once; the server's answer settles it
    api.react(m.id, key).then((r) => setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, reactions: r.reactions } : x)))).catch(() => channel && api.messages(channel.id).then(setMessages).catch(() => {}));
  };
  const deleteMessage = (m: ChatItem) => { setMessages((l) => l.filter((x) => x.id !== m.id)); api.deleteMessage(m.id).catch(() => channel && api.messages(channel.id).then(setMessages).catch(() => {})); };
  function joinVoice(c: ChannelDTO) {
    setNavOpen(false); setView("call"); setDmOpen(false); setHome(false);
    if (voice?.id === c.id) return;                         // already in this call: just bring it back on screen
    setVoice(c); socket.current?.emit("voice:join", c.id);
  }
  // clicking a person: their live replaces whatever we were watching, joining their call first if needed
  function openPerson(c: ChannelDTO, u: UserDTO) {
    if (voice?.id === c.id) {
      setNavOpen(false); setView("call"); setDmOpen(false);
      if (u.sharing && u.id !== self.id) voiceApi.current?.watch(u.id);
      return;
    }
    setAutoWatch(u.sharing ? u.id : undefined);
    joinVoice(c);
  }
  function goHome() { setHome(true); setDmOpen(false); setDmPeer(undefined); setNavOpen(false); }
  function openDm(u: UserDTO) { setDmPeer(u); setDmOpen(true); setNavOpen(false); dms.load(); }
  function leaveVoice() { setVoice(undefined); setChatOpen(false); setView("text"); socket.current?.emit("voice:leave"); }
  async function afterServerChange(s: ServerDTO) {
    socket.current?.emit("server:join", s.id);
    await reload(); setHome(false); setServerId(s.id); setChannel(undefined);
  }

  const section = (label: string, type: "TEXT" | "VOICE") => (
    <div className="flex items-center justify-between px-2 mt-4 mb-1 text-[11px] uppercase tracking-widest text-muted">
      {label}
      {isOwner && <button onClick={() => setNewChannelType(type)} title="Novo canal" className="hover:text-ink"><Plus size={14} /></button>}
    </div>
  );

  const textChan = (c: ChannelDTO) => (
    <button key={c.id} onClick={() => { setHome(false); setDmOpen(false); setChannel(c); setView("text"); setNavOpen(false); }}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${channel?.id === c.id && (!voice || view === "text") ? "bg-accent/15 text-ink" : "text-muted hover:bg-white/5"}`}>
      <Hash size={16} /> {c.name}
    </button>
  );
  const voiceChan = (c: ChannelDTO) => {
    const inside = voiceUsers[c.id] ?? [];
    return (
      <div key={c.id}>
        <button onClick={() => joinVoice(c)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${voice?.id === c.id && view === "call" ? "bg-accent/15 text-ink" : "text-muted hover:bg-white/5"}`}>
          <Volume2 size={16} /> {c.name}
          {inside.length > 0 && <span className="ml-auto text-xs text-accent2">{inside.length}</span>}
        </button>
        {inside.map((u) => (
          <PersonRow key={u.id} user={u} isSelf={u.id === self.id} isOwner={server?.ownerId === u.id} channelName={c.name}
            inCall={voice?.id === c.id} speaking={voice?.id === c.id && speakers.has(u.id)} getApi={() => voiceApi.current}
            onClick={() => openPerson(c, u)} onMessage={() => openDm(u)} onProfile={() => setProfileId(u.id)}
            mod={isOwner && u.id !== self.id ? { muted: !!u.muted, toggleMute: () => void api.muteMember(c.serverId, u.id, !u.muted).catch(() => {}), disconnect: () => void api.disconnectMember(c.serverId, u.id).catch(() => {}), kick: () => void api.kick(c.serverId, u.id).catch(() => {}), ban: () => void api.ban(c.serverId, u.id).catch(() => {}) } : undefined} />
        ))}
      </div>
    );
  };

  // the same chat is used full-screen (text view) and as a side panel during a call
  const chatPane = (compact: boolean) => (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-line font-semibold flex items-center gap-2 min-w-0">
            {!wide && !compact && <button onClick={() => setNavOpen(true)} aria-label="Abrir menu" className="shrink-0 -ml-1 p-2 rounded-xl hover:bg-white/10"><Menu size={20} /></button>}
            <Hash size={18} className="text-muted shrink-0" /> <span className="truncate">{channel?.name ?? "Selecione um canal"}</span>
          </header>
          <DropZone onFiles={(f) => composer.current?.addFiles(f)} className="flex-1 flex flex-col min-h-0">
            <div ref={stick.scroller} onScroll={stick.onScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4">
             <div ref={stick.content}>
              {channel && <RetentionNote what="deste canal" />}
              {msgs.map((m, i) => {
                const prev = msgs[i - 1];
                const head = !prev || prev.author.id !== m.author.id || !!m.replyTo || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000;
                return <MessageItem key={m.id} item={m} selfId={self.id} head={head} canDelete={m.author.id === self.id || isOwner}
                  onProfile={setProfileId} onReply={(x) => setReplyTo({ id: x.id, authorName: nameOf(x.author), text: (x.content || (x.attachments[0] ? "Anexo" : "")).replace(/\s+/g, " ").slice(0, 120) })}
                  onReact={reactTo} onDelete={deleteMessage} onOpenImage={setLightbox} onJump={stick.jumpTo} />;
              })}
             </div>
            </div>
            {stick.away > 0 && <button type="button" onClick={() => stick.toBottom(true)} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 rounded-full grad px-4 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]"><ArrowDown size={14} /> {stick.away === 1 ? "1 nova mensagem" : `${stick.away} novas mensagens`}</button>}
            {channel && <Composer ref={composer} placeholder={`Mensagem em #${channel.name}`} reply={replyTo} onCancelReply={() => setReplyTo(undefined)} onSend={sendMessage} onTyping={() => socket.current?.emit("typing", channel.id)} />}
          </DropZone>
    </div>
  );

  return (
    <div className="h-full flex gap-2 sm:gap-3 p-2 sm:p-3 min-w-0">
      {!wide && navOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setNavOpen(false)} />}
      {(wide || navOpen) && (
      <div className={wide ? "flex gap-3 shrink-0" : "fixed z-50 left-2 bottom-2 top-[calc(var(--titlebar,0px)+0.5rem)] flex gap-2 w-[min(94vw,400px)]"}>
      {/* servers rail */}
      <nav className={`glass rounded-3xl shrink-0 flex flex-col gap-2 py-3 overflow-y-auto no-scrollbar ${railOpen ? "w-[232px] items-stretch px-2.5" : "w-[72px] items-center"}`}>
        {railOpen ? (
          <div className="flex items-center gap-2.5 px-1 mb-1 shrink-0">
            <button onClick={goHome} title="Início" aria-label="Ir para o início" className="flex items-center gap-2.5 flex-1 min-w-0 rounded-xl hover:bg-white/5 -m-1 p-1 transition text-left"><Logo size={36} /><span className="font-bold tracking-tight flex-1">Cohle</span></button>
            <button onClick={() => toggleRail(false)} title="Recolher a barra lateral" aria-label="Recolher a barra lateral" className="p-2 rounded-xl text-muted hover:text-ink hover:bg-white/10"><PanelLeftClose size={18} /></button>
          </div>
        ) : (<>
          <button onClick={goHome} title="Início" aria-label="Ir para o início" aria-current={home && !dmOpen ? "page" : undefined} className="mb-0.5 shrink-0 rounded-2xl hover:bg-white/5 transition"><Logo size={40} /></button>
          {wide && <button onClick={() => toggleRail(true)} title="Expandir a barra lateral (nomes e botões)" aria-label="Expandir a barra lateral" className="shrink-0 size-9 rounded-xl text-muted grid place-items-center hover:text-ink hover:bg-white/10"><PanelLeftOpen size={18} /></button>}
        </>)}
        {rb({ title: "Mensagens diretas", icon: <MessageCircle size={20} />, onClick: () => { setDmOpen(true); setDmPeer(undefined); dms.load(); friends.load(); },
          cls: dmOpen ? "bg-accent text-white shadow-[0_6px_20px_rgb(var(--accent-rgb)/0.4)]" : "bg-white/5 text-accent hover:bg-white/10",
          badge: dms.unread + friends.pending > 0 && <span className={`${railOpen ? "" : "absolute -bottom-1 -right-1 border-2 border-surface"} min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center`}>{dms.unread + friends.pending > 99 ? "99+" : dms.unread + friends.pending}</span> })}
        {auto && (auto.status === "downloading" || auto.status === "ready")
          ? <AutoUpdateBadge st={auto} />
          : update && (!auto || auto.status === "error" || auto.status === "unsupported") && <UpdateBadge n={update.n} note={update.note} url={update.url} />}
        {railOpen && <div className="px-2 pt-1 text-[11px] uppercase tracking-widest text-muted">Servidores</div>}
        {servers.map((s) => {
          const on = !dmOpen && s.id === serverId;
          return (
            <button key={s.id} title={s.name} aria-current={on ? "true" : undefined} onClick={() => { setHome(false); setDmOpen(false); setServerId(s.id); setChannel(undefined); }}
              className={`group relative shrink-0 transition ${railOpen ? `w-full flex items-center gap-3 rounded-2xl pl-2 pr-3 ${on ? "bg-accent/15" : "hover:bg-white/5"}` : ""}`}>
              {/* active: a bar on the left edge + a clean outline with a gap + a soft glow (inactive ones are dimmed) */}
              <span className={`absolute ${railOpen ? "left-0" : "-left-[9px]"} top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-accent transition-all duration-200 ${on ? "h-9 opacity-100 shadow-[0_0_12px_rgb(var(--accent-rgb)/0.8)]" : "h-2 opacity-0 group-hover:opacity-70 group-hover:h-5"}`} />
              <span className={`shrink-0 block rounded-2xl transition-all duration-200 ${on ? "outline outline-2 outline-offset-[3px] outline-white/80 shadow-[0_8px_26px_rgb(var(--accent-rgb)/0.45)]" : "opacity-55 hover:opacity-100 group-hover:scale-105"}`}><ServerIcon server={s} size={48} /></span>
              {railOpen && <span className={`truncate text-sm text-left flex-1 ${on ? "font-semibold text-ink" : "text-muted"}`}>{s.name}</span>}
            </button>
          );
        })}
        <div className={`h-px bg-line my-1 shrink-0 ${railOpen ? "w-full" : "w-8"}`} />
        {rb({ title: "Criar servidor", icon: <Plus size={18} />, onClick: () => setServerModal("create"), cls: "bg-white/5 text-accent2 hover:bg-white/10" })}
        {rb({ title: "Entrar com convite", icon: <Link2 size={18} />, onClick: () => setServerModal("join"), cls: "bg-white/5 text-accent hover:bg-white/10" })}
        <div className="flex-1" />
        {rb({ title: lite ? "Modo leve ligado (clique para desligar)" : "Modo leve: menos efeitos, ideal para jogar", label: "Modo leve", icon: <Zap size={18} />, onClick: onToggleLite, badge: railOpen && lite && <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-emerald-400/20 px-2 py-0.5">ligado</span>,
          cls: lite ? "bg-emerald-500/20 text-emerald-300" : "text-muted hover:text-ink hover:bg-white/5" })}
        {rb({ title: fx ? "Desligar animação de fundo" : "Ligar animação de fundo", label: "Animação de fundo", icon: <Sparkles size={18} />, onClick: onToggleFx, badge: railOpen && fx && <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-accent/20 px-2 py-0.5">ligada</span>,
          cls: fx ? "bg-accent/15 text-accent" : "text-muted hover:text-ink hover:bg-white/5" })}
        {rb({ title: "Sair", label: "Sair da conta", icon: <LogOut size={18} />, onClick: onLogout, cls: "text-muted hover:text-ink hover:bg-white/5" })}
      </nav>

      {/* channels */}
      <aside className={`glass rounded-3xl p-3 flex flex-col min-w-0 ${wide ? "w-64" : "flex-1"}`}>
        {dmOpen || home ? <DmSidebar convs={dms.convs} online={online} peerId={dmOpen ? dmPeer?.id : undefined} onOpen={openDm} onFriends={() => { setDmOpen(true); setDmPeer(undefined); setNavOpen(false); dms.load(); friends.load(); }} friendsActive={dmOpen && !dmPeer} pending={friends.pending} /> : (<>
        <div className="px-2 py-2 border-b border-line mb-1">
          <div className="flex items-center gap-2">
            {server && <ServerIcon server={server} size={32} />}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold truncate flex items-center gap-1.5">{server?.name ?? "Bem-vindo"}{isOwner && <Crown size={13} className="text-accent2 shrink-0" />}</h2>
            </div>
            {server && (
              <button onClick={() => setSettingsOpen(true)} title={isOwner ? "Configurações do servidor" : "Membros e opções"} className="text-muted hover:text-ink p-1">
                <SlidersHorizontal size={16} />
              </button>
            )}
          </div>
          {server && (
            <button onClick={() => setInviteOpen(true)}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-semibold py-2 transition">
              <UserPlus size={14} /> Convidar pessoas
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {server && (<>
            {section("Texto", "TEXT")}
            {server.channels.filter((c) => c.type === "TEXT").map(textChan)}
            {section("Voz", "VOICE")}
            {server.channels.filter((c) => c.type === "VOICE").map(voiceChan)}
          </>)}
          {!server && (
            <div className="px-3 py-8 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-accent/15 text-accent grid place-items-center"><Compass size={22} /></div>
              <p className="font-semibold mt-3">Nenhum servidor ainda</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">Crie um servidor ou entre com um convite para ver canais e salas de voz aqui.</p>
              <button onClick={() => setServerModal("create")} className="grad mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white hover:brightness-110 transition">Criar servidor</button>
              <button onClick={() => setServerModal("join")} className="mt-2 w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-sm font-semibold transition">Entrar com convite</button>
            </div>
          )}
        </div>
        </>)}

        {voice && (
          <div className="mt-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-2 flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <button onClick={() => { setView("call"); setDmOpen(false); setNavOpen(false); }} title="Voltar para a chamada" className="flex-1 min-w-0 truncate text-left hover:underline">Em voz: <b>{voice.name}</b>{view === "text" && <span className="text-muted"> · voltar</span>}</button>
            <button onClick={leaveVoice} className="text-accent hover:underline">Sair</button>
          </div>
        )}

        <button onClick={() => setPrefsOpen(true)} title="Configurações e perfil" className="mt-2 flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-2xl p-2 text-left transition">
          <div className="relative">
            <Avatar user={self} size={34} />
            <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online.has(self.id) ? "bg-emerald-400" : "bg-muted"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate flex items-center gap-1.5">{nameOf(self)}<DevBadge user={self} /></div>
            <div className="text-[11px] text-muted">{online.has(self.id) ? "Online" : "Offline"}</div>
          </div>
          <Settings size={16} className="text-muted" />
        </button>
      </aside>
      </div>
      )}

      {/* main */}
      <main className="glass rounded-3xl flex-1 flex flex-col min-w-0 min-h-0 relative">
        {notice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-accent text-white text-sm font-medium rounded-2xl px-5 py-2.5 shadow-[0_8px_30px_rgb(var(--accent-rgb)/0.5)] flex items-center gap-3">
            {notice}<button onClick={() => setNotice(undefined)} className="opacity-80 hover:opacity-100">✕</button>
          </div>
        )}
        {soundToast && <div className="absolute top-3 right-3 z-40 rounded-2xl bg-black/70 text-sm px-4 py-2 border border-line">{soundToast}</div>}
        {voice && (
          <div className={view === "call" && !dmOpen ? "flex-1 flex flex-col min-h-0 min-w-0" : "hidden"}>
          <Suspense fallback={<div className="flex-1 grid place-items-center text-muted text-sm">Carregando chamada...</div>}>
            <VoiceRoom key={voice.id} channel={voice} onApi={(a) => { voiceApi.current = a; }} onMessage={(uid) => { const u = Object.values(voiceUsers).flat().find((x) => x.id === uid); if (u) openDm(u); }} onProfile={setProfileId} onSound={(id) => socket.current?.emit("voice:sound", id)} onMedia={(micOff, deaf) => { deafRef.current = deaf; socket.current?.emit("voice:media", { micOff, deaf }); }} autoWatch={autoWatch} onAutoWatched={() => setAutoWatch(undefined)} chat={view === "call" && chatOpen ? chatPane(true) : null} chatOpen={chatOpen} unread={unread} onToggleChat={() => setChatOpen((v) => !v)} channelName={channel?.name} users={roomUsers} serverId={voice.serverId} isOwner={server?.id === voice.serverId && isOwner} onLeave={leaveVoice} onSpeakers={(ids) => setSpeakers((prev) => (prev.size === ids.length && ids.every((i) => prev.has(i)) ? prev : new Set(ids)))} onMenu={wide ? undefined : () => setNavOpen(true)} onSharing={(on) => { sharingRef.current = on; socket.current?.emit("voice:sharing", on); }} />
          </Suspense>
          </div>
        )}
        {dmOpen && (dmPeer
          ? <DmChat key={dmPeer.id} peer={dmPeer} self={self} online={online.has(dmPeer.id)} getSocket={() => socket.current} onRead={dms.markRead} onProfile={setProfileId} onMenu={wide ? undefined : () => setNavOpen(true)} />
          : <FriendsPanel self={self} data={friends.data} online={online} onMessage={openDm} onProfile={setProfileId} onChanged={friends.load} onMenu={wide ? undefined : () => setNavOpen(true)} />)}
        {!dmOpen && (!voice || view === "text") && (
          home || !server
            ? <NoServerHome name={nameOf(self)} servers={servers} onOpenServer={(id) => { setHome(false); setServerId(id); setChannel(undefined); }} onCreate={() => setServerModal("create")} onTour={() => setTour(true)} onMenu={wide ? undefined : () => setNavOpen(true)}
                onJoin={async (code) => { const s = await api.join(code); await afterServerChange(s); }} />
            : !channel
              ? <NoChannelHome server={server} isOwner={isOwner} onOpen={(c) => (c.type === "VOICE" ? joinVoice(c) : (setChannel(c), setView("text")))} onInvite={() => setInviteOpen(true)} onNewChannel={(t) => setNewChannelType(t)} onMenu={wide ? undefined : () => setNavOpen(true)} />
              : chatPane(false))}
      </main>

      {adminOpen && self.role && <Suspense fallback={null}><AdminPanel me={self} onClose={() => setAdminOpen(false)} /></Suspense>}
      {prefsOpen && <SettingsModal user={self} onAdmin={() => setAdminOpen(true)} onClose={() => setPrefsOpen(false)} onEditProfile={() => { setPrefsOpen(false); setProfileOpen(true); }} onTour={() => setTour(true)} onLogout={onLogout}
        fx={fx} onToggleFx={onToggleFx} lite={lite} onToggleLite={onToggleLite} rail={rail} onToggleRail={toggleRail} wide={wide} />}
      {profileId && <UserProfile id={profileId} onClose={() => setProfileId(undefined)} onMessage={(u) => openDm(u)} onEdit={() => setProfileOpen(true)} onFriendsChanged={friends.load} onProfile={setProfileId} />}
      {lightbox && <Lightbox att={lightbox} onClose={() => setLightbox(undefined)} />}
      {tour && <Tour name={nameOf(self)} onFinish={closeTour} />}
      {serverModal && <ServerModal initial={serverModal} username={nameOf(self)} onClose={() => setServerModal(undefined)} onDone={afterServerChange} />}
      {inviteOpen && server && <InviteModal server={server} onClose={() => setInviteOpen(false)} />}
      {newChannelType && server && <ChannelModal serverId={server.id} initialType={newChannelType} onClose={() => setNewChannelType(undefined)} />}
      {settingsOpen && server && (
        <ServerSettings server={server} selfId={self.id} online={online} rev={rev}
          onClose={() => setSettingsOpen(false)} onAddChannel={(t) => setNewChannelType(t)} onMessage={openDm} onProfile={setProfileId} />
      )}
      {profileOpen && (
        <ProfileModal user={self} onClose={() => setProfileOpen(false)} onTour={() => setTour(true)}
          onSaved={(u) => { setSelf(u); localStorage.setItem("me", JSON.stringify(u)); }} />
      )}
    </div>
  );
}
