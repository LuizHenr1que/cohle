import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Room, RoomEvent, Track, VideoPresets, type LocalAudioTrack,
  type Participant, type RemoteParticipant, type RemoteTrackPublication,
} from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Volume2, VolumeX, Headphones, HeadphoneOff,
  ScreenShare, Maximize2, Minimize2, X, MonitorPlay, Lock, Ban, UserX, PhoneMissed, ShieldAlert, Menu, Eye, EyeOff, AudioLines, Check, ChevronUp, MessageSquare,
} from "lucide-react";
import type { ChannelDTO, UserDTO } from "@cohle/shared";
import { api, assetUrl } from "../api";
import { Avatar } from "./Avatar";
import { sounds } from "../sounds";
import { ScreenPicker, QUALITY_PRESETS, type Quality } from "./ScreenPicker";
import { fitTiles, useSize } from "../lib/hooks";
import { NOISE_MODES, NoiseProcessor, captureOptions, isNeural, loadNoiseMode, saveNoiseMode, type NoiseMode } from "../lib/noise";

type UserLike = Pick<UserDTO, "username" | "avatarUrl">;
// Per-person listening settings (only affect me). v/s: 0..2 = 0%..200%; m: muted for me.
type Vol = { v: number; s: number; m: boolean };
const DEFAULT_VOL: Vol = { v: 1, s: 1, m: false };
const VOL_KEY = "cohle:volumes";
const loadVols = (): Record<string, Vol> => { try { return JSON.parse(localStorage.getItem(VOL_KEY) ?? "{}"); } catch { return {}; } };

type Moderation = { muted: boolean; toggleMute: () => void; disconnect: () => void; kick: () => void; ban: () => void };

function Slider({ label, value, onChange, compact }: { label: string; value: number; onChange: (v: number) => void; compact?: boolean }) {
  return (
    <label className={compact ? "flex items-center gap-2" : "block space-y-1"}>
      <span className={`flex justify-between text-xs text-muted ${compact ? "gap-2" : ""}`}><span>{label}</span><span className="tabular-nums">{Math.round(value * 100)}%</span></span>
      <input type="range" min={0} max={200} step={5} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)}
        className={`accent-[#ff3b5c] ${compact ? "w-28 sm:w-40" : "w-full"}`} />
    </label>
  );
}

