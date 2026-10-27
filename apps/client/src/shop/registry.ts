// How each shop item looks. Keys come from the server catalog (`apps/server/src/shop/catalog.ts`); this file is the small part of the shop that ships in the main bundle
// (frames, names and badges are drawn everywhere, in lists too). Everything heavier (the Shop screen, particles, overlays) is lazy.
import { Snowflake, FlaskConical, Ghost, Terminal, Gamepad2, Scissors, Crown, PartyPopper, type LucideIcon } from "lucide-react";
import type { Rarity } from "@cohle/shared";

export const THEME_OF: Record<string, string> = { "natal.theme": "natal", "halloween.theme": "halloween", "hacker.theme": "hacker", "gamer.theme": "gamer", "barber.theme": "barbearia", "queen.theme": "rainha", "anonovo.theme": "anonovo" };
export const FRAME_OF: Record<string, string> = {
  "natal.frame.garland": "garland", "natal.frame.santahat": "santahat", "halloween.frame.pumpkin": "pumpkin", "halloween.frame.web": "web",
  "aura.fire": "aura-fire", "aura.ice": "aura-ice", "aura.lightning": "aura-lightning", "aura.sakura": "aura-sakura", "aura.shadow": "aura-shadow", "aura.gold": "aura-gold", "aura.cosmic": "aura-cosmic", "aura.neon": "aura-neon",
  "hacker.frame.code": "code", "hacker.frame.terminal": "terminal", "gamer.frame.pad": "pad", "gamer.frame.pixel": "pixel", "barber.frame.pole": "pole", "barber.frame.scissors": "scissors", "queen.frame.crown": "crown", "queen.frame.flowers": "flowers", "anonovo.frame.gold": "nygold", "anonovo.frame.confetti": "nyconfetti",
};
export const NAME_CLASS: Record<string, string> = { "natal.name.lights": "fx-name-lights", "natal.name.candycane": "fx-name-candy", "halloween.name.pumpkin": "fx-name-pumpkin", "halloween.name.ghost": "fx-name-ghost",
  "hacker.name.terminal": "fx-name-terminal", "hacker.name.glitch": "fx-name-glitch", "gamer.name.neon": "fx-name-neon", "gamer.name.boss": "fx-name-boss", "barber.name.gold": "fx-name-gold", "barber.name.pole": "fx-name-pole", "queen.name.rose": "fx-name-rose", "queen.name.diamond": "fx-name-diamond", "anonovo.name.gold": "fx-name-nygold", "anonovo.name.fireworks": "fx-name-nyfireworks" };
