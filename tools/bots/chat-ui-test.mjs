// The chat in the real client: 15-message history note and live trimming, 500-char limit, replies, icon reactions, delete, files and images (button, paste, drop), DMs, phone size.
// Chrome (default, CDP 9359) or the desktop app: ATTACH=9341. Dev API (OWNER_EMAILS=teste1@cohle.dev, EMAIL_DEV=1) + vite :5173. teste1 uses the UI, teste2 acts through the API.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { createRequire } from "node:module";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sharp = createRequire(import.meta.url)("../../apps/server/node_modules/sharp");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
const srv = (await http("/servers", null, a.token)).d.find((s) => s.name === "Servidor de Teste"), geral = srv.channels.find((c) => c.type === "TEXT").id;
const sb = io(API, { auth: { token: b.token }, transports: ["websocket"] }); await new Promise((r) => sb.on("connect", r)); sb.emit("channel:join", geral);
const bsay1 = (content, extra) => new Promise((r) => sb.emit("message:send", { channelId: geral, content, ...extra }, r));
const bsay = async (content, extra = {}) => { for (let i = 0; i < 5; i++) { const r = await bsay1(content, extra); if (r?.error !== "slow down") return r; await sleep(3500); } return { error: "slow down" }; };
const dir = mkdtempSync(tmpdir() + "/chat-"); const tmpFile = (n, buf) => { const p = `${dir}/${n}`; writeFileSync(p, buf); return p; };
const imgPath = tmpFile("captura de tela.png", await sharp({ create: { width: 1400, height: 900, channels: 3, background: "#3b8cff" } }).png().toBuffer());
const pdfPath = tmpFile("contrato.pdf", Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(2048)]));
const exePath = tmpFile("setup.exe", Buffer.concat([Buffer.from("MZ"), Buffer.alloc(500)]));
const tinyPng = (await sharp({ create: { width: 40, height: 40, channels: 3, background: "#22b35e" } }).png().toBuffer()).toString("base64");

