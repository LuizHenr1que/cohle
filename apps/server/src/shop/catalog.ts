// The shop catalog, defined in code and upserted at boot (see seedCatalog in shop.ts).
// What lives here: names, types, rarity, render parameters. What does NOT get overwritten once a row exists: the runtime switches
// (`ativo`, `inicio`, `fim`, price, isFreeBeta), so they can be edited in the database without a deploy.
import type { ItemType, Rarity } from "@cohle/shared";

export interface CatalogCollection { key: string; nome: string; descricao: string; categoria: string; sazonal: boolean; inicio?: string; fim?: string; bonus?: string; }
export interface CatalogItem { key: string; tipo: ItemType; nome: string; descricao: string; raridade: Rarity; categoria: string; collection?: string; meta?: Record<string, unknown>; }

export const COLLECTIONS: CatalogCollection[] = [
  {
    key: "natal", nome: "Natal", categoria: "natal", sazonal: true, inicio: "2026-10-01T00:00:00-03:00", fim: "2027-01-07T00:00:00-03:00", bonus: "natal.sleigh",
    descricao: "Neve, luzinhas e o Papai Noel: clique na árvore e o trenó passa. Equipe tema + moldura + entrada do conjunto para o trenó deixar um rastro de luzes.",
  },
  { key: "auras", nome: "Auras", categoria: "auras", sazonal: false, descricao: "Energia girando em volta do seu avatar: fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon." },
  { key: "hacker", nome: "Hacker", categoria: "hacker", sazonal: false, descricao: "Terminal verde, código em chuva e a entrada ACCESS GRANTED. Para quem vive no teclado." },
  { key: "gamer", nome: "Gamer", categoria: "gamer", sazonal: false, descricao: "Arena neon, controle, pixel art e a entrada GAME ON. Aperte start." },
  { key: "barbearia", nome: "Barbearia", categoria: "barbearia", sazonal: false, descricao: "Poste de barbeiro girando, tesoura de ouro, bigode e a entrada Na régua!" },
  { key: "rainha", nome: "Rainha", categoria: "rainha", sazonal: false, descricao: "Reino rosé: coroa, flores, brilho de diamante e a entrada Chegou a Rainha!" },
  {
    key: "halloween", nome: "Halloween", categoria: "halloween", sazonal: true, inicio: "2026-10-10T00:00:00-03:00", fim: "2026-11-03T00:00:00-03:00", bonus: "halloween.witch",
    descricao: "Lua cheia, luzes laranja e roxas e uma abóbora no canto: clique nela e a bruxa de vassoura passa. Equipe tema + moldura + entrada do conjunto para a bruxa deixar um rastro de faíscas.",
  },
];

