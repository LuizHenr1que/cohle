// Automatic updates (electron-updater). On launch: look for a newer version; if there is one, show a small
// "Atualizando" window, download it, install and reopen. While the app runs: check every 30 minutes, download in
// the background and let the person restart when it suits them (it is also installed when the app quits).
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const splash = require("./splash.cjs");

const buildNo = () => String(app.getVersion()).split(".").pop();       // 0.0.N -> N

const FEED = process.env.COHLE_UPDATE_URL || "https://github.com/LuizHenr1que/cohle-releases/releases/latest/download/";
let autoUpdater = null;
try { ({ autoUpdater } = require("electron-updater")); } catch { /* not bundled: the renderer falls back to a download link */ }

const enabled = () => !!autoUpdater && app.isPackaged;
let state = { status: enabled() ? "idle" : "unsupported", version: null, percent: 0 };
let installing = false;
const broadcast = () => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && w.webContents.getURL().indexOf("overlay.html") < 0 && w.webContents.getURL().indexOf("splash") < 0) w.webContents.send("update:state", state); };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; broadcast(); listeners.forEach((f) => f(state)); };

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
  autoUpdater.on("update-not-available", () => set({ status: "none" }));
  autoUpdater.on("error", (e) => { console.warn("[updater]", e && e.message); if (state.status !== "ready") set({ status: "error" }); });
}

function install() {
  if (!enabled() || state.status !== "ready" || installing) return;
  installing = true;
  setImmediate(() => autoUpdater.quitAndInstall(false, true));   // not silent on Windows' installer UI is irrelevant (one-click); always reopen
}

/** Runs before the main window opens. Resolves "restarting" when an update is being installed (do not open the app). */
async function launchCheck() {
  if (!enabled()) return "continue";
  setup();
  let sp = null, done = false;
  const timeout = (ms) => new Promise((r) => setTimeout(() => r("timeout"), ms));
  const foot = `Cohle · Versão ${buildNo()}`;
  try {
    const res = await Promise.race([autoUpdater.checkForUpdates(), timeout(7000)]);
    if (res === "timeout" || !res || !res.isUpdateAvailable) return "continue";
    const next = String(res.updateInfo.version).split(".").pop();
    sp = splash.open({ title: `Atualizando para a Versão ${next}`, stat: "Preparando...", pct: null, msg: true, foot });
    autoUpdater.on("download-progress", (p) => sp.set({ pct: Math.round(p.percent), stat: `${Math.round(p.percent)}%  ·  ${(p.transferred / 1048576).toFixed(0)} de ${(p.total / 1048576).toFixed(0)} MB` }));
    const ok = await Promise.race([res.downloadPromise.then(() => true), timeout(180000)]);
    if (ok !== true) throw new Error("download timeout");
    done = true;
    sp.set({ pct: 100, stat: "Instalando...", msg: "Instalando e reabrindo o Cohle..." });
    installing = true;
    setTimeout(() => autoUpdater.quitAndInstall(false, true), 900);
    return "restarting";
  } catch (e) {
    console.warn("[updater] launch check failed:", e && e.message);
    return "continue";
  } finally {
    if (!done && sp) sp.close();
  }
}

/** First launch after an update: a short "updated" card while the app window loads. Returns a handle or null. */
function welcome() {
  try {
    const file = path.join(app.getPath("userData"), "last-version.txt");
    const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
    fs.writeFileSync(file, app.getVersion());
    if (!prev || (prev === app.getVersion() && !(process.env.COHLE_TEST && process.env.COHLE_FORCE_WELCOME))) return null;      // (the env is a test hook: never set in releases)
    return splash.open({ title: "Cohle atualizado!", msg: `Você está na Versão ${buildNo()}. Abrindo...`, stat: "", foot: `Cohle · Versão ${buildNo()}`, pct: null, done: true });
  } catch { return null; }
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
ipcMain.handle("update:check", () => checkNow());

/** Manual "check for updates" (tray menu). */
function checkNow() {
  if (!enabled() || installing || state.status === "downloading" || state.status === "ready") return;
  set({ status: "checking" });
  autoUpdater.checkForUpdates().then((r) => { if (!r || !r.isUpdateAvailable) set({ status: "none" }); }).catch(() => set({ status: "error" }));
}

module.exports = { launchCheck, watch, welcome, getState: () => state, onChange: (f) => listeners.add(f), install, checkNow, enabled };
