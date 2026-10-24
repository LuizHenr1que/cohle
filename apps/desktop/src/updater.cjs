// Automatic updates (electron-updater). On launch: look for a newer version; if there is one, show a small
// "Atualizando" window, download it, install and reopen. While the app runs: check every 30 minutes, download in
// the background and let the person restart when it suits them (it is also installed when the app quits).
const { app, BrowserWindow, ipcMain } = require("electron");

const FEED = process.env.COHLE_UPDATE_URL || "https://github.com/LuizHenr1que/cohle-releases/releases/latest/download/";
let autoUpdater = null;
try { ({ autoUpdater } = require("electron-updater")); } catch { /* not bundled: the renderer falls back to a download link */ }

const enabled = () => !!autoUpdater && app.isPackaged;
let state = { status: enabled() ? "idle" : "unsupported", version: null, percent: 0 };
let installing = false;
const broadcast = () => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && w.webContents.getURL().indexOf("overlay.html") < 0 && w.webContents.getURL().indexOf("splash") < 0) w.webContents.send("update:state", state); };
const set = (patch) => { state = { ...state, ...patch }; broadcast(); };

function setup() {
  if (!enabled()) return;
  autoUpdater.setFeedURL({ provider: "generic", url: FEED });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = { info() {}, warn: console.warn, error: console.error, debug() {} };
  autoUpdater.on("update-available", (i) => set({ status: "downloading", version: i.version, percent: 0 }));
  autoUpdater.on("download-progress", (p) => set({ status: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (i) => set({ status: "ready", version: i.version, percent: 100 }));
  autoUpdater.on("update-not-available", () => set({ status: "idle" }));
  autoUpdater.on("error", (e) => { console.warn("[updater]", e && e.message); if (state.status !== "ready") set({ status: "error" }); });
}

function install() {
  if (!enabled() || state.status !== "ready" || installing) return;
  installing = true;
  setImmediate(() => autoUpdater.quitAndInstall(false, true));   // not silent on Windows' installer UI is irrelevant (one-click); always reopen
}

// The small window shown while an update is applied at launch.
function splash() {
  const w = new BrowserWindow({ width: 340, height: 190, frame: false, resizable: false, movable: true, center: true, show: false, backgroundColor: "#12080c", alwaysOnTop: true,
    webPreferences: { sandbox: true, contextIsolation: true } });
  const html = `<!doctype html><meta charset="utf-8"><title>splash</title><style>
    html,body{margin:0;height:100%;background:#12080c;color:#f5eaee;font:500 13px -apple-system,Segoe UI,Inter,sans-serif;-webkit-app-region:drag;user-select:none}
    .b{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(120% 90% at 50% 0%,rgba(255,59,92,.22),transparent 60%)}
    .l{width:46px;height:46px;border-radius:50%;border:7px solid #ff5a74;border-right-color:transparent;transform:rotate(-30deg)}
    h1{margin:0;font-size:15px}.s{color:#b9a5ad;font-size:12px}
    .t{width:220px;height:6px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden}.f{height:100%;width:3%;border-radius:9px;background:linear-gradient(90deg,#ff3b5c,#ff9a62);transition:width .2s}
  </style><div class="b"><div class="l"></div><h1>Atualizando o Cohle</h1><div class="t"><div class="f" id="f"></div></div><div class="s" id="s">Procurando a nova versão...</div></div>
  <script>window.set=(p,t)=>{document.getElementById("f").style.width=Math.max(3,p)+"%";document.getElementById("s").textContent=t}</script>`;
  w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  w.once("ready-to-show", () => w.show());
  return w;
}

/** Runs before the main window opens. Resolves "restarting" when an update is being installed (do not open the app). */
async function launchCheck() {
  if (!enabled()) return "continue";
  setup();
  let sp = null, done = false;
  const timeout = (ms) => new Promise((r) => setTimeout(() => r("timeout"), ms));
  try {
    const res = await Promise.race([autoUpdater.checkForUpdates(), timeout(7000)]);
    if (res === "timeout" || !res || !res.isUpdateAvailable) return "continue";
    sp = splash();
    const upd = (p) => { if (sp && !sp.isDestroyed()) sp.webContents.executeJavaScript(`set(${p}, "Baixando a versão ${res.updateInfo.version}... ${p}%")`).catch(() => {}); };
    autoUpdater.on("download-progress", (p) => upd(Math.round(p.percent)));
    const ok = await Promise.race([res.downloadPromise.then(() => true), timeout(180000)]);
    if (ok !== true) throw new Error("download timeout");
    done = true;
    if (sp && !sp.isDestroyed()) await sp.webContents.executeJavaScript(`set(100, "Reiniciando...")`).catch(() => {});
    installing = true;
    setTimeout(() => autoUpdater.quitAndInstall(false, true), 400);
    return "restarting";
  } catch (e) {
    console.warn("[updater] launch check failed:", e && e.message);
    return "continue";
  } finally {
    if (!done && sp && !sp.isDestroyed()) sp.close();
  }
}

function watch() {
  if (!enabled()) return;
  setup();                                                   // idempotent for the listeners we care about
  const check = () => { if (!installing) autoUpdater.checkForUpdates().catch(() => {}); };
  setInterval(check, 30 * 60 * 1000).unref();
  setTimeout(check, 20_000).unref();
}

ipcMain.handle("update:get", () => state);
ipcMain.handle("update:install", () => install());

module.exports = { launchCheck, watch };
