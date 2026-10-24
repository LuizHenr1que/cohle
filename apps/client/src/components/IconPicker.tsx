import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { fileToSquareDataUrl } from "../lib/image";
import { ServerIcon } from "./ServerIcon";

export function IconPicker({ name, value, onChange }: { name: string; value: string | null; onChange: (v: string | null) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try { onChange(await fileToSquareDataUrl(f)); setErr(""); } catch (x: any) { setErr(x.message); }
  }
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => file.current?.click()} className="relative group">
        <ServerIcon server={{ name: name || "?", iconUrl: value }} size={76} />
        <span className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 transition grid place-items-center"><Camera size={20} /></span>
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
      <div className="text-xs space-y-1">
        <button type="button" onClick={() => file.current?.click()} className="text-accent2 hover:underline block">Escolher imagem</button>
        {value && <button type="button" onClick={() => onChange(null)} className="text-muted hover:text-ink inline-flex items-center gap-1"><Trash2 size={12} /> Remover</button>}
        {err && <p className="text-accent">{err}</p>}
      </div>
    </div>
  );
}
