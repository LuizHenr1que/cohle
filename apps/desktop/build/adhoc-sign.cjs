// electron-builder afterPack hook: give the macOS app a VALID ad-hoc signature (free, no Apple account).
// Without it the bundle seal is broken and a downloaded app is reported as "damaged" by Gatekeeper.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", app], { stdio: "inherit" });   // fail the build if still invalid
  console.log("  • ad-hoc signature valid:", app);
};
