// Screenshots of the REAL Cohle client (served by vite on :5173) talking to a throw-away demo API on :3002.
//   MODE=desktop|mobile node/electron ui-check/app-shots.cjs   ->  /tmp/cohle-app-shots/<mode>-<name>.jpg
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MODE = process.env.MODE ?? "desktop";
const [W, H] = MODE === "mobile" ? [390, 844] : [1280, 800];
const OUT = "/tmp/cohle-app-shots"; fs.mkdirSync(OUT, { recursive: true });
const API = "http://localhost:3002", WEB = "http://localhost:5173";
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, useContentSize: true, x: 20, y: 20, focusable: false, show: true, webPreferences: { backgroundThrottling: false } });
  win.webContents.setUserAgent(win.webContents.getUserAgent().replace(/ Electron\/\S+/, ""));   // no desktop title-bar strip
  const run = (c) => win.webContents.executeJavaScript(c, true);
  const shot = async (name, ms = 900) => {
    await sleep(ms);
    const img = (await win.webContents.capturePage()), { width } = img.getSize();
    const w = MODE === "mobile" ? width : 1800;
    fs.writeFileSync(`${OUT}/${MODE}-${name}.jpg`, img.resize({ width: Math.min(w, width), quality: "best" }).toJPEG(90));
    console.log("ok", name);
  };
  const click = (t, sel = "button") => run(`(()=>{const b=[...document.querySelectorAll('${sel}')].find(b=>(b.textContent||'').includes(${JSON.stringify(t)})||(b.title||'').includes(${JSON.stringify(t)})||(b.getAttribute('aria-label')||'').includes(${JSON.stringify(t)}));if(b){b.click();return true}return false})()`);
  try {
    await win.loadURL(WEB);
    await run(`localStorage.clear(); localStorage.setItem('cohle:server','${API}')`);
    await win.loadURL(WEB); await sleep(2200);
    await shot("login");
    // sign in as Ana (owner of "Cohle Squad") through the API, like the app would
    await run(`(async()=>{const r=await fetch('${API}/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ana@demo.cohle.dev',password:'demo-pass-123'})});const d=await r.json();localStorage.setItem('token',d.token);localStorage.setItem('me',JSON.stringify(d.user));localStorage.setItem('fx','on');})()`);
    await win.loadURL(WEB); await sleep(3000);
    if (MODE === "mobile") {
      await click("Abrir menu"); await sleep(500); await shot("drawer");
      await click("Bate-papo"); await sleep(11000); await shot("voice", 400);
      await click("Assistir"); await sleep(8000); await shot("stage", 400);
    } else {
      await click("geral"); await sleep(1200); await shot("chat");
      await click("Bate-papo"); await sleep(12000); await shot("voice", 300);
      await click("Volume e opções"); await sleep(600); await shot("menu", 300);
      await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(400);
      await click("Assistir"); await sleep(9000); await shot("stage", 300);
      await click("Parar de assistir"); await sleep(600);
      await click("Criar servidor"); await sleep(900); await shot("create");
      await run(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(500);
      await click("Configurações do servidor"); await sleep(1000); await shot("settings");
      await click("Membros"); await sleep(900); await shot("members");
    }
  } catch (e) { console.log("erro", e.message); }
  app.exit(0);
});
