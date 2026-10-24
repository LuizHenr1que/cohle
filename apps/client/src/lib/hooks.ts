import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Live width/height of an element (ResizeObserver). */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** True while the CSS media query matches. */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const h = () => setMatch(m.matches);
    h(); m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, [query]);
  return match;
}

/**
 * Largest 16:9 tiles that fit `n` items in W x H. If they would be smaller than `minW`,
 * fall back to a scrolling grid of `minW`-wide tiles.
 */
export function fitTiles(n: number, W: number, H: number, gap: number, minW = 150, ar = 16 / 9) {
  if (n < 1 || W <= 0 || H <= 0) return { w: 0, h: 0, scroll: false };
  let best = { w: 0, h: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    let w = (W - gap * (cols - 1)) / cols, h = w / ar;
    const maxH = (H - gap * (rows - 1)) / rows;
    if (h > maxH) { h = maxH; w = h * ar; }
    if (w > best.w) best = { w, h };
  }
  if (best.w >= minW) return { ...best, scroll: false };
  const cols = Math.max(1, Math.floor((W + gap) / (minW + gap)));
  const w = (W - gap * (cols - 1)) / cols;
  return { w, h: w / ar, scroll: true };
}
