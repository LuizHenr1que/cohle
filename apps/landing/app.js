/* Cohle landing: OS-aware download buttons, 3D tilt, interactive app demo. No dependencies. */
"use strict";

/* ---------- config: flip `live` once the installers are published ---------- */
const DOWNLOADS = {
  live: true,                                    // installers are published as a public GitHub Release
  base: "https://github.com/LuizHenr1que/cohle-releases/releases/latest/download/",
  files: { "mac-arm64": "Cohle-mac-arm64.dmg", "mac-x64": "Cohle-mac-x64.dmg", "win-x64": "Cohle-win-x64.exe" },   // stable names: /latest/ always resolves
};
const OS_NAME = { "mac-arm64": "macOS", "mac-x64": "macOS (Intel)", "win-x64": "Windows" };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (n, c = "") => `<svg class="i ${c}"><use href="icons.svg#i-${n}"/></svg>`;
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
}

/* ---------- operating system detection ---------- */
async function detectOS() {
  const ua = navigator.userAgent, plat = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  if (/android|iphone|ipad|ipod/i.test(ua)) return { os: "mobile" };
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return { os: "mobile" };          // iPadOS pretends to be a Mac
  if (/X11|Linux/.test(ua) && !/Android/.test(ua)) return { os: "other" };
  if (/win/.test(plat) || /Windows/.test(ua)) return { os: "win", key: "win-x64" };
  if (/mac/.test(plat) || /Macintosh/.test(ua)) {
    let arch = null;
    try { const h = await navigator.userAgentData?.getHighEntropyValues(["architecture"]); if (h?.architecture) arch = /arm/.test(h.architecture) ? "arm64" : "x64"; } catch { /* not supported */ }
    if (!arch) {
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const r = gl ? gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) : "";
        if (/Apple M/i.test(r)) arch = "arm64"; else if (/Intel|AMD|Radeon/i.test(r)) arch = "x64";
      } catch { /* ignore */ }
    }
    return { os: "mac", key: `mac-${arch ?? "arm64"}`, sure: !!arch };
  }
  return { os: "other" };
}

