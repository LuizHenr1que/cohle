// Real client (vite dev) + production API: join a voice room, start a screen share, check the self-preview.
const { app, BrowserWindow, session, desktopCapturer } = require("electron");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
app.on("window-all-closed", () => {});
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("use-fake-ui-for-media-stream");
app.commandLine.appendSwitch("use-fake-device-for-media-stream");
if (!process.env.TESTE2_PW) throw new Error("defina TESTE2_PW");
const API = "https://cohle-api.onrender.com", WEB = "http://localhost:5173";
app.whenReady().then(async () => {
  session.defaultSession.setDisplayMediaRequestHandler(async (_r, cb) => {
    const src = (await desktopCapturer.getSources({ types: ["screen"] }))[0]; cb(src ? { video: src } : {});
  });
  const win = new BrowserWindow({ width: 1280, height: 800, show: true, focusable: false, x: 20, y: 20, webPreferences: { backgroundThrottling: false } });
  win.webContents.setUserAgent(win.webContents.getUserAgent().replace(/ Electron\/\S+/, ""));
  const run = (c) => win.webContents.executeJavaScript(c, true);
  const click = (t) => run(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes(${JSON.stringify(t)})||(b.title||'').includes(${JSON.stringify(t)}));if(b){b.click();return true}return false})()`);
  await win.loadURL(WEB);
  await run(`localStorage.clear(); localStorage.setItem('cohle:server','${API}')`);
  await run(`(async()=>{const r=await fetch('${API}/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teste2@cohle.dev',password:process.env.TESTE2_PW})});const d=await r.json();localStorage.setItem('token',d.token);localStorage.setItem('me',JSON.stringify(d.user));})()`);
  await win.loadURL(WEB); await sleep(4000);
  ok("entrou na sala 'Sala de filmes'", await click("Sala de filmes")); await sleep(9000);
  ok("conectado à chamada", /Conectado/.test(await run("document.body.innerText")));
  ok("botão de compartilhar tela existe", await click("Compartilhar tela")); await sleep(7000);
  const tile = `(()=>{const t=[...document.querySelectorAll('video')].find(v=>v.videoWidth>0);return t?{w:t.videoWidth,h:t.videoHeight,playing:!t.paused&&t.readyState>=2}:null})()`;
  const v1 = await run(tile);
  ok("a minha tela aparece no meu quadro (prévia com vídeo tocando)", !!v1 && v1.playing, JSON.stringify(v1));
  ok('aviso "Prévia da sua tela: só você vê isso"', /Prévia da sua tela/.test(await run("document.body.innerText")));
  ok("selo AO VIVO no meu quadro", /AO VIVO/.test(await run("document.body.innerText")));
  ok("botão de esconder a prévia", await click("Esconder a prévia")); await sleep(1500);
  const v2 = await run(tile);
  ok("prévia escondida: some o vídeo e volta o aviso", !v2 && /Você está compartilhando a tela/.test(await run("document.body.innerText")), JSON.stringify(v2));
  ok("botão de mostrar a prévia de novo", await click("Mostrar a prévia")); await sleep(1500);
  ok("prévia volta", !!(await run(tile)));
  await click("Sair da chamada"); await sleep(1500);
  console.log(`\n${pass} passaram, ${fail} falharam`); app.exit(fail ? 1 : 0);
});
