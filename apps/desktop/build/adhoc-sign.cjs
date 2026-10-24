// electron-builder afterPack hook: free ad-hoc signature with a STABLE identity.
// macOS stores the Screen Recording permission against the app's "designated requirement". An ad-hoc signature
// defaults to the exact code hash, which changes on every build, so the permission was lost on every update.
// Pinning the requirement to the bundle identifier keeps the permission across updates.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const id = context.packager.appInfo.id;                                  // app.cohle.desktop
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", "--identifier", id, "-r=designated => identifier \"" + id + "\"", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", app], { stdio: "inherit" });
  console.log("  • signature valid, stable identity:", id);
};
