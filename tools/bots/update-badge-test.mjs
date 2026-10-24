// (needs the Electron stdout in /tmp/el.log)
// "Nova versão" badge: appears only when the public releases have a newer teste-N; click starts the right download.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const run = async (tag) => {
  await cmd("Page.enable"); await cmd("Page.addScriptToEvaluateOnNewDocument", { source: `window.__opened=[];const f=window.fetch;window.fetch=(u,o)=>String(u).includes('api.github.com')?Promise.resolve(new Response(JSON.stringify({tag_name:'${tag}',name:'Versão de teste 9 · coisa nova'}),{status:200})):f(u,o);0` });
  await ev(`localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
};
await run("teste-9");
const has = () => ev(`[...document.querySelectorAll('button')].some(b=>b.innerText.includes('Nova versão'))`);
ok("com release mais nova aparece o badge Nova versão", await has());
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Nova versão')).click()`); await sleep(300);
const { readFileSync } = await import('node:fs'); const opened = readFileSync('/tmp/el.log','utf8').split('\n').filter((l)=>l.includes('[open:external]')).map((l)=>l.split(' ').pop()); ok("clicar abre o download do instalador certo", opened.length === 1 && /releases\/latest\/download\/Cohle-(mac-(arm64|x64)\.dmg|win-x64\.zip)$/.test(opened[0]), JSON.stringify(opened));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
