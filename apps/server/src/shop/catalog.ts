// The shop catalog, defined in code and upserted at boot (see seedCatalog in shop.ts).
// What lives here: names, types, rarity, render parameters. What does NOT get overwritten once a row exists: the runtime switches
// (`ativo`, `inicio`, `fim`, price, isFreeBeta), so they can be edited in the database without a deploy.
import type { ItemType, Rarity } from "@cohle/shared";

export interface CatalogCollection { key: string; nome: string; descricao: string; categoria: string; sazonal: boolean; inicio?: string; fim?: string; bonus?: string; }
export interface CatalogItem { key: string; tipo: ItemType; nome: string; descricao: string; raridade: Rarity; categoria: string; collection?: string; meta?: Record<string, unknown>; }

export const COLLECTIONS: CatalogCollection[] = [
  {
    key: "natal", nome: "Natal", categoria: "natal", sazonal: true, inicio: "2026-10-01T00:00:00-03:00", fim: "2027-01-07T00:00:00-03:00", bonus: "natal.sleigh",
    descricao: "Neve, luzinhas e o trenó do Papai Noel. Equipe tema + moldura + entrada do conjunto para liberar o trenó extra.",
  },
  {
    key: "halloween", nome: "Halloween", categoria: "halloween", sazonal: true, inicio: "2026-10-10T00:00:00-03:00", fim: "2026-11-03T00:00:00-03:00", bonus: "halloween.witch",
    descricao: "Lua cheia, luzes laranja e roxas e uma bruxa de vassoura cruzando a tela. Equipe tema + moldura + entrada do conjunto para liberar a bruxa extra.",
  },
];

export const ITEMS: CatalogItem[] = [
  // ---- everybody ----
  { key: "beta.tester", tipo: "badge", nome: "Beta Tester", raridade: "comum", categoria: "base", descricao: "Quem estava aqui no beta. Automático para todo mundo agora.", meta: { icon: "flask", auto: true } },

  // ---- Natal ----
  { key: "natal.theme", tipo: "theme", nome: "Natal", raridade: "epico", categoria: "natal", collection: "natal", descricao: "Noite estrelada, neve caindo, luzinhas nas bordas, árvore no canto e o trenó passando de vez em quando.",
    meta: { theme: "natal", particles: "snow", sleigh: true, lights: true, tree: true, countdown: true } },
  { key: "natal.frame.garland", tipo: "frame", nome: "Guirlanda de luzes", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Guirlanda ao redor do avatar com luzes que piscam.", meta: { style: "garland" } },
  { key: "natal.frame.santahat", tipo: "frame", nome: "Gorro de Papai Noel", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Um gorro vermelho no seu avatar.", meta: { style: "santahat" } },
  { key: "natal.badge.spirit", tipo: "badge", nome: "Espírito Natalino", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Para quem entrou no clima.", meta: { icon: "snowflake" } },
  { key: "natal.entrance.hohoho", tipo: "entrance", nome: "Ho ho ho", raridade: "epico", categoria: "natal", collection: "natal", descricao: "Ao entrar na sala: Ho ho ho, presentes e neve para todo mundo ver.", meta: { fx: "hohoho", sound: "hohoho" } },
  { key: "natal.name.lights", tipo: "name_effect", nome: "Nome de luzinhas", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Seu nome com cores de luzinhas de Natal.", meta: { style: "lights" } },
  { key: "natal.name.candycane", tipo: "name_effect", nome: "Nome de bengala doce", raridade: "comum", categoria: "natal", collection: "natal", descricao: "Listras vermelhas e brancas no seu nome.", meta: { style: "candycane" } },
  { key: "natal.reactions", tipo: "reaction", nome: "Reações de Natal", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Presente abrindo, boneco de neve e rena para a reação gigante.", meta: { icons: ["gift", "snowman", "reindeer"] } },

  // ---- Halloween (seasonal: whoever claimed keeps it; when the season ends it leaves the shop) ----
  { key: "halloween.theme", tipo: "theme", nome: "Noite de Halloween", raridade: "epico", categoria: "halloween", collection: "halloween", descricao: "Noite roxa, lua cheia, luzes laranja nas bordas, abóbora no canto e uma bruxa de vassoura passando de vez em quando.",
    meta: { theme: "halloween", witch: true, lights: true, corner: "pumpkin", countdown: true } },
  { key: "halloween.frame.pumpkin", tipo: "frame", nome: "Abóbora", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Uma aboborinha com sorriso no seu avatar.", meta: { style: "pumpkin" } },
  { key: "halloween.frame.web", tipo: "frame", nome: "Teia de aranha", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Teia no canto do avatar, com uma aranha pendurada.", meta: { style: "web" } },
  { key: "halloween.badge.spooky", tipo: "badge", nome: "Noite Sombria", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Para quem encarou a noite mais assustadora do ano.", meta: { icon: "ghost" } },
  { key: "halloween.entrance.boo", tipo: "entrance", nome: "Buuu!", raridade: "epico", categoria: "halloween", collection: "halloween", descricao: "Ao entrar na sala: Buuu!, morcegos e fantasminhas passando para todo mundo ver.", meta: { fx: "boo", sound: "boo" } },
  { key: "halloween.name.pumpkin", tipo: "name_effect", nome: "Nome de abóbora", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Seu nome em degradê laranja de abóbora.", meta: { style: "pumpkin" } },
  { key: "halloween.name.ghost", tipo: "name_effect", nome: "Nome fantasma", raridade: "comum", categoria: "halloween", collection: "halloween", descricao: "Seu nome em tons de roxo e névoa.", meta: { style: "ghost" } },
  { key: "halloween.reactions", tipo: "reaction", nome: "Reações de Halloween", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Abóbora, fantasma e morcego para a reação gigante.", meta: { icons: ["pumpkin", "ghost", "bat"] } },
];

/** Reaction icons everybody can send as a "giant reaction"; packs add more. */
export const BASE_GIANT = ["heart", "fire", "party"] as const;
