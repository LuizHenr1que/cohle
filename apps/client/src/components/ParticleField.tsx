import { useEffect, useRef } from "react";

type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number };

// Floating dots joined by faint lines when close — a "neural network" backdrop.
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0, dots: P[] = [];
    const LINK = 130;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(60, Math.max(24, (w * h) / 32000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: 0.08 + Math.random() * 0.3, // gentle downward drift
        r: 0.8 + Math.random() * 1.8, hue: Math.random(),
      }));
    };

    // Draw at ~30fps, and not at all while the window is hidden or unfocused (e.g. you're in a game).
    let last = 0;
    const active = () => !document.hidden && document.hasFocus();
    const frame = (now = performance.now()) => {
      raf = requestAnimationFrame(frame);
      if (!active() || now - last < 33) return;
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.y > h + 10) { d.y = -10; d.x = Math.random() * w; }
        if (d.x < -10) d.x = w + 10; else if (d.x > w + 10) d.x = -10;
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, dist = dx * dx + dy * dy;
          if (dist < LINK * LINK) {
            ctx.strokeStyle = `rgba(255, 90, 110, ${(1 - Math.sqrt(dist) / LINK) * 0.22})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        ctx.fillStyle = d.hue > 0.7 ? "rgba(255, 138, 91, 0.75)" : "rgba(255, 110, 130, 0.7)";
        ctx.shadowColor = "rgba(255, 59, 92, 0.8)"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    resize(); raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
}
