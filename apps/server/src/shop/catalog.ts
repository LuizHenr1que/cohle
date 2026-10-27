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
  {
    key: "anonovo", nome: "Ano Novo", categoria: "anonovo", sazonal: true, inicio: "2026-12-20T00:00:00-03:00", fim: "2027-01-10T00:00:00-03:00",
    descricao: "Céu escuro, dourado e uma garrafa de champanhe no canto: clique nela e os fogos da virada estouram. Aro dourado, confete, entrada Feliz 2027 e muito brilho.",
  },
  { key: "auras", nome: "Auras", categoria: "auras", sazonal: false, descricao: "Energia girando em volta do seu avatar: fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon." },
  { key: "hacker", nome: "Hacker", categoria: "hacker", sazonal: false, descricao: "Terminal verde, código em chuva e a entrada ACCESS GRANTED. Para quem vive no teclado." },
  { key: "gamer", nome: "Gamer", categoria: "gamer", sazonal: false, descricao: "Arena neon, controle, pixel art e a entrada GAME ON. Aperte start." },
  { key: "barbearia", nome: "Barbearia", categoria: "barbearia", sazonal: false, descricao: "Poste de barbeiro girando, tesoura de ouro, bigode e a entrada Na régua!" },
  { key: "rainha", nome: "Rainha", categoria: "rainha", sazonal: false, descricao: "Reino rosé: coroa, flores, brilho de diamante e a entrada Chegou a Rainha!" },
  { key: "pets", nome: "Pets", categoria: "pets", sazonal: false, descricao: "Um bichinho no canto do seu cartão que reage ao carinho: passe o mouse e ele se mexe, clique e ele pula, solta corações e faz barulhinho." },
  { key: "status", nome: "Status animados", categoria: "status", sazonal: false, descricao: "Um status com vida ao lado do seu nome: jogando, ouvindo música, dormindo, codando e mais. Só se mexe no hover e no perfil." },
  { key: "banners", nome: "Banners animados", categoria: "banners", sazonal: false, descricao: "A capa do seu perfil em movimento: aurora, chuva neon, ondas, estrelas, lava, sakura, pôr do sol e código verde." },
  { key: "brasil", nome: "Brasil", categoria: "brasil", sazonal: false, descricao: "Verde, amarelo e azul: louros, bola no canto, a entrada GOOOOL! e muito orgulho." },
  { key: "carnaval", nome: "Carnaval", categoria: "carnaval", sazonal: true, inicio: "2027-01-25T00:00:00-03:00", fim: "2027-02-20T00:00:00-03:00", descricao: "Confete, glitter e uma máscara no canto: clique nela e o bloco sai pela tela. Entrada Bora pro bloco!" },
  { key: "memes", nome: "Memes", categoria: "memes", sazonal: false, descricao: "Óculos de pixel, aura +1000, texto Impact e a entrada SEXTOUUU!. Arte 100% original, só zoeira." },
  { key: "anime", nome: "Anime", categoria: "anime", sazonal: false, descricao: "Estilo anime com pétalas, olhar brilhante e um portal torii no canto. Sem personagens oficiais: só o clima." },
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

  // ---- Ano Novo (seasonal; nothing happens on its own: the champagne in the corner starts the fireworks when clicked) ----
  { key: "anonovo.theme", tipo: "theme", nome: "Virada 2027", raridade: "epico", categoria: "anonovo", collection: "anonovo", descricao: "Céu escuro e dourado, luzes douradas nas bordas, contagem para a virada e uma garrafa no canto: clique e os fogos estouram.", meta: {theme: "anonovo", lights: true, corner: "newyear", "countdown": true} },
  { key: "anonovo.frame.gold", tipo: "frame", nome: "Aro dourado", raridade: "raro", categoria: "anonovo", collection: "anonovo", descricao: "Aro dourado com faíscas girando.", meta: {style: "nygold"} },
  { key: "anonovo.frame.confetti", tipo: "frame", nome: "Confete", raridade: "comum", categoria: "anonovo", collection: "anonovo", descricao: "Confete colorido em volta do avatar.", meta: {style: "nyconfetti"} },
  { key: "anonovo.badge.2027", tipo: "badge", nome: "Virada 2027", raridade: "raro", categoria: "anonovo", collection: "anonovo", descricao: "Estava lá na virada.", meta: {icon: "party"} },
  { key: "anonovo.entrance.champagne", tipo: "entrance", nome: "Feliz 2027!", raridade: "epico", categoria: "anonovo", collection: "anonovo", descricao: "Ao entrar na sala: Feliz 2027! com fogos, champanhe e relógios caindo.", meta: {fx: "champagne", sound: "pop"} },
  { key: "anonovo.name.gold", tipo: "name_effect", nome: "Nome de ouro", raridade: "raro", categoria: "anonovo", collection: "anonovo", descricao: "Dourado brilhante com reflexo.", meta: {style: "nygold"} },
  { key: "anonovo.name.fireworks", tipo: "name_effect", nome: "Nome de fogos", raridade: "epico", categoria: "anonovo", collection: "anonovo", descricao: "Cores de fogos de artifício.", meta: {style: "nyfireworks"} },
  { key: "anonovo.reactions", tipo: "reaction", nome: "Reações de Ano Novo", raridade: "raro", categoria: "anonovo", collection: "anonovo", descricao: "Fogos, champanhe e relógio para a reação gigante.", meta: {icons: ["firework", "champagne", "clock"]} },

  // ---- Pets (interactive: hover wiggle, click jump + sound; nothing by itself) ----
  { key: "pet.cat", tipo: "pet", nome: "Gatinho", raridade: "raro", categoria: "pets", collection: "pets", descricao: "Um gatinho laranja que ronrona e pede carinho.", meta: {pet: "cat"} },
  { key: "pet.dog", tipo: "pet", nome: "Cachorrinho", raridade: "raro", categoria: "pets", collection: "pets", descricao: "Um cachorrinho que abana o rabo e late quando você clica.", meta: {pet: "dog"} },
  { key: "pet.fox", tipo: "pet", nome: "Raposa", raridade: "epico", categoria: "pets", collection: "pets", descricao: "Uma raposa esperta e fofoqueira.", meta: {pet: "fox"} },
  { key: "pet.dragon", tipo: "pet", nome: "Dragãozinho", raridade: "lendario", categoria: "pets", collection: "pets", descricao: "Um dragãozinho que solta fogo (de brinquedo) quando recebe carinho.", meta: {pet: "dragon"} },
  { key: "pet.ghost", tipo: "pet", nome: "Fantasminha", raridade: "epico", categoria: "pets", collection: "pets", descricao: "Um fantasminha fofo que assombra com carinho.", meta: {pet: "ghost"} },
  { key: "pet.robot", tipo: "pet", nome: "Robozinho", raridade: "epico", categoria: "pets", collection: "pets", descricao: "Um robozinho com LED que pisca e processa carinho.", meta: {pet: "robot"} },

  // ---- Status animados ----
  { key: "status.playing", tipo: "status", nome: "Jogando", raridade: "comum", categoria: "status", collection: "status", descricao: "Controle pulando ao lado do seu nome.", meta: {status: "playing"} },
  { key: "status.busy", tipo: "status", nome: "Ocupado", raridade: "comum", categoria: "status", collection: "status", descricao: "Pulsa em vermelho: melhor não incomodar.", meta: {status: "busy"} },
  { key: "status.music", tipo: "status", nome: "Ouvindo música", raridade: "raro", categoria: "status", collection: "status", descricao: "Barrinhas de equalizador dançando.", meta: {status: "music"} },
  { key: "status.sleep", tipo: "status", nome: "Dormindo", raridade: "raro", categoria: "status", collection: "status", descricao: "Uma lua com zzz subindo.", meta: {status: "sleep"} },
  { key: "status.code", tipo: "status", nome: "Codando", raridade: "raro", categoria: "status", collection: "status", descricao: "Colchetes com cursor piscando.", meta: {status: "code"} },
  { key: "status.live", tipo: "status", nome: "Ao vivo", raridade: "epico", categoria: "status", collection: "status", descricao: "Ponto vermelho pulsando: você está transmitindo.", meta: {status: "live"} },
  { key: "status.afk", tipo: "status", nome: "Já volto", raridade: "comum", categoria: "status", collection: "status", descricao: "Um cafezinho esperando você voltar.", meta: {status: "afk"} },
  { key: "status.study", tipo: "status", nome: "Estudando", raridade: "comum", categoria: "status", collection: "status", descricao: "Um livro aberto, brilhando de leve.", meta: {status: "study"} },

  // ---- Banners animados (capa do perfil) ----
  { key: "banner.aurora", tipo: "banner", nome: "Aurora", raridade: "epico", categoria: "banners", collection: "banners", descricao: "Luzes verdes e roxas dançando no céu.", meta: {banner: "aurora"} },
  { key: "banner.neonrain", tipo: "banner", nome: "Chuva neon", raridade: "raro", categoria: "banners", collection: "banners", descricao: "Fios de luz neon caindo.", meta: {banner: "neonrain"} },
  { key: "banner.waves", tipo: "banner", nome: "Ondas", raridade: "comum", categoria: "banners", collection: "banners", descricao: "Ondas azuis deslizando.", meta: {banner: "waves"} },
  { key: "banner.stars", tipo: "banner", nome: "Estrelas", raridade: "raro", categoria: "banners", collection: "banners", descricao: "Céu estrelado com uma estrela cadente.", meta: {banner: "stars"} },
  { key: "banner.lava", tipo: "banner", nome: "Lava", raridade: "epico", categoria: "banners", collection: "banners", descricao: "Bolhas de lava subindo.", meta: {banner: "lava"} },
  { key: "banner.sakura", tipo: "banner", nome: "Sakura", raridade: "raro", categoria: "banners", collection: "banners", descricao: "Pétalas de cerejeira caindo.", meta: {banner: "sakura"} },
  { key: "banner.sunset", tipo: "banner", nome: "Pôr do sol", raridade: "lendario", categoria: "banners", collection: "banners", descricao: "Sol se pondo atrás das colinas.", meta: {banner: "sunset"} },
  { key: "banner.matrix", tipo: "banner", nome: "Código verde", raridade: "epico", categoria: "banners", collection: "banners", descricao: "Chuva de código verde.", meta: {banner: "matrix"} },

  // ---- Brasil ----
  { key: "brasil.theme", tipo: "theme", nome: "Brasil", raridade: "epico", categoria: "brasil", collection: "brasil", descricao: "Verde, amarelo e azul nas bordas, uma bola no canto: clique nela e comemore.", meta: {theme: "brasil", lights: true, corner: "ball"} },
  { key: "brasil.frame.laurel", tipo: "frame", nome: "Louros", raridade: "raro", categoria: "brasil", collection: "brasil", descricao: "Coroa de louros verde com estrelas amarelas.", meta: {style: "laurel"} },
  { key: "brasil.frame.arc", tipo: "frame", nome: "Arco verde-amarelo", raridade: "comum", categoria: "brasil", collection: "brasil", descricao: "Arcos verde e amarelo em volta do avatar.", meta: {style: "bflag"} },
  { key: "brasil.badge.fan", tipo: "badge", nome: "Torcedor", raridade: "raro", categoria: "brasil", collection: "brasil", descricao: "Para quem veste a camisa.", meta: {icon: "trophy"} },
  { key: "brasil.entrance.gol", tipo: "entrance", nome: "GOOOOL!", raridade: "epico", categoria: "brasil", collection: "brasil", descricao: "Ao entrar na sala: GOOOOL! com bola, troféu e cafezinho voando.", meta: {fx: "gol", sound: "goal"} },
  { key: "brasil.name.verde", tipo: "name_effect", nome: "Verde e amarelo", raridade: "raro", categoria: "brasil", collection: "brasil", descricao: "Degradê verde e amarelo.", meta: {style: "brverde"} },
  { key: "brasil.name.azul", tipo: "name_effect", nome: "Azul estrelado", raridade: "comum", categoria: "brasil", collection: "brasil", descricao: "Azul profundo com brilho de estrela.", meta: {style: "brazul"} },
  { key: "brasil.reactions", tipo: "reaction", nome: "Reações do Brasil", raridade: "raro", categoria: "brasil", collection: "brasil", descricao: "Bola, café e violão para a reação gigante.", meta: {icons: ["soccer", "coffee", "guitar"]} },

  // ---- Carnaval ----
  { key: "carnaval.theme", tipo: "theme", nome: "Bloco de rua", raridade: "epico", categoria: "carnaval", collection: "carnaval", descricao: "Confete e serpentina nas bordas e uma máscara no canto: clique nela e o bloco sai.", meta: {theme: "carnaval", lights: true, corner: "mask"} },
  { key: "carnaval.frame.mask", tipo: "frame", nome: "Máscara", raridade: "raro", categoria: "carnaval", collection: "carnaval", descricao: "Uma máscara de carnaval com glitter.", meta: {style: "cmask"} },
  { key: "carnaval.frame.feather", tipo: "frame", nome: "Penas", raridade: "epico", categoria: "carnaval", collection: "carnaval", descricao: "Penas coloridas em arco no avatar.", meta: {style: "cfeather"} },
  { key: "carnaval.badge.folia", tipo: "badge", nome: "Folião", raridade: "raro", categoria: "carnaval", collection: "carnaval", descricao: "Quem pulou o carnaval inteiro.", meta: {icon: "music"} },
  { key: "carnaval.entrance.bloco", tipo: "entrance", nome: "Bora pro bloco!", raridade: "epico", categoria: "carnaval", collection: "carnaval", descricao: "Ao entrar na sala: Bora pro bloco! com máscaras, tambores e serpentinas.", meta: {fx: "bloco", sound: "drums"} },
  { key: "carnaval.name.confete", tipo: "name_effect", nome: "Confete", raridade: "comum", categoria: "carnaval", collection: "carnaval", descricao: "Cores de confete no nome.", meta: {style: "cconfete"} },
  { key: "carnaval.name.glitter", tipo: "name_effect", nome: "Glitter", raridade: "raro", categoria: "carnaval", collection: "carnaval", descricao: "Dourado e rosa com brilho.", meta: {style: "cglitter"} },
  { key: "carnaval.reactions", tipo: "reaction", nome: "Reações de Carnaval", raridade: "raro", categoria: "carnaval", collection: "carnaval", descricao: "Máscara, tambor e serpentina para a reação gigante.", meta: {icons: ["mask", "drum", "streamer"]} },

  // ---- Memes ----
  { key: "meme.theme", tipo: "theme", nome: "Meme Lab", raridade: "epico", categoria: "memes", collection: "memes", descricao: "Roxo e verde-limão de laboratório, uma seta de stonks no canto: clique nela.", meta: {theme: "memes", lights: true, corner: "stonks"} },
  { key: "meme.frame.shades", tipo: "frame", nome: "Óculos de pixel", raridade: "raro", categoria: "memes", collection: "memes", descricao: "Óculos escuros de pixel no seu avatar.", meta: {style: "shades"} },
  { key: "meme.frame.plus", tipo: "frame", nome: "Aura +1000", raridade: "epico", categoria: "memes", collection: "memes", descricao: "Um selo +1000 de aura em volta do avatar.", meta: {style: "plus1000"} },
  { key: "meme.badge.sextou", tipo: "badge", nome: "Sextou", raridade: "raro", categoria: "memes", collection: "memes", descricao: "O dia mais esperado da semana.", meta: {icon: "laugh"} },
  { key: "meme.entrance.sextou", tipo: "entrance", nome: "SEXTOUUU!", raridade: "epico", categoria: "memes", collection: "memes", descricao: "Ao entrar na sala: SEXTOUUU! com caveiras, stonks e óculos.", meta: {fx: "sextou", sound: "boom"} },
  { key: "meme.name.impact", tipo: "name_effect", nome: "Texto Impact", raridade: "raro", categoria: "memes", collection: "memes", descricao: "Branco com contorno preto, clássico de meme.", meta: {style: "impact"} },
  { key: "meme.name.comic", tipo: "name_effect", nome: "Comic dourado", raridade: "comum", categoria: "memes", collection: "memes", descricao: "Letras de gibi douradas.", meta: {style: "comic"} },
  { key: "meme.reactions", tipo: "reaction", nome: "Reações de Meme", raridade: "raro", categoria: "memes", collection: "memes", descricao: "Caveira, stonks e óculos nerd para a reação gigante.", meta: {icons: ["skull", "stonks", "glasses"]} },

  // ---- Anime ----
  { key: "anime.theme", tipo: "theme", nome: "Sakura Dojo", raridade: "epico", categoria: "anime", collection: "anime", descricao: "Noite azul com pétalas rosa e um portal torii no canto: clique nele.", meta: {theme: "anime", lights: true, corner: "torii"} },
  { key: "anime.frame.charms", tipo: "frame", nome: "Amuletos", raridade: "raro", categoria: "anime", collection: "anime", descricao: "Amuletos de papel girando em volta do avatar.", meta: {style: "charms"} },
  { key: "anime.frame.glint", tipo: "frame", nome: "Olhar brilhante", raridade: "epico", categoria: "anime", collection: "anime", descricao: "Faíscas de brilho como nos olhos de anime.", meta: {style: "glint"} },
  { key: "anime.badge.senpai", tipo: "badge", nome: "Senpai", raridade: "raro", categoria: "anime", collection: "anime", descricao: "Reconhecido pela turma.", meta: {icon: "swords"} },
  { key: "anime.entrance.yatta", tipo: "entrance", nome: "Yatta!", raridade: "epico", categoria: "anime", collection: "anime", descricao: "Ao entrar na sala: Yatta! com pétalas, estrelas e leques.", meta: {fx: "yatta", sound: "slash"} },
  { key: "anime.name.toquio", tipo: "name_effect", nome: "Neon Tóquio", raridade: "raro", categoria: "anime", collection: "anime", descricao: "Rosa e ciano de rua de Tóquio à noite.", meta: {style: "atoquio"} },
  { key: "anime.name.sumi", tipo: "name_effect", nome: "Tinta sumi", raridade: "comum", categoria: "anime", collection: "anime", descricao: "Tinta preta com contorno branco.", meta: {style: "asumi"} },
  { key: "anime.reactions", tipo: "reaction", nome: "Reações de Anime", raridade: "raro", categoria: "anime", collection: "anime", descricao: "Sakura, brilho e leque para a reação gigante.", meta: {icons: ["sakura", "sparkle", "fan"]} },
];

/** Reaction icons everybody can send as a "giant reaction"; packs add more. */
export const BASE_GIANT = ["heart", "fire", "party"] as const;
