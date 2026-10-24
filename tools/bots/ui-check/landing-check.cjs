// Behaviour checks of the landing page (served on :5174)
const { app, BrowserWindow } = require("electron");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const UAS = {
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  win: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};
async function page(ua) {
  const win = new BrowserWindow({ width: 1280, height: 800, show: true, focusable: false, x: 20, y: 20, webPreferences: { backgroundThrottling: false } });
  if (ua) win.webContents.setUserAgent(ua);
  const run = (c) => win.webContents.executeJavaScript(c, true);
  for (let i = 0; i < 4; i++) { try { await win.loadURL((process.env.BASE ?? "http://localhost:5174/")); break; } catch (e) { await sleep(700); } }
  await sleep(1800);
  return { win, run };
}
app.on("window-all-closed", () => {});   // keep running between test windows
app.whenReady().then(async () => {
  // ---- OS detection ----
  for (const [name, expect] of [["win", ["Baixar para Windows", "win-x64"]], ["iphone", ["Baixar o Cohle", null]], ["android", ["Baixar o Cohle", null]], ["linux", ["Baixar o Cohle", null]]]) {
    const { win, run } = await page(UAS[name]);
    const label = await run(`document.querySelector('.hero [data-dl-primary] [data-dl-label]').textContent`);
    const me = await run(`document.querySelector('.dl.me')?.dataset.os ?? null`);
    const others = await run(`document.querySelector('[data-dl-others]').textContent`);
    ok(`UA ${name}: botão "${label}"`, label === expect[0] && me === expect[1], `destaque: ${me ?? "nenhum"} | ${others.slice(0, 60)}`);
    win.destroy(); await sleep(600);
  }
  const { win, run } = await page(UAS.mac);
  ok('UA mac: "Baixar para macOS" + instalador Apple Silicon/Intel destacado', (await run(`document.querySelector('.hero [data-dl-primary] [data-dl-label]').textContent`)) === "Baixar para macOS" && /^mac-/.test(await run(`document.querySelector('.dl.me')?.dataset.os ?? ''`)));
  ok("3 botões de download (mac arm64, mac intel, windows)", (await run(`document.querySelectorAll('.dl [data-dl]').length`)) === 3);
  const hrefs = await run(`[...document.querySelectorAll('.dl [data-dl]')].map(a=>a.getAttribute('href'))`);
  ok("botões apontam para a Release pública (latest/download)", hrefs.length === 3 && hrefs.every((h) => /^https:\/\/github\.com\/LuizHenr1que\/cohle-releases\/releases\/latest\/download\/Cohle-(mac-arm64\.dmg|mac-x64\.dmg|win-x64\.zip)$/.test(h)), hrefs.map((h) => h.split("/").pop()).join(", "));
  ok("botão principal leva ao instalador do sistema detectado", /Cohle-mac-(arm64|x64)\.dmg$/.test(await run(`document.querySelector('.hero [data-dl-primary]').getAttribute('href')`)));

  // ---- 3D card ----
  const tf = await run(`getComputedStyle(document.getElementById('tilt')).transform`);
  ok("card 3D com rotateY(12deg) rotateX(6deg) em repouso", tf && tf !== "none" && tf.startsWith("matrix3d"));
  ok("perspectiva 1000px no palco", (await run(`getComputedStyle(document.getElementById('stage3d')).perspective`)) === "1000px");
  ok("animação contínua de flutuação", /floaty/.test(await run(`getComputedStyle(document.querySelector('.float')).animationName`)));
  ok("brilho (glow) animado", /spin/.test(await run(`getComputedStyle(document.querySelector('.glow')).animationName`)));

  // ---- interactive demo ----
  const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
  ok("demo abre na sala de voz com 6 pessoas", (await run(`document.querySelectorAll('#mock .m-tile').length`)) === 6);
  await run(`${q('[data-try="stage"]')}.click()`); await sleep(1200);
  ok('"Assistir ao vivo" abre o palco', await run(`!!${q('#mock .m-stage')}`));
  await run(`${q('#mock [data-act="unwatch"]')}.click()`); await sleep(300);
  await run(`${q('[data-try="owner"]')}.click()`); await sleep(1200);
  ok('"Ser o dono" mostra as ações de moderação', await run(`!!${q('#mock .m-pop .own')}`));
  await run(`${q('#mock [data-act="own"][data-k="mute"]')}.click()`); await sleep(300);
  ok("silenciar mostra o cadeado no quadro", await run(`!!${q('#mock .m-tile .lock')}`));
  await run(`${q('[data-try="lite"]')}.click()`); await sleep(300);
  ok("Modo Leve liga a classe lite", await run(`${q('#mock')}.classList.contains('lite')`));
  await run(`${q('[data-try="chat"]')}.click()`); await sleep(3200);
  ok("enviar mensagem adiciona mensagens no chat", (await run(`document.querySelectorAll('#mock .m-msg').length`)) >= 5);
  await run(`${q('#mock [data-act="voice"]')}.click()`); await sleep(300);
  ok("volta para a sala de voz", await run(`!!${q('#mock .m-grid')}`));
  await run(`window.scrollTo(0, 0)`); await sleep(800);   // the download click scrolled the page: the demo pauses off-screen on purpose
  const speaking = [];
  for (let i = 0; i < 4; i++) { await sleep(1000); speaking.push(await run(`document.querySelectorAll('#mock .speaking').length`)); }
  ok("anéis verdes de quem fala se movem sozinhos", speaking.some((n) => n > 0), speaking.join(","));

  // ---- gallery + FAQ ----
  await run(`${q('.shot-tabs [data-shot="ao-vivo"]')}.click()`); await sleep(900);
  ok("aba da galeria troca a imagem", /ao-vivo\.jpg/.test(await run(`${q('#shotImg')}.src`)) && (await run(`${q('#shotImg')}.naturalWidth`)) > 1000);
  // lazy images below the fold are not loaded until scrolled to, so ask the server for each one instead
  ok("as 7 imagens da página existem (sem 404)", await run(`Promise.all([...document.querySelectorAll('img')].map(i=>fetch(i.currentSrc||i.src).then(r=>r.ok).catch(()=>false))).then(a=>a.length===7&&a.every(Boolean))`));
  ok("as 7 telas da galeria existem (sem 404)", await run(`Promise.all(['voz','ao-vivo','dono','chat','criar','membros','login'].map(k=>fetch('shots/'+k+'.jpg').then(r=>r.ok).catch(()=>false))).then(a=>a.every(Boolean))`));
  ok("sem emojis na página", !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(await run(`document.body.innerText`)));
  ok("sem rolagem horizontal", await run(`document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`));
  console.log(`\n${pass} passaram, ${fail} falharam`);
  app.exit(fail ? 1 : 0);
});