function fileUrl(key) { return DOWNLOADS.live && DOWNLOADS.base ? DOWNLOADS.base + DOWNLOADS.files[key] : null; }
function wireDownload(a, key) {
  a.dataset.key = key;
  const url = fileUrl(key);
  if (url) { a.href = url; a.setAttribute("download", ""); }
  a.addEventListener("click", (e) => {
    if (fileUrl(key)) return;
    e.preventDefault();
    toast("Os instaladores entram no ar na primeira versão pública. Em breve por aqui.");
    $("#baixar").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
}

async function setupDownloads() {
  const d = await detectOS();
  $$("[data-dl]").forEach((a) => wireDownload(a, a.dataset.dl));
  const label = d.key ? `Baixar para ${d.os === "win" ? "Windows" : "macOS"}` : "Baixar o Cohle";
  $$("[data-dl-primary]").forEach((a) => {
    if (d.key) wireDownload(a, d.key); else a.addEventListener("click", () => { /* goes to #baixar */ });
    $$("[data-dl-label]", a).forEach((s) => (s.textContent = $("a.btn-sm") === a ? "Baixar" : label));
    const use = $("[data-dl-icon] use", a);
    if (use && d.key) use.setAttribute("href", `icons.svg#i-${d.os === "win" ? "monitor" : "laptop"}`);
  });
  const others = $("[data-dl-others]");
  if (d.os === "mac") others.innerHTML = `Mac com chip Intel? <a href="#baixar" data-dl="mac-x64">Baixe esta versão</a>. Prefere Windows? <a href="#baixar" data-dl="win-x64">É por aqui</a>.`;
  else if (d.os === "win") others.innerHTML = `Usa Mac? <a href="#baixar" data-dl="mac-arm64">Apple Silicon</a> ou <a href="#baixar" data-dl="mac-x64">Intel</a>.`;
  else if (d.os === "mobile") others.innerHTML = `Celular: o app está em construção. Por enquanto o Cohle roda no <a href="/app/">navegador</a>, no <a href="#baixar" data-dl="mac-arm64">Mac</a> e no <a href="#baixar" data-dl="win-x64">Windows</a>.`;
  else others.innerHTML = `Disponível para <a href="#baixar" data-dl="mac-arm64">macOS</a> e <a href="#baixar" data-dl="win-x64">Windows</a>.`;
  $$("[data-dl]", others).forEach((a) => wireDownload(a, a.dataset.dl));
  if (d.key) {
    $(`.dl[data-os="${d.key}"]`)?.classList.add("me");
    const line = $("[data-dl-detected]");
    line.textContent = d.os === "win" ? "Detectamos o Windows. O seu instalador está destacado abaixo."
      : d.sure ? "Detectamos um Mac com a sua arquitetura. O seu instalador está destacado abaixo."
      : "Detectamos um Mac. Se o seu for Intel (mais antigo), use o instalador Intel.";
  }
}

/* ---------- current version (title of the latest public release) ---------- */
async function showLatestRelease() {
  try {
    const r = await fetch("https://api.github.com/repos/LuizHenr1que/cohle-releases/releases/latest", { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) return;
    const j = await r.json(); if (!j.name) return;
    const when = j.published_at ? ` · publicada em ${new Date(j.published_at).toLocaleDateString("pt-BR")}` : "";
    $$("[data-release]").forEach((el) => {
      el.replaceChildren();
      el.insertAdjacentHTML("afterbegin", ic("flask-conical"));
      const b = document.createElement("b"); b.textContent = j.name;     // textContent: the title is data, never HTML
      el.append(b, document.createTextNode(when)); el.hidden = false;
    });
  } catch { /* offline or rate limited: the page simply does not show the line */ }
}

/* ---------- small page behaviours ---------- */
function setupPage() {
  $("#year").textContent = `© ${new Date().getFullYear()} Cohle.`;
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("stuck", scrollY > 8);
  onScroll(); addEventListener("scroll", onScroll, { passive: true });

  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  // spotlight that follows the pointer on cards
  $$(".card").forEach((c) => c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  $$(".seg button").forEach((b) => b.addEventListener("click", () => {
    $$(".seg button").forEach((x) => x.classList.toggle("on", x === b)); $("#segNote").textContent = b.dataset.q;
  }));
  $$("[data-r]").forEach((r) => r.addEventListener("input", () => (r.parentElement.querySelector("b").textContent = `${r.value}%`)));
}

/* ---------- 3D tilt: rotateY(12deg) rotateX(6deg) at rest, follows the pointer ---------- */
function setupTilt() {
  const stage = $("#stage3d"), tilt = $("#tilt");
  const small = matchMedia("(max-width: 700px)").matches;
  const base = small ? { ry: 6, rx: 3 } : { ry: 12, rx: 6 };
  const reset = () => { tilt.style.setProperty("--ry", `${base.ry}deg`); tilt.style.setProperty("--rx", `${base.rx}deg`); };
  reset();
  if (reduceMotion) return;
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.setProperty("--ry", `${base.ry - x * 16}deg`); tilt.style.setProperty("--rx", `${base.rx - y * 12}deg`);
  });
  stage.addEventListener("pointerleave", reset);
}

/* ---------- real screenshots gallery ---------- */
const SHOTS = {
  "voz": ["Sala de voz do Cohle com oito pessoas, anéis verdes em quem está falando e botão para assistir transmissões", "A sala de voz: quem está falando ganha um anel verde. Agora ninguém mais pode fingir que não era com ele."],
  "ao-vivo": ["Transmissão ao vivo em tela grande, com barra de volume e botão de tela cheia", "O palco do ao vivo: tela grande, volume só dele e botão de tela cheia. O vídeo só é baixado se você clicar em Assistir."],
  "dono": ["Menu do dono com volume por pessoa e ações como silenciar, desconectar, expulsar e banir", "Volume por pessoa e, se você é o dono, as ações de moderação. Poder demais? Talvez. Responsabilidade? Com certeza."],
  "chat": ["Canal de texto com mensagens em tempo real", "O chat em tempo real, para as decisões importantes da vida, como o horário da partida."],
  "criar": ["Tela de criar servidor com modelos prontos", "Servidor novo em dois cliques: escolha um modelo e ele já nasce com os canais certos."],
  "membros": ["Configurações do servidor com a lista de membros", "Configurações do servidor: membros, canais, convite e a lista de banidos (com botão de desbanir)."],
  "login": ["Tela de entrada do Cohle", "A porta de entrada. Login social (Google e GitHub) está na fila de construção."],
};
const LOJA_SHOTS = {
  "vitrine": ["Vitrine da Loja do Cohle com as coleções de Natal e Halloween e o selo Preview Beta", "A vitrine: coleções de temporada com contagem regressiva, tudo com o selo Preview Beta (grátis durante o beta)."],
  "auras": ["Coleção de Auras da Loja com oito auras animadas: fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon", "As auras giram, queimam e brilham em volta do seu avatar. Passe o mouse e veja. Fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon."],
  "colecoes": ["Banners das coleções Hacker, Gamer, Barbearia e Rainha com a arte de cada item", "Cada coleção mostra tudo o que vem nela: tema, moldura, nome, emblema, entrada e reações. Clicou, viu, decidiu."],
  "previa": ["Prévia grande de um conjunto da Loja no avatar da própria pessoa", "A prévia mostra o conjunto no seu próprio avatar, com a entrada tocando ao vivo. Gostou? Pega. Não gostou? Sai."],
  "natal": ["Cohle com o tema de Natal: neve, luzinhas, árvore e contagem para o Natal", "Tema de Natal: neve, luzinhas e uma árvore no canto. Clique nela e o Papai Noel passa no trenó."],
  "halloween": ["Cohle com o tema de Halloween: luzes laranja e roxas, abóbora no canto e contagem", "Tema de Halloween: luzes laranja e roxas e uma abóbora no canto. Clique nela e a bruxa passa de vassoura."],
  "hacker": ["Cohle com o tema Hacker: verde de terminal, luzes verdes e terminal no canto", "Tema Hacker: verde de terminal sobre preto. Clique no terminal para ver ACCESS GRANTED."],
  "grupos": ["Barra lateral do Cohle com servidores organizados em grupos que se recolhem", "Muitos servidores? Agrupe. Cada grupo tem nome e cor, recolhe num ícone só e vale em qualquer aparelho."],
};
const APP_GALLERY = { img: "#shotImg", cap: "#shotCap", main: "#shotMain", stage: "#shotStage", tabs: "#app-real .shot-tabs", shots: SHOTS, first: "voz", prefix: "" };
const LOJA_GALLERY = { img: "#lojaImg", cap: "#lojaCap", main: "#lojaMain", stage: "#lojaStage", tabs: "#loja .shot-tabs", shots: LOJA_SHOTS, first: "vitrine", prefix: "loja-" };
function setupGallery(cfg) {
  const img = $(cfg.img), cap = $(cfg.cap), main = $(cfg.main), stage = $(cfg.stage), tabs = `${cfg.tabs} button`, shots = cfg.shots;
  if (!img || !stage) return;
  const set = (k) => {
    $$(tabs).forEach((b) => b.classList.toggle("on", b.dataset.shot === k));
    img.classList.add("swap");
    setTimeout(() => { img.src = `shots/${cfg.prefix}${k}.jpg`; img.alt = shots[k][0]; cap.textContent = shots[k][1]; img.onload = () => img.classList.remove("swap"); }, 160);
  };
  cap.textContent = shots[cfg.first][1];
  $$(tabs).forEach((b) => b.addEventListener("click", () => set(b.dataset.shot)));
  if (reduceMotion) return;
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = main.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    main.style.setProperty("--sy", `${x * 7}deg`); main.style.setProperty("--sx", `${-y * 5}deg`);
  });
  stage.addEventListener("pointerleave", () => { main.style.setProperty("--sy", "0deg"); main.style.setProperty("--sx", "0deg"); });
  // preload the other screens once the section is near the viewport
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { Object.keys(shots).forEach((k) => (new Image().src = `shots/${cfg.prefix}${k}.jpg`)); o.disconnect(); } }, { rootMargin: "400px" }).observe(stage);
}

