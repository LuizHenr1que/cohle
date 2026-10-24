const { app, BrowserWindow, desktopCapturer, ipcMain, nativeImage, session, shell, systemPreferences } = require("electron");
const path = require("path");

// Keep the footprint small: no extra Chromium services we do not use.
app.commandLine.appendSwitch("disable-features", "MediaRouter,TranslateUI,OptimizationHints,AutofillServerCommunication");
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required"); // remote voices must play without a click

app.setName("Cohle");
const ICON = path.join(__dirname, "..", "build", "icon.png");   // packaged builds embed icon.icns / icon.ico instead

const DEV_URL = process.env.COHLE_DEV_URL ?? "http://localhost:5173";
const isDev = !app.isPackaged;

// Source chosen in the renderer's picker modal, consumed by the display-media handler.
let picked = { id: null, audio: false };

const screenStatus = () => (process.platform === "darwin" ? systemPreferences.getMediaAccessStatus("screen") : "granted");
let asked = false;   // macOS shows its prompt the first time the capture API is used: do that once per run, never in a loop

ipcMain.handle("screen:openSettings", () => shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"));

// only the public releases repo (the update download), nothing else the page might ask for
ipcMain.handle("open:external", (_e, url) => { if (typeof url === "string" && url.startsWith("https://github.com/LuizHenr1que/cohle-releases/")) { console.log("[open:external]", url); return shell.openExternal(url); } });
ipcMain.handle("sources:list", async () => {
  const status = screenStatus();
  if (status === "denied" || (status === "not-determined" && asked)) return { screenAccess: status, sources: [] };
  if (status === "not-determined") asked = true;
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 360, height: 220 },
    fetchWindowIcons: true,
  });
  const screenAccess = screenStatus();
  return {
    screenAccess,
    sources: sources
      .filter((s) => !s.thumbnail.isEmpty())
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: s.id.startsWith("screen:") ? "screen" : "window",
        thumbnail: s.thumbnail.toDataURL(),
        appIcon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
      })),
  };
});

ipcMain.handle("sources:select", (_e, id, audio) => { picked = { id, audio: !!audio }; });

// ---- in-call widget: a tiny always-on-top window, only while you are in a call and Cohle is not in front ----
let mainWin = null, overlay = null;
let ov = { inCall: false, channel: "", speakers: [], dismissed: false };

function mainInFront() { return !!mainWin && !mainWin.isDestroyed() && mainWin.isVisible() && !mainWin.isMinimized() && mainWin.isFocused(); }
function ensureOverlay() {
  if (overlay && !overlay.isDestroyed()) return overlay;
  const { workArea } = require("electron").screen.getPrimaryDisplay();
  overlay = new BrowserWindow({
    width: 268, height: 52, x: workArea.x + workArea.width - 268 - 14, y: workArea.y + 14,
    frame: false, transparent: true, resizable: false, movable: true, skipTaskbar: true, focusable: false, hasShadow: false, show: false,
    alwaysOnTop: true, fullscreenable: false, backgroundColor: "#00000000",
    webPreferences: { preload: path.join(__dirname, "overlay-preload.cjs"), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });       // click-through by default
  overlay.loadFile(path.join(__dirname, "overlay.html"));
  overlay.on("closed", () => { overlay = null; });
  return overlay;
}
function syncOverlay() {
  const want = ov.inCall && !ov.dismissed && !mainInFront();
  if (!want) { if (overlay && !overlay.isDestroyed() && overlay.isVisible()) overlay.hide(); return; }
  const o = ensureOverlay();
  const send = () => o.webContents.send("overlay:state", { channel: ov.channel, speakers: ov.speakers });
  if (o.webContents.isLoading()) o.webContents.once("did-finish-load", send); else send();
  if (!o.isVisible()) o.showInactive();
}
ipcMain.on("overlay:state", (_e, st) => {
  const wasIn = ov.inCall;
  ov = { inCall: !!st?.inCall, channel: String(st?.channel ?? "").slice(0, 60), speakers: Array.isArray(st?.speakers) ? st.speakers.slice(0, 6).map((p) => ({ id: String(p.id), name: String(p.name).slice(0, 40), avatar: typeof p.avatar === "string" && /^https?:/.test(p.avatar) ? p.avatar : null })) : [], dismissed: ov.dismissed };
  if (!ov.inCall || !wasIn) ov.dismissed = false;           // a new call brings the widget back
  syncOverlay();
});
ipcMain.on("overlay:size", (_e, h) => { if (overlay && !overlay.isDestroyed()) overlay.setSize(268, Math.max(40, Math.min(400, Math.round(h)))); });
ipcMain.on("overlay:interactive", (_e, on) => { if (overlay && !overlay.isDestroyed()) overlay.setIgnoreMouseEvents(!on, { forward: true }); });
ipcMain.on("overlay:close", () => { ov.dismissed = true; syncOverlay(); });
ipcMain.on("overlay:focus-app", () => { if (mainWin && !mainWin.isDestroyed()) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); } });

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 380, minHeight: 520,
    icon: ICON,
    backgroundColor: "#0a0507",
    // macOS: hidden title bar, the client draws a 44px drag strip under the traffic lights.
    // Windows/Linux: keep the native frame so caption buttons and snapping behave natively.
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 18, y: 14 } }
      : { autoHideMenuBar: true }),
    webPreferences: {
      contextIsolation: true, sandbox: true, preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: true,   // timers/animations slow down when the window is hidden (audio is unaffected)
      spellcheck: false,            // no spellchecker process/dictionaries in memory
    },
  });

  // Screen share: use the source the user picked in the renderer modal.
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, callback) => {
    const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
    const src = sources.find((x) => x.id === picked.id) ?? sources.find((x) => x.id.startsWith("screen:"));
    const audio = picked.audio && process.platform === "win32" ? "loopback" : undefined;
    picked = { id: null, audio: false };
    callback(src ? { video: src, audio } : {});
  });

  if (process.platform === "darwin") {
    await systemPreferences.askForMediaAccess("microphone").catch(() => {});
    await systemPreferences.askForMediaAccess("camera").catch(() => {});
  }

  mainWin = win;
  for (const e of ["focus", "blur", "minimize", "restore", "show", "hide"]) win.on(e, () => setTimeout(syncOverlay, 60));
  win.on("closed", () => { mainWin = null; if (overlay && !overlay.isDestroyed()) overlay.destroy(); });
  if (isDev) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, "..", "client", "index.html"));
}

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock?.setIcon(nativeImage.createFromPath(ICON));   // dev: the dock shows the real icon
  return createWindow();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
