// How each shop item looks. Keys come from the server catalog (`apps/server/src/shop/catalog.ts`); this file is the small part of the shop that ships in the main bundle
// (frames, names and badges are drawn everywhere, in lists too). Everything heavier (the Shop screen, particles, overlays) is lazy.
import { Snowflake, FlaskConical, Ghost, type LucideIcon } from "lucide-react";
import type { Rarity } from "@cohle/shared";

export const THEME_OF: Record<string, string> = { "natal.theme": "natal", "halloween.theme": "halloween" };
export const FRAME_OF: Record<string, "garland" | "santahat" | "pumpkin" | "web"> = { "natal.frame.garland": "garland", "natal.frame.santahat": "santahat", "halloween.frame.pumpkin": "pumpkin", "halloween.frame.web": "web" };
export const NAME_CLASS: Record<string, string> = { "natal.name.lights": "fx-name-lights", "natal.name.candycane": "fx-name-candy", "halloween.name.pumpkin": "fx-name-pumpkin", "halloween.name.ghost": "fx-name-ghost" };
export const BADGES: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  "beta.tester": { label: "Beta Tester", Icon: FlaskConical, color: "#22b8cf" },
  "natal.badge.spirit": { label: "Espírito Natalino", Icon: Snowflake, color: "#5cc8ff" },
  "halloween.badge.spooky": { label: "Noite Sombria", Icon: Ghost, color: "#ff8a3d" },
};
export const ENTRANCE_OF: Record<string, { label: string; text: string; sound: "hohoho" | "boo"; kind: "natal" | "halloween" }> = {
  "natal.entrance.hohoho": { label: "Ho ho ho", text: "Ho ho ho!", sound: "hohoho", kind: "natal" },
  "halloween.entrance.boo": { label: "Buuu!", text: "Buuu!", sound: "boo", kind: "halloween" },
};
export const RARITY_COLOR: Record<Rarity, string> = { comum: "#9d8890", raro: "#3b8cff", epico: "#a06bff", lendario: "#ffb347" };
/** Colours of the little scoped preview of a theme (the real colours are in index.css). */
export const THEME_PREVIEW: Record<string, Record<string, string>> = {
  natal: { "--color-bg": "#06101c", "--color-surface": "#0b1a2b", "--color-ink": "#f2f7ff", "--color-muted": "#8aa0b8", "--color-accent": "#e63946", "--color-accent2": "#3ddc84" },
  halloween: { "--color-bg": "#0d0716", "--color-surface": "#160d24", "--color-ink": "#f6efff", "--color-muted": "#a597bd", "--color-accent": "#ff7a1a", "--color-accent2": "#a06bff" },
};
/** Per season: the tint of its hero card in the shop and what its set bonus is (the text is shown next to "Equipar conjunto completo"). */
export const SEASON_LOOK: Record<string, { tint: string; bonus: string }> = {
  natal: { tint: "rgba(230,57,70,0.28)", bonus: "trenó extra com rastro de luzes" },
  halloween: { tint: "rgba(255,122,26,0.26)", bonus: "bruxa extra com rastro de faíscas" },
};
export const REACTION_ICON_KEYS = ["heart", "fire", "party", "gift", "snowman", "reindeer", "pumpkin", "ghost", "bat"] as const;
export type GiantIcon = (typeof REACTION_ICON_KEYS)[number];
