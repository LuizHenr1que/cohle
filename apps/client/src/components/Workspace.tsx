import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MessageCircle, Hash, Volume2, Plus, LogOut, Send, Link2, Settings, ScreenShare, Sparkles, UserPlus, Crown, SlidersHorizontal, Zap, Menu } from "lucide-react";
import type { ServerDTO, ChannelDTO, MessageDTO, UserDTO, VoiceStateDTO } from "@cohle/shared";
import { api, connectSocket } from "../api";
// The call UI (and the LiveKit SDK, the heaviest dependency) loads only when you join a voice channel.
import type { VoiceApi } from "./VoiceRoom";
import { PersonRow } from "./PersonRow";
import { useAutoUpdate, useUpdate } from "../lib/update";
import { AutoUpdateBadge, UpdateBadge } from "./UpdateBadge";
import { DmChat, DmSidebar, useDms } from "./DirectMessages";
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

export function Workspace({ me, onLogout, fx, onToggleFx, lite, onToggleLite }: { me: UserDTO; onLogout: () => void; fx: boolean; onToggleFx: () => void; lite: boolean; onToggleLite: () => void }) {
  const [self, setSelf] = useState<UserDTO>(me);
  const [servers, setServers] = useState<ServerDTO[]>([]);
  const [serverId, setServerId] = useState<string>();
  const [channel, setChannel] = useState<ChannelDTO>();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<ChannelDTO>();
  const [voiceUsers, setVoiceUsers] = useState<Record<string, UserDTO[]>>({});
  const [speakers, setSpeakers] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [profileOpen, setProfileOpen] = useState(false);
  const [serverModal, setServerModal] = useState<"create" | "join">();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const auto = useAutoUpdate();
  const [dmOpen, setDmOpen] = useState(false);              // "home": direct messages instead of a server
  const [dmPeer, setDmPeer] = useState<UserDTO>();
  const deafRef = useRef(false);
  const [soundToast, setSoundToast] = useState<string>();
  const voiceApi = useRef<VoiceApi | null>(null);
  const [autoWatch, setAutoWatch] = useState<string>();     // a live clicked on the sidebar before we were in that call
  const dms = useDms(() => socket.current, self.id, dmPeer?.id, dmOpen);
  const voiceRef = useRef<ChannelDTO>();
  voiceRef.current = voice;
  const sharingRef = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const server = servers.find((s) => s.id === serverId);
  const isOwner = server?.ownerId === self.id;

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
    s.on("message:new", (m: MessageDTO) => {
      setMessages((l) => [...l, m]);
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
    setMessages([]);
    api.messages(channel.id).then(setMessages);
    socket.current?.emit("channel:join", channel.id);
  }, [channel?.id]);

  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(undefined), 7000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { if (server && !channel) setChannel(server.channels.find((c) => c.type === "TEXT")); }, [server]);

  const msgs = messages.filter((m) => m.channelId === channel?.id);
  const roomUsers = voice ? voiceUsers[voice.id] ?? [] : [];

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !channel) return;
    socket.current?.emit("message:send", { channelId: channel.id, content: text });
    setText("");
  }
  function joinVoice(c: ChannelDTO) {
    setNavOpen(false); setView("call"); setDmOpen(false);
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
  function openDm(u: UserDTO) { setDmPeer(u); setDmOpen(true); setNavOpen(false); dms.load(); }
  function leaveVoice() { setVoice(undefined); setChatOpen(false); setView("text"); socket.current?.emit("voice:leave"); }
  async function afterServerChange(s: ServerDTO) {
    socket.current?.emit("server:join", s.id);
    await reload(); setServerId(s.id); setChannel(undefined);
  }

  const section = (label: string, type: "TEXT" | "VOICE") => (
    <div className="flex items-center justify-between px-2 mt-4 mb-1 text-[11px] uppercase tracking-widest text-muted">
      {label}
      {isOwner && <button onClick={() => setNewChannelType(type)} title="Novo canal" className="hover:text-ink"><Plus size={14} /></button>}
    </div>
  );

  const textChan = (c: ChannelDTO) => (
    <button key={c.id} onClick={() => { setDmOpen(false); setChannel(c); setView("text"); setNavOpen(false); }}
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
            onClick={() => openPerson(c, u)} onMessage={() => openDm(u)}
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
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
            {msgs.map((m) => (
              <div key={m.id} className="flex gap-3">
                <Avatar user={m.author.id === self.id ? self : m.author} size={38} />
                <div className="min-w-0">
                  <div className="text-sm"><b>{m.author.username}</b> <span className="text-muted text-xs ml-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                  <p className="text-ink/90 whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          {channel && (
            <form onSubmit={send} className="p-2 sm:p-4 flex gap-2 border-t border-line">
              <input value={text} onChange={(e) => { setText(e.target.value); socket.current?.emit("typing", channel.id); }}
                placeholder={`Mensagem em #${channel.name}`}
                className="flex-1 rounded-2xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent" />
              <button className="grad rounded-2xl px-5 text-white"><Send size={18} /></button>
            </form>
          )}
    </div>
  );

  return (
    <div className="h-full flex gap-2 sm:gap-3 p-2 sm:p-3 min-w-0">
      {!wide && navOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setNavOpen(false)} />}
      {(wide || navOpen) && (
      <div className={wide ? "flex gap-3 shrink-0" : "fixed z-50 left-2 bottom-2 top-[calc(var(--titlebar,0px)+0.5rem)] flex gap-2 w-[min(94vw,400px)]"}>
      {/* servers rail */}
      <nav className="glass rounded-3xl w-[72px] shrink-0 flex flex-col items-center gap-2 py-3 overflow-y-auto">
        <div title="Cohle" className="mb-1 shrink-0"><Logo size={40} /></div>
        <button onClick={() => { setDmOpen(true); dms.load(); }} title="Mensagens diretas"
          className={`relative shrink-0 size-12 rounded-2xl grid place-items-center transition ${dmOpen ? "bg-accent text-white shadow-[0_6px_20px_rgba(255,59,92,0.4)]" : "bg-white/5 text-accent hover:bg-white/10"}`}>
          <MessageCircle size={20} />
          {dms.unread > 0 && <span className="absolute -bottom-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center border-2 border-surface">{dms.unread > 99 ? "99+" : dms.unread}</span>}
        </button>
        {auto && (auto.status === "downloading" || auto.status === "ready")
          ? <AutoUpdateBadge st={auto} />
          : update && (!auto || auto.status === "error" || auto.status === "unsupported") && <UpdateBadge n={update.n} note={update.note} url={update.url} />}
        {servers.map((s) => (
          <button key={s.id} title={s.name}
            onClick={() => { setDmOpen(false); setServerId(s.id); setChannel(undefined); }}
            className={`rounded-2xl transition ${!dmOpen && s.id === serverId ? "ring-2 ring-accent shadow-[0_6px_20px_rgba(255,59,92,0.4)]" : "opacity-70 hover:opacity-100"}`}>
            <ServerIcon server={s} size={48} />
          </button>
        ))}
        <div className="w-8 h-px bg-line my-1" />
        <button onClick={() => setServerModal("create")} title="Criar servidor" className="size-12 rounded-2xl bg-white/5 text-accent2 grid place-items-center hover:bg-white/10"><Plus size={18} /></button>
        <button onClick={() => setServerModal("join")} title="Entrar com convite" className="size-12 rounded-2xl bg-white/5 text-accent grid place-items-center hover:bg-white/10"><Link2 size={18} /></button>
        <div className="flex-1" />
        <button onClick={onToggleLite} title={lite ? "Modo leve ligado (clique para desligar)" : "Modo leve: menos efeitos, ideal para jogar"}
          className={`size-12 rounded-2xl grid place-items-center transition ${lite ? "bg-emerald-500/20 text-emerald-300" : "text-muted hover:text-ink"}`}>
          <Zap size={18} />
        </button>
        <button onClick={onToggleFx} title={fx ? "Desligar animação de fundo" : "Ligar animação de fundo"}
          className={`size-12 rounded-2xl grid place-items-center transition ${fx ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"}`}>
          <Sparkles size={18} />
        </button>
        <button onClick={onLogout} title="Sair" className="size-12 rounded-2xl text-muted grid place-items-center hover:text-ink"><LogOut size={18} /></button>
      </nav>

      {/* channels */}
      <aside className={`glass rounded-3xl p-3 flex flex-col min-w-0 ${wide ? "w-64" : "flex-1"}`}>
        {dmOpen ? <DmSidebar convs={dms.convs} online={online} peerId={dmPeer?.id} onOpen={openDm} /> : (<>
        <div className="px-2 py-2 border-b border-line mb-1">
          <div className="flex items-center gap-2">
            {server && <ServerIcon server={server} size={32} />}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold truncate flex items-center gap-1.5">{server?.name ?? "Sem servidor"}{isOwner && <Crown size={13} className="text-accent2 shrink-0" />}</h2>
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
        </div>
        </>)}

        {voice && (
          <div className="mt-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-2 flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <button onClick={() => { setView("call"); setDmOpen(false); setNavOpen(false); }} title="Voltar para a chamada" className="flex-1 min-w-0 truncate text-left hover:underline">Em voz: <b>{voice.name}</b>{view === "text" && <span className="text-muted"> · voltar</span>}</button>
            <button onClick={leaveVoice} className="text-accent hover:underline">Sair</button>
          </div>
        )}

        <button onClick={() => setProfileOpen(true)} className="mt-2 flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-2xl p-2 text-left transition">
          <div className="relative">
            <Avatar user={self} size={34} />
            <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online.has(self.id) ? "bg-emerald-400" : "bg-muted"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{self.username}</div>
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
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-accent text-white text-sm font-medium rounded-2xl px-5 py-2.5 shadow-[0_8px_30px_rgba(255,59,92,0.5)] flex items-center gap-3">
            {notice}<button onClick={() => setNotice(undefined)} className="opacity-80 hover:opacity-100">✕</button>
          </div>
        )}
        {soundToast && <div className="absolute top-3 right-3 z-40 rounded-2xl bg-black/70 text-sm px-4 py-2 border border-line">{soundToast}</div>}
        {voice && (
          <div className={view === "call" && !dmOpen ? "flex-1 flex flex-col min-h-0 min-w-0" : "hidden"}>
          <Suspense fallback={<div className="flex-1 grid place-items-center text-muted text-sm">Carregando chamada...</div>}>
            <VoiceRoom key={voice.id} channel={voice} onApi={(a) => { voiceApi.current = a; }} onMessage={(uid) => { const u = Object.values(voiceUsers).flat().find((x) => x.id === uid); if (u) openDm(u); }} onSound={(id) => socket.current?.emit("voice:sound", id)} onMedia={(micOff, deaf) => { deafRef.current = deaf; socket.current?.emit("voice:media", { micOff, deaf }); }} autoWatch={autoWatch} onAutoWatched={() => setAutoWatch(undefined)} chat={view === "call" && chatOpen ? chatPane(true) : null} chatOpen={chatOpen} unread={unread} onToggleChat={() => setChatOpen((v) => !v)} channelName={channel?.name} users={roomUsers} serverId={voice.serverId} isOwner={server?.id === voice.serverId && isOwner} onLeave={leaveVoice} onSpeakers={(ids) => setSpeakers((prev) => (prev.size === ids.length && ids.every((i) => prev.has(i)) ? prev : new Set(ids)))} onMenu={wide ? undefined : () => setNavOpen(true)} onSharing={(on) => { sharingRef.current = on; socket.current?.emit("voice:sharing", on); }} />
          </Suspense>
          </div>
        )}
        {dmOpen && (dmPeer
          ? <DmChat key={dmPeer.id} peer={dmPeer} self={self} online={online.has(dmPeer.id)} getSocket={() => socket.current} onRead={dms.markRead} onMenu={wide ? undefined : () => setNavOpen(true)} />
          : (
            <div className="flex-1 grid place-items-center text-center px-6 text-muted">
              <div>
                {!wide && <button onClick={() => setNavOpen(true)} className="mb-4 rounded-xl bg-white/5 px-4 py-2 text-sm text-ink">Abrir conversas</button>}
                <MessageCircle size={40} className="mx-auto mb-3 text-accent" />
                <p className="font-semibold text-ink">Suas mensagens diretas</p>
                <p className="text-sm mt-1">Escolha uma pessoa na lista para conversar em particular.</p>
              </div>
            </div>
          ))}
        {!dmOpen && (!voice || view === "text") && chatPane(false)}
      </main>

      {serverModal && <ServerModal initial={serverModal} username={self.username} onClose={() => setServerModal(undefined)} onDone={afterServerChange} />}
      {inviteOpen && server && <InviteModal server={server} onClose={() => setInviteOpen(false)} />}
      {newChannelType && server && <ChannelModal serverId={server.id} initialType={newChannelType} onClose={() => setNewChannelType(undefined)} />}
      {settingsOpen && server && (
        <ServerSettings server={server} selfId={self.id} online={online} rev={rev}
          onClose={() => setSettingsOpen(false)} onAddChannel={(t) => setNewChannelType(t)} onMessage={openDm} />
      )}
      {profileOpen && (
        <ProfileModal user={self} onClose={() => setProfileOpen(false)}
          onSaved={(u) => { setSelf(u); localStorage.setItem("me", JSON.stringify(u)); }} />
      )}
    </div>
  );
}
