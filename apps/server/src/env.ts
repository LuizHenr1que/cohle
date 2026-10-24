// Loads apps/server/.env WITHOUT overriding variables that are already set in the environment,
// so `tools/share/start.sh` (own secrets, public IP) always wins over the development defaults.
import { readFileSync } from "node:fs";

try {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
} catch { /* no .env: rely on the real environment */ }
