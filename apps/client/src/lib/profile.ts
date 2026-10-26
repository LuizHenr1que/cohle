/** Cover colours offered in the profile editor (the first is the Cohle red). */
export const BANNER_COLORS = ["#ff3b5c", "#ff6a3d", "#ffb347", "#22b35e", "#14b8a6", "#3b8cff", "#8b5cf6", "#e056d9", "#64748b", "#27272a"];

/** The cover of a profile card: the chosen colour as a soft gradient, or the app's accent when nothing was chosen. */
export const bannerBg = (color?: string | null) =>
  color ? `radial-gradient(120% 140% at 25% 0%, ${color}, transparent 75%), linear-gradient(135deg, color-mix(in srgb, ${color} 55%, #000), color-mix(in srgb, ${color} 20%, #0a0507))`
        : "radial-gradient(120% 140% at 30% 0%, rgb(var(--accent-rgb) / 0.55), transparent 70%), linear-gradient(135deg, #2a1018, #12080c)";

export const monthYear = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
