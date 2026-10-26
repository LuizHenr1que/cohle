import { useEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft, Check, Plus, Link2, Volume2, ScreenShare, MessageCircle, Music, Crown, Video, Sparkles, Mic, Siren, PartyPopper, Laugh, PhoneCall } from "lucide-react";
import { Logo } from "./Logo";

/** First-run tour: shows the essentials with small animated illustrations. Skippable at any moment. */
export function Tour({ name, onFinish }: { name: string; onFinish: (next?: "create" | "join") => void }) {
  const [i, setI] = useState(0);
  const steps = STEPS(name);
  const last = i === steps.length - 1;
  const S = steps[i];
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
      else if (e.key === "ArrowRight" || e.key === "Enter") setI((v) => Math.min(v + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Tour de boas-vindas">
      <style>{`
        @keyframes t-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes t-bar{50%{transform:scaleY(.4)}}
        @keyframes t-float{50%{transform:translateY(-7px)}}
        @keyframes t-pop{0%{opacity:0;transform:scale(.6)}70%{transform:scale(1.08)}100%{opacity:1;transform:none}}
        @keyframes t-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.6);opacity:0}}
        .t-in{animation:t-in .45s cubic-bezier(.2,.8,.2,1) both}.t-pop{animation:t-pop .5s cubic-bezier(.2,1.2,.4,1) both}
        .t-bar{animation:t-bar 1.2s ease-in-out infinite;transform-origin:50% 100%}.t-float{animation:t-float 3.4s ease-in-out infinite}
        .t-ring{animation:t-ring 1.8s ease-out infinite}
      `}</style>
      <div className="relative w-full max-w-2xl rounded-[2rem] overflow-hidden border border-line bg-surface shadow-[0_30px_100px_rgba(0,0,0,0.65)] max-h-[96dvh] flex flex-col">
        <div className="absolute top-0 inset-x-0 h-1 bg-white/10 z-10"><div className="h-full grad transition-all duration-500" style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
        <button onClick={() => onFinish()} className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 px-3.5 py-1.5 text-xs font-semibold transition">
          {last ? "Fechar" : "Pular tour"} <X size={13} />
        </button>

        <div className="relative h-52 sm:h-60 shrink-0 grid place-items-center overflow-hidden bg-[radial-gradient(120%_100%_at_50%_0%,rgb(var(--accent-rgb)/0.28),transparent_65%)]">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div key={i} className="relative">{S.art}</div>
        </div>

        <div className="p-5 sm:p-8 flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div key={i} className="t-in">
            <p className="text-[11px] uppercase tracking-widest text-accent2 font-semibold">{S.kicker}</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">{S.title}</h2>
            <p className="text-muted mt-2 leading-relaxed">{S.text}</p>
            {S.points && <ul className="mt-3 space-y-1.5 text-sm">{S.points.map((p) => <li key={p} className="flex gap-2"><Check size={16} className="text-accent shrink-0 mt-0.5" /><span className="text-ink/90">{p}</span></li>)}</ul>}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <div className="flex gap-1.5">{steps.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Passo ${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 grad" : "w-2 bg-white/20 hover:bg-white/35"}`} />)}</div>
            <div className="flex-1" />
            {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-white/5 inline-flex items-center gap-1.5 transition"><ArrowLeft size={15} /> Voltar</button>}
            {!last
              ? <button onClick={() => setI(i + 1)} className="grad rounded-xl px-5 py-2.5 font-semibold text-white hover:brightness-110 inline-flex items-center gap-2 transition">{i === 0 ? "Começar" : "Próximo"} <ArrowRight size={16} /></button>
              : <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => onFinish("join")} className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition"><Link2 size={15} /> Entrar com convite</button>
                  <button onClick={() => onFinish("create")} className="grad rounded-xl px-5 py-2.5 font-semibold text-white hover:brightness-110 inline-flex items-center gap-2 transition"><Plus size={16} /> Criar meu servidor</button>
                </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

type Step = { kicker: string; title: string; text: string; points?: string[]; art: React.ReactNode };

const av = (l: string, cls = "") => <span className={`size-12 rounded-full grid place-items-center font-bold text-white bg-gradient-to-br from-[#ff5a74] to-[#ff9a62] ${cls}`}>{l}</span>;
const Bars = ({ n = 7, h = 34 }: { n?: number; h?: number }) => <span className="flex items-end gap-1" style={{ height: h }}>{Array.from({ length: n }, (_, k) => <span key={k} className="t-bar w-1.5 rounded-full bg-gradient-to-b from-[#ff8a5b] to-[#ff3b5c]" style={{ height: `${40 + ((k * 37) % 60)}%`, animationDelay: `${k * 0.12}s` }} />)}</span>;

const STEPS = (name: string): Step[] => [
  { kicker: "Bem-vindo", title: `Oi, ${name}. A resenha agora tem endereço.`, text: "Em menos de um minuto você conhece o essencial do Cohle. Dá para pular quando quiser e rever depois no seu perfil.",
    art: <div className="relative grid place-items-center"><span className="absolute size-28 rounded-full border border-accent/60 t-ring" /><span className="absolute size-28 rounded-full border border-accent/40 t-ring" style={{ animationDelay: ".9s" }} /><div className="t-float"><Logo size={96} /></div></div> },
  { kicker: "Servidores", title: "Crie um servidor e chame a galera", text: "Servidor é o seu espaço: canais de texto, salas de voz e as pessoas que você convidar.",
    points: ["Modelos prontos: jogos, amigos, estudo, comunidade e mais", "Convide por link ou código, em um clique", "Você é o dono e controla quem entra"],
    art: <div className="flex items-center gap-5"><div className="flex flex-col gap-3">{["S", "G", "C"].map((l, k) => <span key={l} className={`t-pop size-14 rounded-2xl grid place-items-center text-xl font-bold text-white bg-gradient-to-br from-[#ff5a74] to-[#ff9a62] ${k === 0 ? "ring-2 ring-white/70 shadow-[0_6px_24px_rgb(var(--accent-rgb)/0.5)]" : "opacity-70"}`} style={{ animationDelay: `${k * 0.15}s` }}>{l}</span>)}</div>
      <div className="glass rounded-2xl p-4 t-pop" style={{ animationDelay: ".5s" }}><div className="flex items-center gap-2 font-semibold"><Crown size={14} className="text-accent2" /> Squad da Noite</div><div className="mt-3 rounded-xl bg-accent/20 text-accent text-xs font-semibold px-3 py-2 flex items-center gap-2"><Plus size={13} /> Convidar pessoas</div><div className="mt-2 text-[11px] text-muted"># geral &nbsp; # clipes</div></div></div> },
  { kicker: "Voz", title: "Entre numa sala de voz e fale", text: "Clique numa sala e pronto: sem convite de chamada, sem esperar ninguém atender.",
    points: ["O contorno verde mostra quem está falando", "Supressão de ruído já vem ligada", "Botão direito em alguém: volume e silenciar só para você"],
    art: <div className="grid grid-cols-3 gap-4 place-items-center">{["A", "B", "C", "D", "E", "F"].map((l, k) => <span key={l} className="relative">{av(l, k === 0 || k === 4 ? "ring-[3px] ring-[#3ddc84]" : "opacity-90")}{(k === 0 || k === 4) && <span className="absolute inset-0 rounded-full border-2 border-[#3ddc84] t-ring" />}</span>)}</div> },
  { kicker: "Tela e câmera", title: "Compartilhe a tela sem pesar no jogo", text: "Escolha a tela toda ou só uma janela e a qualidade. Quem estiver na sala assiste com um clique.",
    points: ["Passe o mouse em quem está AO VIVO para espiar a tela", "A câmera mostra uma prévia só para você antes de ligar", "Leve: pensado para rodar com o jogo aberto"],
    art: <div className="relative"><div className="w-64 h-36 rounded-2xl glass overflow-hidden relative"><div className="absolute inset-0 bg-gradient-to-br from-[#2a1018] to-[#12080c]" /><span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full"><ScreenShare size={11} /> AO VIVO</span><div className="absolute inset-x-4 bottom-4 flex justify-center"><Bars n={12} h={46} /></div></div><span className="absolute -bottom-4 -right-4 size-14 rounded-full grid place-items-center bg-surface-2 border border-line t-float"><Video size={22} className="text-accent" /></span></div> },
  { kicker: "Conversas", title: "Mensagens nos canais e em particular", text: "Fale no chat do servidor mesmo durante uma chamada, ou mande mensagem direta para qualquer pessoa dos seus servidores.",
    points: ["Histórico guardado nas conversas diretas", "Contador de não lidas no botão de mensagens", "Clique em uma pessoa da sala para começar a conversar"],
    art: <div className="w-72 space-y-2.5 text-sm">{[["Bom dia! Hoje tem partida às 21h", "l", 0], ["Confirmado. O áudio está cristalino", "r", 0.5], ["Vou compartilhar a tela do replay", "l", 1]].map(([t, s, d]) => <div key={t as string} className={`t-in max-w-[85%] rounded-2xl px-3.5 py-2 ${s === "r" ? "ml-auto grad text-white" : "glass"}`} style={{ animationDelay: `${d}s` }}>{t}</div>)}</div> },
  { kicker: "Extras", title: "Sons para a sala e Cohle em segundo plano", text: "Divirta a galera e deixe o Cohle fora do caminho enquanto você joga.",
    points: ["Botão de sons: susto, fogos, risos, chamando e tatakae", "Fechar a janela mantém o Cohle na bandeja do sistema", "Um widget translúcido mostra quem fala por cima do jogo"],
    art: <div className="flex flex-wrap justify-center gap-2.5 max-w-sm">{[[Siren, "Susto"], [PartyPopper, "Fogos"], [Laugh, "Risos"], [PhoneCall, "Chamando"], [Sparkles, "Tatakae"]].map(([I, l], k) => { const Ic = I as typeof Siren; return <span key={l as string} className="t-pop glass rounded-2xl px-4 py-2.5 inline-flex items-center gap-2 text-sm font-semibold" style={{ animationDelay: `${k * 0.12}s` }}><Ic size={16} className="text-accent" /> {l as string}</span>; })}</div> },
  { kicker: "Tudo pronto", title: "Vamos começar?", text: "Crie o seu primeiro servidor ou entre em um que alguém te convidou. O resto você descobre usando.",
    art: <div className="t-pop grid place-items-center size-24 rounded-full grad shadow-[0_0_60px_rgb(var(--accent-rgb)/0.6)]"><Check size={46} className="text-white" strokeWidth={3} /></div> },
];
