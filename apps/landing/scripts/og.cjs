// Renders scripts/og.html into og.png (1200x630) with Electron:  electron apps/landing/scripts/og.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("fs"), path = require("path");
app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const scale = require("electron").screen.getPrimaryDisplay().scaleFactor;
  const win = new BrowserWindow({ width: 1200, height: 630, useContentSize: true, show: true, focusable: false, x: 0, y: 0, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, "og.html"));
  await new Promise((r) => setTimeout(r, 1500));
  let img = await win.webContents.capturePage();
  if (img.getSize().width !== 1200) img = img.resize({ width: 1200, height: 630, quality: "best" });
  fs.writeFileSync(path.join(__dirname, "..", "og.png"), img.toPNG());
  console.log("og.png", img.getSize(), "scale", scale); app.exit(0);
});
