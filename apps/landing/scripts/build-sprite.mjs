// Builds apps/landing/icons.svg from the same icon set the app uses (lucide), so the landing matches the product.
//   node apps/landing/scripts/build-sprite.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "../../client/node_modules/lucide-react/dist/esm/icons");
const NAMES = ["hash","volume-2","volume-x","mic","mic-off","headphones","headphone-off","video","video-off","monitor-up","monitor-play",
  "phone-off","plus","link-2","zap","crown","send","maximize-2","minimize-2","x","user-plus","sliders-horizontal","screen-share","settings",
  "lock","ban","user-x","phone-missed","shield-alert","sparkles","download","laptop","monitor","message-square","rocket","smartphone",
  "globe","heart","check","chevron-down","arrow-right","play","users","gamepad-2","graduation-cap","palette","flame","gauge","bell",
  "image","smile","bot","key-round","hourglass","hammer","coffee","party-popper","feather","sun","moon","cpu","wifi","at-sign","file-up","layers"];

const attr = (o) => Object.entries(o).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ");
const out = [];
for (const n of NAMES) {
  const f = join(dir, `${n}.js`);
  if (!existsSync(f)) { console.warn("sem ícone:", n); continue; }
  const src = readFileSync(f, "utf8");
  const m = /createLucideIcon\(\s*"[^"]+",\s*(\[[\s\S]*?\])\s*\);/.exec(src);
  if (!m) { console.warn("não consegui ler:", n); continue; }
  const nodes = new Function(`return ${m[1]}`)();
  out.push(`<symbol id="i-${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes.map(([t, a]) => `<${t} ${attr(a)}/>`).join("")}</symbol>`);
}
writeFileSync(join(here, "../icons.svg"), `<svg xmlns="http://www.w3.org/2000/svg">${out.join("\n")}</svg>\n`);
console.log(`${out.length}/${NAMES.length} ícones -> apps/landing/icons.svg`);
