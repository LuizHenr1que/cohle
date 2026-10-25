// The sign-up / confirm / forgot-password screens in the real client (dev server with EMAIL_DEV=1, codes read from /tmp/server.log).
import { readFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const ev = (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const click = (txt) => ev(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const lastCode = (to) => { const t = readFileSync("/tmp/server.log", "utf8"); const m = [...t.matchAll(new RegExp(`to=${to.replace(/[.+]/g, "\\$&")} subject="(\\d{6})`, "g"))]; return m.length ? m.at(-1)[1] : null; };
const tag = Date.now().toString(36), email = `ui_${tag}@exemplo.dev`, user = `ui_${tag}`.slice(0, 20);
const fresh = async () => { await ev(`localStorage.clear(); location.reload()`); await sleep(2500); };

await fresh();
await click("Não tem conta? Cadastre-se"); await sleep(300);
await setVal('input[type="email"]', email); await setVal('input[placeholder="Nome de usuário"]', user); await setVal('input[type="password"]', "senha-forte-1");
await click("Criar conta"); await sleep(1800);
ok("cadastro leva para «Confirme o seu e-mail» com o endereço", /Confirme o seu e-mail/.test(await text()) && (await text()).includes(email));
ok("há botão de reenviar com contagem regressiva", /Reenviar código em \d+s/.test(await text()));
await setVal('input[aria-label="Código de 6 dígitos"]', "000000"); await sleep(1500);
ok("código errado mostra erro em português", /Código incorreto/.test(await text()), (await text()).match(/Código incorreto[^\n]*/)?.[0]);
const code = lastCode(email);
await setVal('input[aria-label="Código de 6 dígitos"]', code); await sleep(3500);
ok("código certo confirma e entra no app (sem apertar nada)", await ev(`!!document.querySelector("nav")`) && !/Confirme o seu e-mail/.test(await text()));

// login with an unconfirmed account -> goes to the code screen
const e2 = `ui2_${tag}@exemplo.dev`;
await fetch("http://localhost:3001/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e2, username: `ui2_${tag}`.slice(0, 20), password: "senha-forte-1" }) });
await fresh(); await setVal('input[type="email"]', e2); await setVal('input[type="password"]', "senha-forte-1"); await click("Entrar"); await sleep(1800);
ok("entrar sem ter confirmado leva à tela do código", /Confirme o seu e-mail/.test(await text()));

// forgot password
await fresh();
await click("Esqueci minha senha"); await sleep(400);
ok("abre «Esqueceu a senha?»", /Esqueceu a senha\?/.test(await text()));
await setVal('input[type="email"]', email); await click("Enviar código"); await sleep(1800);
ok("segue para «Escolha uma nova senha»", /Escolha uma nova senha/.test(await text()));
const rc = lastCode(email);
await setVal('input[aria-label="Código de 6 dígitos"]', rc);
await setVal('input[placeholder^="Nova senha"]', "nova-senha-77"); await setVal('input[placeholder="Repita a nova senha"]', "diferente-12345"); await click("Redefinir senha"); await sleep(600);
ok("senhas diferentes: avisa", /As senhas não conferem/.test(await text()));
await setVal('input[placeholder="Repita a nova senha"]', "nova-senha-77"); await click("Redefinir senha"); await sleep(3500);
ok("redefinir com o código entra direto no app", await ev(`!!document.querySelector("nav")`));
const login = await fetch("http://localhost:3001/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "nova-senha-77" }) });
ok("a nova senha vale no servidor", login.status === 200);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