export const ITEMS: CatalogItem[] = [
  // ---- everybody ----
  { key: "beta.tester", tipo: "badge", nome: "Beta Tester", raridade: "comum", categoria: "base", descricao: "Quem estava aqui no beta. Automático para todo mundo agora.", meta: { icon: "flask", auto: true } },

  // ---- Natal ----
  { key: "natal.theme", tipo: "theme", nome: "Natal", raridade: "epico", categoria: "natal", collection: "natal", descricao: "Noite estrelada, neve caindo, luzinhas nas bordas e uma árvore no canto: clique nela e o Papai Noel passa no trenó, com o ho ho ho.",
    meta: { theme: "natal", particles: "snow", sleigh: true, lights: true, tree: true, countdown: true } },
  { key: "natal.frame.garland", tipo: "frame", nome: "Guirlanda de luzes", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Guirlanda ao redor do avatar com luzes que piscam.", meta: { style: "garland" } },
  { key: "natal.frame.santahat", tipo: "frame", nome: "Gorro de Papai Noel", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Um gorro vermelho no seu avatar.", meta: { style: "santahat" } },
  { key: "natal.badge.spirit", tipo: "badge", nome: "Espírito Natalino", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Para quem entrou no clima.", meta: { icon: "snowflake" } },
  { key: "natal.entrance.hohoho", tipo: "entrance", nome: "Ho ho ho", raridade: "epico", categoria: "natal", collection: "natal", descricao: "Ao entrar na sala: Ho ho ho, presentes e neve para todo mundo ver.", meta: { fx: "hohoho", sound: "hohoho" } },
  { key: "natal.name.lights", tipo: "name_effect", nome: "Nome de luzinhas", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Seu nome com cores de luzinhas de Natal.", meta: { style: "lights" } },
  { key: "natal.name.candycane", tipo: "name_effect", nome: "Nome de bengala doce", raridade: "comum", categoria: "natal", collection: "natal", descricao: "Listras vermelhas e brancas no seu nome.", meta: { style: "candycane" } },
  { key: "natal.reactions", tipo: "reaction", nome: "Reações de Natal", raridade: "raro", categoria: "natal", collection: "natal", descricao: "Presente abrindo, boneco de neve e rena para a reação gigante.", meta: { icons: ["gift", "snowman", "reindeer"] } },

  // ---- Halloween (seasonal: whoever claimed keeps it; when the season ends it leaves the shop) ----
  { key: "halloween.theme", tipo: "theme", nome: "Noite de Halloween", raridade: "epico", categoria: "halloween", collection: "halloween", descricao: "Noite roxa, lua cheia e luzes laranja nas bordas. Clique na abóbora do canto e a bruxa passa de vassoura, com o buuu.",
    meta: { theme: "halloween", witch: true, lights: true, corner: "pumpkin", countdown: true } },
  { key: "halloween.frame.pumpkin", tipo: "frame", nome: "Abóbora", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Uma aboborinha com sorriso no seu avatar.", meta: { style: "pumpkin" } },
  { key: "halloween.frame.web", tipo: "frame", nome: "Teia de aranha", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Teia no canto do avatar, com uma aranha pendurada.", meta: { style: "web" } },
  { key: "halloween.badge.spooky", tipo: "badge", nome: "Noite Sombria", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Para quem encarou a noite mais assustadora do ano.", meta: { icon: "ghost" } },
  { key: "halloween.entrance.boo", tipo: "entrance", nome: "Buuu!", raridade: "epico", categoria: "halloween", collection: "halloween", descricao: "Ao entrar na sala: Buuu!, morcegos e fantasminhas passando para todo mundo ver.", meta: { fx: "boo", sound: "boo" } },
  { key: "halloween.name.pumpkin", tipo: "name_effect", nome: "Nome de abóbora", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Seu nome em degradê laranja de abóbora.", meta: { style: "pumpkin" } },
  { key: "halloween.name.ghost", tipo: "name_effect", nome: "Nome fantasma", raridade: "comum", categoria: "halloween", collection: "halloween", descricao: "Seu nome em tons de roxo e névoa.", meta: { style: "ghost" } },
  { key: "halloween.reactions", tipo: "reaction", nome: "Reações de Halloween", raridade: "raro", categoria: "halloween", collection: "halloween", descricao: "Abóbora, fantasma e morcego para a reação gigante.", meta: { icons: ["pumpkin", "ghost", "bat"] } },

  // ---- Auras (always available): energy that moves around the avatar ----
  { key: "aura.fire", tipo: "frame", nome: "Aura de Fogo", raridade: "epico", categoria: "auras", collection: "auras", descricao: "Chamas que dançam ao redor de você, com brasas girando.", meta: {style: "aura-fire"} },
  { key: "aura.ice", tipo: "frame", nome: "Aura de Gelo", raridade: "epico", categoria: "auras", collection: "auras", descricao: "Cristais de gelo orbitando e um brilho gelado.", meta: {style: "aura-ice"} },
  { key: "aura.lightning", tipo: "frame", nome: "Aura de Raios", raridade: "raro", categoria: "auras", collection: "auras", descricao: "Raios azuis estalando em volta do avatar.", meta: {style: "aura-lightning"} },
  { key: "aura.sakura", tipo: "frame", nome: "Aura Sakura", raridade: "raro", categoria: "auras", collection: "auras", descricao: "Pétalas de cerejeira girando suave, estilo anime.", meta: {style: "aura-sakura"} },
  { key: "aura.shadow", tipo: "frame", nome: "Aura Sombria", raridade: "epico", categoria: "auras", collection: "auras", descricao: "Energia sombria roxa subindo, estilo anime.", meta: {style: "aura-shadow"} },
  { key: "aura.gold", tipo: "frame", nome: "Aura Dourada", raridade: "lendario", categoria: "auras", collection: "auras", descricao: "Poder dourado pulsando em chamas e faíscas.", meta: {style: "aura-gold"} },
  { key: "aura.cosmic", tipo: "frame", nome: "Aura Cósmica", raridade: "lendario", categoria: "auras", collection: "auras", descricao: "Estrelas orbitando numa nebulosa.", meta: {style: "aura-cosmic"} },
  { key: "aura.neon", tipo: "frame", nome: "Aura Neon", raridade: "raro", categoria: "auras", collection: "auras", descricao: "Anéis neon ciano e magenta girando em sentidos opostos.", meta: {style: "aura-neon"} },

  // ---- Hacker ----
  { key: "hacker.theme", tipo: "theme", nome: "Terminal Hacker", raridade: "epico", categoria: "hacker", collection: "hacker", descricao: "Verde de terminal sobre preto, luzes verdes nas bordas e um terminal no canto.", meta: {theme: "hacker", "lights": true, "corner": "terminal"} },
  { key: "hacker.frame.code", tipo: "frame", nome: "Chuva de código", raridade: "raro", categoria: "hacker", collection: "hacker", descricao: "Zeros e uns caindo em volta do avatar.", meta: {style: "code"} },
  { key: "hacker.frame.terminal", tipo: "frame", nome: "Colchetes de terminal", raridade: "comum", categoria: "hacker", collection: "hacker", descricao: "Cantos de terminal e cursor piscando.", meta: {style: "terminal"} },
  { key: "hacker.badge.root", tipo: "badge", nome: "Root", raridade: "raro", categoria: "hacker", collection: "hacker", descricao: "Acesso total.", meta: {icon: "terminal"} },
  { key: "hacker.entrance.access", tipo: "entrance", nome: "ACCESS GRANTED", raridade: "epico", categoria: "hacker", collection: "hacker", descricao: "Ao entrar na sala: ACCESS GRANTED com bugs e códigos caindo.", meta: {fx: "access", sound: "glitch"} },
  { key: "hacker.name.terminal", tipo: "name_effect", nome: "Nome de terminal", raridade: "comum", categoria: "hacker", collection: "hacker", descricao: "Verde fosforescente de terminal.", meta: {style: "terminal"} },
  { key: "hacker.name.glitch", tipo: "name_effect", nome: "Nome glitch", raridade: "raro", categoria: "hacker", collection: "hacker", descricao: "Cores que vibram como um erro de vídeo.", meta: {style: "glitch"} },
  { key: "hacker.reactions", tipo: "reaction", nome: "Reações Hacker", raridade: "raro", categoria: "hacker", collection: "hacker", descricao: "Terminal, bug e cadeado para a reação gigante.", meta: {icons: ["terminal", "bug", "lock"]} },

  // ---- Gamer ----
  { key: "gamer.theme", tipo: "theme", nome: "Arena Gamer", raridade: "epico", categoria: "gamer", collection: "gamer", descricao: "Roxo e ciano neon, luzes de arena nas bordas e um controle no canto.", meta: {theme: "gamer", "lights": true, "corner": "gamepad"} },
  { key: "gamer.frame.pad", tipo: "frame", nome: "Controle", raridade: "raro", categoria: "gamer", collection: "gamer", descricao: "Botões coloridos girando em volta do avatar.", meta: {style: "pad"} },
  { key: "gamer.frame.pixel", tipo: "frame", nome: "Pixel", raridade: "comum", categoria: "gamer", collection: "gamer", descricao: "Borda de pixel art de jogo clássico.", meta: {style: "pixel"} },
  { key: "gamer.badge.player1", tipo: "badge", nome: "Player 1", raridade: "raro", categoria: "gamer", collection: "gamer", descricao: "Pronto para a próxima fase.", meta: {icon: "gamepad"} },
  { key: "gamer.entrance.gameon", tipo: "entrance", nome: "GAME ON!", raridade: "epico", categoria: "gamer", collection: "gamer", descricao: "Ao entrar na sala: GAME ON! com troféus e controles voando.", meta: {fx: "gameon", sound: "gameon"} },
  { key: "gamer.name.neon", tipo: "name_effect", nome: "Neon Arena", raridade: "raro", categoria: "gamer", collection: "gamer", descricao: "Degradê neon ciano e magenta.", meta: {style: "neon"} },
  { key: "gamer.name.boss", tipo: "name_effect", nome: "Chefão final", raridade: "epico", categoria: "gamer", collection: "gamer", descricao: "Vermelho e amarelo de última fase.", meta: {style: "boss"} },
  { key: "gamer.reactions", tipo: "reaction", nome: "Reações Gamer", raridade: "raro", categoria: "gamer", collection: "gamer", descricao: "Controle, troféu e coração pixel para a reação gigante.", meta: {icons: ["gamepad", "trophy", "pixelheart"]} },

  // ---- Barbearia ----
  { key: "barber.theme", tipo: "theme", nome: "Barbearia Clássica", raridade: "epico", categoria: "barbearia", collection: "barbearia", descricao: "Madeira escura, dourado e o poste de barbeiro no canto.", meta: {theme: "barbearia", "lights": true, "corner": "pole"} },
  { key: "barber.frame.pole", tipo: "frame", nome: "Poste de barbeiro", raridade: "raro", categoria: "barbearia", collection: "barbearia", descricao: "Listras vermelhas, brancas e azuis girando.", meta: {style: "pole"} },
  { key: "barber.frame.scissors", tipo: "frame", nome: "Tesoura de ouro", raridade: "raro", categoria: "barbearia", collection: "barbearia", descricao: "Aro dourado com uma tesoura brilhando.", meta: {style: "scissors"} },
  { key: "barber.badge.blade", tipo: "badge", nome: "Navalha", raridade: "raro", categoria: "barbearia", collection: "barbearia", descricao: "Corte na régua.", meta: {icon: "scissors"} },
  { key: "barber.entrance.regua", tipo: "entrance", nome: "Na régua!", raridade: "epico", categoria: "barbearia", collection: "barbearia", descricao: "Ao entrar na sala: Na régua! com tesouras e bigodes.", meta: {fx: "regua", sound: "snip"} },
  { key: "barber.name.gold", tipo: "name_effect", nome: "Nome dourado", raridade: "raro", categoria: "barbearia", collection: "barbearia", descricao: "Dourado de moldura de espelho.", meta: {style: "gold"} },
  { key: "barber.name.pole", tipo: "name_effect", nome: "Listras de poste", raridade: "comum", categoria: "barbearia", collection: "barbearia", descricao: "Vermelho, branco e azul.", meta: {style: "pole"} },
  { key: "barber.reactions", tipo: "reaction", nome: "Reações de Barbearia", raridade: "raro", categoria: "barbearia", collection: "barbearia", descricao: "Tesoura, bigode e navalha para a reação gigante.", meta: {icons: ["scissors", "mustache", "razor"]} },

  // ---- Rainha ----
  { key: "queen.theme", tipo: "theme", nome: "Reino Rosé", raridade: "epico", categoria: "rainha", collection: "rainha", descricao: "Rosa e lilás com brilho, luzes rosé e uma coroa no canto.", meta: {theme: "rainha", "lights": true, "corner": "crown"} },
  { key: "queen.frame.crown", tipo: "frame", nome: "Coroa", raridade: "raro", categoria: "rainha", collection: "rainha", descricao: "Uma coroa dourada no topo do avatar.", meta: {style: "crown"} },
  { key: "queen.frame.flowers", tipo: "frame", nome: "Flores", raridade: "comum", categoria: "rainha", collection: "rainha", descricao: "Coroa de flores em volta do avatar.", meta: {style: "flowers"} },
  { key: "queen.badge.crown", tipo: "badge", nome: "Rainha", raridade: "raro", categoria: "rainha", collection: "rainha", descricao: "Quem manda por aqui.", meta: {icon: "crown"} },
  { key: "queen.entrance.queen", tipo: "entrance", nome: "Chegou a Rainha!", raridade: "epico", categoria: "rainha", collection: "rainha", descricao: "Ao entrar na sala: Chegou a Rainha! com coroas, flores e diamantes.", meta: {fx: "queen", sound: "tada"} },
  { key: "queen.name.rose", tipo: "name_effect", nome: "Nome rosé", raridade: "raro", categoria: "rainha", collection: "rainha", descricao: "Degradê rosa e lilás.", meta: {style: "rose"} },
  { key: "queen.name.diamond", tipo: "name_effect", nome: "Nome diamante", raridade: "epico", categoria: "rainha", collection: "rainha", descricao: "Brilho de diamante, do branco ao azul gelo.", meta: {style: "diamond"} },
  { key: "queen.reactions", tipo: "reaction", nome: "Reações da Rainha", raridade: "raro", categoria: "rainha", collection: "rainha", descricao: "Coroa, flor e diamante para a reação gigante.", meta: {icons: ["crown", "flower", "diamond"]} },
];

/** Reaction icons everybody can send as a "giant reaction"; packs add more. */
export const BASE_GIANT = ["heart", "fire", "party"] as const;
