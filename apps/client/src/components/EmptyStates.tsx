import { useState } from "react";
import { Plus, Link2, Volume2, ScreenShare, MessageCircle, Music, Menu, Hash, UserPlus, Compass, ArrowRight, Sparkles } from "lucide-react";
import type { ChannelDTO, ServerDTO } from "@cohle/shared";
import heroArt from "../assets/hero-art.svg?raw";
import { ServerIcon } from "./ServerIcon";

// The banner artwork, with a slow, cheap motion (transform/opacity only; none in lite mode because .lite kills animations).
const Art = () => (
  <>
    <style>{`
      .hero-art svg{position:absolute;inset:0;width:100%;height:100%}
      .hero-art .orbits .o1{transform-box:view-box;transform-origin:800px 320px;animation:ha-rot 50s linear infinite}
      .hero-art .orbits .o3{transform-box:view-box;transform-origin:800px 320px;animation:ha-rot 80s linear infinite reverse}
      .hero-art .fl{animation:ha-fl 5s ease-in-out infinite}.hero-art .fl.b{animation-delay:-1s}.hero-art .fl.c{animation-delay:-2s}.hero-art .fl.d{animation-delay:-3s}.hero-art .fl.e{animation-delay:-3.8s}.hero-art .fl.f{animation-delay:-4.4s}
      .hero-art .pulse{animation:ha-pl 2.2s ease-in-out infinite}
      .hero-art .bars rect{transform-box:fill-box;transform-origin:50% 100%;animation:ha-bar 1.6s ease-in-out infinite}
      .hero-art .bars rect:nth-child(2n){animation-delay:-.5s}.hero-art .bars rect:nth-child(3n){animation-delay:-1s}
      @keyframes ha-rot{to{transform:rotate(360deg)}}@keyframes ha-fl{50%{transform:translateY(-9px)}}@keyframes ha-pl{50%{opacity:.35}}@keyframes ha-bar{50%{transform:scaleY(.55)}}
      @keyframes ha-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      .ha-in{animation:ha-in .5s cubic-bezier(.2,.8,.2,1) both}
    `}</style>
    <div className="hero-art absolute inset-y-0 right-0 w-full md:w-[68%] opacity-80 md:opacity-100 [mask-image:linear-gradient(to_right,transparent,#000_38%)]" dangerouslySetInnerHTML={{ __html: heroArt }} aria-hidden />
  </>
);

const TEMPLATES = ["Jogos", "Amigos", "Estudo", "Comunidade", "Criadores"];
const FEATURES = [
  { icon: Volume2, title: "Salas de voz leves", text: "Entre com um clique e fale, com supressão de ruído já ligada." },
  { icon: ScreenShare, title: "Tela com fluidez", text: "Compartilhe a tela toda ou uma janela sem pesar no seu jogo." },
  { icon: MessageCircle, title: "Mensagens diretas", text: "Converse em particular, com histórico e contador de não lidas." },
  { icon: Music, title: "Sons para a sala", text: "Susto, fogos, risos e mais para animar a galera." },
];