export const BADGES: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  "beta.tester": { label: "Beta Tester", Icon: FlaskConical, color: "#22b8cf" },
  "natal.badge.spirit": { label: "Espírito Natalino", Icon: Snowflake, color: "#5cc8ff" },
  "halloween.badge.spooky": { label: "Noite Sombria", Icon: Ghost, color: "#ff8a3d" },
  "hacker.badge.root": { label: "Root", Icon: Terminal, color: "#3dff7a" },
  "gamer.badge.player1": { label: "Player 1", Icon: Gamepad2, color: "#b57bff" },
  "barber.badge.blade": { label: "Navalha", Icon: Scissors, color: "#e0b050" },
  "queen.badge.crown": { label: "Rainha", Icon: Crown, color: "#ff8fcf" },
  "anonovo.badge.2027": { label: "Virada 2027", Icon: PartyPopper, color: "#ffd166" },
};
/** Entrances: the big text, the sound, the little things that fall (art keys of GiantIcons) and the glow. */
export type EntranceLook = { label: string; text: string; sound: "hohoho" | "boo" | "glitch" | "gameon" | "snip" | "tada" | "pop" | "fireworks"; icons: string[]; glow: string };
export const ENTRANCE_OF: Record<string, EntranceLook> = {
  "natal.entrance.hohoho": { label: "Ho ho ho", text: "Ho ho ho!", sound: "hohoho", icons: ["gift", "gift", "dot"], glow: "230,57,70" },
  "halloween.entrance.boo": { label: "Buuu!", text: "Buuu!", sound: "boo", icons: ["bat", "ghost", "pumpkin"], glow: "255,122,26" },
  "hacker.entrance.access": { label: "ACCESS GRANTED", text: "ACCESS GRANTED", sound: "glitch", icons: ["bug", "terminal", "lock"], glow: "61,255,122" },
  "gamer.entrance.gameon": { label: "GAME ON!", text: "GAME ON!", sound: "gameon", icons: ["gamepad", "trophy", "pixelheart"], glow: "181,123,255" },
  "barber.entrance.regua": { label: "Na régua!", text: "Na régua!", sound: "snip", icons: ["scissors", "mustache", "razor"], glow: "224,176,80" },
  "anonovo.entrance.champagne": { label: "Feliz 2027!", text: "Feliz 2027!", sound: "pop", icons: ["firework", "champagne", "clock"], glow: "255,209,102" },
  "queen.entrance.queen": { label: "Chegou a Rainha!", text: "Chegou a Rainha!", sound: "tada", icons: ["crown", "flower", "diamond"], glow: "255,143,207" },
};
export const RARITY_COLOR: Record<Rarity, string> = { comum: "#9d8890", raro: "#3b8cff", epico: "#a06bff", lendario: "#ffb347" };
/** Colours of the little scoped preview of a theme (the real colours are in index.css). */
export const THEME_PREVIEW: Record<string, Record<string, string>> = {
  natal: { "--color-bg": "#06101c", "--color-surface": "#0b1a2b", "--color-ink": "#f2f7ff", "--color-muted": "#8aa0b8", "--color-accent": "#e63946", "--color-accent2": "#3ddc84" },
  hacker: { "--color-bg": "#030a05", "--color-surface": "#07140b", "--color-ink": "#d6ffe2", "--color-muted": "#6fae85", "--color-accent": "#3dff7a", "--color-accent2": "#19c2ff" },
  gamer: { "--color-bg": "#0a0716", "--color-surface": "#120d26", "--color-ink": "#f1ecff", "--color-muted": "#9a8fc2", "--color-accent": "#b57bff", "--color-accent2": "#19e0ff" },
  barbearia: { "--color-bg": "#150d08", "--color-surface": "#21140c", "--color-ink": "#fbf1e4", "--color-muted": "#b59a82", "--color-accent": "#e0b050", "--color-accent2": "#c8312f" },
  rainha: { "--color-bg": "#170a14", "--color-surface": "#231020", "--color-ink": "#fff0f8", "--color-muted": "#c49ab5", "--color-accent": "#ff8fcf", "--color-accent2": "#b794ff" },
  anonovo: { "--color-bg": "#07060d", "--color-surface": "#100e1a", "--color-ink": "#fff7e0", "--color-muted": "#b5a98a", "--color-accent": "#ffd166", "--color-accent2": "#ff8fcf" },
  halloween: { "--color-bg": "#0d0716", "--color-surface": "#160d24", "--color-ink": "#f6efff", "--color-muted": "#a597bd", "--color-accent": "#ff7a1a", "--color-accent2": "#a06bff" },
};
/** Per season: the tint of its hero card in the shop and what its set bonus is (the text is shown next to "Equipar conjunto completo"). */
export const SEASON_LOOK: Record<string, { tint: string; bonus: string }> = {
  natal: { tint: "rgba(230,57,70,0.28)", bonus: "o trenó deixa um rastro de luzes quando você clica na árvore" },
  halloween: { tint: "rgba(255,122,26,0.26)", bonus: "a bruxa deixa um rastro de faíscas quando você clica na abóbora" },
};
export const REACTION_ICON_KEYS = ["heart", "fire", "party", "gift", "snowman", "reindeer", "pumpkin", "ghost", "bat", "terminal", "bug", "lock", "gamepad", "trophy", "pixelheart", "scissors", "mustache", "razor", "crown", "flower", "diamond", "firework", "champagne", "clock"] as const;
export type GiantIcon = (typeof REACTION_ICON_KEYS)[number];

/** The ambient scene of the themes that have no season (edge lights colours + the corner art key). Natal and Halloween have their own, richer scenes. */
export const THEME_SCENE: Record<string, { lights: [string, string, string, string]; corner: string }> = {
  "hacker.theme": { lights: ["#3dff7a", "#19c2ff", "#3dff7a", "#0b8f3a"], corner: "terminal" },
  "gamer.theme": { lights: ["#b57bff", "#19e0ff", "#ff4fd8", "#19e0ff"], corner: "gamepad" },
  "barber.theme": { lights: ["#c8312f", "#ffffff", "#2a6fd6", "#e0b050"], corner: "pole" },
  "queen.theme": { lights: ["#ff8fcf", "#ffe0f2", "#b794ff", "#ffd166"], corner: "crown" },
  "anonovo.theme": { lights: ["#ffd166", "#ffffff", "#ff8fcf", "#ffd166"], corner: "newyear" },
};

/** What a click on the corner icon of a theme does (no season theme does anything on its own): a burst with its own text, falling art and sound. */
export const CLICK_FX: Record<string, EntranceLook> = {
  terminal: { label: "Terminal", text: "$ sudo hack --all", sound: "glitch", icons: ["bug", "terminal", "lock"], glow: "61,255,122" },
  gamepad: { label: "Controle", text: "+1 UP!", sound: "gameon", icons: ["gamepad", "trophy", "pixelheart"], glow: "181,123,255" },
  pole: { label: "Poste", text: "Corte na régua!", sound: "snip", icons: ["scissors", "mustache", "razor"], glow: "224,176,80" },
  newyear: { label: "Champanhe", text: "Feliz Ano Novo!", sound: "fireworks", icons: ["firework", "champagne", "clock"], glow: "255,209,102" },
  crown: { label: "Coroa", text: "Majestade!", sound: "tada", icons: ["crown", "flower", "diamond"], glow: "255,143,207" },
};
