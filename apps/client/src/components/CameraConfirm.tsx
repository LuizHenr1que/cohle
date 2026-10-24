import { useEffect, useRef } from "react";
import { Video } from "lucide-react";
import { Modal, primaryCls } from "./Modal";

/** Asked before the webcam turns on: nothing touches the camera until the person confirms. */
export function CameraConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => { ok.current?.focus(); }, []);
  return (
    <Modal title="Ligar a câmera?" subtitle="Todos na chamada vão ver o vídeo da sua webcam." onClose={onCancel}>
      <div className="rounded-2xl bg-white/5 border border-line p-4 flex items-center gap-3 text-sm text-muted">
        <span className="size-10 rounded-xl bg-accent/15 text-accent grid place-items-center shrink-0"><Video size={20} /></span>
        A câmera só é ativada depois que você confirmar. Você pode desligar a qualquer momento.
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl px-5 py-3 text-muted hover:text-ink hover:bg-white/5 transition">Cancelar</button>
        <button ref={ok} onClick={onConfirm} className={primaryCls}>Ligar câmera</button>
      </div>
    </Modal>
  );
}
