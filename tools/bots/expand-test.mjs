// Click a person's tile to expand it (camera, avatar or live); switch between people; close to go back. Needs bots.mjs --count 3 --share 1, Electron test app (CDP 9341, fake camera).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const click = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>!${JSON.stringify(txt ?? "")}||x.innerText.includes(${JSON.stringify(txt ?? "")}));if(e)e.click();return !!e})()`);
const tile = (name) => click('[title^="Clique para ampliar"]', name);
const stageUp = () => ev(`!!document.querySelector('button[title="Voltar à grade"],button[title="Parar de assistir"]')`);
const stageVideoLive = () => ev(`(()=>{const v=[...document.querySelectorAll('video')].find(v=>v.offsetWidth>300&&v.videoWidth>0);return !!v&&!v.paused})()`);
const screens = () => ev(`[...window.__cohleRoom.remoteParticipants.values()].filter(p=>[...p.trackPublications.values()].some(x=>x.source==='screen_share'&&x.isSubscribed)).map(p=>p.name)`);
await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
await click("aside button", "Sala de voz"); await sleep(8000);
ok("grade: ninguém ampliado", !(await stageUp()));
await tile("bot3"); await sleep(700);
ok("clicar em quem não tem câmera amplia (avatar grande)", (await stageUp()) && await ev(`document.body.innerText.includes('bot3')`));
await click('button[title="Voltar à grade"]'); await sleep(500);
ok("fechar volta para a grade", !(await stageUp()));
// my camera
await click('button[title="Câmera"]'); await sleep(2000); await click("button", "Ligar câmera"); await sleep(3000);
await tile("(você)"); await sleep(1200);
ok("clicar em mim com a câmera ligada amplia a minha imagem", (await stageUp()) && await stageVideoLive());
await click('button[title="Voltar à grade"]'); await sleep(500);
await click('button[title="Câmera"]'); await sleep(1200);
// the live
await click("button", "Assistir"); await sleep(3500);
ok("assistir a transmissão continua ampliando a tela dela", (await stageUp()) && (await screens()).includes("bot1"), JSON.stringify(await screens()));
await tile("bot3"); await sleep(1500);
ok("clicar em outra pessoa troca a ampliação e solta a transmissão (leve)", (await stageUp()) && (await screens()).length === 0, JSON.stringify(await screens()));
await tile("bot1"); await sleep(3000);
ok("clicar no tile dela na faixa volta para a transmissão", (await screens()).includes("bot1"));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
