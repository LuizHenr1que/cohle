import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

/** Drop files anywhere on the chat to attach them. */
export function DropZone({ onFiles, children, className = "" }: { onFiles: (files: File[]) => void; children: React.ReactNode; className?: string }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: React.DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
  return (
    <div className={`relative min-h-0 ${className}`}
      onDragEnter={(e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true); }}
      onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
      onDragLeave={(e) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current = 0; setOver(false); onFiles([...e.dataTransfer.files]); }}>
      {children}
      {over && <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-3xl border-2 border-dashed border-accent bg-bg/85 text-center"><div><UploadCloud size={34} className="mx-auto text-accent" /><p className="mt-2 font-semibold">Solte para anexar</p><p className="text-xs text-muted">Imagens e arquivos de até 10 MB</p></div></div>}
    </div>
  );
}
