// Color themes. The CSS (index.css) defines the tokens per [data-theme]; here are the names and the swatches for the picker.
export type ThemeId = "cohle" | "ocean" | "forest" | "violet" | "sunset" | "custom";
export const THEMES: { id: ThemeId; name: string; hint: string; a: string; b: string; bg: string }[] = [
  { id: "cohle", name: "Cohle", hint: "Vermelho, o clássico", a: "#ff3b5c", b: "#ff8a5b", bg: "#140a0e" },
  { id: "ocean", name: "Oceano", hint: "Azul profundo", a: "#3b8cff", b: "#35c8ff", bg: "#0a121c" },
  { id: "forest", name: "Floresta", hint: "Verde escuro", a: "#22b35e", b: "#9be15d", bg: "#09130d" },
  { id: "violet", name: "Violeta", hint: "Roxo e rosa", a: "#8b5cf6", b: "#e056d9", bg: "#100a1c" },
  { id: "sunset", name: "Pôr do sol", hint: "Laranja quente", a: "#ff6a3d", b: "#ffb347", bg: "#170d08" },
];
const KEY = "cohle:theme";
export const getTheme = (): ThemeId => { try { const t = localStorage.getItem(KEY) as ThemeId | null; return t === "custom" || THEMES.some((x) => x.id === t) ? t! : "cohle"; } catch { return "cohle"; } };
// ---- custom color: the whole palette is derived from ONE color the person picks ----
const CKEY = "cohle:theme-color";
export const getCustomColor = (): string => { try { const c = localStorage.getItem(CKEY); return c && /^#[0-9a-f]{6}$/i.test(c) ? c : "#ff3b5c"; } catch { return "#ff3b5c"; } };
const VARS = ["--color-bg", "--color-surface", "--color-surface-2", "--color-ink", "--color-muted", "--color-accent", "--color-accent2", "--accent-rgb", "--accent2-rgb", "--glass-a", "--glass-b", "--orb-core", "--orb-deep", "--orb-dark"];
function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const hex = ([r, g, b]: number[]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const hsl = (h: number, s: number, l: number) => hslToRgb(((h % 360) + 360) % 360, Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, l)));
/** The palette for a picked color (readable with white text on the buttons, dark surfaces tinted with the same hue). */
export function paletteFor(color: string) {
  const [h, s0] = hexToHsl(color);
  const s = Math.max(0.55, s0), acc = hsl(h, s, 0.56), acc2 = hsl(h + 28, s, 0.62);   // lightness clamped: always readable
  const rgb = (c: number[]) => c.join(" ");
  const a = (c: number[], al: number) => `rgba(${c.join(", ")}, ${al})`;
  return {
    "--color-bg": hex(hsl(h, 0.4, 0.035)), "--color-surface": hex(hsl(h, 0.34, 0.07)), "--color-surface-2": hex(hsl(h, 0.3, 0.1)),
    "--color-ink": hex(hsl(h, 0.3, 0.94)), "--color-muted": hex(hsl(h, 0.12, 0.6)),
    "--color-accent": hex(acc), "--color-accent2": hex(acc2), "--accent-rgb": rgb(acc), "--accent2-rgb": rgb(acc2),
    "--glass-a": a(hsl(h, 0.28, 0.15), 0.82), "--glass-b": a(hsl(h, 0.32, 0.085), 0.9),
    "--orb-core": hex(hsl(h, 1, 0.9)), "--orb-deep": hex(hsl(h, 0.8, 0.22)), "--orb-dark": hex(hsl(h, 0.8, 0.06)),
  } as Record<string, string>;
}
export function applyTheme(id: ThemeId, color?: string) {
  const el = document.documentElement;
  VARS.forEach((v) => el.style.removeProperty(v));                    // presets come from the CSS; custom sets the variables inline
  el.dataset.theme = id;
  if (id === "custom") {
    const c = color ?? getCustomColor();
    Object.entries(paletteFor(c)).forEach(([k, v]) => el.style.setProperty(k, v));
    try { localStorage.setItem(CKEY, c); } catch { /* private mode */ }
  }
  try { localStorage.setItem(KEY, id); } catch { /* private mode */ }
  window.dispatchEvent(new Event("cohle:theme"));
}
