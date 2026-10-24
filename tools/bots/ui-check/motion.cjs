// Test fixture: a small always-on-top window with moving, very distinct colour bars (so a shared desktop has motion and recognisable content).
const { app, BrowserWindow } = require("electron"); app.on("window-all-closed", () => {});
app.whenReady().then(() => {
  const w = new BrowserWindow({ x: 40, y: 80, width: 640, height: 360, frame: false, alwaysOnTop: true, focusable: false, show: true, webPreferences: { backgroundThrottling: false } });
  w.setAlwaysOnTop(true, "screen-saver");
  w.loadURL("data:text/html,<body style='margin:0;overflow:hidden;background:%23101'><style>@keyframes m{from{transform:translateX(-120px)}to{transform:translateX(640px)}}div{position:absolute;height:90px;width:120px;animation:m 1.6s linear infinite}</style><div style='top:0;background:%23ff00ff'></div><div style='top:90px;background:%2300ffff;animation-delay:-.4s'></div><div style='top:180px;background:%23ffff00;animation-delay:-.8s'></div><div style='top:270px;background:%2300ff00;animation-delay:-1.2s'></div>");
});