// Listening controls for one remote person + (for the server owner) moderation actions.
// Rendered in a portal with fixed positioning so tiles/scroll areas can never clip it.
function PersonMenu({ name, vol, onVol, sharing, mod }: { name: string; vol: Vol; onVol: (patch: Partial<Vol>) => void; sharing: boolean; mod?: Moderation }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<string>();
  const [pos, setPos] = useState({ top: 0, left: 0, width: 256 });
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const silent = vol.m || vol.v === 0;

  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const width = Math.min(256, window.innerWidth - 16);
      setPos({
        width,
        left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(r.bottom + 8, window.innerHeight - 380)),
      });
    }
    setConfirm(undefined); setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", away); window.addEventListener("keydown", esc); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", esc); window.removeEventListener("resize", close); };
  }, [open]);

  const act = (key: string, label: string, Icon: typeof Ban, run: () => void, danger = true) => (
    <button key={key} onClick={() => (confirm === key ? (run(), setConfirm(undefined), setOpen(false)) : setConfirm(key))}
      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition ${confirm === key ? "bg-red-600 text-white" : danger ? "text-red-300 hover:bg-red-500/15" : "hover:bg-white/10"}`}>
      <Icon size={14} /> {confirm === key ? `Confirmar: ${label}` : label}
    </button>
  );
  return (
    <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <button ref={btn} onClick={toggle} className="bg-black/50 hover:bg-black/70 rounded-full p-1.5 @sm:p-2" title="Volume e opções">
        {silent ? <VolumeX size={14} className="text-accent" /> : <Volume2 size={14} />}
      </button>
      {open && createPortal(
        <div ref={pop} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[60] max-h-[min(70vh,430px)] overflow-y-auto rounded-2xl bg-surface border border-line shadow-2xl p-3 space-y-3 text-sm">
          <div className="font-medium truncate">{name}</div>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" checked={vol.m} onChange={(e) => onVol({ m: e.target.checked })} className="accent-[#ff3b5c]" /> Mutar para mim
          </label>
          <Slider label="Volume da voz" value={vol.v} onChange={(v) => onVol({ v })} />
          {sharing && <Slider label="Volume do ao vivo" value={vol.s} onChange={(s) => onVol({ s })} />}
          {mod && (
            <div className="pt-2 border-t border-line space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1"><ShieldAlert size={11} /> Ações do dono</p>
              {act("mute", mod.muted ? "Liberar o microfone" : "Silenciar para todos", mod.muted ? Mic : MicOff, mod.toggleMute, false)}
              {act("dc", "Desconectar da chamada", PhoneMissed, mod.disconnect)}
              {act("kick", "Expulsar do servidor", UserX, mod.kick)}
              {act("ban", "Banir do servidor", Ban, mod.ban)}
            </div>
          )}
        </div>, document.body)}
    </div>
  );
}

// One participant. Sizes come from the tile itself (container queries), so it adapts in a 1-person view,
// a 12-person grid or the small strip next to a stage.
function Tile({ p, user, speaking, watching, compact, vol, onVol, mod, serverMuted, onWatch, onOpen, preview, onTogglePreview }: {
  p: Participant; user: UserLike; speaking: boolean; watching: boolean; compact?: boolean; preview: boolean; onTogglePreview: () => void;
  vol: Vol; onVol: (patch: Partial<Vol>) => void; mod?: Moderation; serverMuted: boolean;
  onWatch: () => void; onOpen: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const sharing = p.isScreenShareEnabled;
  // Remote screen: only while I am watching it. My own screen: a preview, so I can see that it is really being shared.
  const showScreen = p.isLocal ? preview : watching;
  const screenTrack = showScreen ? p.getTrackPublication(Track.Source.ScreenShare)?.track : undefined;
  const camTrack = p.getTrackPublication(Track.Source.Camera)?.track;
  const track = screenTrack ?? camTrack;

  // Attach only when the actual track changes (not on every render).
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);

  const unwatched = sharing && !p.isLocal && !watching;
  const avatarSize = compact ? "clamp(26px, 38cqmin, 44px)" : unwatched ? "clamp(34px, 24cqmin, 96px)" : "clamp(40px, 34cqmin, 120px)";

  return (
    <div className={`@container relative rounded-2xl @sm:rounded-3xl bg-surface-2 border border-line w-full h-full min-h-0 select-none ${speaking ? "speaking" : ""}`}>
      <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
        <video ref={ref} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-contain bg-black/40 ${track ? "" : "hidden"}`} />
      </div>

      {!track && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2cqmin] px-2 pt-7 pb-8">
          <div className={unwatched && !compact ? "@max-[230px]:hidden" : ""}><Avatar user={user} size={avatarSize} speaking={speaking} /></div>
          {unwatched && !compact && (
            <button onClick={onWatch} className="grad rounded-xl px-3 @sm:px-4 py-1.5 @sm:py-2 text-xs @sm:text-sm font-semibold text-white whitespace-nowrap shadow-[0_6px_24px_rgba(255,59,92,0.45)] inline-flex items-center gap-1.5 hover:brightness-110">
              <MonitorPlay size={15} /> <span className="@max-[260px]:hidden">Assistir transmissão</span><span className="@min-[261px]:hidden">Assistir</span>
            </button>
          )}
        </div>
      )}

      {sharing && (
        <span className="absolute top-2 left-2 @sm:top-3 @sm:left-3 flex items-center gap-1 bg-accent px-1.5 @sm:px-2.5 py-0.5 @sm:py-1 rounded-full text-[10px] @sm:text-[11px] font-semibold shadow-[0_0_16px_rgba(255,59,92,0.6)]">
          <ScreenShare size={12} /> <span className="@max-[170px]:hidden">AO VIVO</span>
        </span>
      )}
      {unwatched && compact && (
        <button onClick={onWatch} title="Assistir transmissão" className="absolute top-1.5 right-1.5 grad rounded-full p-1.5 text-white"><MonitorPlay size={13} /></button>
      )}
      {p.isLocal && sharing && !compact && (
        <span className="absolute bottom-9 inset-x-0 mx-auto w-fit text-[11px] text-muted bg-black/55 rounded-full px-3 py-1">
          {screenTrack ? "Prévia da sua tela: só você vê isso" : "Você está compartilhando a tela"}
        </span>
      )}

      {!compact && (
        <div className="absolute top-2 right-2 @sm:top-3 @sm:right-3 flex gap-1.5 items-start">
          {!p.isLocal && <PersonMenu name={user.username} vol={vol} onVol={onVol} sharing={sharing} mod={mod} />}
          {p.isLocal && sharing && (
            <button onClick={onTogglePreview} className="bg-black/50 hover:bg-black/70 rounded-full p-1.5 @sm:p-2" title={preview ? "Esconder a prévia da minha tela" : "Mostrar a prévia da minha tela"}>
              {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {watching && <button onClick={onOpen} className="bg-black/50 hover:bg-black/70 rounded-full p-1.5 @sm:p-2" title="Abrir em tela maior"><Maximize2 size={14} /></button>}
        </div>
      )}

      <div className="absolute bottom-1.5 inset-x-1.5 @sm:bottom-3 @sm:inset-x-3 flex items-center gap-2 pointer-events-none">
        <span className="min-w-0 truncate text-[11px] @sm:text-xs bg-black/55 px-2 @sm:px-3 py-0.5 @sm:py-1 rounded-full">
          {p.isLocal ? `${user.username} (você)` : user.username}
        </span>
        <span className="flex-1" />
        {serverMuted ? (
          <span className="shrink-0 bg-accent/90 rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1" title="Silenciado pelo dono do servidor"><Lock size={11} /><span className="@max-[200px]:hidden">Silenciado</span></span>
        ) : !p.isMicrophoneEnabled ? (
          <span className="shrink-0 bg-black/55 rounded-full p-1"><MicOff size={13} className="text-accent" /></span>
        ) : null}
      </div>
    </div>
  );
}

// The watched live stream: big picture + its own control bar (so nothing is drawn over the video).
function Stage({ p, user, vol, onVol, speaking, stageRef, onStop }: {
  p: Participant; user: UserLike; vol: Vol; onVol: (patch: Partial<Vol>) => void; speaking: boolean;
  stageRef: React.RefObject<HTMLDivElement>; onStop: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const track = p.getTrackPublication(Track.Source.ScreenShare)?.track;
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);

  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, [stageRef]);
  const toggleFs = () => { const el = stageRef.current; if (!el) return; document.fullscreenElement ? void document.exitFullscreen() : el.requestFullscreen().catch(() => {}); };

  return (
    <div ref={stageRef} className={`flex-1 min-h-0 min-w-0 flex flex-col rounded-2xl sm:rounded-3xl bg-bg border border-line overflow-hidden ${speaking ? "speaking" : ""}`}>
      <div className="relative flex-1 min-h-0 bg-black" onDoubleClick={toggleFs}>
        <video ref={ref} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-contain" />
        {!track && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Carregando transmissão…</div>}
        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-accent px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-[0_0_16px_rgba(255,59,92,0.6)]"><ScreenShare size={13} /> AO VIVO</span>
      </div>
      <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 sm:px-4 py-2 bg-surface border-t border-line">
        <div className="flex items-center gap-2 min-w-0 flex-1 basis-32">
          <Avatar user={user} size={26} />
          <span className="truncate text-sm font-medium">{user.username}</span>
        </div>
        <div className="flex items-center gap-2">
          {vol.m || vol.s === 0 ? <VolumeX size={16} className="text-accent shrink-0" /> : <Volume2 size={16} className="text-muted shrink-0" />}
          <Slider compact label="Som" value={vol.m ? 0 : vol.s} onChange={(s) => onVol({ s, m: false })} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleFs} className="bg-white/10 hover:bg-white/15 rounded-full p-2" title={fs ? "Sair da tela cheia" : "Tela cheia"}>{fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button onClick={onStop} className="bg-white/10 hover:bg-red-500/30 rounded-full p-2" title="Parar de assistir"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
}

type Status = "connecting" | "connected" | "error";
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const GAP = 12;

export function VoiceRoom({ channel, users, serverId, isOwner, onLeave, onSpeakers, onSharing, onMenu, chat, chatOpen, unread, onToggleChat, channelName }: {
  channel: ChannelDTO; users: UserDTO[]; serverId: string; isOwner: boolean;
  chat?: React.ReactNode; chatOpen?: boolean; unread?: number; onToggleChat?: () => void; channelName?: string;
  onLeave: () => void; onSpeakers: (ids: string[]) => void; onSharing: (on: boolean) => void; onMenu?: () => void;
}) {
  const roomRef = useRef<Room>();
  const stageRef = useRef<HTMLDivElement>(null);
  const audioHost = useRef<HTMLDivElement>(null);
  const [areaRef, area] = useSize<HTMLDivElement>();           // space available for tiles / stage
  const [, tick] = useState(0);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [err, setErr] = useState("");
  const [picking, setPicking] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [watching, setWatching] = useState<Set<string>>(new Set());   // whose screen share I'm downloading
  const [focusId, setFocusId] = useState<string>();                    // spotlighted participant
  const [vols, setVols] = useState<Record<string, Vol>>(loadVols);
  const [preview, setPreview] = useState(() => { try { return localStorage.getItem("cohle:preview") !== "off"; } catch { return true; } });
  const togglePreview = () => setPreview((v) => { try { localStorage.setItem("cohle:preview", v ? "off" : "on"); } catch { /* ignore */ } return !v; });
  const [noise, setNoise] = useState<NoiseMode>(loadNoiseMode);   // on by default (neural, runs locally)
  const [audioMenu, setAudioMenu] = useState(false);
  const [devices, setDevices] = useState<{ ins: MediaDeviceInfo[]; outs: MediaDeviceInfo[]; inId?: string; outId?: string }>({ ins: [], outs: [] });
  const lastNeural = useRef<NoiseMode>(isNeural(loadNoiseMode()) ? loadNoiseMode() : "rnnoise");
  const noiseRef = useRef(noise);
  noiseRef.current = noise;
  const deafRef = useRef(false);
  const micBeforeDeaf = useRef(true);
  const watchRef = useRef(watching);
  watchRef.current = watching;
  const volsRef = useRef(vols);
  volsRef.current = vols;

  // Effective listening volume = my per-person setting, forced to 0 while deafened.
  const applyVolumes = () => roomRef.current?.remoteParticipants.forEach((p) => {
    const v = volsRef.current[p.identity] ?? DEFAULT_VOL;
    const silent = deafRef.current || v.m;
    p.setVolume(silent ? 0 : v.v, Track.Source.Microphone);
    p.setVolume(silent ? 0 : v.s, Track.Source.ScreenShareAudio);
  });
  const setVol = (id: string, patch: Partial<Vol>) => {
    const next = { ...volsRef.current, [id]: { ...(volsRef.current[id] ?? DEFAULT_VOL), ...patch } };
    volsRef.current = next; setVols(next);
    try { localStorage.setItem(VOL_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    applyVolumes();
  };

  // Subscription policy (keeps CPU/bandwidth low): audio and cameras always; a screen share only while watched,
  // and its video is paused while the window is hidden/minimized (audio keeps playing).
  const applyPolicy = (pub: RemoteTrackPublication, p: RemoteParticipant) => {
    let want = false;
    if (pub.source === Track.Source.Microphone) want = true;
    else if (pub.source === Track.Source.Camera) want = !document.hidden;
    else if (pub.source === Track.Source.ScreenShareAudio) want = watchRef.current.has(p.identity);
    else if (pub.source === Track.Source.ScreenShare) want = watchRef.current.has(p.identity) && !document.hidden;
    if (pub.isSubscribed !== want) pub.setSubscribed(want);
  };
  const applyAll = () => roomRef.current?.remoteParticipants.forEach((p) => p.trackPublications.forEach((pub) => applyPolicy(pub, p)));

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true, dynacast: true,
      webAudioMix: (() => { try { return localStorage.getItem("cohle:webaudio") !== "off"; } catch { return true; } })(),   // lets the volume slider go above 100%
      videoCaptureDefaults: { resolution: VideoPresets.h540.resolution },   // lighter camera than 720p
      audioCaptureDefaults: captureOptions(noiseRef.current),               // echo cancellation + auto gain always; browser suppressor only in "Padrão"
    });
    roomRef.current = room;
    try { if (localStorage.getItem("cohle:debug") === "1") (window as any).__cohleRoom = room; } catch { /* ignore */ }
    const bump = () => tick((n) => n + 1);
    (["TrackUnsubscribed", "LocalTrackPublished", "LocalTrackUnpublished", "TrackMuted", "TrackUnmuted", "TrackUnpublished"] as const)
      .forEach((e) => room.on(RoomEvent[e] as any, bump));

    // LiveKit does NOT play remote audio by itself: every audio track must be attached to an <audio> element.
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) audioHost.current?.appendChild(track.attach());
      applyVolumes(); bump();
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) track.detach().forEach((el) => el.remove());
    });
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => { if (!room.canPlaybackAudio) room.startAudio().catch(() => {}); });

    room.on(RoomEvent.TrackPublished, (pub, p) => { applyPolicy(pub, p); bump(); });
    room.on(RoomEvent.ParticipantConnected, (p) => { sounds.userJoin(); p.trackPublications.forEach((pub) => applyPolicy(pub, p)); applyVolumes(); bump(); });
    room.on(RoomEvent.ParticipantDisconnected, () => { sounds.userLeave(); bump(); });
    room.on(RoomEvent.LocalTrackUnpublished, (pub) => { if (pub.source === Track.Source.ScreenShare) onSharing(false); });
    room.on(RoomEvent.ActiveSpeakersChanged, (s) => {
      const ids = s.map((x) => x.identity).sort();
      setSpeakers((prev) => (sameIds(prev, ids) ? prev : ids));            // skip re-render when nothing changed
    });
    room.on(RoomEvent.Disconnected, () => setStatus((s) => (s === "error" ? s : "connecting")));
    const onVis = () => { applyAll(); bump(); };
    document.addEventListener("visibilitychange", onVis);
    // closing/reloading the window: say goodbye to LiveKit now, so the room list does not keep a ghost until it times out
    const bye = () => { try { void room.disconnect(true); } catch { /* already gone */ } };
    window.addEventListener("pagehide", bye);

    (async () => {
      try {
        const { token, url } = await api.voiceToken(channel.id);
        await room.connect(url, token, { autoSubscribe: false });
        await room.startAudio().catch(() => {});
        applyAll(); applyVolumes();
        setStatus("connected");
        sounds.joinSelf();
        bump();
        await room.localParticipant.setMicrophoneEnabled(true).catch((e) => setErr(`Microfone: ${e.message}`));
        if (isNeural(noiseRef.current)) await applyNoise(noiseRef.current);
        bump();
      } catch (e: any) { setStatus("error"); setErr(e.message ?? "falha ao conectar"); sounds.error(); }
    })();
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", bye); room.disconnect(); sounds.leaveSelf(); };
  }, [channel.id]);

  useEffect(() => { onSpeakers(speakers); }, [speakers]);

  // Desktop only: tell the floating widget (shown while Cohle is in the background) who is talking.
  useEffect(() => {
    if (!window.cohle?.overlayState) return;
    const sp = speakers.map((id) => users.find((u) => u.id === id)).filter((u): u is UserDTO => !!u)
      .map((u) => ({ id: u.id, name: u.username, avatar: assetUrl(u.avatarUrl) }));
    window.cohle.overlayState({ inCall: status === "connected", channel: channel.name, speakers: sp });
  }, [speakers, users, status, channel.name]);
  useEffect(() => () => window.cohle?.overlayState?.({ inCall: false, channel: "", speakers: [] }), []);
  useEffect(() => () => onSpeakers([]), []);

  const room = roomRef.current;
  const lp = room?.localParticipant;
  const parts: Participant[] = room && status === "connected" ? [room.localParticipant, ...room.remoteParticipants.values()] : [];
  const userOf = (p: Participant): UserLike => users.find((u) => u.id === p.identity) ?? { username: p.name ?? "?", avatarUrl: null };
  const mutedByOwner = (id: string) => !!users.find((u) => u.id === id)?.muted;
  const meMuted = lp ? mutedByOwner(lp.identity) : false;

  // The owner silenced me: make sure my mic is off (the server also revokes the right to publish).
  useEffect(() => {
    if (meMuted && lp?.isMicrophoneEnabled) lp.setMicrophoneEnabled(false).catch(() => {}).finally(() => tick((n) => n + 1));
  }, [meMuted]);

  // Drop watch/focus state for people who stopped sharing or left.
  useEffect(() => {
    if (!room) return;
    const gone = [...watching].filter((id) => !room.remoteParticipants.get(id)?.isScreenShareEnabled);
    if (gone.length) setWatching((w) => { const n = new Set(w); gone.forEach((id) => n.delete(id)); return n; });
    if (focusId && !room.remoteParticipants.get(focusId)?.isScreenShareEnabled) setFocusId(undefined);
  });

  function watch(id: string) {
    const n = new Set(watchRef.current).add(id);
    watchRef.current = n; setWatching(n);
    applyAll();
    setFocusId(id);
  }
  function stopWatch(id: string) {
    const n = new Set(watchRef.current); n.delete(id);
    watchRef.current = n; setWatching(n);
    applyAll();
    if (focusId === id) { if (document.fullscreenElement) void document.exitFullscreen(); setFocusId(undefined); }
  }

  // Switch the microphone treatment: capture constraints + (for the neural modes) a processor in the audio path.
  async function applyNoise(mode: NoiseMode) {
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack as LocalAudioTrack | undefined;
    if (!track) return;
    try {
      await track.stopProcessor();
      await track.restartTrack(captureOptions(mode));
      if (isNeural(mode)) await track.setProcessor(new NoiseProcessor(mode as "rnnoise" | "gtcrn"));
    } catch (e: any) {
      await track.stopProcessor().catch(() => {});
      await track.restartTrack(captureOptions("browser")).catch(() => {});      // plan B: the system suppressor
      setErr("Não consegui ligar a supressão de ruído avançada; usando a padrão.");
    }
  }
  const pickNoise = (m: NoiseMode) => { if (isNeural(m)) lastNeural.current = m; setNoise(m); saveNoiseMode(m); void applyNoise(m); };
  const toggleNoise = () => pickNoise(noise === "off" ? lastNeural.current : "off");

  async function loadDevices() {
    const r = roomRef.current; if (!r) return;
    try {
      const [ins, outs] = await Promise.all([Room.getLocalDevices("audioinput"), Room.getLocalDevices("audiooutput")]);
      setDevices({ ins, outs, inId: r.getActiveDevice("audioinput"), outId: r.getActiveDevice("audiooutput") });
    } catch { /* devices unavailable: the menu just hides the lists */ }
  }
  async function pickDevice(kind: "audioinput" | "audiooutput", id: string) {
    try { await roomRef.current?.switchActiveDevice(kind, id); setErr(""); } catch (e: any) { setErr(`Não consegui trocar o dispositivo: ${e.message ?? e}`); }
    void loadDevices();
  }
  useEffect(() => {
    if (!audioMenu) return;
    void loadDevices();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAudioMenu(false); };
    const away = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-audio-menu]")) setAudioMenu(false); };
    window.addEventListener("keydown", esc); document.addEventListener("mousedown", away);
    return () => { window.removeEventListener("keydown", esc); document.removeEventListener("mousedown", away); };
  }, [audioMenu]);

  async function toggleDeafen() {
    if (!room) return;
    const next = !deafRef.current;
    deafRef.current = next; setDeafened(next);
    applyVolumes();
    const l = room.localParticipant;
    if (next) { micBeforeDeaf.current = l.isMicrophoneEnabled; await l.setMicrophoneEnabled(false); sounds.mute(); }
    else if (!meMuted) { await l.setMicrophoneEnabled(micBeforeDeaf.current); sounds.unmute(); }
    tick((n) => n + 1);
  }

  const toggle = async (what: "mic" | "cam" | "screen") => {
    if (!lp) return;
    try {
      if (what === "mic") {
        if (meMuted) { setErr("O dono do servidor silenciou o seu microfone."); sounds.error(); return; }
        if (deafRef.current) { micBeforeDeaf.current = true; await toggleDeafen(); return; }
        const on = !lp.isMicrophoneEnabled; await lp.setMicrophoneEnabled(on); on ? sounds.unmute() : sounds.mute();
      }
      if (what === "cam") await lp.setCameraEnabled(!lp.isCameraEnabled);
      if (what === "screen") {
        if (!lp.isScreenShareEnabled && window.cohle) { setPicking(true); return; } // desktop: ask what to share first
        const on = !lp.isScreenShareEnabled; await lp.setScreenShareEnabled(on); onSharing(on); on ? sounds.screenOn() : sounds.screenOff();
      }
      setErr("");
    } catch (e: any) { setErr(e.message); sounds.error(); }
    tick((n) => n + 1);
  };

  async function startShare(id: string, audio: boolean, quality: Quality) {
    setPicking(false);
    const q = QUALITY_PRESETS[quality];
    try {
      await window.cohle!.selectSource(id, audio);
      await lp?.setScreenShareEnabled(
        true,
        { audio, resolution: { width: q.width, height: q.height, frameRate: q.fps }, contentHint: "motion" },
        { screenShareEncoding: { maxBitrate: q.bitrate, maxFramerate: q.fps } },
      );
      onSharing(true); sounds.screenOn(); setErr("");
    } catch (e: any) { setErr(e.message); sounds.error(); }
    tick((n) => n + 1);
  }

  const moderation = (p: Participant): Moderation | undefined => {
    if (!isOwner || p.isLocal) return undefined;
    const run = (fn: () => Promise<unknown>) => fn().catch((e: any) => { setErr(e.message); sounds.error(); });
    const muted = mutedByOwner(p.identity);
    return {
      muted,
      toggleMute: () => run(() => api.muteMember(serverId, p.identity, !muted)),
      disconnect: () => run(() => api.disconnectMember(serverId, p.identity)),
      kick: () => run(() => api.kick(serverId, p.identity)),
      ban: () => run(() => api.ban(serverId, p.identity)),
    };
  };

  const btn = (on: boolean) => `size-11 sm:size-12 rounded-2xl grid place-items-center transition ${on ? "bg-white/10 hover:bg-white/15" : "bg-accent/80"}`;
  const label = { connecting: "Conectando...", connected: "Conectado", error: "Falha na conexão" }[status];
  const dot = { connecting: "bg-amber-400 animate-pulse", connected: "bg-emerald-400", error: "bg-accent" }[status];

  const tile = (p: Participant, compact = false) => (
    <Tile key={p.identity} p={p} user={userOf(p)} speaking={speakers.includes(p.identity)} compact={compact}
      watching={watching.has(p.identity)} vol={vols[p.identity] ?? DEFAULT_VOL} onVol={(patch) => setVol(p.identity, patch)}
      mod={moderation(p)} serverMuted={mutedByOwner(p.identity)}
      preview={preview} onTogglePreview={togglePreview}
      onWatch={() => watch(p.identity)} onOpen={() => setFocusId(p.identity)} />
  );

  const focused = focusId ? parts.find((p) => p.identity === focusId) : undefined;
  const sideStrip = area.w >= 760 && area.w / Math.max(area.h, 1) > 1.7;   // wide & short area: strip on the right; otherwise below
  const others = parts.filter((p) => p.identity !== focusId);
  const fit = fitTiles(parts.length, area.w, area.h, GAP);  // grid mode: biggest 16:9 tiles that fit

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <div ref={audioHost} className="hidden" aria-hidden />
      <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-line flex items-center gap-2 sm:gap-3 min-w-0">
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="shrink-0 -ml-1 p-2 rounded-xl hover:bg-white/10"><Menu size={20} /></button>}
        <Volume2 size={18} className="text-muted shrink-0 hidden sm:block" />
        <span className="font-semibold truncate">{channel.name}</span>
        {onToggleChat && (
          <button onClick={onToggleChat} title={chatOpen ? "Fechar o chat" : "Abrir o chat"} className={`relative ml-auto shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition ${chatOpen ? "bg-accent/20 text-ink" : "bg-white/5 text-muted hover:text-ink hover:bg-white/10"}`}>
            <MessageSquare size={15} /> <span className="hidden sm:inline">Chat</span>
            {!!unread && !chatOpen && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold grid place-items-center">{unread > 9 ? "9+" : unread}</span>}
          </button>
        )}
        <span className={`${onToggleChat ? "" : "ml-auto "}flex items-center gap-2 text-xs text-muted shrink-0`}>
          <span className={`size-2 rounded-full ${dot}`} /> <span className="hidden xs:inline sm:inline">{label}</span>
          {status === "connected" && <span>· {parts.length}<span className="hidden sm:inline"> na sala</span></span>}
        </span>
      </header>

      <div className="flex-1 flex min-h-0 min-w-0 relative">
      <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 sm:gap-3 min-h-0 min-w-0">
        {err && <p className="text-accent text-sm bg-accent/10 rounded-xl px-4 py-2">{err}</p>}
        {meMuted && <p className="text-sm bg-accent/10 border border-accent/30 rounded-xl px-4 py-2 flex items-center gap-2"><Lock size={14} /> O dono do servidor silenciou o seu microfone.</p>}

        <div ref={areaRef} className="flex-1 min-h-0 min-w-0 flex">
          {focused ? (
            <div className={`flex-1 min-h-0 min-w-0 flex gap-2 sm:gap-3 ${sideStrip ? "flex-row" : "flex-col"}`}>
              <Stage p={focused} user={userOf(focused)} vol={vols[focused.identity] ?? DEFAULT_VOL} onVol={(patch) => setVol(focused.identity, patch)}
                speaking={speakers.includes(focused.identity)} stageRef={stageRef} onStop={() => stopWatch(focused.identity)} />
              {others.length > 0 && (
                <div className={sideStrip ? "w-44 shrink-0 flex flex-col gap-2 overflow-y-auto no-scrollbar p-1" : "h-[6.5rem] sm:h-[7.5rem] shrink-0 flex gap-2 overflow-x-auto no-scrollbar p-1"}>
                  {others.map((p) => <div key={p.identity} className={sideStrip ? "w-full aspect-video shrink-0" : "h-full aspect-video shrink-0"}>{tile(p, true)}</div>)}
                </div>
              )}
            </div>
          ) : (
            <div className={`flex-1 min-h-0 min-w-0 ${fit.scroll ? "overflow-y-auto" : ""}`}>
              <div className={`flex flex-wrap justify-center gap-3 ${fit.scroll ? "" : "h-full content-center"}`}>
                {parts.map((p) => <div key={p.identity} style={{ width: fit.w, height: fit.h }} className="shrink-0">{tile(p)}</div>)}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 shrink-0">
          <div className="relative flex" data-audio-menu>
            <button className={`${btn(!!lp?.isMicrophoneEnabled)} rounded-r-md`} onClick={() => toggle("mic")} title={meMuted ? "Silenciado pelo dono" : "Microfone"}>
              {meMuted ? <Lock size={20} /> : lp?.isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}</button>
            <button className={`h-11 sm:h-12 w-7 rounded-2xl rounded-l-md grid place-items-center transition ${audioMenu ? "bg-accent/30" : "bg-white/10 hover:bg-white/15"}`} onClick={() => setAudioMenu((v) => !v)} title="Configurações de áudio" aria-label="Configurações de áudio" aria-expanded={audioMenu}>
              <ChevronUp size={15} className={`transition ${audioMenu ? "" : "rotate-180"}`} /></button>
            {audioMenu && (
              <div className="absolute bottom-full mb-3 left-0 w-[22rem] max-w-[92vw] z-40 rounded-2xl bg-surface border border-line shadow-2xl p-3 space-y-3 max-h-[min(70vh,520px)] overflow-y-auto text-left">
                <label className="block space-y-1"><span className="text-[11px] uppercase tracking-widest text-muted">Microfone</span>
                  <select value={devices.inId ?? "default"} onChange={(e) => pickDevice("audioinput", e.target.value)} className="w-full rounded-xl bg-white/5 border border-line px-3 py-2 text-sm outline-none focus:border-accent">
                    {devices.ins.length === 0 && <option value="default">Padrão do sistema</option>}
                    {devices.ins.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microfone"}</option>)}
                  </select></label>
                {devices.outs.length > 0 && (
                  <label className="block space-y-1"><span className="text-[11px] uppercase tracking-widest text-muted">Alto-falante</span>
                    <select value={devices.outId ?? "default"} onChange={(e) => pickDevice("audiooutput", e.target.value)} className="w-full rounded-xl bg-white/5 border border-line px-3 py-2 text-sm outline-none focus:border-accent">
                      {devices.outs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Alto-falante"}</option>)}
                    </select></label>
                )}
                <div className="space-y-1 pt-1 border-t border-line">
                  <p className="text-[11px] uppercase tracking-widest text-muted pt-2">Supressão de ruído</p>
                  {NOISE_MODES.map((m) => (
                    <button key={m.id} onClick={() => pickNoise(m.id)} className={`w-full text-left rounded-xl px-3 py-2 transition ${noise === m.id ? "bg-accent/15" : "hover:bg-white/5"}`}>
                      <span className="flex items-center gap-2 text-sm font-medium">{m.label}{noise === m.id && <Check size={14} className="text-accent2 ml-auto" />}</span>
                      <span className="block text-xs text-muted mt-0.5">{m.hint}</span>
                    </button>
                  ))}
                  <p className="text-[11px] text-muted pt-1">Cancelamento de eco e ganho automático ficam sempre ligados.</p>
                </div>
              </div>
            )}
          </div>
          <button title={noise === "off" ? "Ligar a supressão de ruído" : "Desligar a supressão de ruído"} aria-pressed={noise !== "off"} className={`${btn(true)} ${noise !== "off" ? "text-accent2 ring-1 ring-accent2/50" : ""}`} onClick={toggleNoise}><AudioLines size={20} /></button>
          <button title={deafened ? "Desativar ensurdecer" : "Ensurdecer"} className={btn(!deafened)} onClick={toggleDeafen}>{deafened ? <HeadphoneOff size={20} /> : <Headphones size={20} />}</button>
          <button title="Câmera" className={btn(!!lp?.isCameraEnabled)} onClick={() => toggle("cam")}>{lp?.isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}</button>
          <button title="Compartilhar tela" className={`size-11 sm:size-12 rounded-2xl grid place-items-center ${lp?.isScreenShareEnabled ? "grad text-white" : "bg-white/10"}`} onClick={() => toggle("screen")}><MonitorUp size={20} /></button>
          <button title="Sair da chamada" className="size-11 sm:size-12 rounded-2xl grid place-items-center bg-red-600" onClick={onLeave}><PhoneOff size={20} /></button>
        </div>
      </div>
      {chat && <aside className="max-sm:absolute max-sm:inset-0 max-sm:z-30 sm:w-80 lg:w-96 shrink-0 flex flex-col min-h-0 bg-bg sm:border-l border-line">{chat}</aside>}
      </div>
      {picking && <ScreenPicker onCancel={() => setPicking(false)} onConfirm={startShare} />}
    </div>
  );
}
