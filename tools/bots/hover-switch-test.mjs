// Hover card + one-click switching between lives (real client in Electron, dev stack, bots sharing). Needs: bots.mjs --count 4 --share 2
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = process.env.API ?? "http://localhost:3001", PORT = process.env.PORT ?? 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); return c; };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
await ev(`(()=>{if(!/Sala de voz/.test(document.body.innerText)){[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes('Abrir menu'))?.click()}})()`); await sleep(800);
// centre of the sidebar row of a person
const rowPos = (name) => ev(`(()=>{const r=[...document.querySelectorAll('aside div.cursor-pointer')].find(d=>d.innerText.split(/\\s+/).includes(${JSON.stringify(name)}));if(!r)return null;const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
const mouse = (type, p) => cmd("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: type === "mouseMoved" ? "none" : "left", clickCount: 1 });
const hover = async (name) => { const p = await rowPos(name); if (!p) return false; await mouse("mouseMoved", { x: 5, y: 5 }); await mouse("mouseMoved", p); await sleep(900); return true; };
const click = async (name) => { const p = await rowPos(name); await mouse("mouseMoved", p); await mouse("mousePressed", p); await mouse("mouseReleased", p); };
const card = () => ev(`(()=>{const c=document.querySelector('body > div.fixed.z-\\\\[80\\\\]');if(!c)return null;const v=c.querySelector('video');return {text:c.innerText,video:!!v,playing:v?v.videoWidth>0&&!v.paused:false}})()`);
const screens = () => ev(`(()=>{const r=window.__cohleRoom;if(!r)return null;return [...r.remoteParticipants.values()].filter(p=>[...p.trackPublications.values()].some(x=>x.source==='screen_share'&&x.isSubscribed)).map(p=>p.name||p.identity)})()`);
const names = await ev(`[...document.querySelectorAll('aside div.cursor-pointer')].map(d=>d.innerText.replace(/\\n+/g,' ').trim())`);
console.log("linhas:", names);
const sharers = names.filter((n) => /AO VIVO/.test(n)).map((n) => n.split(/\s/)[1]); const quiet = names.find((n) => !/AO VIVO/.test(n) && !/você/.test(n))?.split(/\s/)[1];
ok("há 2 pessoas ao vivo na lista", sharers.length >= 2, sharers.join(","));
const [s1, s2] = sharers;

// 1) not in the call: card with info, no preview video, no screen subscription
ok("hover em quem está ao vivo (fora da chamada)", await hover(s1));
let c = await card(); ok("cartão aparece com nome, sala e AO VIVO", !!c && c.text.includes(s1) && /AO VIVO/.test(c.text) && /Sala de voz/.test(c.text), c?.text.replace(/\n+/g, " | "));
ok("fora da chamada não há vídeo (só a dica)", !!c && !c.video && /entrar/i.test(c.text));
if (quiet) { await hover(quiet); c = await card(); ok("quem não transmite: cartão sem prévia", !!c && !c.video && !/AO VIVO/.test(c.text), c?.text.replace(/\n+/g, " | ")); }
await mouse("mouseMoved", { x: 600, y: 400 }); await sleep(500); ok("cartão some ao tirar o mouse", (await card()) === null);

// 2) click a sharer from outside: joins and starts watching them
await click(s1); await sleep(9000);
let sc = await screens(); ok("clicar entra na sala e já assiste ao vivo do 1º", !!sc && sc.length === 1 && sc[0].includes(s1), JSON.stringify(sc));
const focus = await ev(`document.body.innerText.includes('Parar de assistir') || !!document.querySelector('[data-stage]') || true`);

// 3) in the call: hover the OTHER sharer shows a playing preview and temporarily subscribes
ok("hover no 2º ao vivo (já em chamada)", await hover(s2));
c = await card(); ok("prévia ao vivo tocando no cartão", !!c && c.video && c.playing, JSON.stringify(c && { video: c.video, playing: c.playing }));
sc = await screens(); ok("durante a prévia o 2º é assinado também", !!sc && sc.some((x) => x.includes(s2)), JSON.stringify(sc));
await mouse("mouseMoved", { x: 600, y: 400 }); await sleep(1500);
sc = await screens(); ok("ao sair do hover o 2º é desassinado de novo (leve)", !!sc && sc.length === 1 && sc[0].includes(s1), JSON.stringify(sc));

// 4) click the other: switches at once, exclusive
await click(s2); await sleep(2500);
sc = await screens(); ok("clicar no outro troca na hora (só o 2º assinado)", !!sc && sc.length === 1 && sc[0].includes(s2), JSON.stringify(sc));
await click(s1); await sleep(2500);
sc = await screens(); ok("e de volta ao 1º", !!sc && sc.length === 1 && sc[0].includes(s1), JSON.stringify(sc));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
