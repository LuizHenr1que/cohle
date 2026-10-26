// @username sign-up/login screens, forgot user/password, the Friends hub, privacy and phone size, in a real browser (headless Chrome, CDP 9357).
// Needs dev API (EMAIL_DEV=1, log in SERVER_LOG) + vite :5173.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
// clean slate between the two test accounts: accepted friendships AND any leftover pending request
for (const [me, other] of [[a, b], [b, a]]) { const f = (await http("/friends", null, me.token)).d; for (const r of [...f.incoming, ...f.outgoing]) await http(`/friends/${r.id}/decline`, {}, me.token); await http(`/friends/${other.user.id}`, null, me.token, "DELETE"); }
await http("/me/privacy", { findByEmail: true }, b.token); await http("/me/privacy", { findByEmail: true }, a.token);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9357", `--user-data-dir=${mkdtempSync(tmpdir() + "/id-")}`, "--window-size=1280,860", "--no-first-run", "about:blank"], { stdio: "ignore" });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9357/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result);
  else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const shot = async (f) => { await sleep(600); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const fresh = async () => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`localStorage.clear();sessionStorage.clear();location.reload()`); await sleep(2200); };
const noSide = () => ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  await fresh();
  ok("o login pede e-mail ou @usuário", (await ev(`document.querySelector('input[placeholder="E-mail ou @usuário"]')?.getAttribute('autocomplete')`)) === "username");
  // ---- sign-up screen: rules while typing ----
  await click("Cadastre-se"); await sleep(500);
  const hint = async (name) => { await setVal('input[aria-label="@usuário"]', name); await sleep(900); return ev(`document.getElementById('uname-help')?.innerText`); };
  ok("cadastro: 'ab' é curto demais", /pelo menos 3/.test(await hint("ab")));
  ok("cadastro: maiúsculas viram minúsculas", (await hint("Ana_Maria")) && (await ev(`document.querySelector('input[aria-label="@usuário"]').value`)) === "ana_maria");
  ok("cadastro: hífen/espaço não é aceito", /minúsculas, números/.test(await hint("ana-maria")));
  ok("cadastro: 'admin' é reservado", /reservado/.test(await hint("admin")));
  ok("cadastro: @ de quem já existe aparece como em uso", /já está em uso/.test(await hint("teste1")));
  const free = "livre_" + Date.now().toString(36).slice(-6);
  ok("cadastro: nome livre aparece como disponível", /está disponível/.test(await hint(free)));
  await shot("id-1-cadastro");
  // ---- login by @username through the form ----
  await click("Já tem conta"); await sleep(400);
  await setVal('input[placeholder="E-mail ou @usuário"]', "@TESTE1"); await setVal('input[placeholder^="Senha"]', "teste12345");
  await click("Entrar", "button.grad"); await sleep(4200);
  ok("entra digitando @TESTE1 (qualquer caixa)", /Servidor de Teste/.test(await text()));
  // ---- friends hub ----
  await ev(`localStorage.setItem('cohle:tour:${a.user.id}','done')`);
  await ev(`document.querySelector('button[title="Mensagens diretas"]').click()`); await sleep(900);
  let tx = await text();
  ok("central de amigos: abas Todos, Online, Pendentes e Adicionar", ["Todos", "Online", "Pendentes", "Adicionar amigo"].every((s) => tx.includes(s)));
  await click("Adicionar amigo"); await sleep(500);
  ok("aba Adicionar mostra o seu @usuário", /Seu @usuário/i.test(await text()) && /@teste1/.test(await text()));
  await setVal('input[aria-label="@usuário ou e-mail"]', "@nao_existe_xyz"); await click("Enviar pedido"); await sleep(1200);
  ok("@ inexistente: erro claro em português", /Não encontramos ninguém com esse @usuário/.test(await text()));
  await setVal('input[aria-label="@usuário ou e-mail"]', "fantasma@exemplo.com"); await sleep(300);
  ok("digitando e-mail, a tela avisa que busca por e-mail", /Procurando pelo e-mail/.test(await text()));
  await click("Enviar pedido"); await sleep(1200);
  ok("e-mail sem conta: resposta neutra (não revela)", /Se existir uma conta com esse e-mail/.test(await text()));
  await setVal('input[aria-label="@usuário ou e-mail"]', "teste2@cohle.dev"); await click("Enviar pedido"); await sleep(1200);
  ok("e-mail de conta real: mesma resposta neutra", /Se existir uma conta com esse e-mail/.test(await text()));
  await click("Pendentes"); await sleep(500);
  ok("o pedido por e-mail aparece em Enviados", /Enviados \(1\)/i.test(await text()) && /@teste2/.test(await text()));
  await shot("id-2-amigos-pendentes");
  const inc = (await http("/friends", null, b.token)).d.incoming; ok("teste2 recebeu o pedido feito por e-mail", inc.length === 1 && inc[0].user.username === "teste1");
  if (inc[0]) await http(`/friends/${inc[0].id}/accept`, {}, b.token); await sleep(1200);
  await click("Todos"); await sleep(500); tx = await text();
  ok("depois de aceitar, @teste2 aparece em Todos com busca", /@teste2/.test(tx) && (await ev(`!!document.querySelector('input[aria-label="Buscar amigo"]')`)));
  await setVal('input[aria-label="Buscar amigo"]', "zzz"); await sleep(300);
  ok("a busca filtra a lista", /Nenhum amigo com esse nome/.test(await text()));
  await setVal('input[aria-label="Buscar amigo"]', "@TESTE2"); await sleep(300);
  ok("a busca aceita @ e maiúsculas", /@teste2/.test(await text()));
  await shot("id-3-amigos-todos");
  // ---- privacy toggle persists ----
  await click("Adicionar amigo"); await sleep(600);
  await ev(`document.querySelector('button[role=switch][aria-label="Permitir que me achem pelo e-mail"]').click()`); await sleep(800);
  ok("desligar 'achar pelo e-mail' grava no servidor", (await http("/me/account", null, a.token)).d.findByEmail === false);
  await http("/me/privacy", { findByEmail: true }, a.token);
  // ---- profile: @ with rules ----
  await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700);
  ok("configurações mostram o @usuário", /@teste1/.test(await text()));
  await click("Editar foto e nome"); await sleep(700);
  await setVal('input[aria-describedby="profile-uname-help"]', "admin"); await sleep(900);
  ok("editar perfil: nome reservado é barrado na hora", /reservado/.test(await ev(`document.getElementById('profile-uname-help').innerText`)));
  await setVal('input[aria-describedby="profile-uname-help"]', "teste2"); await sleep(900);
  ok("editar perfil: @ de outra pessoa aparece como em uso", /já está em uso/.test(await ev(`document.getElementById('profile-uname-help').innerText`)));
  await shot("id-4-perfil");
  // ---- forgot username / password screens ----
  await fresh();
  await click("Esqueci meu usuário"); await sleep(500);
  ok("tela 'Esqueceu o @usuário?'", /Esqueceu o @usuário\?/.test(await text()));
  await setVal('input[type="email"]', "teste1@cohle.dev"); await click("Enviar meu @usuário"); await sleep(1500);
  ok("resposta neutra ao pedir o usuário", /Se existir uma conta com esse e-mail, enviamos o seu @usuário/.test(await text()));
  ok("e o e-mail com o @ foi mesmo enviado (log de desenvolvimento)", /Seu usuário no Cohle: @teste1/.test(readFileSync(LOG, "utf8")));
  await shot("id-5-esqueci-usuario");
  await click("Voltar"); await sleep(400); await click("Esqueci minha senha"); await sleep(500);
  ok("esqueci a senha aceita e-mail ou @usuário", (await ev(`!!document.querySelector('input[placeholder="E-mail ou @usuário"]')`)));
  // ---- phone size ----
  await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(600);
  await fresh(); await click("Cadastre-se"); await sleep(400); await setVal('input[aria-label="@usuário"]', "teste1"); await sleep(900);
  ok("celular: cadastro sem rolagem lateral", await noSide()); await shot("id-6-cadastro-celular");
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 200));
} finally { ws.close(); chrome.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
