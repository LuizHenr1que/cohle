import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AlertCircle, CornerUpLeft, FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { MAX_FILES, MESSAGE_MAX, MESSAGE_MAX_LINES, type AttachmentDTO } from "@cohle/shared";
import { api, uploadFile } from "../../api";
import { humanSize, precheck, prepareImage } from "../../lib/chat";

type Up = { key: string; name: string; size: number; preview?: string; pct: number; status: "up" | "ok" | "err"; att?: AttachmentDTO; err?: string; cancel?: () => void };
export interface ComposerHandle { addFiles: (files: File[]) => void; focus: () => void; }
export interface SendPayload { content: string; replyToId?: string; attachmentIds: string[]; }

/** The message box of a channel or a conversation: text (500 characters, 12 lines), files and images (drag, paste or the clip), and the reply bar.
 *  `onSend` resolves with an error message, or null when it went through. */
export const Composer = forwardRef<ComposerHandle, {
  placeholder: string; reply?: { id: string; authorName: string; text: string }; onCancelReply: () => void;
  onSend: (p: SendPayload) => Promise<string | null>; onTyping?: () => void; disabled?: boolean;
}>(function Composer({ placeholder, reply, onCancelReply, onSend, onTyping, disabled }, ref) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Up[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const live = useRef<Up[]>([]); live.current = files;
  const setOne = (key: string, p: Partial<Up>) => setFiles((l) => l.map((f) => (f.key === key ? { ...f, ...p } : f)));

  async function addFiles(list: File[]) {
    setErr("");
    for (const f of list) {
      const n = live.current.filter((x) => x.status !== "err").length;
      const bad = precheck(f, n); if (bad) { setErr(bad); continue; }
      const key = Math.random().toString(36).slice(2);
      const preview = f.type.startsWith("image/") && !/gif/.test(f.type) ? URL.createObjectURL(f) : undefined;
      live.current = [...live.current, { key, name: f.name, size: f.size, preview, pct: 0, status: "up" }];
      setFiles(live.current);
      try {
        const { blob, name } = await prepareImage(f);
        const up = uploadFile(blob, name, (pct) => setOne(key, { pct }));
        setOne(key, { cancel: up.cancel });
        const att = await up.promise;
        setOne(key, { status: "ok", pct: 100, att, name: att.name });
      } catch (e: any) { if (!e?.aborted) setOne(key, { status: "err", err: e?.message ?? "Falhou." }); }
    }
  }
  const remove = (key: string) => {
    const f = live.current.find((x) => x.key === key);
    f?.cancel?.(); if (f?.preview) URL.revokeObjectURL(f.preview);
    if (f?.att) api.deleteUpload(f.att.id).catch(() => {});            // do not leave it waiting on the server
    live.current = live.current.filter((x) => x.key !== key); setFiles(live.current);
  };
  useImperativeHandle(ref, () => ({ addFiles: (l) => void addFiles(l), focus: () => area.current?.focus() }));
  useEffect(() => () => live.current.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)), []);
  useEffect(() => { if (reply) area.current?.focus(); }, [reply?.id]);

  const ready = files.filter((f) => f.status === "ok" && f.att), uploading = files.some((f) => f.status === "up");
  const empty = !text.trim() && ready.length === 0;
  async function send() {
    if (busy || uploading || empty || disabled) return;
    setBusy(true); setErr("");
    const sentText = text, sent = new Set(ready.map((f) => f.key));
    const e = await onSend({ content: sentText, ...(reply ? { replyToId: reply.id } : {}), attachmentIds: ready.map((f) => f.att!.id) }).catch(() => "Não foi possível enviar. Tente de novo.");
    setBusy(false);
    if (e) return setErr(e);
    ready.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setText((t) => (t === sentText ? "" : t));                       // clear only what was sent: what the person typed or attached while the send was in flight stays
    setFiles((l) => l.filter((f) => !sent.has(f.key))); onCancelReply();
    if (area.current && area.current.value === sentText) area.current.style.height = "auto";
    area.current?.focus();
  }
  const near = text.length >= MESSAGE_MAX * 0.8;

  return (
    <div className="shrink-0 p-2 sm:p-4 border-t border-line">
      {reply && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-accent bg-white/[0.05] px-3 py-1.5 text-xs">
          <CornerUpLeft size={13} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate">Respondendo a <b>{reply.authorName}</b><span className="text-muted">: {reply.text}</span></span>
          <button type="button" onClick={onCancelReply} aria-label="Cancelar resposta" className="shrink-0 p-1 rounded-full hover:bg-white/10 text-muted hover:text-ink"><X size={14} /></button>
        </div>
      )}
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Arquivos para enviar">
          {files.map((f) => (
            <li key={f.key} className={`relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 max-w-[15rem] ${f.status === "err" ? "border-red-500/40 bg-red-500/10" : "border-line bg-white/[0.04]"}`}>
              {f.preview ? <img src={f.preview} alt="" className="size-10 rounded-lg object-cover shrink-0" /> : <span className="size-10 shrink-0 rounded-lg bg-accent/15 text-accent grid place-items-center"><FileText size={18} /></span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{f.name}</span>
                <span className={`block truncate text-[11px] ${f.status === "err" ? "text-red-300" : "text-muted"}`}>{f.status === "err" ? f.err : f.status === "up" ? `Enviando… ${f.pct}%` : humanSize(f.att?.size ?? f.size)}</span>
                {f.status === "up" && <span className="mt-1 block h-1 rounded-full bg-white/10 overflow-hidden"><span className="block h-full grad transition-[width]" style={{ width: `${f.pct}%` }} /></span>}
              </span>
              <button type="button" onClick={() => remove(f.key)} aria-label={`Remover ${f.name}`} className="shrink-0 p-1 rounded-full hover:bg-white/10 text-muted hover:text-ink"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {err && <p role="alert" className="mb-2 flex items-start gap-1.5 text-xs text-accent"><AlertCircle size={13} className="mt-0.5 shrink-0" />{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2 items-end">
        <input ref={pick} type="file" multiple hidden onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
        <button type="button" onClick={() => pick.current?.click()} disabled={disabled || files.length >= MAX_FILES} aria-label="Anexar arquivo ou imagem" title="Anexar (ou arraste e cole imagens)" className="shrink-0 size-12 rounded-2xl grid place-items-center bg-white/5 hover:bg-white/10 text-muted hover:text-ink disabled:opacity-40 transition"><Paperclip size={18} /></button>
        <div className="relative flex-1 min-w-0">
          <textarea ref={area} value={text} rows={1} maxLength={MESSAGE_MAX} placeholder={placeholder} aria-label="Mensagem" disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              if (v.split("\n").length > MESSAGE_MAX_LINES) return;                           // no walls of lines either
              setText(v); setErr(""); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; onTyping?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
              if (e.key === "Escape" && reply) onCancelReply();
            }}
            onPaste={(e) => {
              const imgs = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
              if (!imgs.length) return;
              e.preventDefault();
              void addFiles(imgs.map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `captura-${Date.now().toString(36)}${i ? "-" + i : ""}.${f.type.split("/")[1] || "png"}`, { type: f.type }))));
            }}
            className="w-full resize-none rounded-2xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent max-h-36 transition" />
          {near && <span aria-live="polite" className={`pointer-events-none absolute right-3 bottom-1 text-[10px] tabular-nums ${text.length >= MESSAGE_MAX ? "text-accent font-semibold" : "text-muted"}`}>{text.length}/{MESSAGE_MAX}</span>}
        </div>
        <button disabled={empty || uploading || busy || disabled} aria-label="Enviar" className="shrink-0 grad rounded-2xl size-12 grid place-items-center text-white disabled:opacity-40 transition">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
      </form>
    </div>
  );
});
