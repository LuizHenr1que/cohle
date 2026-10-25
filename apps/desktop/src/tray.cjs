// System tray (Windows notification area / macOS menu bar). Closing the window keeps Cohle running here,
// like other chat apps; the menu opens it, checks for updates, sets "open at login" and quits for real.
const { Tray, Menu, nativeImage, app, Notification } = require("electron");
const fs = require("fs");
const path = require("path");

let tray = null, lastMenu = null;

function image() {
  const dir = path.join(__dirname, "..", "build");
  const img = nativeImage.createFromPath(path.join(dir, process.platform === "darwin" ? "tray-32.png" : "tray-64.png"));
  return img.resize({ width: process.platform === "darwin" ? 18 : 16, height: process.platform === "darwin" ? 18 : 16 });
}

function create({ show, quit, updater }) {
  if (tray) return tray;
  tray = new Tray(image());
  tray.setToolTip("Cohle");
  const build = () => {
    const st = updater.getState();
    const upd = st.status === "ready" ? { label: `Reiniciar para atualizar (Versão ${String(st.version).split(".").pop()})`, click: () => updater.install() }
      : st.status === "downloading" ? { label: `Baixando atualização... ${st.percent}%`, enabled: false }
      : st.status === "checking" ? { label: "Procurando atualizações...", enabled: false }
      : st.status === "none" ? { label: "Você está na versão mais recente", enabled: false }
      : { label: "Verificar atualizações", enabled: updater.enabled(), click: () => updater.checkNow() };
    const login = app.getLoginItemSettings();
    return Menu.buildFromTemplate([
      { label: "Abrir o Cohle", click: show },
      { type: "separator" },
      upd,
      { label: process.platform === "win32" ? "Iniciar com o Windows" : "Abrir ao iniciar o computador", type: "checkbox", checked: login.openAtLogin, enabled: app.isPackaged,
        click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked, args: ["--hidden"] }) },
      { type: "separator" },
      { label: `Cohle · Versão ${String(app.getVersion()).split(".").pop()}`, enabled: false },
      { label: "Sair do Cohle", click: quit },
    ]);
  };
  const refresh = () => { if (tray && !tray.isDestroyed()) { lastMenu = build(); tray.setContextMenu(lastMenu); } };
  refresh();
  updater.onChange(refresh);
  tray.on("click", () => { if (process.platform !== "darwin") show(); });
  tray.on("double-click", show);
  tray.on("right-click", () => { refresh(); });
  return tray;
}

/** One-time hint the first time the window is hidden instead of closed. */
function hintOnce() {
  if (process.env.COHLE_TEST) return;      // automated tests must not raise system notifications
  try {
    const file = path.join(app.getPath("userData"), "tray-hint-shown");
    if (fs.existsSync(file)) return;
    fs.writeFileSync(file, "1");
    if (Notification.isSupported()) new Notification({ title: "O Cohle continua aberto", body: process.platform === "darwin" ? "Ele ficou na barra de menus. Use o ícone para abrir ou sair." : "Ele ficou na bandeja, perto do relógio. Clique no ícone para abrir ou sair." }).show();
  } catch { /* the hint is a courtesy */ }
}

module.exports = { create, hintOnce, get: () => tray, menu: () => lastMenu };
