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
    let ac = "255, 90, 110", ac2 = "255, 138, 91";                 // theme colors (as "r, g, b"), re-read when the theme changes
    const readTheme = () => { const cs = getComputedStyle(document.documentElement); const rgb = (v: string, d: string) => (cs.getPropertyValue(v).trim().replace(/\s+/g, ", ") || d); ac = rgb("--accent-rgb", ac); ac2 = rgb("--accent2-rgb", ac2); };
    readTheme(); window.addEventListener("cohle:theme", readTheme);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(34, Math.max(16, (w * h) / 60000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: 0.08 + Math.random() * 0.3, // gentle downward drift
        r: 0.8 + Math.random() * 1.8, hue: Math.random(),
      }));
    };

    // Draw at ~30fps, and not at all while the window is hidden or unfocused (e.g. you're in a game).
    let last = 0, cleared = false;
    const active = () => !document.hidden && document.hasFocus();
    const frame = (now = performance.now()) => {
      raf = requestAnimationFrame(frame);
      if (!active() || now - last < 50) return;               // 20 fps is plenty for slow drifting dots
      if (document.documentElement.classList.contains("in-call")) { if (!cleared) { ctx.clearRect(0, 0, w, h); cleared = true; } return; }   // never compete with a call
      cleared = false;
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
            ctx.strokeStyle = `rgba(${ac}, ${(1 - Math.sqrt(dist) / LINK) * 0.22})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        const warm = d.hue > 0.7;
        ctx.fillStyle = warm ? "rgba(255, 138, 91, 0.16)" : "rgb(var(--accent-rgb)/0.16)";
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 3, 0, Math.PI * 2); ctx.fill();               // cheap glow (no shadowBlur)
        ctx.fillStyle = warm ? `rgba(${ac2}, 0.75)` : `rgba(${ac}, 0.7)`;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
    };

    resize(); raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize);  window.removeEventListener("cohle:theme", readTheme); };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
}
