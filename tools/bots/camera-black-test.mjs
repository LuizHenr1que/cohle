// After the camera is opened and closed (modal cancel, or on then off) the tile must go back to the avatar, never a black frame. CDP 9341, fake camera flags.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const click = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>!${JSON.stringify(txt ?? "")}||x.innerText.includes(${JSON.stringify(txt ?? "")}));if(e)e.click();return !!e})()`);
// a "black" tile = a video element that is visible (not hidden) inside the call tiles while the camera is off
const visibleVideos = () => ev(`[...document.querySelectorAll('video')].filter(v=>v.offsetWidth>0&&v.offsetHeight>0&&!v.closest('.fixed.z-50')).length`);
const camOn = () => ev(`window.__cohleRoom?.localParticipant?.isCameraEnabled ?? null`);
const avatarShown = () => ev(`!!document.querySelector('main [class*="rounded-full"] img, main .grad')`);
await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
await click("aside button", "Sala de voz"); await sleep(7000);
ok("antes: sem vídeo visível na chamada", (await visibleVideos()) === 0);
await click('button[title="Câmera"]'); await sleep(2000); await click("button", "Cancelar"); await sleep(800);
ok("abrir o modal e cancelar não deixa tela preta", (await visibleVideos()) === 0 && !(await ev(`!!document.querySelector('.fixed.z-50')`)));
await click('button[title="Câmera"]'); await sleep(2000); await click("button", "Ligar câmera"); await sleep(3000);
ok("ligada: o vídeo aparece", (await visibleVideos()) >= 1, `cam=${await camOn()} vídeos=${await visibleVideos()}`);
await click('button[title="Câmera"]'); await sleep(1500);
const left = await visibleVideos();
ok("desligada: volta o avatar (nenhum quadro preto sobrando)", left === 0, `vídeos visíveis=${left}`);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
