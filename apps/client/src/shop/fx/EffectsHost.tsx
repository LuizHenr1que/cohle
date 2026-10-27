// Mounted once (lazy) when something needs it: an equipped scene, the season's ambient snow, or being in a call (entrances and giant reactions from the others).
// Every effect obeys one switch (useEffectsOn: not switched off, not Modo leve, no reduced-motion) and nothing runs in a hidden tab.
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ENTRANCE_OF } from "../registry";
import { GiantArt } from "../GiantIcons";
import { isMobile, useEffectsOn, usePrefs } from "../prefs";
import { playFx, soundboardOn } from "../../lib/soundboard";
import { Countdown, Lights, PumpkinCorner, Sleigh, Tree, Witch, useVisible } from "./Pieces";
import type { Socket } from "socket.io-client";

const Snow = lazy(() => import("./Snow"));

type Ov = { id: number; kind: "entrance"; text: string; who: string; look: "natal" | "halloween"; sound: "hohoho" | "boo" } | { id: number; kind: "giant"; icon: string };
let seq = 0;

function Entrance({ text, who, kind }: { text: string; who: string; kind: "natal" | "halloween" }) {
  const bits = useRef(Array.from({ length: 16 }, () => ({ x: Math.random() * 96, dx: (Math.random() - 0.5) * 18, rot: (Math.random() - 0.5) * 540, d: Math.random() * 0.8, pick: Math.random() }))).current;
  const halloween = kind === "halloween";
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none overflow-hidden" aria-hidden="true">
      {bits.map((b, i) => (
        <span key={i} className="absolute top-0" style={{ left: `${b.x}%`, ["--dx" as any]: `${b.dx}vw`, ["--rot" as any]: `${b.rot}deg`, animation: `fx-fall ${1.9 + b.d}s linear ${b.d * 0.5}s both` }}>
          {halloween ? <GiantArt icon={b.pick < 0.4 ? "bat" : b.pick < 0.75 ? "ghost" : "pumpkin"} size={34} /> : b.pick < 0.55 ? <GiantArt icon="gift" size={34} /> : <span className="block size-3 rounded-full bg-white/90" />}
        </span>
      ))}
      <div className="absolute inset-x-0 top-[28%] grid place-items-center">
        <div className="fx-ent-text text-center">
          <div className={`text-5xl sm:text-7xl font-black tracking-tight text-white ${halloween ? "drop-shadow-[0_6px_30px_rgba(255,122,26,0.8)]" : "drop-shadow-[0_6px_30px_rgba(230,57,70,0.7)]"}`}>{text}</div>
          <div className="mt-2 text-sm sm:text-base font-semibold text-white/85">{who} entrou na sala</div>
        </div>
      </div>
    </div>
  );
}

function Giant({ icon, onDone }: { icon: string; onDone: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current; if (!node) return;
    const y = 12 + Math.random() * 40;
    const a = node.animate([{ transform: `translate3d(-18vw, ${y}vh, 0) scale(.7) rotate(-10deg)`, opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.88 }, { transform: `translate3d(112vw, ${y - 10}vh, 0) scale(1.15) rotate(12deg)`, opacity: 0 }], { duration: 2000, easing: "ease-in-out" });
    a.onfinish = onDone; return () => a.cancel();
  }, []);
  return <div ref={el} className="fixed left-0 top-0 z-[70] pointer-events-none" style={{ opacity: 0 }} aria-hidden="true"><GiantArt icon={icon} size={140} /></div>;
}