/** Shown when the person is not in any server yet: a clear starting point instead of an empty screen. */
export function NoServerHome({ name, onCreate, onJoin, onTour, onMenu }: {
  name: string; onCreate: () => void; onJoin: (code: string) => Promise<void>; onTour: () => void; onMenu?: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().split(/[/\s]/).filter(Boolean).pop() ?? "";          // accepts a pasted invite link too
    if (!c) return;
    setBusy(true); setErr("");
    try { await onJoin(c); } catch (x: any) { setErr(x?.message ?? "Convite inválido."); } finally { setBusy(false); }
  };
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative h-60 sm:h-72 overflow-hidden rounded-t-3xl bg-[linear-gradient(135deg,#1e0d14,#12080c_55%,#0a0507)]">
        <Art />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-surface via-surface/70 to-transparent md:h-24 md:via-transparent" />
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="absolute top-3 left-3 p-2.5 rounded-xl bg-black/40 hover:bg-black/60"><Menu size={18} /></button>}
        <div className="absolute inset-x-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 px-5 sm:px-10 pb-5 md:pb-0 md:max-w-[52%]"><div className="ha-in">
          <p className="text-[11px] uppercase tracking-widest text-accent2 font-semibold">Comece por aqui</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1">Bem-vindo ao Cohle, {name}</h1>
          <p className="text-muted mt-1.5 max-w-xl text-sm sm:text-base">Aqui as conversas acontecem em servidores. Crie o seu ou entre em um com um convite.</p>
        </div></div>
      </div>

      <div className="px-4 sm:px-10 pb-10 max-w-5xl mx-auto -mt-1">
        <div className="grid md:grid-cols-2 gap-4">
          <section className="glass rounded-3xl p-5 sm:p-6 flex flex-col gap-3 ha-in" style={{ animationDelay: ".08s" }}>
            <div className="size-12 rounded-2xl grad grid place-items-center text-white shadow-[0_8px_24px_rgb(var(--accent-rgb)/0.4)]"><Plus size={22} /></div>
            <h2 className="text-xl font-bold">Criar o meu servidor</h2>
            <p className="text-sm text-muted">Canais de texto e de voz prontos em segundos, com modelos para cada tipo de grupo. Você é o dono.</p>
            <div className="flex flex-wrap gap-1.5">{TEMPLATES.map((t) => <button key={t} onClick={onCreate} className="rounded-full bg-white/5 hover:bg-accent/20 border border-line px-3 py-1 text-xs transition">{t}</button>)}</div>
            <button onClick={onCreate} className="grad mt-auto rounded-xl px-5 py-3 font-semibold text-white hover:brightness-110 inline-flex items-center justify-center gap-2 transition">Criar servidor <ArrowRight size={16} /></button>
          </section>

          <section className="glass rounded-3xl p-5 sm:p-6 flex flex-col gap-3 ha-in" style={{ animationDelay: ".16s" }}>
            <div className="size-12 rounded-2xl bg-white/10 grid place-items-center text-accent"><Link2 size={22} /></div>
            <h2 className="text-xl font-bold">Entrar com um convite</h2>
            <p className="text-sm text-muted">Recebeu um código ou link de convite de alguém? Cole aqui e você já entra no servidor.</p>
            <form onSubmit={submit} className="mt-auto space-y-2">
              <input value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="Cole o código ou o link do convite"
                className="w-full rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent transition placeholder:text-muted" />
              {err && <p className="text-accent text-sm">{err}</p>}
              <button disabled={busy || !code.trim()} className="w-full rounded-xl bg-white/10 hover:bg-white/15 px-5 py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 transition">{busy ? "Entrando..." : "Entrar no servidor"}</button>
            </form>
          </section>
        </div>

        <h3 className="mt-8 mb-3 text-[11px] uppercase tracking-widest text-muted">O que você encontra por aqui</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white/[0.03] p-4 ha-in" style={{ animationDelay: `${0.2 + i * 0.06}s` }}>
              <f.icon size={20} className="text-accent" />
              <div className="font-semibold mt-2.5 text-sm">{f.title}</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
        <button onClick={onTour} className="mt-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><Sparkles size={15} /> Ver o tour de boas-vindas</button>
      </div>
    </div>
  );
}

/** A server is open but no channel is selected yet. */
export function NoChannelHome({ server, isOwner, onOpen, onInvite, onNewChannel, onMenu }: {
  server: ServerDTO; isOwner: boolean; onOpen: (c: ChannelDTO) => void; onInvite: () => void; onNewChannel: (t: "TEXT" | "VOICE") => void; onMenu?: () => void;
}) {
  const text = server.channels.filter((c) => c.type === "TEXT"), voice = server.channels.filter((c) => c.type === "VOICE");
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative h-40 sm:h-52 overflow-hidden rounded-t-3xl bg-[linear-gradient(135deg,#1e0d14,#12080c_55%,#0a0507)]">
        <Art />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface to-transparent" />
        {onMenu && <button onClick={onMenu} aria-label="Abrir menu" className="absolute top-3 left-3 p-2.5 rounded-xl bg-black/40 hover:bg-black/60"><Menu size={18} /></button>}
      </div>
      <div className="px-4 sm:px-10 pb-10 max-w-3xl mx-auto -mt-12 relative">
        <div className="flex items-end gap-4 ha-in">
          <div className="ring-4 ring-surface rounded-3xl"><ServerIcon server={server} size={72} /></div>
          <div className="min-w-0 pb-1"><h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{server.name}</h1><p className="text-sm text-muted">Escolha um canal para começar a conversar.</p></div>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {([["Canais de texto", text, Hash, "TEXT"], ["Salas de voz", voice, Volume2, "VOICE"]] as const).map(([title, list, Icon, type]) => (
            <section key={title} className="glass rounded-3xl p-4 ha-in">
              <div className="flex items-center justify-between mb-2"><h2 className="text-[11px] uppercase tracking-widest text-muted">{title}</h2>
                {isOwner && <button onClick={() => onNewChannel(type)} className="text-muted hover:text-ink p-1" title="Novo canal"><Plus size={15} /></button>}</div>
              {list.length ? <div className="space-y-1">{list.map((c) => (
                <button key={c.id} onClick={() => onOpen(c)} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-left hover:bg-white/10 transition"><Icon size={16} className="text-accent shrink-0" /> <span className="truncate">{c.name}</span></button>
              ))}</div> : <p className="text-sm text-muted px-1 py-2">{isOwner ? "Nenhum canal ainda. Crie o primeiro." : "Nenhum canal ainda."}</p>}
            </section>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onInvite} className="rounded-xl bg-accent/15 hover:bg-accent/25 text-accent px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition"><UserPlus size={16} /> Convidar pessoas</button>
          <span className="inline-flex items-center gap-2 text-xs text-muted px-2"><Compass size={14} /> Dica: clique com o botão direito em alguém na sala para ajustar o volume só para você.</span>
        </div>
      </div>
    </div>
  );
}
