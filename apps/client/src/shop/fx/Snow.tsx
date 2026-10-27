// Falling snow on one small canvas (no library: a particle engine cost ~3 points of idle CPU and ~50 KB gz for the same picture).
// One path and one fill per frame, ~24 fps, half-resolution backing store, and the loop stops when the tab is hidden or the window has no focus.
import { useEffect, useId, useRef } from "react";

type Flake = { x: number; y: number; r: number; vy: number; sway: number; ph: number };
const FRAME_MS = 1000 / 24, SCALE = 0.5;

export default function Snow({ count }: { count: number }) {
  const id = "fx-snow-" + useId().replace(/:/g, "");
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current, ctx = c?.getContext("2d", { alpha: true }); if (!c || !ctx) return;
    let W = 0, H = 0, raf = 0, last = 0, flakes: Flake[] = [];
    const size = () => {
      W = Math.max(1, Math.round(innerWidth * SCALE)); H = Math.max(1, Math.round(innerHeight * SCALE)); c.width = W; c.height = H;
      flakes = Array.from({ length: count }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (1 + Math.random() * 2.2) * SCALE * 1.6, vy: (0.35 + Math.random() * 0.9) * SCALE * 2, sway: 0.2 + Math.random() * 0.6, ph: Math.random() * 6.28 }));
    };
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < FRAME_MS) return; last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (const f of flakes) {
        f.y += f.vy; f.x += Math.sin(t / 1800 + f.ph) * f.sway * SCALE;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, 6.2832);
      }
      ctx.fillStyle = "rgba(255,255,255,.78)"; ctx.fill();
    };
    const run = () => { cancelAnimationFrame(raf); if (!document.hidden && document.hasFocus()) raf = requestAnimationFrame(draw); };    // nothing runs in a hidden tab or an unfocused window
    const pause = () => cancelAnimationFrame(raf);
    size(); run();
    addEventListener("focus", run); addEventListener("blur", pause); addEventListener("resize", size); document.addEventListener("visibilitychange", run);
    return () => { pause(); removeEventListener("focus", run); removeEventListener("blur", pause); removeEventListener("resize", size); document.removeEventListener("visibilitychange", run); };
  }, [count]);
  return <div id={id} className="fixed inset-0 z-[4] pointer-events-none" aria-hidden="true"><canvas ref={cv} className="absolute inset-0 size-full" /></div>;
}
