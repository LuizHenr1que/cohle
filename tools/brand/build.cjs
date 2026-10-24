// Renders brand/cohle-icon.svg into every icon the app needs (macOS .icns, Windows .ico, PNGs, favicon).
// Run: apps/desktop/node_modules/.bin/electron tools/brand/build.cjs
const { app, BrowserWindow, nativeImage } = require("electron");
const fs = require("fs"), path = require("path"), cp = require("child_process");
const root = path.resolve(__dirname, "..", "..");
const out = { desktop: path.join(root, "apps/desktop/build"), pub: path.join(root, "apps/client/public"), png: path.join(root, "brand/png") };
Object.values(out).forEach((d) => fs.mkdirSync(d, { recursive: true }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A 1024 px window does not fit on most screens (the OS shrinks it and the capture gets cropped), so draw in a
// window of size/scale CSS px: on a 2x display that captures exactly `size` physical pixels.
async function render(svgFile, size) {
  const scale = require("electron").screen.getPrimaryDisplay().scaleFactor;
  const css = Math.round(size / scale);
  const win = new BrowserWindow({ width: css, height: css, useContentSize: true, transparent: true, frame: false, show: true, focusable: false, hasShadow: false, x: 0, y: 0,
    webPreferences: { backgroundThrottling: false } });
  const svg = fs.readFileSync(svgFile, "utf8");
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<body style="margin:0;background:transparent"><div style="width:${css}px;height:${css}px">${svg.replace("<svg ", `<svg width="${css}" height="${css}" `)}</div></body>`));
  await sleep(600);
  const img = await win.webContents.capturePage();
  win.destroy();
  const got = img.getSize();
  if (got.width !== size || got.height !== size) throw new Error(`capture is ${got.width}x${got.height}, expected ${size}x${size} (display scale ${scale})`);
  return img;
}

function ico(pngs) {   // PNG-in-ICO (Vista+): header + directory + raw PNG blobs
  const n = pngs.length, head = Buffer.alloc(6 + 16 * n);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(n, 4);
  let off = head.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o); head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3); head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(buf.length, o + 8); head.writeUInt32LE(off, o + 12); off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.buf)]);
}

app.whenReady().then(async () => {
  const big = await render(path.join(root, "brand/cohle-icon.svg"), 1024);
  const at = (size) => size === 1024 ? big : big.resize({ width: size, height: size, quality: "best" });
  const save = (file, img) => fs.writeFileSync(file, img.toPNG());

  save(path.join(out.png, "cohle-icon-1024.png"), big);
  save(path.join(out.desktop, "icon.png"), big);

  // macOS .icns via iconutil
  const set = path.join(out.png, "cohle.iconset"); fs.rmSync(set, { recursive: true, force: true }); fs.mkdirSync(set);
  for (const s of [16, 32, 128, 256, 512]) { save(path.join(set, `icon_${s}x${s}.png`), at(s)); save(path.join(set, `icon_${s}x${s}@2x.png`), at(s * 2)); }
  cp.execFileSync("iconutil", ["-c", "icns", set, "-o", path.join(out.desktop, "icon.icns")]);
  fs.rmSync(set, { recursive: true, force: true });

  // Windows .ico
  fs.writeFileSync(path.join(out.desktop, "icon.ico"), ico([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, buf: at(size).toPNG() }))));

  // web: apple touch, PWA sizes, favicon (the squircle without the macOS margin reads better small)
  save(path.join(out.pub, "apple-touch-icon.png"), at(180));
  save(path.join(out.pub, "icon-192.png"), at(192));
  save(path.join(out.pub, "icon-512.png"), at(512));
  fs.copyFileSync(path.join(root, "brand/cohle-icon.svg"), path.join(out.pub, "favicon.svg"));
  fs.copyFileSync(path.join(root, "brand/cohle-mark.svg"), path.join(out.pub, "cohle-mark.svg"));
  console.log("ok"); app.exit(0);
});
