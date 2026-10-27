import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken, getStored, setStored, clearStored, setOnSessionGone } from "./api";
import { AuthScreen } from "./components/AuthScreen";
import { Workspace } from "./components/Workspace";
import { ParticleField } from "./components/ParticleField";
import { usePrefs, weakDevice } from "./shop/prefs";

export function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [me, setMe] = useState<{ id: string; username: string } | null>(
    JSON.parse(getStored("me") ?? "null"),
  );

  const dropSession = useCallback(() => { setToken(null); clearStored("me"); setAuthed(false); setMe(null); }, []);

  useEffect(() => { setOnSessionGone(dropSession); }, [dropSession]);

  // The shop changed what I wear (frame, name, badge...): fetch my profile again so my own screens show it.
  useEffect(() => {
    if (!authed) return;
    const h = () => api.me().then((u) => { let remember = true; try { remember = localStorage.getItem("token") === getToken(); } catch { /* ignore */ } setStored("me", JSON.stringify(u), remember); setMe(u); }).catch(() => {});
    window.addEventListener("cohle:me-changed", h); return () => window.removeEventListener("cohle:me-changed", h);
  }, [authed]);

  // A stored token can belong to an account that no longer exists. /servers still returns [] in that case.
  useEffect(() => {
    if (!authed) return;
    api.me().then((u) => {
      let remember = true;
      try { remember = localStorage.getItem("token") === getToken(); } catch { /* ignore */ }
      setStored("me", JSON.stringify(u), remember);
      setMe(u);
    }).catch((e: { status?: number }) => {
      if (e?.status === 401 || e?.status === 404) dropSession();
    });
  }, [authed, dropSession]);

  // Particle backdrop: on by default, user can switch it off from the sidebar (saved per device).
  // Desktop: on by default. Web: off by default (a browser tab shares the machine with everything else; opt in from the sidebar).
  const [fx, setFx] = useState(() => {
    try { const v = localStorage.getItem("fx"); return (v ? v === "on" : !!window.cohle) && !matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return !!window.cohle; }
  });
  const toggleFx = () => setFx((v) => { try { localStorage.setItem("fx", v ? "off" : "on"); } catch {} return !v; });

  // Lite mode: no particles, no blur, no animations. Saved per device.
  // The manual switch wins; otherwise the shop preference decides ("Automático" turns it on by itself for weak machines).
  const [lite, setLite] = useState(() => { try { return localStorage.getItem("lite") === "on"; } catch { return false; } });
  const prefs = usePrefs();
  const manual = (() => { try { return localStorage.getItem("lite"); } catch { return null; } })();
  const liteEff = lite || (manual === null && (prefs.lite === "on" || (prefs.lite === "auto" && weakDevice())));
  useEffect(() => { document.documentElement.classList.toggle("lite", liteEff); }, [liteEff]);
  const toggleLite = () => setLite((v) => { try { localStorage.setItem("lite", v ? "off" : "on"); } catch {} return !v; });

  const titleBar = <div className="titlebar-drag hidden electron-mac:block" />;
  const shell = (child: React.ReactNode) => (
    <div className="h-full flex flex-col relative">
      {fx && !liteEff && <ParticleField />}
      <div className="relative z-10 flex flex-col h-full">
        {titleBar}
        <div className="flex-1 min-h-0">{child}</div>
      </div>
    </div>
  );

  if (!authed || !me)
    return shell(
      <AuthScreen
        onDone={(t, u, remember) => {
          setToken(t, remember); setStored("me", JSON.stringify(u), remember); setMe(u); setAuthed(true);
        }}
      />,
    );
  return shell(<Workspace me={me} fx={fx && !liteEff} onToggleFx={toggleFx} lite={lite} onToggleLite={toggleLite} onLogout={dropSession} />);
}
