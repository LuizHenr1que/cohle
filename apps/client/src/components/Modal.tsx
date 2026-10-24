import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ title, subtitle, onClose, wide, children }: {
  title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 sm:p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className={`glass bg-surface w-full ${wide ? "max-w-2xl" : "max-w-sm"} max-h-[90dvh] rounded-3xl p-4 sm:p-6 flex flex-col gap-4 min-h-0`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputCls = "w-full rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent focus:bg-white/[0.07] transition placeholder:text-muted";
export const primaryCls = "grad rounded-xl px-5 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-50 transition";
export const ghostCls = "rounded-xl px-5 py-3 bg-white/5 hover:bg-white/10 text-sm transition";
