import { useEffect, useState } from "react";
import { api, getToken, setToken, getStored, setStored, clearStored } from "./api";
import { AuthScreen } from "./components/AuthScreen";
import { Workspace } from "./components/Workspace";
import { ParticleField } from "./components/ParticleField";

export function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [me, setMe] = useState<{ id: string; username: string } | null>(
    JSON.parse(getStored("me") ?? "null"),
  );

  useEffect(() => {
    if (authed) api.servers().catch(() => { setToken(null); setAuthed(false); });
  }, [authed]);

  // Particle backdrop: on by default, user can switch it off from the sidebar (saved per device).
  const [fx, setFx] = useState(() => {
    try { return localStorage.getItem("fx") !== "off" && !matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return true; }
  });
  const toggleFx = () => setFx((v) => { try { localStorage.setItem("fx", v ? "off" : "on"); } catch {} return !v; });

  // Lite mode: no particles, no blur, no animations. Saved per device.
  const [lite, setLite] = useState(() => { try { return localStorage.getItem("lite") === "on"; } catch { return false; } });
  useEffect(() => { document.documentElement.classList.toggle("lite", lite); }, [lite]);
  const toggleLite = () => setLite((v) => { try { localStorage.setItem("lite", v ? "off" : "on"); } catch {} return !v; });

  const titleBar = <div className="titlebar-drag hidden electron-mac:block" />;
  const shell = (child: React.ReactNode) => (
    <div className="h-full flex flex-col relative">
      {fx && !lite && <ParticleField />}
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
  return shell(<Workspace me={me} fx={fx && !lite} onToggleFx={toggleFx} lite={lite} onToggleLite={toggleLite} onLogout={() => { setToken(null); clearStored("me"); setAuthed(false); setMe(null); }} />);
}