export default function EffectsHost({ keys, bonus, season, socket, voiceId, nameFor }: {
  keys: Partial<Record<string, string>>; bonus: string | null; season: boolean; socket: () => Socket | null | undefined; voiceId?: string; nameFor: (userId: string) => string;
}) {
  const on = useEffectsOn(), prefs = usePrefs(), vis = useVisible();
  const [ovs, setOvs] = useState<Ov[]>([]);
  const latest = useRef({ voiceId, nameFor, on, prefs, socket }); latest.current = { voiceId, nameFor, on, prefs, socket };       // the props are inline closures: read them through the ref so the listeners are attached once

  useEffect(() => {
    let off = () => {};
    const t = setInterval(() => {
      const s = latest.current.socket(); if (!s) return; clearInterval(t);
      const add = (o: Ov, ms: number) => { setOvs((l) => [...l.slice(-5), o]); setTimeout(() => setOvs((l) => l.filter((x) => x.id !== o.id)), ms); };
      const sound = (id: "hohoho" | "boo" | "whoosh") => { const p = latest.current.prefs; if (!p.soundsOff && soundboardOn()) playFx(id); };
      const entrance = (e: { userId: string; channelId: string; key: string }) => {
        const L = latest.current, meta = ENTRANCE_OF[e.key];
        if (!L.on || !meta || e.channelId !== L.voiceId || document.hidden) return;                // only in the call I am in, only if effects are on and I am looking
        add({ id: ++seq, kind: "entrance", text: meta.text, who: L.nameFor(e.userId), look: meta.kind, sound: meta.sound }, 2800); sound(meta.sound);
      };
      const giant = (e: { icon: string; channelId: string }) => {
        const L = latest.current; if (!L.on || e.channelId !== L.voiceId || document.hidden) return;
        add({ id: ++seq, kind: "giant", icon: e.icon }, 2300); sound("whoosh");
      };
      s.on("fx:entrance", entrance); s.on("fx:giant", giant);
      off = () => { s.off("fx:entrance", entrance); s.off("fx:giant", giant); };
    }, 300);
    return () => { clearInterval(t); off(); };
  }, []);

  // "Ver ao vivo" in the Shop: play an effect here, only for me
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: "entrance" | "giant"; text?: string; who?: string; icon?: string; look?: "natal" | "halloween" };
      if (!latest.current.on) return;
      const o: Ov = d.kind === "entrance" ? { id: ++seq, kind: "entrance", text: d.text ?? "", who: d.who ?? "", look: d.look ?? "natal", sound: d.look === "halloween" ? "boo" : "hohoho" } : { id: ++seq, kind: "giant", icon: d.icon ?? "heart" };
      setOvs((l) => [...l.slice(-5), o]); setTimeout(() => setOvs((l) => l.filter((x) => x.id !== o.id)), d.kind === "entrance" ? 2800 : 2300);
      if (!latest.current.prefs.soundsOff && soundboardOn()) playFx(o.kind === "entrance" ? o.sound : "whoosh");
    };
    window.addEventListener("cohle:fx-preview", h); return () => window.removeEventListener("cohle:fx-preview", h);
  }, []);

  if (!on) return null;
  const scene = keys.theme === "natal.theme", spooky = keys.theme === "halloween.theme";
  const ambient = !scene && !keys.theme && season && prefs.seasonalAuto;           // the season's light snow, for people who did not equip a theme (they can switch it off)
  const snow = vis && (scene || ambient) ? Math.round((isMobile() ? 30 : 80) * (scene ? 1 : 0.35)) : 0;
  const crossSound = (id: "sleigh" | "witch") => () => { const p = latest.current.prefs; if (!p.soundsOff && soundboardOn()) playFx(id); };
  return (
    <>
      {snow > 0 && <Suspense fallback={null}><Snow count={snow} /></Suspense>}
      {scene && vis && <><Lights /><Tree /><Countdown /><Sleigh everyMs={bonus === "natal.sleigh" ? 75_000 : 240_000} trail={bonus === "natal.sleigh"} onPass={crossSound("sleigh")} /></>}
      {spooky && vis && <><Lights halloween /><PumpkinCorner /><Countdown month={9} day={31} tag="halloween" soon="Faltam {n} dias para o Halloween" tomorrow="O Halloween é amanhã!" today="Hoje é Halloween!" after="Feliz Halloween!" /><Witch everyMs={bonus === "halloween.witch" ? 75_000 : 240_000} trail={bonus === "halloween.witch"} onPass={crossSound("witch")} /></>}
      {ovs.map((o) => (o.kind === "entrance" ? <Entrance key={o.id} text={o.text} who={o.who} kind={o.look} /> : <Giant key={o.id} icon={o.icon} onDone={() => setOvs((l) => l.filter((x) => x.id !== o.id))} />))}
    </>
  );
}
