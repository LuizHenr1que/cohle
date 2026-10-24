// Drives the REAL Cohle client in Electron: joins the voice room as teste2 and measures what the app plays.
const { app, BrowserWindow } = require("electron");
const path = require("path");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const out = [];
const ok = (l, c, x = "") => { c ? pass++ : fail++; out.push(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 600, x: 40, y: 40, focusable: false, show: true,
    webPreferences: { contextIsolation: false, nodeIntegration: false, backgroundThrottling: false, preload: path.join(__dirname, "preload.cjs") } });
  const run = (code) => win.webContents.executeJavaScript(code, true);
  const click = (text, sel = "button") => run(`(()=>{const b=[...document.querySelectorAll('${sel}')].find(b=>b.textContent.includes(${JSON.stringify(text)})||b.title.includes(${JSON.stringify(text)}));if(b){b.click();return true}return false})()`);
  try {
    await win.loadURL("http://localhost:5173");
    await run(`(async()=>{const r=await fetch('http://localhost:3001/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teste2@cohle.dev',password:'teste12345'})});const d=await r.json();localStorage.setItem('token',d.token);localStorage.setItem('me',JSON.stringify(d.user));localStorage.setItem('cohle:volumes','{}');})()`);
    await win.loadURL("http://localhost:5173");
    await sleep(3000);
    ok("entrou no app já logado", await click("Sala de voz"));
    await sleep(9000);

    // measure real audio energy of every <audio> element the app attached (6 s window)
    const measure = () => run(`new Promise(res=>{
      const ctx=new AudioContext();const els=[...document.querySelectorAll('audio')];
      const items=els.map(el=>{const s=el.srcObject;if(!s)return null;const a=ctx.createAnalyser();a.fftSize=2048;ctx.createMediaStreamSource(s).connect(a);return {a,peak:0,sq:0,n:0,buf:new Float32Array(2048)}}).filter(Boolean);
      const t=setInterval(()=>{for(const i of items){i.a.getFloatTimeDomainData(i.buf);for(const v of i.buf){i.sq+=v*v;i.peak=Math.max(i.peak,Math.abs(v))}i.n+=i.buf.length}},50);
      setTimeout(()=>{clearInterval(t);res({elements:els.length,tracks:items.map(i=>({peak:+i.peak.toFixed(3),rms:+Math.sqrt(i.sq/Math.max(i.n,1)).toFixed(4)}))})},6000)})`);
    const before = await measure();
    ok("o app anexou elementos de áudio das vozes (antes: nenhum)", before.elements >= 5, `${before.elements} elementos`);
    const talking = before.tracks.filter((t) => t.peak > 0.05).length;
    ok("há som de verdade chegando nas caixas de voz", talking >= 3, `${talking}/${before.tracks.length} faixas com som, pico máx ${Math.max(...before.tracks.map((t) => t.peak))}`);
    const gains0 = await run(`window.__gains.map(g=>+g.gain.value.toFixed(2))`);
    ok("o app usa ganho de áudio (permite >100%)", gains0.length >= before.elements, `${gains0.length} ganhos`);

    // watch bot1's live: should add the screen-share audio + a playing video
    ok('botão "Assistir transmissão" existe', await click("Assistir transmissão"));
    await sleep(9000);
    const live = await measure();
    ok('depois de "Assistir", chega o áudio do ao vivo', live.elements >= before.elements + 1, `${before.elements} → ${live.elements} elementos`);
    const melody = live.tracks.filter((t) => t.rms > 0.03 && t.peak > 0.2).length;
    ok("o áudio do ao vivo (melodia contínua) é audível", melody >= 1, `${melody} faixa(s) com som contínuo`);
    const frames = () => run(`(()=>{const v=[...document.querySelectorAll('video')].find(v=>v.videoWidth>0);return v?{w:v.videoWidth,h:v.videoHeight,f:v.getVideoPlaybackQuality().totalVideoFrames}:null})()`);
    const f1 = await frames(); await sleep(3000); const f2 = await frames();
    ok("o vídeo do ao vivo está tocando (quadros avançando)", !!f1 && !!f2 && f2.f - f1.f >= 15, f1 && f2 ? `${f1.w}x${f1.h}, ${f2.f - f1.f} quadros em 3 s` : "sem vídeo");
    const stage = await run(`!!document.querySelector('[title="Tela cheia"]')`);
    ok("abriu no palco (botão de tela cheia visível)", stage);
    ok('slider "Volume do ao vivo" no palco', await run(`[...document.querySelectorAll('span')].some(s=>s.textContent==='Volume do ao vivo')`));

    // volume controls: open a person's menu, mute for me, then 200 %
    const rangeSet = (v) => run(`(()=>{const r=[...document.querySelectorAll('input[type=range]')][0];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(r,'${v}');r.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
    await click("Parar de assistir");           // back to the grid, where each tile has the volume menu
    await sleep(800);
    const g1 = await run(`window.__gains.map(g=>g.gain.value)`);
    await click("Volume e opções");
    await sleep(500);
    ok("menu de volume abre", await run(`[...document.querySelectorAll('span')].some(s=>s.textContent==='Volume da voz')`));
    await rangeSet(200); await sleep(1200);
    const g2 = await run(`window.__gains.map(g=>+g.gain.value.toFixed(2))`);
    ok("slider em 200% sobe o ganho real de áudio para 2", g2.some((v) => v >= 1.99), `ganhos: ${JSON.stringify(g2)}`);
    await run(`(()=>{const c=[...document.querySelectorAll('input[type=checkbox]')].find(c=>c.parentElement.textContent.includes('Mutar para mim'));c.click()})()`);
    await sleep(1200);
    const g3 = await run(`window.__gains.map(g=>+g.gain.value.toFixed(2))`);
    ok('"Mutar para mim" zera o áudio daquela pessoa', g3.filter((v) => v === 0).length > g1.filter((v) => v === 0).length, `ganhos: ${JSON.stringify(g3)}`);
    const saved = await run(`localStorage.getItem('cohle:volumes')`);
    ok("a escolha de volume fica salva", /"m":true/.test(saved) && /"v":2/.test(saved), saved);
    ok("quem não é dono não vê as ações de moderação", !(await run(`document.body.textContent.includes('Ações do dono')`)));
  } catch (e) { ok("execução sem erro", false, e.message); }
  console.log(out.join("\n") + `\n\n${pass} passaram, ${fail} falharam`);
  app.exit(fail ? 1 : 0);
});
