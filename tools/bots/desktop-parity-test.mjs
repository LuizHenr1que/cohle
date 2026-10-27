// Desktop (Electron on CDP 9341, dev stack: `COHLE_DEV_URL=http://localhost:5173 electron . --remote-debugging-port=9341`) must offer the SAME things as the web:
// @username login, friends hub, privacy, admin entry, same version label. Only the web/app shortcut differs on purpose.
import { writeFileSync } from "node:fs"; import { tmpdir } from "node:os";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir();
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
for (const [me, other] of [[a, b], [b, a]]) { const f = (await http("/friends", null, me.token)).d; for (const r of [...f.incoming, ...f.outgoing]) await http(`/friends/${r.id}/decline`, {}, me.token); await http(`/friends/${other.user.id}`, null, me.token, "DELETE"); }
await http("/me/privacy", { findByEmail: true }, a.token);
const t = (await (await fetch("http://localhost:9341/json")).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const shot = async (f) => { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); await sleep(900); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  await ev(`sessionStorage.clear();localStorage.clear();location.reload()`); await sleep(3000);
  let tx = await text();
  ok("é o app de verdade (window.cohle existe)", (await ev(`typeof window.cohle`)) === "object");
  ok("login: e-mail ou @usuário, igual à web", (await ev(`!!document.querySelector('input[placeholder="E-mail ou @usuário"]')`)));
  ok("login: 'Esqueci meu usuário' e 'Esqueci minha senha', igual à web", /Esqueci meu usuário/.test(tx) && /Esqueci minha senha/.test(tx));
  ok("login: mesmo rótulo de versão da web (Versão 13)", /Versão 13/.test(tx));
  ok("login: a logo é o atalho discreto para a web (sem cartão chamativo)", (await ev(`!!document.querySelector('button[title="Abrir o Cohle na web"] svg')`)) && !/Prefere o navegador/.test(tx));
  await shot("desk-1-login");
  await click("Cadastre-se"); await sleep(400);
  await setVal('input[aria-label="@usuário"]', "Admin"); await sleep(900);
  ok("cadastro: mesma regra de @ (admin é reservado)", /reservado/.test(await ev(`document.getElementById('uname-help')?.innerText`)));
  await click("Já tem conta"); await sleep(300);
  await setVal('input[placeholder="E-mail ou @usuário"]', "@TESTE1"); await setVal('input[placeholder^="Senha"]', "teste12345");
  await click("Entrar", "button.grad"); await sleep(4200);
  ok("entra com @TESTE1 e cai na boas-vindas, com seus servidores", /Servidor de Teste/.test(await text()) && /Bem-vindo ao Cohle/.test(await text()) && /Seus servidores/i.test(await text()));
  await ev(`localStorage.setItem('cohle:tour:${a.user.id}','done')`);
  await ev(`document.querySelector('button[title="Mensagens diretas"]').click()`); await sleep(900); tx = await text();
  ok("amigos: as mesmas abas da web", ["Todos", "Online", "Pendentes", "Adicionar amigo"].every((s) => tx.includes(s)));
  await click("Adicionar amigo"); await sleep(500);
  await setVal('input[aria-label="@usuário ou e-mail"]', "teste2@cohle.dev"); await sleep(300);
  ok("amigos: aviso de busca por e-mail, igual à web", /Procurando pelo e-mail/.test(await text()));
  await click("Enviar pedido"); await sleep(1200);
  ok("amigos: resposta neutra ao adicionar por e-mail", /Se existir uma conta com esse e-mail/.test(await text()));
  ok("amigos: o pedido chegou à outra conta", (await http("/friends", null, b.token)).d.incoming.length === 1);
  ok("amigos: opção de privacidade presente", /Permitir que me achem pelo e-mail/.test(await text()));
  await shot("desk-2-amigos");
  await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700); tx = await text();
  ok("configurações: @usuário e Painel do Cohle (conta Dono), igual à web", /@teste1/.test(tx) && /Painel do Cohle/.test(tx));
  ok("configurações: aba Aplicativo existe só no desktop (diferença esperada)", /Aplicativo/.test(tx));
  await click("Sobre"); await sleep(500); tx = await text();
  ok("sobre: diz que é o aplicativo (sem linhas de 'ir para a web')", /Aplicativo para computador/.test(tx) && !/Cohle na web/.test(tx));
  await shot("desk-3-sobre");
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 200));
} finally { ws.close(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
