import { useEffect, useState } from "react";
import { BUILD } from "../version";

const REPO = "LuizHenr1que/cohle-releases";

/** Desktop app only: checks the public releases for a newer "teste-N" and gives the direct download of the right installer. */
export function useUpdate() {
  const [next, setNext] = useState<{ n: number; note: string; url: string }>();
  useEffect(() => {
    const c = window.cohle;
    if (!c) return;
    let dead = false;
    const check = async () => {
      try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
        if (!r.ok) return;
        const rel = await r.json() as { tag_name?: string; name?: string };
        const n = Number(/(\d+)\s*$/.exec(rel.tag_name ?? "")?.[1]);
        if (dead || !n || n <= BUILD.n) return;
        const file = c.platform === "darwin" ? `Cohle-mac-${c.arch === "arm64" ? "arm64" : "x64"}.dmg` : "Cohle-win-x64.zip";
        setNext({ n, note: rel.name ?? "", url: `https://github.com/${REPO}/releases/latest/download/${file}` });
      } catch { /* offline: try again later */ }
    };
    check();
    const t = setInterval(check, 30 * 60_000);                    // light: one tiny request every 30 min
    return () => { dead = true; clearInterval(t); };
  }, []);
  return next;
}
