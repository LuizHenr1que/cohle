// First-run tour: appears for a brand-new account, can be skipped, remembered, reopened from the profile. Dev server with EMAIL_DEV=1, Electron test app on CDP 9341.
import { readFileSync, writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const click = (txt) => ev(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const lastCode = (to) => { const t = readFileSync((process.env.SERVER_LOG ?? "/tmp/server.log"), "utf8"); const m = [...t.matchAll(new RegExp(`to=${to.replace(/[.+]/g, "\\$&")} subject="(\\d{6})`, "g"))]; return m.at(-1)?.[1]; };
const tag = Date.now().toString(36), email = `tour_${tag}@exemplo.dev`;
await ev(`localStorage.clear(); sessionStorage.clear(); location.reload()`); await sleep(2500);
await click("Não tem conta? Cadastre-se"); await sleep(300);
await setVal('input[type="email"]', email); await setVal('input[aria-label="@usuário"]', `tour_${tag}`.slice(0, 20)); await setVal('input[type="password"]', "senha-forte-1");
for (let i = 0; i < 40 && !/está disponível/.test(await text()); i++) await sleep(250);          // the @username check goes to the database: wait for it like a person would
await click("Criar conta"); await sleep(1800);
await setVal('input[aria-label="Código de 6 dígitos"]', lastCode(email)); await sleep(4000);
{ const tt = await text(); ok("conta nova: o tour abre sozinho", /Pular tour/.test(tt) && /A resenha agora tem endereço/.test(tt), /Pular tour/.test(tt) ? "" : tt.slice(0, 300).replace(/\n/g, " / ")); }
const seen = [];
for (let i = 0; i < 6; i++) {
  seen.push(await ev(`document.querySelector('[role=dialog] h2').innerText`));
  if (i === 2) { const s = await cmd("Page.captureScreenshot", { format: "png" }); writeFileSync("/tmp/tour.png", Buffer.from(s.data, "base64")); }
  await click(i === 0 ? "Começar" : "Próximo"); await sleep(500);
}
ok("percorre os 7 passos até o final", seen.length === 6 && /Vamos começar/.test(await text()), seen.join(" | ").slice(0, 160));
ok("no final oferece criar servidor e entrar com convite", /Criar meu servidor/.test(await text()) && /Entrar com convite/.test(await text()));
await click("Criar meu servidor"); await sleep(700);
ok("«Criar meu servidor» fecha o tour e abre o assistente de servidor", !/Pular tour|Fechar\b/.test((await text()).split("Criar servidor")[0] ?? "") && await ev(`!document.querySelector('[role=dialog][aria-label="Tour de boas-vindas"]')`));
await ev(`location.reload()`); await sleep(4000);
ok("depois de concluído, não abre de novo", await ev(`!document.querySelector('[role=dialog][aria-label="Tour de boas-vindas"]')`));
// reopen from profile and skip
await ev(`[...document.querySelectorAll('button')].find(b=>/tour_/.test(b.innerText))?.click()`); await sleep(500);
await click("Rever o tour"); await sleep(600);
ok("perfil → «Rever o tour» reabre", await ev(`!!document.querySelector('[role=dialog][aria-label="Tour de boas-vindas"]')`));
await click("Pular tour"); await sleep(400);
ok("«Pular tour» fecha na hora", await ev(`!document.querySelector('[role=dialog][aria-label="Tour de boas-vindas"]')`));
// existing accounts never see it
await ev(`localStorage.clear(); sessionStorage.clear(); location.reload()`); await sleep(2500);
const a = await (await fetch("http://localhost:3001/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
await ev(`localStorage.setItem('token',${JSON.stringify(a.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))});location.reload()`); await sleep(4000);
ok("conta que já existia não vê o tour", await ev(`!document.querySelector('[role=dialog][aria-label="Tour de boas-vindas"]')`));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
