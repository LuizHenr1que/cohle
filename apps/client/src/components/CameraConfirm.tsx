import { useCallback, useEffect, useRef, useState } from "react";
import { Video, VideoOff, RefreshCw } from "lucide-react";
import { Modal, primaryCls } from "./Modal";
import { friendlyMediaError } from "../lib/mediaErrors";

const KEY = "cohle:cam";
const saved = () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } };

/** Asked before the webcam goes live: shows a private preview first, so nobody sees you until you confirm. */
export function CameraConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (deviceId?: string) => Promise<void> }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [msg, setMsg] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState(saved());
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const ok = useRef<HTMLButtonElement>(null);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; if (video.current) video.current.srcObject = null; };
  const start = useCallback(async (id: string) => {
    stop(); setState("loading"); setMsg("");
    try {
      let s: MediaStream;
      try { s = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true }); }
      catch (e: any) { if (id && /Overconstrained|NotFound/i.test(e?.name ?? "")) s = await navigator.mediaDevices.getUserMedia({ video: true }); else throw e; }   // the saved camera is gone: use the default one
      stream.current = s;
      if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}); }
      const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");   // labels only exist after permission
      setDevices(list);
      const cur = s.getVideoTracks()[0]?.getSettings().deviceId; if (cur) setDeviceId(cur);
      setState("ready");
    } catch (e) { setMsg(friendlyMediaError(e, "camera")); setState("error"); }
  }, []);

  useEffect(() => { void start(deviceId); return stop; }, []);                   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state === "ready") ok.current?.focus(); }, [state]);

  async function confirm() {
    setBusy(true);
    try { try { localStorage.setItem(KEY, deviceId); } catch { /* private mode */ } stop(); await onConfirm(deviceId || undefined); }
    catch (e) { setMsg(friendlyMediaError(e, "camera")); setState("error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Ligar a câmera?" subtitle="Veja como você aparece antes de entrar no ar." onClose={onCancel}>
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-line">
        <video ref={video} muted playsInline autoPlay className={`w-full h-full object-cover -scale-x-100 ${state === "ready" ? "" : "invisible"}`} />
        {state === "loading" && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Abrindo a câmera...</div>}
        {state === "error" && (
          <div className="absolute inset-0 grid place-items-center p-5 text-center">
            <div>
              <VideoOff size={30} className="mx-auto mb-2 text-accent" />
              <p className="text-sm text-ink/90">{msg}</p>
            </div>
          </div>
        )}
        {state === "ready" && <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 rounded-full px-2 py-1 flex items-center gap-1"><Video size={11} /> PRÉVIA · só você está vendo</span>}
      </div>
      {devices.length > 1 && state === "ready" && (
        <select value={deviceId} onChange={(e) => { setDeviceId(e.target.value); void start(e.target.value); }}
          className="w-full rounded-xl bg-white/5 border border-line px-3 py-2.5 text-sm outline-none focus:border-accent">
          {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId} className="bg-surface">{d.label || `Câmera ${i + 1}`}</option>)}
        </select>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl px-5 py-3 text-muted hover:text-ink hover:bg-white/5 transition">Cancelar</button>
        {state === "error"
          ? <button onClick={() => start(deviceId)} className="rounded-xl px-5 py-3 font-semibold bg-white/10 hover:bg-white/15 flex items-center gap-2 transition"><RefreshCw size={16} /> Tentar novamente</button>
          : <button ref={ok} disabled={state !== "ready" || busy} onClick={confirm} className={primaryCls}>{busy ? "Ligando..." : "Ligar câmera"}</button>}
      </div>
    </Modal>
  );
}