/* ---------- floating dots background ---------- */
function setupDots() {
  if (reduceMotion) return;
  const cv = $("#dots"), ctx = cv.getContext("2d"); let w, h, dots = [], last = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = Array.from({ length: Math.round(Math.min(46, Math.max(18, (w * h) / 34000))) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .22, vy: .07 + Math.random() * .26, r: .8 + Math.random() * 1.7 }));
  };
  const frame = (t) => {
    requestAnimationFrame(frame);
    if (document.hidden || t - last < 33) return; last = t; ctx.clearRect(0, 0, w, h);
    for (const d of dots) { d.x += d.vx; d.y += d.vy; if (d.y > h + 8) { d.y = -8; d.x = Math.random() * w; } if (d.x < -8) d.x = w + 8; if (d.x > w + 8) d.x = -8; }
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
      const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, q = dx * dx + dy * dy;
      if (q < 16900) { ctx.strokeStyle = `rgba(255,90,110,${(1 - Math.sqrt(q) / 130) * .16})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke(); }
    }
    ctx.fillStyle = "rgba(255,120,130,.7)"; ctx.shadowColor = "rgba(255,59,92,.8)"; ctx.shadowBlur = 8;
    for (const d of dots) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); } ctx.shadowBlur = 0;
  };
  resize(); addEventListener("resize", resize); requestAnimationFrame(frame);
}

/* =====================================================================================
   Interactive app demo (same layout and tokens as the real client; design size 1000x620)
   ===================================================================================== */
function setupDemo() {
  const root = $("#mock"), wrap = $("#mockWrap");
  const PEOPLE = ["Bruno", "Carla", "Diego", "Elisa", "Felipe"];
  const LIVE = new Set(["Bruno", "Carla"]);
  const SERVERS = [
    { name: "Squad da Noite", short: "S", text: ["geral", "memes", "clipes"], voice: "Resenha", chat: {
      geral: [["Ana", "Bom dia, pessoal! Hoje tem partida às 21h"], ["Bruno", "Confirmado. O áudio aqui está cristalino"], ["Carla", "Vou compartilhar a tela pra vocês verem o replay"], ["Diego", "E só baixa o vídeo quem clicar em Assistir. Zero peso"]],
      memes: [["Elisa", "Quem mutou o Felipe de novo?"], ["Felipe", "Fui eu mesmo. Estava respirando alto"]],
      clipes: [["Carla", "Clipe da noite: a jogada impossível"], ["Ana", "Assisti três vezes. Não fez sentido nenhum"]] } },
    { name: "Grupo de Estudo", short: "G", text: ["geral", "materiais"], voice: "Sala 1", chat: {
      geral: [["Elisa", "Alguém dividindo a tela na sala 1?"], ["Diego", "Eu! Mas só mostro o resumo, o caderno é segredo"]],
      materiais: [["Ana", "Subi o resumo no drive"], ["Bruno", "Salvou a minha prova de amanhã"]] } },
    { name: "Criadores", short: "C", text: ["geral", "projetos"], voice: "Estúdio", chat: {
      geral: [["Carla", "Meu projeto novo sai semana que vem"], ["Felipe", "Posso ver um preview ao vivo?"]],
      projetos: [["Ana", "Sala de voz aberta para feedback"], ["Diego", "Chego já, só vou ajustar o microfone"]] } },
  ];
  const REPLIES = ["Fechou!", "Kkk não acredito", "Bora então", "Já estou entrando na sala", "Isso! Agora sim", "Alguém liga o microfone aí?", "Manda o código de convite"];

  const s = { srv: 0, view: "voice", channel: "geral", mic: true, deaf: false, cam: false, share: false, lite: false, owner: false, muted: {}, pop: null, fs: false, vol: 140, chat: JSON.parse(JSON.stringify(SERVERS.map((x) => x.chat))) };
  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const av = (n, cls = "") => `<span class="m-av ${cls}" data-av="${n}">${n[0]}</span>`;

  const rail = () => `
    <aside class="m-glass m-rail">
      <img src="logo-mark.svg" alt="" />
      ${SERVERS.map((v, i) => `<button class="m-srv ${i === s.srv ? "on" : ""}" data-act="srv" data-i="${i}" title="${v.name}">${v.short}</button>`).join("")}
      <div class="m-hr"></div>
      <button class="m-rb" data-act="soon" title="Criar servidor">${ic("plus")}</button>
      <button class="m-rb" data-act="soon" title="Entrar com convite">${ic("link-2")}</button>
      <div class="m-sp"></div>
      <button class="m-rb ${s.lite ? "on" : ""}" data-act="lite" title="Modo Leve">${ic("zap")}</button>
    </aside>`;

  const panel = () => {
    const v = SERVERS[s.srv], inVoice = s.view !== "text";
    return `<aside class="m-glass m-panel">
      <div class="m-ph"><span class="m-si">${v.short}</span><b>${v.name}</b>${s.owner ? `<span style="color:#ff8a5b">${ic("crown")}</span>` : ""}<span style="color:var(--muted)">${ic("sliders-horizontal")}</span></div>
      <button class="m-invite" data-act="invite">${ic("user-plus")}Convidar pessoas</button>
      <div class="m-sec">TEXTO ${ic("plus")}</div>
      ${v.text.map((c) => `<button class="m-ch ${!inVoice && c === s.channel ? "on" : ""}" data-act="text" data-c="${c}">${ic("hash")}${c}</button>`).join("")}
      <div class="m-sec">VOZ ${ic("plus")}</div>
      <button class="m-ch ${inVoice ? "on" : ""}" data-act="voice">${ic("volume-2")}${v.voice}<span class="n">6</span></button>
      ${inVoice ? ["Você", ...PEOPLE].map((n) => `<div class="m-vu">${av(n, "sm")}${n}${LIVE.has(n) ? `<span class="live">${ic("screen-share")}AO VIVO</span>` : n === "Você" && s.share ? `<span class="live">${ic("screen-share")}AO VIVO</span>` : ""}</div>`).join("") : ""}
      <div class="m-sp"></div>
      <div class="m-me">${av("V")}<div><b>Você</b><small>Online</small></div></div>
    </aside>`;
  };

  const chatHtml = () => {
    const v = SERVERS[s.srv], list = s.chat[s.srv][s.channel] || [];
    return `<header class="m-head">${ic("hash")}${s.channel}</header>
      <div class="m-body"><div class="m-msgs" id="mMsgs">${list.map(([n, t]) => msg(n, t)).join("")}</div>
      <div class="m-typing" id="mTyping"></div>
      <form class="m-comp" id="mForm"><input id="mInput" placeholder="Mensagem em #${s.channel}" autocomplete="off" /><button aria-label="Enviar">${ic("send")}</button></form></div>`;
  };
  const msg = (n, t) => `<div class="m-msg">${av(n === "Você" ? "V" : n, "lg")}<div><b>${n}</b><time>${now()}</time><p>${t}</p></div></div>`;

  const tile = (n) => {
    const me = n === "Você", live = LIVE.has(n) || (me && s.share), muted = s.muted[n];
    const pop = s.pop === n ? `<div class="m-pop" style="right:6px;top:42px" data-keep>
        <h6>${n}</h6><label>Volume da voz <b id="pv">${s.vol}%</b></label><input type="range" min="0" max="200" value="${s.vol}" data-act="pvol" />
        ${s.owner ? `<div class="own"><small>${ic("shield-alert")}Ações do dono</small>
          <button data-act="own" data-k="mute">${ic("mic-off")}${muted ? "Liberar o microfone" : "Silenciar para todos"}</button>
          <button data-act="own" data-k="dc">${ic("phone-missed")}Desconectar da chamada</button>
          <button data-act="own" data-k="kick">${ic("user-x")}Expulsar do servidor</button>
          <button data-act="own" data-k="ban">${ic("ban")}Banir do servidor</button></div>` : ""}</div>` : "";
    return `<div class="m-tile" data-n="${n}">
      ${live ? `<span class="badge-live">${ic("screen-share")}AO VIVO</span>` : ""}
      ${av(n === "Você" ? "V" : n, "lg")}
      ${live && !me ? `<button class="watch" data-act="watch" data-n="${n}">${ic("monitor-play")}Assistir</button>` : ""}
      ${me && s.share ? `<span style="position:absolute;bottom:38px;font-size:10.5px;color:var(--muted)">Você está compartilhando a tela</span>` : ""}
      <span class="nm">${me ? "Você" : n}</span>
      ${me ? "" : `<div class="tr"><button data-act="menu" data-n="${n}" title="Volume e opções">${ic("volume-2")}</button></div>`}
      ${muted ? `<span class="lock">${ic("lock")}Silenciado</span>` : me && !s.mic ? `<span class="micoff">${ic("mic-off")}</span>` : ""}
      ${pop}</div>`;
  };
  const controls = () => `<div class="m-ctrl">
      <button class="m-cb ${s.mic ? "" : "off"}" data-act="mic" title="Microfone">${ic(s.mic ? "mic" : "mic-off")}</button>
      <button class="m-cb ${s.deaf ? "off" : ""}" data-act="deaf" title="Ensurdecer">${ic(s.deaf ? "headphone-off" : "headphones")}</button>
      <button class="m-cb ${s.cam ? "on" : ""}" data-act="cam" title="Câmera">${ic(s.cam ? "video" : "video-off")}</button>
      <button class="m-cb ${s.share ? "on" : ""}" data-act="share" title="Compartilhar tela">${ic("monitor-up")}</button>
      <button class="m-cb leave" data-act="leave" title="Sair">${ic("phone-off")}</button></div>`;
  const voiceHtml = () => `<header class="m-head">${ic("volume-2")}${SERVERS[s.srv].voice}<span class="r"><i class="m-dot"></i>Conectado · 6 na sala</span></header>
      <div class="m-body"><div class="m-grid">${["Você", ...PEOPLE].map(tile).join("")}</div>${controls()}</div>`;

  const lines = [["52%", "#ff6384", "0s"], ["34%", "#7ee2b8", ".25s"], ["64%", "#8aa8ff", ".5s"], ["40%", "#ffaa64", ".75s"], ["58%", "#c896ff", "1s"], ["30%", "#ff6384", "1.25s"], ["48%", "#7ee2b8", "1.5s"], ["62%", "#8aa8ff", "1.75s"]];
  const stageHtml = () => {
    const n = s.watching;
    return `<header class="m-head">${ic("volume-2")}${SERVERS[s.srv].voice}<span class="r"><i class="m-dot"></i>Conectado · 6 na sala</span></header>
      <div class="m-body"><div class="m-stage ${s.fs ? "fs" : ""}" id="mStage">
        <div class="m-screen"><span class="ov">${ic("screen-share")}AO VIVO</span>
          <div class="m-win"><div class="tb"><i></i><i></i><i></i></div><div class="side">${"<u></u>".repeat(6)}</div>
            <div class="m-code">${lines.map(([w, c, d]) => `<u style="--w:${w};--c:${c};--d:${d}"></u>`).join("")}</div><span class="m-cur"></span></div>
          <div class="m-game"><i></i></div></div>
        <div class="m-sbar"><span class="who">${av(n)}${n}</span>
          <span class="vol">${ic(s.vol ? "volume-2" : "volume-x")}Som<input type="range" min="0" max="200" value="${s.vol}" data-act="svol" /><b id="sv">${s.vol}%</b></span>
          <button data-act="fs" title="Tela cheia">${ic(s.fs ? "minimize-2" : "maximize-2")}</button><button data-act="unwatch" title="Parar de assistir">${ic("x")}</button></div></div>
      ${s.fs ? "" : controls()}</div>`;
  };

  const main = () => `<main class="m-glass m-main" id="mMain">${s.view === "text" ? chatHtml() : s.view === "voice" ? voiceHtml() : stageHtml()}</main>`;
  function render() { root.innerHTML = rail() + panel() + main(); root.classList.toggle("lite", s.lite); if (s.view === "text") { const m = $("#mMsgs"); if (m) m.scrollTop = m.scrollHeight; } }

  const mtoast = (t) => { $(".m-toast", root)?.remove(); const el = document.createElement("div"); el.className = "m-toast"; el.textContent = t; $("#mMain", root).append(el); setTimeout(() => el.remove(), 2800); };
  const touched = () => $("#demoHint")?.classList.add("gone");

  function addMsg(n, t) {
    s.chat[s.srv][s.channel] = [...(s.chat[s.srv][s.channel] || []), [n, t]].slice(-5);
    const box = $("#mMsgs", root); if (!box) return;
    box.insertAdjacentHTML("beforeend", msg(n, t)); while (box.children.length > 5) box.firstElementChild.remove();
  }
  function say(text) {
    addMsg("Você", text);
    const who = rand(["Ana", ...PEOPLE]), tp = $("#mTyping", root);
    if (tp) tp.textContent = `${who} está digitando...`;
    setTimeout(() => { if (s.view === "text") { if ($("#mTyping", root)) $("#mTyping", root).textContent = ""; addMsg(who, rand(REPLIES)); } }, 1300);
  }

  const act = {
    srv(el) { s.srv = +el.dataset.i; s.view = "text"; s.channel = SERVERS[s.srv].text[0]; s.pop = null; render(); },
    text(el) { s.view = "text"; s.channel = el.dataset.c; s.pop = null; render(); },
    voice() { s.view = "voice"; s.pop = null; render(); },
    leave() { s.view = "text"; s.share = false; s.pop = null; render(); },
    mic() { s.mic = !s.mic; if (s.mic) s.deaf = false; render(); },
    deaf() { s.deaf = !s.deaf; if (s.deaf) s.mic = false; render(); },
    cam() { s.cam = !s.cam; render(); },
    share() { s.share = !s.share; render(); if (s.share) mtoast("Escolha a tela e a qualidade: Leve, Equilibrada ou Alta"); },
    menu(el) { s.pop = s.pop === el.dataset.n ? null : el.dataset.n; render(); },
    watch(el) { s.watching = el.dataset.n; s.view = "stage"; s.pop = null; render(); },
    unwatch() { s.view = "voice"; s.fs = false; render(); },
    fs() { s.fs = !s.fs; render(); },
    own(el) {
      const k = el.dataset.k, n = s.pop;
      if (k === "mute") { s.muted[n] = !s.muted[n]; s.pop = null; render(); mtoast(s.muted[n] ? `${n} foi silenciado para todos (de mentirinha)` : `${n} pode falar de novo`); }
      else { s.pop = null; render(); mtoast("Isso é só uma demo: ninguém foi tirado de verdade."); }
    },
    lite() { s.lite = !s.lite; render(); mtoast(s.lite ? "Modo Leve: sem desfoque e sem animações" : "Efeitos de volta"); },
    invite() { mtoast("Código copiado: a3f9c1d07b"); },
    soon() { mtoast("Aqui é só uma demo, mas no app dá para criar servidores"); },
  };

  root.addEventListener("click", (e) => {
    touched();
    const el = e.target.closest("[data-act]"); if (!el || el.matches("input")) { if (!e.target.closest("[data-keep]") && s.pop) { s.pop = null; render(); } return; }
    act[el.dataset.act]?.(el);
  });
  root.addEventListener("input", (e) => {
    const a = e.target.dataset.act;
    if (a === "pvol" || a === "svol") { s.vol = +e.target.value; $("#pv", root) && ($("#pv", root).textContent = `${s.vol}%`); $("#sv", root) && ($("#sv", root).textContent = `${s.vol}%`); }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault(); touched();
    const inp = $("#mInput", root), t = inp.value.trim(); if (!t) return; inp.value = ""; say(t);
  });
  root.addEventListener("focusin", touched);

  // who is talking: green rings jump around (only while the demo is on screen)
  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.1 }).observe(wrap);
  setInterval(() => {
    if (!visible || document.hidden || reduceMotion) return;
    $$(".speaking", root).forEach((x) => x.classList.remove("speaking"));
    const names = ["Ana", ...PEOPLE].sort(() => Math.random() - 0.5).slice(0, 2);
    names.forEach((n) => { $(`.m-tile[data-n="${n}"]`, root)?.classList.add("speaking"); $$(`[data-av="${n}"]`, root).forEach((x) => x.classList.add("speaking")); });
    if (s.view === "voice" && s.mic && Math.random() < 0.5) $(`.m-tile[data-n="Você"]`, root)?.classList.add("speaking");
  }, 900);

  // scale the 1000x620 design to the container width
  const fit = () => { const sc = Math.max(0.3, wrap.clientWidth / 1000); root.style.setProperty("--s", sc); wrap.style.height = `${620 * sc}px`; };
  new ResizeObserver(fit).observe(wrap); fit();
  render();

  // guided buttons under the 3D card
  const api = {
    voice() { act.voice(); },
    stage() { s.view = "voice"; render(); setTimeout(() => act.watch({ dataset: { n: "Bruno" } }), 500); },
    owner() { s.owner = true; s.view = "voice"; render(); setTimeout(() => { s.pop = "Diego"; render(); mtoast("Você é o dono: repare nas ações no menu"); }, 450); },
    lite() { act.lite(); },
    chat() { s.view = "text"; s.channel = SERVERS[s.srv].text[0]; render(); const i = $("#mInput", root); let k = 0; const txt = "Bora fazer a resenha de hoje?"; const t = setInterval(() => { i.value = txt.slice(0, ++k); if (k >= txt.length) { clearInterval(t); setTimeout(() => say(txt) || (i.value = ""), 400); } }, 45); },
  };
  $$("[data-try]").forEach((b) => b.addEventListener("click", () => { touched(); api[b.dataset.try]?.(); }));
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  setupPage(); showLatestRelease(); setupDownloads(); setupTilt(); setupDots(); setupDemo(); setupGallery(APP_GALLERY); setupGallery(LOJA_GALLERY);
});
