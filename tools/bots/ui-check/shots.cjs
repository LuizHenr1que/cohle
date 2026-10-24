// Screenshots of the real client at several window sizes/states -> /tmp/cohle-shots/<size>-<state>.png
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const SIZES = (process.env.SIZES ?? "1280x800,900x600,600x800,390x780").split(",").map((s) => s.split("x").map(Number));
const STATES = (process.env.STATES ?? "text,voice,stage").split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync("/tmp/cohle-shots", { recursive: true });
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

app.whenReady().then(async () => {
  for (const [w, h] of SIZES) {
    const win = new BrowserWindow({ width: w, height: h, useContentSize: true, x: 20, y: 20, focusable: false, show: true,
      webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    const run = (code) => win.webContents.executeJavaScript(code, true);
    const shot = async (name) => { await sleep(700); fs.writeFileSync(`/tmp/cohle-shots/${w}x${h}-${name}.png`, (await win.webContents.capturePage()).toPNG()); };
    const click = (t) => run(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes(${JSON.stringify(t)})||(b.title||'').includes(${JSON.stringify(t)})||(b.getAttribute('aria-label')||'').includes(${JSON.stringify(t)}));if(b){b.click();return true}return false})()`);
    try {
      await win.loadURL("http://localhost:5173");
      if (STATES.includes("login")) { await run(`localStorage.clear()`); await win.loadURL("http://localhost:5173"); await sleep(1500); await shot("login"); }
      await run(`(async()=>{const r=await fetch('http://localhost:3001/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teste2@cohle.dev',password:'teste12345'})});const d=await r.json();localStorage.setItem('token',d.token);localStorage.setItem('me',JSON.stringify(d.user));localStorage.setItem('cohle:volumes','{}')})()`);
      await win.loadURL("http://localhost:5173"); await sleep(2500);
      if (STATES.includes("text")) await shot("text");
      await click("Abrir menu"); await sleep(400);
      if (STATES.includes("menu")) await shot("menu");
      const joined = await click("Sala de voz"); await sleep(joined ? 9000 : 500);
      if (STATES.includes("voice")) await shot("voice");
      if (await click("Assistir")) { await sleep(6000); if (STATES.includes("stage")) await shot("stage"); }
      if (STATES.includes("settings")) { await click("Parar de assistir"); await click("Configurações"); await sleep(800); await shot("settings"); }
    } catch (e) { console.log("erro", w, h, e.message); }
    win.destroy();
  }
  console.log("ok"); app.exit(0);
});
