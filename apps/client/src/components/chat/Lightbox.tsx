import { useEffect } from "react";
import { Download, X } from "lucide-react";
import type { AttachmentDTO } from "@cohle/shared";
import { fileHref, humanSize } from "../../lib/chat";

/** Full-size view of an image. Esc, a click outside, or the close button leave it. */
export function Lightbox({ att, onClose }: { att: AttachmentDTO; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  return (
    <div role="dialog" aria-label={`Imagem: ${att.name}`} className="fixed inset-0 z-[80] bg-black/85 grid place-items-center p-3 sm:p-8" onMouseDown={onClose}>
      <div className="absolute top-3 right-3 flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
        <a href={fileHref(att)} download={att.name} aria-label="Baixar imagem" title="Baixar" className="size-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><Download size={18} /></a>
        <button onClick={onClose} aria-label="Fechar" className="size-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><X size={18} /></button>
      </div>
      <img src={fileHref(att)} alt={att.name} decoding="async" onMouseDown={(e) => e.stopPropagation()} className="max-w-full max-h-[86dvh] rounded-xl object-contain shadow-[0_20px_80px_rgba(0,0,0,0.7)]" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70 rounded-full bg-black/50 px-3 py-1 max-w-[90vw] truncate">{att.name} · {humanSize(att.size)}{att.width ? ` · ${att.width}×${att.height}` : ""}</div>
    </div>
  );
}