let t; if (ATTACH) t = (await (await fetch(`http://localhost:${ATTACH}/json`)).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const chrome = ATTACH ? null : spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9359", `--user-data-dir=${mkdtempSync(tmpdir() + "/cu-")}`, "--window-size=1280,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9359/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const waitFor = async (fn, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return true; await sleep(250); } return false; };
const waitText = (re, ms) => waitFor(`/${re.source}/${re.flags}.test(document.body.innerText)`, ms);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;const d=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value');d.set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const enter = async () => { await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
const sendByClick = () => ev(`document.querySelector('button[aria-label="Enviar"]').click()`);
const shot = async (f) => { if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); } await sleep(800); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
// Chrome can be handed files from the disk through the debugging protocol. The Electron renderer is not allowed to read a path injected that way (ERR_ACCESS_DENIED; a real
// pick through the system dialog is granted by Chromium), so for the app the files are rebuilt inside the page and put on the <input> exactly like a pick would.
const MIME = { png: "image/png", pdf: "application/pdf", exe: "application/x-msdownload" };
const attach = async (paths) => {
  if (!ATTACH) { const r = await cmd("Runtime.evaluate", { expression: `document.querySelector('input[type=file]')` }); return cmd("DOM.setFileInputFiles", { files: paths, objectId: r.result.objectId }); }
  const files = paths.map((p) => ({ name: p.split("/").pop(), type: MIME[p.split(".").pop()] ?? "", b64: readFileSync(p).toString("base64") }));
  await ev(`(()=>{const dt=new DataTransfer();for(const f of ${JSON.stringify(files)}){const bin=atob(f.b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);dt.items.add(new File([u],f.name,{type:f.type}))}const i=[...document.querySelectorAll('input[type=file]')].at(-1);i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))})()`);
};
const count = () => ev(`document.querySelectorAll('[data-mid]').length`);
const open = async () => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(a.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))});localStorage.setItem('cohle:tour:${a.user.id}','done');location.reload()`); await sleep(3800); };
const goChannel = async () => { await ev(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('title')==='Servidor de Teste'||x.innerText.includes('Servidor de Teste'))?.click()`); await sleep(900); await click("geral", "button, a, div[role=button]"); await waitFor(`!!document.querySelector('textarea[aria-label="Mensagem"]')`); };
const noSide = () => ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
try {
  await cmd("Runtime.enable"); await cmd("Page.enable"); await cmd("DOM.enable");
  if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); }       // a window behind others stops rendering (and its resize observers): keep it "visible" like a real user's
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }).catch(() => {});
  await open(); await goChannel();
  ok("aviso do plano grátis: só as últimas 15 mensagens", /Plano grátis:.*últimas 15 mensagens deste canal/.test(await text()));
  // ---- text, limit, send ----
  await ev(`document.querySelector('textarea[aria-label="Mensagem"]').focus()`); await cmd("Input.insertText", { text: "x".repeat(600) }); await sleep(300);      // real typing/pasting, which the field's maxLength limits
  ok("o campo limita em 500 caracteres e mostra o contador", (await ev(`document.querySelector('textarea[aria-label="Mensagem"]').value.length`)) === 500 && /500\/500/.test(await text()), String(await ev(`document.querySelector('textarea[aria-label="Mensagem"]').value.length`)));
  await setVal('textarea[aria-label="Mensagem"]', "");
  const hello = "olá do teste " + Date.now().toString(36);
  await setVal('textarea[aria-label="Mensagem"]', hello); await ev(`document.querySelector('textarea[aria-label="Mensagem"]').focus()`); await enter();
  ok("Enter envia e a mensagem aparece", await waitText(new RegExp(hello)));
  ok("o campo limpa depois de enviar", (await ev(`document.querySelector('textarea[aria-label="Mensagem"]').value`)) === "");
  // ---- reply to a message from teste2 ----
  const orig = (await bsay("mensagem do teste2 para responder")).message;
  await waitText(/mensagem do teste2 para responder/);
  await ev(`(()=>{const el=document.getElementById('msg-${orig.id}');el.querySelector('button[aria-label="Responder"]').click()})()`); await sleep(500);
  ok("Responder mostra a barra 'Respondendo a'", /Respondendo a teste2/.test(await text()));
  await setVal('textarea[aria-label="Mensagem"]', "minha resposta"); await sendByClick();
  ok("a resposta traz a citação com o nome e o texto", await waitFor(`(()=>{const m=[...document.querySelectorAll('[data-mid]')].find(x=>x.innerText.includes('minha resposta'));return !!m&&m.innerText.includes('teste2')&&m.innerText.includes('mensagem do teste2 para responder')})()`));
  await shot(`chat-1-resposta-${TAG}`);
  // ---- reactions (mine and live from the other person) ----
  await ev(`document.getElementById('msg-${orig.id}').querySelector('button[aria-label="Reagir"]').click()`); await sleep(300);
  await ev(`document.querySelector('[role=menu][aria-label="Reagir"] button[aria-label="Fogo"]').click()`); await sleep(1200);
  ok("reagir com o ícone Fogo mostra o contador marcado como meu", await waitFor(`!!document.getElementById('msg-${orig.id}').querySelector('button[aria-label="Fogo: 1"][aria-pressed="true"]')`));
  await http(`/messages/${orig.id}/reactions`, { key: "love" }, b.token);
  ok("a reação do outro aparece ao vivo", await waitFor(`!!document.getElementById('msg-${orig.id}').querySelector('button[aria-label="Amei: 1"]')`));
  await ev(`document.getElementById('msg-${orig.id}').querySelector('button[aria-label="Fogo: 1"]').click()`);
  ok("clicar de novo tira a minha reação", await waitFor(`!document.getElementById('msg-${orig.id}').querySelector('button[aria-label^="Fogo"]')`));
  // ---- delete my own ----
  const mineId = await ev(`[...document.querySelectorAll('[data-mid]')].find(x=>x.innerText.includes(${JSON.stringify(hello)}))?.dataset.mid`);
  await ev(`document.getElementById('msg-${mineId}').querySelector('button[aria-label="Apagar mensagem"]').click()`); await sleep(300);
  await ev(`[...document.getElementById('msg-${mineId}').querySelectorAll('button')].find(x=>x.innerText.includes('Apagar?')).click()`);
  ok("apagar a própria mensagem (com confirmação)", await waitFor(`!document.getElementById('msg-${mineId}')`));
  ok("o dono do servidor (teste1) também pode apagar mensagens dos outros", (await ev(`!!document.getElementById('msg-${orig.id}').querySelector('button[aria-label="Apagar mensagem"]')`)));
  // ---- files ----
  const ownImgs = () => ev(`document.querySelectorAll('[data-mid] img[alt="captura de tela.webp"]').length`);
  const imgsBefore = await ownImgs();
  await attach([imgPath]);
  ok("a imagem aparece pronta para enviar, com tamanho", await waitFor(`!!document.querySelector('ul[aria-label="Arquivos para enviar"] li img') && /KB|MB/.test(document.querySelector('ul[aria-label="Arquivos para enviar"]').innerText)`, 15000));
  await sendByClick();
  ok("a imagem enviada aparece no chat como miniatura leve", await waitFor(`document.querySelectorAll('[data-mid] img[alt="captura de tela.webp"][loading="lazy"]').length > ${imgsBefore}`, 15000));
  const thumb = await ev(`(()=>{const i=[...document.querySelectorAll('[data-mid] img[alt="captura de tela.webp"]')].at(-1);return i?{src:i.src,w:i.width,h:i.height,alt:i.alt,dec:i.decoding}:null})()`);
  ok("a miniatura tem tamanho definido (sem pular a tela) e nome como alt", thumb && thumb.w > 0 && thumb.h > 0 && /captura de tela/.test(thumb.alt) && thumb.dec === "async", JSON.stringify(thumb && { w: thumb.w, h: thumb.h, alt: thumb.alt }));
  await shot(`chat-2-imagem-${TAG}`);
  await ev(`[...document.querySelectorAll('[data-mid] button[aria-label^="Abrir imagem"]')].at(-1).click()`); await sleep(600);
  ok("clicar na imagem abre o visualizador", !!(await ev(`!!document.querySelector('[role=dialog][aria-label^="Imagem:"] img')`)));
  await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await sleep(400);
  ok("Esc fecha o visualizador", !!(await ev(`!document.querySelector('[role=dialog][aria-label^="Imagem:"]')`)));
  const pdfsBefore = await ev(`document.querySelectorAll('[data-mid] a[download="contrato.pdf"]').length`);
  await attach([pdfPath]); await waitFor(`!!document.querySelector('ul[aria-label="Arquivos para enviar"]')&&/KB/.test(document.querySelector('ul[aria-label="Arquivos para enviar"]').innerText)`, 15000); await sendByClick();
  ok("o PDF aparece como arquivo para baixar", await waitFor(`document.querySelectorAll('[data-mid] a[download="contrato.pdf"]').length > ${pdfsBefore}`, 15000));
  await attach([exePath]);
  ok("executável é recusado com aviso claro", await waitText(/não aceitamos executáveis nem scripts/i, 15000));
  await ev(`document.querySelector('ul[aria-label="Arquivos para enviar"] button[aria-label^="Remover"]')?.click()`);
  // paste an image from the clipboard, and drop a file on the chat
  await ev(`(()=>{const dt=new DataTransfer();const bin=atob(${JSON.stringify(tinyPng)});const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);dt.items.add(new File([u],'image.png',{type:'image/png'}));document.querySelector('textarea[aria-label="Mensagem"]').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))})()`);
  ok("colar uma imagem (Ctrl+V) cria um anexo 'captura-…'", await waitFor(`/captura-/.test(document.querySelector('ul[aria-label="Arquivos para enviar"]')?.innerText||'')`, 12000));
  await ev(`document.querySelector('ul[aria-label="Arquivos para enviar"] button[aria-label^="Remover"]')?.click()`); await sleep(300);
  await ev(`(()=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([37,80,68,70,45,49,46,52,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])],'solto.pdf',{type:'application/pdf'}));const z=document.querySelector('textarea[aria-label="Mensagem"]').closest('.relative');for(const t of ['dragenter','dragover','drop'])z.dispatchEvent(new DragEvent(t,{dataTransfer:dt,bubbles:true,cancelable:true}))})()`);
  ok("arrastar e soltar um arquivo no chat anexa", await waitFor(`/solto\\.pdf/.test(document.querySelector('ul[aria-label="Arquivos para enviar"]')?.innerText||'')`, 12000));
  await ev(`document.querySelector('ul[aria-label="Arquivos para enviar"] button[aria-label^="Remover"]')?.click()`);
  // ---- the 15-message history, live ----
  await sleep(10_500); for (let i = 1; i <= 7; i++) await bsay(`histórico ${i}`); await sleep(10_500); for (let i = 8; i <= 14; i++) await bsay(`histórico ${i}`); await sleep(10_500); for (let i = 15; i <= 16; i++) await bsay(`histórico ${i}`);
  ok("a tela mostra só 15 mensagens", await waitFor(`document.querySelectorAll('[data-mid]').length===15 && document.body.innerText.includes('histórico 16')`, 20000), `${await count()} na tela`);
  ok("as mais antigas (e a imagem) saíram da tela sozinhas", !/histórico 1\b/.test(await text()) && !(await ev(`!!document.querySelector('[data-mid] img[src*="/files/"]')`)));
  await shot(`chat-3-historico-${TAG}`);

  // ---- scrolling and the message box, like a real chat ----
  const scrollerExpr = `[...document.querySelectorAll('.overflow-y-auto')].find(e=>e.querySelector('[data-mid]'))`;
  const dist = () => ev(`(()=>{const el=${scrollerExpr};return el.scrollHeight-el.scrollTop-el.clientHeight})()`);
  const composerVisible = () => ev(`(()=>{const r=document.querySelector('textarea[aria-label="Mensagem"]').getBoundingClientRect();return r.top>=0&&r.bottom<=window.innerHeight+1&&document.scrollingElement.scrollTop===0&&document.querySelector('main').scrollTop===0})()`);
  ok("o chat começa no fim e a caixa de mensagem está na janela", (await dist()) < 8 && (await composerVisible()), `distância do fim: ${await dist()}`);
  if (!ATTACH) { await cmd("Emulation.setDeviceMetricsOverride", { width: 1000, height: 560, deviceScaleFactor: 1, mobile: false }); await sleep(600); }
  ok("em janela pequena a caixa de mensagem continua visível", await composerVisible());
  await sleep(10_500);
  const full = await count();
  await bsay("nova com o limite cheio");
  ok("com 15 mensagens (uma entra, outra sai) a tela acompanha até o fim", await waitFor(`document.body.innerText.includes('nova com o limite cheio')`) && (await sleep(500), await dist()) < 8 && (await count()) === full, `contagem ${full}→${await count()}, distância ${await dist()}`);
  const imgUp = await (await fetch(API + "/uploads?name=foto.png", { method: "POST", headers: { "Content-Type": "application/octet-stream", Authorization: "Bearer " + b.token }, body: await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#e056d9" } }).png().toBuffer() })).json();
  await sleep(1500); await bsay("", { attachmentIds: [imgUp.id] });
  ok("uma imagem que chega e carrega não tira a tela do fim", await waitFor(`!!document.querySelector('[data-mid] img[src*="${imgUp.id}"]')`) && (await sleep(1500), await dist()) < 8, `distância ${await dist()}`);
  await ev(`(()=>{const el=${scrollerExpr};el.scrollTop=0;el.dispatchEvent(new Event('scroll'))})()`); await sleep(400);
  await sleep(10_000); await bsay("chegou enquanto eu lia o histórico");
  ok("lendo o histórico (rolado para cima) a tela NÃO é puxada para baixo", await waitFor(`document.body.innerText.includes('chegou enquanto eu lia')`) && (await ev(`${scrollerExpr}.scrollTop`)) < 40);
  ok("e aparece o aviso de nova mensagem", await waitText(/1 nova mensagem/));
  await shot(`chat-6-novas-${TAG}`);
  await click("1 nova mensagem"); await sleep(900);
  ok("o aviso leva ao fim da conversa", (await dist()) < 8 && !(await ev(`/nova mensagem/.test(document.body.innerText)`)));
  await ev(`(()=>{const el=${scrollerExpr};el.scrollTop=0;el.dispatchEvent(new Event('scroll'))})()`); await sleep(300);
  await setVal('textarea[aria-label="Mensagem"]', "mandei lendo o histórico"); await sendByClick();
  ok("a minha própria mensagem sempre leva ao fim", await waitFor(`document.body.innerText.includes('mandei lendo o histórico')`) && (await sleep(700), await dist()) < 8);
  await ev(`document.querySelector('[data-mid] button[aria-label="Responder"]').click()`); await attach([imgPath]); await waitFor(`/KB|MB/.test(document.querySelector('ul[aria-label="Arquivos para enviar"]')?.innerText||'')`, 15000);
  ok("com barra de resposta e anexo a caixa de mensagem continua inteira na janela", await composerVisible() && /Respondendo a/.test(await text()));
  await shot(`chat-7-composer-alto-${TAG}`);
  await ev(`document.querySelector('ul[aria-label="Arquivos para enviar"] button[aria-label^="Remover"]')?.click()`); await ev(`document.querySelector('button[aria-label="Cancelar resposta"]')?.click()`);
  if (!ATTACH) { await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(500); }

  // ---- direct messages ----
  await ev(`document.querySelector('button[title="Mensagens diretas"]').click()`); await sleep(900);
  await http("/friends/request", { handle: "@teste2" }, a.token); const inc = (await http("/friends", null, b.token)).d.incoming.find((r) => r.user.id === a.user.id); if (inc) await http(`/friends/${inc.id}/accept`, {}, b.token);
  const dmm = await new Promise((r) => sb.emit("dm:send", { toId: a.user.id, content: "oi, é o teste2 na conversa direta" }, r));
  await sleep(1200); await click("teste2", "button"); await waitFor(`!!document.querySelector('textarea[aria-label="Mensagem"]')`);
  ok("conversa direta começa no fim", (await sleep(800), await ev(`(()=>{const el=[...document.querySelectorAll('.overflow-y-auto')].find(e=>e.querySelector('[data-mid]'));return !el||el.scrollHeight-el.scrollTop-el.clientHeight<8})()`)));
  ok("conversa direta: aviso do limite e as mesmas ferramentas", /últimas 15 mensagens desta conversa/.test(await text()) && !!(await ev(`!!document.querySelector('button[aria-label="Anexar arquivo ou imagem"]')`)));
  await waitFor(`!!document.getElementById('msg-${dmm.message.id}')`, 12000);        // wait for THIS message (an older one with the same text may be on screen)
  await ev(`document.getElementById('msg-${dmm.message.id}').querySelector('button[aria-label="Responder"]').click()`); await sleep(300);
  await setVal('textarea[aria-label="Mensagem"]', "resposta direta"); await sendByClick();
  ok("conversa direta: resposta com citação", await waitFor(`[...document.querySelectorAll('[data-mid]')].some(x=>x.innerText.includes('resposta direta')&&x.innerText.includes('oi, é o teste2'))`));
  await ev(`document.getElementById('msg-${dmm.message.id}').querySelector('button[aria-label="Reagir"]').click()`); await sleep(300); await ev(`document.querySelector('[role=menu][aria-label="Reagir"] button[aria-label="Curtir"]').click()`);
  ok("conversa direta: reação", await waitFor(`!!document.getElementById('msg-${dmm.message.id}').querySelector('button[aria-label="Curtir: 1"]')`));
  await waitFor(`document.querySelector('textarea[aria-label="Mensagem"]')?.value === ""`, 8000);          // the reply above is still being confirmed: like a person, wait for the box to be free before attaching
  await attach([imgPath]); await waitFor(`!!document.querySelector('ul[aria-label="Arquivos para enviar"] li img')&&/KB|MB/.test(document.querySelector('ul[aria-label="Arquivos para enviar"]').innerText)`, 15000); await sendByClick();
  const dmImgs0 = 0; ok("conversa direta: imagem", await waitFor(`document.querySelectorAll('[data-mid] img[alt="captura de tela.webp"]').length > 0`, 15000), String(await ev(`document.querySelector('[role=alert]')?.innerText ?? "sem aviso; chips: " + (document.querySelector('ul[aria-label="Arquivos para enviar"]')?.innerText ?? "nenhum") + " | imgs: " + [...document.querySelectorAll('[data-mid] img')].map(i=>i.alt+"@"+i.naturalWidth).join(",") + " | último: " + ([...document.querySelectorAll('[data-mid]')].at(-1)?.innerHTML ?? "").slice(0,400)`)));
  await shot(`chat-4-dm-${TAG}`);

  // ---- phone size ----
  if (!ATTACH) {
    await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(800);
    ok("celular: a conversa (com imagem) não rola para o lado", await noSide());
    await shot(`chat-5-celular-${TAG}`);
  }
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 200));
} finally { sb.close(); ws.close(); chrome?.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
