import { useEffect, useRef, useState } from "react";
import { CornerUpLeft, Download, FileArchive, FileText, Film, Music, SmilePlus, Trash2 } from "lucide-react";
import { nameOf, type AttachmentDTO, type ReactionDTO, type ReactionKey, type ReplyDTO, type UserDTO } from "@cohle/shared";
import { Avatar } from "../Avatar";
import { DevBadge } from "../Badge";
import { fileHref, humanSize, thumbHref } from "../../lib/chat";
import { ReactionChips, ReactionPicker } from "./Reactions";

export interface ChatItem { id: string; author: UserDTO; content: string; createdAt: string; replyTo?: ReplyDTO; attachments: AttachmentDTO[]; reactions: ReactionDTO[]; }

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fileIcon = (a: AttachmentDTO) => (a.mime.startsWith("audio/") ? Music : a.mime.startsWith("video/") ? Film : /zip|rar|7z|gzip|tar/.test(a.mime) ? FileArchive : FileText);

function Image({ a, onOpen }: { a: AttachmentDTO; onOpen: (a: AttachmentDTO) => void }) {
  const w = a.width ?? 320, h = a.height ?? 240, k = Math.min(1, 320 / w, 260 / h);
  return (
    <button type="button" onClick={() => onOpen(a)} aria-label={`Abrir imagem ${a.name}`} className="block overflow-hidden rounded-xl border border-line bg-white/[0.04] hover:border-accent/50 transition" style={{ width: Math.round(w * k), maxWidth: "100%" }}>
      {/* width/height are known up front, so nothing jumps while the picture loads; the thumbnail is small and lazy */}
      <img src={thumbHref(a)} alt={a.name} width={Math.round(w * k)} height={Math.round(h * k)} loading="lazy" decoding="async" className="block h-auto w-full" />
    </button>
  );
}

function FileChip({ a }: { a: AttachmentDTO }) {
  const I = fileIcon(a);
  return (
    <a href={fileHref(a)} download={a.name} className="flex max-w-sm items-center gap-3 rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 hover:border-accent/50 hover:bg-white/[0.07] transition" title={`Baixar ${a.name}`}>
      <span className="size-9 shrink-0 rounded-lg bg-accent/15 text-accent grid place-items-center"><I size={18} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.name}</span><span className="block text-[11px] text-muted">{humanSize(a.size)}</span></span>
      <Download size={16} className="shrink-0 text-muted" />
    </a>
  );
}

/** One message of a channel or a conversation. Same markup for both, on web and desktop. */
export function MessageItem({ item, selfId, head, canDelete, onProfile, onReply, onReact, onDelete, onOpenImage, onJump }: {
  item: ChatItem; selfId: string; head: boolean; canDelete: boolean;
  onProfile: (id: string) => void; onReply: (m: ChatItem) => void; onReact: (m: ChatItem, key: ReactionKey) => void; onDelete: (m: ChatItem) => void; onOpenImage: (a: AttachmentDTO) => void; onJump: (id: string) => void;
}) {
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!picker && !confirm) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setPicker(false); setConfirm(false); } };
    document.addEventListener("mousedown", away); return () => document.removeEventListener("mousedown", away);
  }, [picker, confirm]);
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 3500); return () => clearTimeout(t); }, [confirm]);

  const images = item.attachments.filter((a) => a.kind === "image"), files = item.attachments.filter((a) => a.kind !== "image");
  const r = item.replyTo;
  const tool = "size-8 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-white/10 transition";
  return (
    <div ref={box} id={`msg-${item.id}`} data-mid={item.id} className={`group relative flex gap-3 rounded-xl px-2 -mx-2 py-0.5 hover:bg-white/[0.03] transition-colors ${head ? "mt-3" : ""}`}>
      <div className="w-[38px] shrink-0">
        {head ? <button onClick={() => onProfile(item.author.id)} title="Ver perfil" className="block"><Avatar user={item.author} size={38} /></button>
          : <span className="block pt-1 text-center text-[10px] text-muted opacity-0 group-hover:opacity-100 tabular-nums">{clock(item.createdAt)}</span>}
      </div>
      <div className="min-w-0 flex-1">
        {head && (
          <div className="text-sm"><button onClick={() => onProfile(item.author.id)} className="font-bold hover:underline">{nameOf(item.author)}</button> <DevBadge user={item.author} /> <span className="text-muted text-xs ml-1">{clock(item.createdAt)}</span></div>
        )}
        {r && (
          <button type="button" onClick={() => r.id && onJump(r.id)} disabled={!r.id} title={r.id ? "Ir para a mensagem" : "A mensagem original foi apagada"}
            className="mb-1 flex max-w-full items-center gap-2 rounded-lg border-l-2 border-accent/60 bg-white/[0.04] px-2.5 py-1 text-left text-xs enabled:hover:bg-white/[0.08] transition">
            <CornerUpLeft size={12} className="shrink-0 text-accent" />
            <span className="font-semibold shrink-0">{r.authorName}</span>
            <span className="truncate text-muted">{r.text || "Mensagem"}</span>
            {!r.id && <span className="shrink-0 text-[10px] text-muted/70">(apagada)</span>}
          </button>
        )}
        {item.content && <p className="text-ink/90 whitespace-pre-wrap break-words selectable">{item.content}</p>}
        {images.length > 0 && <div className="mt-1.5 flex flex-wrap gap-2">{images.map((a) => <Image key={a.id} a={a} onOpen={onOpenImage} />)}</div>}
        {files.length > 0 && <div className="mt-1.5 flex flex-col gap-1.5">{files.map((a) => <FileChip key={a.id} a={a} />)}</div>}
        <ReactionChips reactions={item.reactions} selfId={selfId} onToggle={(k) => onReact(item, k)} />
      </div>
      {/* hover toolbar; always there on touch screens (no hover) */}
      <div className="absolute -top-3.5 right-2 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.4)] opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
        <button className={tool} onClick={() => setPicker((v) => !v)} aria-label="Reagir" title="Reagir" aria-expanded={picker}><SmilePlus size={16} /></button>
        <button className={tool} onClick={() => onReply(item)} aria-label="Responder" title="Responder"><CornerUpLeft size={16} /></button>
        {canDelete && (confirm
          ? <button className="h-8 rounded-lg px-2 text-xs font-semibold bg-red-600 text-white" onClick={() => { setConfirm(false); onDelete(item); }}>Apagar?</button>
          : <button className={`${tool} hover:!text-red-300`} onClick={() => setConfirm(true)} aria-label="Apagar mensagem" title="Apagar"><Trash2 size={16} /></button>)}
        {picker && <div className="absolute right-0 bottom-full mb-1.5"><ReactionPicker onPick={(k) => { setPicker(false); onReact(item, k); }} /></div>}
      </div>
    </div>
  );
}
