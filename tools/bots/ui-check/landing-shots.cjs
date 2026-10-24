// Screenshots + behaviour checks of the landing page (served on :5174)
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.env.W ?? 1280), H = Number(process.env.H ?? 800), UA = process.env.UA;
const OUT = process.env.OUT ?? "/tmp/cohle-landing";
fs.mkdirSync(OUT, { recursive: true });
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, useContentSize: true, x: 20, y: 20, focusable: false, show: true, webPreferences: { backgroundThrottling: false } });
  if (UA) win.webContents.setUserAgent(UA);
  const run = (c) => win.webContents.executeJavaScript(c, true);
  const shot = async (n) => { await sleep(900); fs.writeFileSync(`${OUT}/${W}x${H}-${n}.png`, (await win.webContents.capturePage()).toPNG()); };
  const errs = []; win.webContents.on("console-message", (_e, lvl, msg) => { if (lvl >= 2) errs.push(msg); });
  await win.loadURL("http://localhost:5174/"); await sleep(2500);
  console.log("erros de console:", JSON.stringify(errs));
  console.log("botão principal:", await run(`document.querySelector('.hero [data-dl-primary] [data-dl-label]').textContent`));
  console.log("destacado:", await run(`document.querySelector('.dl.me')?.dataset.os ?? 'nenhum'`));
  await shot("hero");
  if (process.env.FULL) {
    const h = await run("document.documentElement.scrollHeight");
    for (let y = 0, i = 0; y < h; y += H - 80, i++) { await run(`window.scrollTo(0, ${y})`); await sleep(700); await shot(`p${String(i).padStart(2, "0")}`); }
  }
  app.exit(0);
});
