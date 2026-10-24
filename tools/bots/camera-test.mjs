// Camera modal: private preview first, confirm turns it on; failures are explained in Portuguese. Needs the dev stack and the Electron test app (CDP 9341, fake camera flags).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const click = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>!${JSON.stringify(txt ?? "")}||x.innerText.includes(${JSON.stringify(txt ?? "")}));if(e)e.click();return !!e})()`);
const text = () => ev(`document.body.innerText`);
const boot = async () => { await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000); await click("aside button", "Sala de voz"); await sleep(7000); };
const camOn = () => ev(`window.__cohleRoom?.localParticipant?.isCameraEnabled ?? null`);

await boot();
await click('button[title="Câmera"]'); await sleep(2500);
ok("abre o modal com a prévia", /Ligar a câmera\?/.test(await text()) && /PRÉVIA/.test(await text()));
ok("a prévia está tocando (vídeo com imagem)", await ev(`(()=>{const v=document.querySelector('.fixed video');return !!v&&v.videoWidth>0&&!v.paused})()`));
ok("enquanto vê a prévia, ninguém recebe: câmera ainda não publicada", (await camOn()) !== true);
await click("button", "Cancelar"); await sleep(600);
ok("cancelar fecha o modal e não publica a câmera", !/Ligar a câmera\?/.test(await text()) && (await camOn()) !== true);
await click('button[title="Câmera"]'); await sleep(2000); await click("button", "Ligar câmera"); await sleep(3000);
ok("confirmar publica a câmera", (await camOn()) === true);
await click('button[title="Câmera"]'); await sleep(1000);
ok("desligar é imediato", (await camOn()) === false);

// failures, as the person would see them
const stub = (name) => ev(`(()=>{const md=navigator.mediaDevices;if(!window.__gum)window.__gum=md.getUserMedia.bind(md);md.getUserMedia=()=>Promise.reject(Object.assign(new Error('x'),{name:${JSON.stringify(name)}}))})()`);
const cases = [["NotFoundError", /Nenhuma câmera foi encontrada/], ["NotAllowedError", /não tem permissão para usar a câmera.*Privacidade/], ["NotReadableError", /em uso por outro aplicativo/]];
for (const [name, re] of cases) {
  await stub(name); await click('button[title="Câmera"]'); await sleep(1200);
  const tx = await text();
  ok(`${name}: mensagem clara em português`, re.test(tx) && !/Requested device|NotFound|not found/i.test(tx), (tx.match(/(Nenhuma|O Cohle|Não foi)[^\n]*/) ?? [""])[0].slice(0, 110));
  ok(`${name}: não deixa ligar sem câmera, oferece tentar de novo`, /Tentar novamente/.test(tx) && !/Ligar câmera/.test(tx.replace("Ligar a câmera?", "")));
  await click("button", "Cancelar"); await sleep(400);
}
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
