import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, ScreenShare, Volume2, MicOff, HeadphoneOff, MessageCircle } from "lucide-react";
import type { UserDTO } from "@cohle/shared";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import type { VoiceApi } from "./VoiceRoom";
import { PersonPanel, panelAt, saveVol, loadVols, DEFAULT_VOL, type Moderation, type PanelPos, type Vol } from "./PersonPanel";

/** A person in a voice channel on the sidebar: hover shows a quick card (with a tiny live preview when they are sharing), click goes to their live. */
export function PersonRow({ user, isSelf, isOwner, channelName, inCall, speaking, getApi, onClick, onMessage, onProfile, mod }: {
  user: UserDTO; isSelf: boolean; isOwner: boolean; channelName: string; inCall: boolean; speaking: boolean;
  getApi: () => VoiceApi | null; onClick: () => void; onMessage?: () => void; onProfile?: () => void; mod?: Moderation;
}) {
  const [ctx, setCtx] = useState<PanelPos>();
  const [vol, setVolState] = useState<Vol>(DEFAULT_VOL);
  const row = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect>();
  const timer = useRef<number>();
  const video = useRef<HTMLVideoElement>(null);
  const live = !!user.sharing;

  const show = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => row.current && setRect(row.current.getBoundingClientRect()), 250); };
  const hide = () => { window.clearTimeout(timer.current); setRect(undefined); };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // tiny live preview: only possible when we are in that very call (the stream is already coming to us)
  const canPreview = live && inCall && !isSelf;
  useEffect(() => {
    if (!rect || !canPreview || !video.current) return;
    return getApi()?.preview(user.id, video.current) ?? undefined;
  }, [rect, canPreview, user.id]);

  const W = 272;
  const left = rect ? Math.min(rect.right + 10, window.innerWidth - W - 8) : 0;
  const top = rect ? Math.max(8, Math.min(rect.top - 8, window.innerHeight - (live ? 280 : 150))) : 0;

  return (
    <div ref={row} onContextMenu={(e) => { if (isSelf) return; e.preventDefault(); hide(); setVolState(loadVols()[user.id] ?? DEFAULT_VOL); setCtx(panelAt(e.clientX, e.clientY)); }}
      onMouseEnter={show} onMouseLeave={hide} onClick={() => { hide(); onClick(); }}
      className="group flex items-center gap-2 pl-9 pr-2 py-1 text-xs text-muted rounded-lg cursor-pointer hover:bg-white/5 hover:text-ink">
      <Avatar user={user} size={20} speaking={speaking} />
      <span className="truncate">{isSelf ? `${user.username} (você)` : user.username}</span><DevBadge user={user} />
      {user.deaf ? <HeadphoneOff size={12} className="shrink-0 text-accent" aria-label="Áudio desativado" /> : (user.micOff || user.muted) && <MicOff size={12} className="shrink-0 text-accent" aria-label="Microfone desativado" />}
      {onMessage && !isSelf && <button onClick={(e) => { e.stopPropagation(); hide(); onMessage(); }} title="Enviar mensagem" aria-label="Enviar mensagem"
        className={`${live ? "" : "ml-auto"} shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-accent transition`}><MessageCircle size={13} /></button>}
      {live && (
        <span title="Compartilhando a tela" className="ml-auto flex items-center gap-1 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          <ScreenShare size={10} /> AO VIVO
        </span>
      )}
      {ctx && <PersonPanel name={user.username} vol={vol} sharing={live && inCall} mod={mod} pos={ctx} onClose={() => setCtx(undefined)}
        onVol={(patch) => { setVolState((v) => ({ ...v, ...patch })); if (inCall) getApi()?.setVol(user.id, patch); else saveVol(user.id, patch); }}
        onExpand={live || inCall ? onClick : undefined} expandLabel={live ? "Assistir ao vivo" : "Ir para a chamada"} onMessage={onMessage} onProfile={onProfile} />}
      {rect && createPortal(
        <div style={{ left, top, width: W }} className="fixed z-[80] pointer-events-none rounded-2xl border border-line bg-surface-2/95 shadow-2xl p-3 text-ink">
          <div className="flex items-center gap-3">
            <Avatar user={user} size={44} speaking={speaking} />
            <div className="min-w-0">
              <div className="font-semibold truncate flex items-center gap-1.5">
                {user.username}<DevBadge user={user} full />{isOwner && <Crown size={13} className="text-amber-400 shrink-0" />}
              </div>
              <div className="text-[11px] text-muted truncate">{isSelf ? "Você" : isOwner ? "Dono do servidor" : "Membro"}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted"><Volume2 size={12} /> Em <b className="text-ink truncate">{channelName}</b>
            {user.muted && <span className="ml-auto flex items-center gap-1 text-red-400"><MicOff size={12} /> silenciado</span>}</div>
          {live && (
            <div className="mt-2.5">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-line">
                {canPreview
                  ? <video ref={video} muted playsInline autoPlay className="w-full h-full object-contain" />
                  : <div className="w-full h-full grid place-items-center text-[11px] text-muted text-center px-3">{isSelf ? "Esta é a sua transmissão" : "Clique para entrar e assistir ao vivo"}</div>}
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"><ScreenShare size={10} /> AO VIVO</span>
              </div>
              {!isSelf && <div className="mt-1.5 text-[10px] text-muted">Clique para assistir</div>}
            </div>
          )}
        </div>, document.body)}
    </div>
  );
}
