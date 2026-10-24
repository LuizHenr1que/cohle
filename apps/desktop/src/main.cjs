const { app, BrowserWindow, desktopCapturer, ipcMain, nativeImage, session, systemPreferences } = require("electron");
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

ipcMain.handle("sources:list", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 360, height: 220 },
    fetchWindowIcons: true,
  });
  const screenAccess = process.platform === "darwin" ? systemPreferences.getMediaAccessStatus("screen") : "granted";
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

  if (isDev) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, "..", "client", "index.html"));
}

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock?.setIcon(nativeImage.createFromPath(ICON));   // dev: the dock shows the real icon
  return createWindow();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
