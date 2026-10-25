// Password eye + "Lembrar de mim". Dev server, Electron test app on CDP 9341.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const ev = (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const click = (txt) => ev(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const fresh = async () => { await ev(`localStorage.clear();sessionStorage.clear();location.reload()`); await sleep(2500); };
await fresh();
ok("senha começa oculta", await ev(`document.querySelector('input[placeholder^="Senha"]').type`) === "password");
await ev(`document.querySelector('button[aria-label="Mostrar senha"]').click()`); await sleep(200);
ok("o olhinho mostra a senha", await ev(`document.querySelector('input[placeholder^="Senha"]').type`) === "text");
await ev(`document.querySelector('button[aria-label="Ocultar senha"]').click()`); await sleep(200);
ok("e oculta de novo", await ev(`document.querySelector('input[placeholder^="Senha"]').type`) === "password");
ok("«Lembrar de mim» vem marcado", await ev(`[...document.querySelectorAll('label')].find(l=>/Lembrar de mim/.test(l.innerText)).querySelector('input').checked`));

// remember = on: stays in localStorage + e-mail pre-filled next time
await setVal('input[type="email"]', "teste1@cohle.dev"); await setVal('input[placeholder^="Senha"]', "teste12345"); await click("Entrar"); await sleep(3500);
ok("lembrar ligado: sessão fica no armazenamento permanente", await ev(`!!localStorage.getItem('token') && !sessionStorage.getItem('token')`));
await ev(`location.reload()`); await sleep(3500);
ok("reabrir o app: continua logado", await ev(`!!document.querySelector('nav')`));
await ev(`(()=>{const t=localStorage.getItem('token');localStorage.removeItem('token');localStorage.removeItem('me');location.reload()})()`); await sleep(2500);
ok("e-mail lembrado vem preenchido no login", await ev(`document.querySelector('input[type="email"]').value`) === "teste1@cohle.dev");

// remember = off: session only
await fresh();
await ev(`[...document.querySelectorAll('label')].find(l=>/Lembrar de mim/.test(l.innerText)).querySelector('input').click()`);
await setVal('input[type="email"]', "teste1@cohle.dev"); await setVal('input[placeholder^="Senha"]', "teste12345"); await click("Entrar"); await sleep(3500);
ok("lembrar desligado: a sessão não vai para o armazenamento permanente", await ev(`!localStorage.getItem('token') && !!sessionStorage.getItem('token')`));
ok("e o e-mail não é guardado", await ev(`!localStorage.getItem('cohle:last-email')`));
ok("na mesma sessão continua logado ao recarregar", (await ev(`location.reload()`), await sleep(3500), await ev(`!!document.querySelector('nav')`)));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
