// Clicks the real download buttons on the live site and records what the browser starts to download.
const { app, BrowserWindow, session } = require("electron");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
app.on("window-all-closed", () => {});
const UAS = {
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  win: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};
app.whenReady().then(async () => {
  for (const [name, ua] of Object.entries(UAS)) {
    const ses = session.fromPartition("dl-" + name);
    const got = [];
    ses.on("will-download", (_e, item) => { got.push({ file: item.getFilename(), mb: Math.round(item.getTotalBytes() / 1048576), url: item.getURL().slice(0, 70) }); item.cancel(); });
    const win = new BrowserWindow({ width: 1280, height: 800, show: true, focusable: false, x: 20, y: 20, webPreferences: { session: ses, backgroundThrottling: false } });
    win.webContents.setUserAgent(ua);
    await win.loadURL("https://cohle.verticeapp.com.br/"); await sleep(2500);
    const label = await win.webContents.executeJavaScript(`document.querySelector('.hero [data-dl-primary] [data-dl-label]').textContent`);
    await win.webContents.executeJavaScript(`document.querySelector('.hero [data-dl-primary]').click()`); await sleep(6000);
    console.log(`${name}: botão "${label}" -> download iniciado:`, JSON.stringify(got));
    win.destroy(); await sleep(500);
  }
  app.exit(0);
});
