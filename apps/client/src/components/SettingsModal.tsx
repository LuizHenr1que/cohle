import { useEffect, useState } from "react";
import { Copy, X, User, ShieldCheck, Palette, Volume2, MonitorCog, Info, LogOut, Check, RefreshCw, Pencil, Sparkles, Gauge } from "lucide-react";
import type { AccountDTO, UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import { PasswordInput } from "./PasswordInput";
import { Switch } from "./Switch";
import { DOWNLOAD_URL, openLink } from "../lib/links";
import { BUILD } from "../version";
import { NOISE_MODES, loadNoiseMode, saveNoiseMode, type NoiseMode } from "../lib/noise";
import { setSoundboardOn, soundboardOn } from "../lib/soundboard";
import { THEMES, applyTheme, getTheme, getCustomColor, paletteFor, type ThemeId } from "../lib/theme";

type Tab = "account" | "security" | "look" | "audio" | "app" | "about";

const Row = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-4 py-3.5 border-b border-line last:border-0">
    <div className="min-w-0 flex-1"><div className="text-sm font-medium">{title}</div>{hint && <div className="text-xs text-muted mt-0.5 leading-relaxed">{hint}</div>}</div>{children}
  </div>
);
const Card = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl border border-line bg-white/[0.03] px-4">{children}</div>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-bold mb-4">{children}</h2>;

export function SettingsModal({ user, onAdmin, onClose, onEditProfile, onTour, onLogout, fx, onToggleFx, lite, onToggleLite, rail, onToggleRail, wide }: {
  user: UserDTO; onAdmin: () => void; onClose: () => void; onEditProfile: () => void; onTour: () => void; onLogout: () => void;
  fx: boolean; onToggleFx: () => void; lite: boolean; onToggleLite: () => void; rail: boolean; onToggleRail: (v: boolean) => void; wide: boolean;
}) {
  const desktop = !!window.cohle?.getSettings;
  const [tab, setTab] = useState<Tab>("account");
  const [acc, setAcc] = useState<AccountDTO>();
  useEffect(() => { api.account().then(setAcc).catch(() => {}); const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, []);

  const tabs: [Tab, string, typeof User][] = [["account", "Minha conta", User], ["security", "Senha e segurança", ShieldCheck], ["look", "Aparência", Palette], ["audio", "Áudio e sons", Volume2], ...(desktop ? [["app", "Aplicativo", MonitorCog] as [Tab, string, typeof User]] : []), ["about", "Sobre", Info]];

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center bg-black/65 p-2 sm:p-6" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Configurações" className="w-full max-w-4xl h-[min(92dvh,680px)] rounded-[1.75rem] overflow-hidden border border-line bg-surface shadow-[0_30px_100px_rgba(0,0,0,0.65)] flex flex-col sm:flex-row">
        <nav className="sm:w-60 shrink-0 sm:border-r border-b sm:border-b-0 border-line p-2 sm:p-4 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto bg-black/20">
          <div className="hidden sm:block px-2 pb-3 text-[11px] uppercase tracking-widest text-muted">Configurações</div>
          {tabs.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition ${tab === id ? "bg-accent/15 text-ink font-semibold" : "text-muted hover:bg-white/5 hover:text-ink"}`}><Icon size={17} className={tab === id ? "text-accent" : ""} />{label}</button>
          ))}
          {user.role && <button onClick={() => { onClose(); onAdmin(); }} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-accent2 hover:bg-white/5 whitespace-nowrap font-semibold"><Gauge size={17} /> Painel do Cohle</button>}
          <div className="hidden sm:block flex-1" />
          <button onClick={() => { onClose(); onLogout(); }} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10 whitespace-nowrap"><LogOut size={17} /> Sair da conta</button>
        </nav>

        <div className="relative flex-1 min-w-0 overflow-y-auto p-5 sm:p-8">
          <button onClick={onClose} aria-label="Fechar" className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink"><X size={18} /></button>
          {tab === "account" && (<>
            <H>Minha conta</H>
            <div className="rounded-2xl overflow-hidden border border-line">
              <div className="h-20 bg-[radial-gradient(120%_140%_at_30%_0%,rgb(var(--accent-rgb)/0.5),transparent_70%),linear-gradient(135deg,#2a1018,#12080c)]" />
              <div className="px-4 pb-4 -mt-9 flex items-end gap-4 flex-wrap">
                <div className="ring-4 ring-surface rounded-full"><Avatar user={user} size={72} /></div>
                <div className="min-w-0 flex-1 pb-1"><div className="text-lg font-bold flex items-center gap-2 flex-wrap">{user.username}<DevBadge user={user} full /></div>
                  <div className="text-xs text-muted truncate">{acc?.email ?? "..."}</div>
                  <button onClick={() => navigator.clipboard?.writeText(`@${user.username}`).catch(() => {})} title="Copiar o seu @usuário" className="mt-1 inline-flex items-center gap-1.5 text-xs text-accent2 hover:underline">@{user.username} <Copy size={12} /></button></div>
                <button onClick={onEditProfile} className="grad rounded-xl px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 hover:brightness-110"><Pencil size={15} /> Editar foto e nome</button>
              </div>
            </div>
            <div className="mt-4"><Card>
              <Row title="E-mail" hint="Usado para entrar e para recuperar a senha."><span className="text-sm text-muted truncate max-w-[50%]">{acc?.email ?? "..."}</span></Row>
              <Row title="E-mail confirmado">{acc?.emailVerified ? <span className="inline-flex items-center gap-1.5 text-emerald-300 text-sm"><Check size={15} /> Confirmado</span> : <span className="text-sm text-muted">{acc ? "Pendente" : "..."}</span>}</Row>
              <Row title="Membro desde"><span className="text-sm text-muted inline-block first-letter:uppercase">{acc ? new Date(acc.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "..."}</span></Row>
            </Card></div>
            <button onClick={() => { onClose(); onTour(); }} className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><Sparkles size={15} /> Rever o tour de boas-vindas</button>
          </>)}
          {tab === "security" && <Security />}
          {tab === "look" && (<>
            <H>Aparência e desempenho</H>
            <ThemePicker />
            <Card>
              <Row title="Animação de fundo" hint="Partículas flutuando atrás do app. Desligue para economizar processador."><Switch on={fx} onChange={onToggleFx} /></Row>
              <Row title="Modo leve" hint="Menos efeitos, sem desfoque e sem animações. Ideal para jogar com o Cohle aberto."><Switch on={lite} onChange={onToggleLite} /></Row>
              {wide && <Row title="Barra lateral expandida" hint="Mostra o nome dos servidores e os rótulos dos botões."><Switch on={rail} onChange={onToggleRail} /></Row>}
            </Card>
          </>)}
          {tab === "audio" && <AudioTab />}
          {tab === "app" && desktop && <AppTab />}
          {tab === "about" && (<>
            <H>Sobre o Cohle</H>
            <Card>
              <Row title="Versão"><span className="text-sm font-semibold">Versão {BUILD.n}</span></Row>
              <Row title="Novidades desta versão"><span className="text-sm text-muted text-right max-w-[60%]">{BUILD.note}</span></Row>
              <Row title="Você está usando"><span className="text-sm text-muted">{desktop ? "Aplicativo para computador" : "Cohle no navegador"}</span></Row>
              <Row title="Site"><span className="text-sm text-muted">cohle.verticeapp.com.br</span></Row>
              {!desktop && <Row title="Aplicativo para computador" hint="Mais leve para jogar com o Cohle aberto, com atualização automática e escolha de qual janela compartilhar."><button type="button" onClick={() => openLink(DOWNLOAD_URL)} className="grad rounded-xl px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Baixar</button></Row>}
            </Card>
            <p className="text-xs text-muted mt-4 leading-relaxed">Chat, voz e compartilhamento de tela num app só. Leve, bonito e feito para a galera.</p>
          </>)}
        </div>
      </div>
    </div>
  );
}

function Security() {
  const [find, setFind] = useState<boolean>();
  useEffect(() => { api.account().then((a) => setFind(a.findByEmail)).catch(() => {}); }, []);
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent focus:bg-white/[0.07] transition placeholder:text-muted";
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(undefined);
    if (f.next.length < 8) return setMsg({ ok: false, t: "A nova senha precisa ter pelo menos 8 caracteres." });
    if (f.next !== f.again) return setMsg({ ok: false, t: "As senhas novas não conferem." });
    setBusy(true);
    try { await api.changePassword({ current: f.current, password: f.next }); setF({ current: "", next: "", again: "" }); setMsg({ ok: true, t: "Senha alterada com sucesso." }); }
    catch (x: any) { setMsg({ ok: false, t: x.message === "E-mail, @usuário ou senha incorretos." ? "A senha atual está incorreta." : x.message }); } finally { setBusy(false); }
  }
  return (<>
    <H>Senha e segurança</H>
    <form onSubmit={save} className="space-y-3 max-w-sm">
      <PasswordInput className={input} placeholder="Senha atual" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
      <PasswordInput className={input} placeholder="Nova senha (mín. 8 caracteres)" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
      <PasswordInput className={input} placeholder="Repita a nova senha" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} />
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-300" : "text-accent"}`}>{msg.t}</p>}
      <button disabled={busy || !f.current || !f.next} className="grad rounded-xl px-5 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-50 transition">{busy ? "Salvando..." : "Alterar senha"}</button>
    </form>
    <div className="mt-6 max-w-lg"><Card><Row title="Permitir que me achem pelo e-mail" hint="Quando ligado, quem digitar o seu e-mail na aba Amigos consegue te enviar um pedido. Pelo @usuário sempre dá para te achar."><Switch on={!!find} disabled={find === undefined} onChange={(v) => { setFind(v); api.setPrivacy(v).catch(() => setFind(!v)); }} label="Permitir que me achem pelo e-mail" /></Row></Card></div>
    <p className="text-xs text-muted mt-5 max-w-sm leading-relaxed">Esqueceu a senha atual? Saia da conta e use "Esqueci minha senha" na tela de login: enviamos um código por e-mail.</p>
  </>);
}

function AudioTab() {
  const [sounds, setSounds] = useState(() => { try { return localStorage.getItem("sounds") !== "off"; } catch { return true; } });
  const [board, setBoard] = useState(soundboardOn());
  const [noise, setNoise] = useState<NoiseMode>(loadNoiseMode());
  return (<>
    <H>Áudio e sons</H>
    <Card>
      <Row title="Sons do aplicativo" hint="Avisos de entrar e sair da sala, mensagens, ligar e desligar o microfone."><Switch on={sounds} onChange={(v) => { setSounds(v); try { localStorage.setItem("sounds", v ? "on" : "off"); } catch { /* private mode */ } }} /></Row>
      <Row title="Ouvir os sons da sala" hint="Susto, fogos, risos e outros que as pessoas tocam na chamada."><Switch on={board} onChange={(v) => { setBoard(v); setSoundboardOn(v); }} /></Row>
    </Card>
    <h3 className="text-[11px] uppercase tracking-widest text-muted mt-6 mb-2">Supressão de ruído do microfone</h3>
    <div className="space-y-2">
      {NOISE_MODES.map((m) => (
        <button key={m.id} onClick={() => { setNoise(m.id); saveNoiseMode(m.id); }} className={`w-full text-left rounded-2xl border px-4 py-3 transition ${noise === m.id ? "border-accent bg-accent/10" : "border-line bg-white/[0.03] hover:bg-white/[0.06]"}`}>
          <div className="flex items-center gap-2 text-sm font-medium">{m.label}{noise === m.id && <Check size={15} className="text-accent" />}</div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">{m.hint}</div>
        </button>
      ))}
    </div>
    <p className="text-xs text-muted mt-3">Vale a partir da próxima chamada. Dentro da chamada você também troca pelo botão de áudio.</p>
  </>);
}

function AppTab() {
  const [s, setS] = useState<{ closeToTray: boolean; openAtLogin: boolean; packaged: boolean; version: string; platform: string }>();
  const [u, setU] = useState<UpdateState>();
  useEffect(() => { window.cohle?.getSettings().then(setS); window.cohle?.getUpdate().then(setU); return window.cohle?.onUpdate(setU); }, []);
  const set = (p: { closeToTray?: boolean; openAtLogin?: boolean }) => window.cohle?.setSettings(p).then(setS);
  const label = !u ? "" : u.status === "checking" ? "Procurando atualizações..." : u.status === "none" ? "Você está na versão mais recente." : u.status === "downloading" ? `Baixando a versão ${String(u.version).split(".").pop()}... ${u.percent}%` : u.status === "ready" ? `A versão ${String(u.version).split(".").pop()} está pronta.` : u.status === "error" ? "Não foi possível verificar agora." : u.status === "unsupported" ? "Atualização automática indisponível nesta execução." : "";
  return (<>
    <H>Aplicativo</H>
    <Card>
      <Row title={s?.platform === "win32" ? "Iniciar com o Windows" : "Abrir ao iniciar o computador"} hint={s && !s.packaged ? "Disponível no aplicativo instalado." : "O Cohle abre escondido na bandeja quando o computador liga."}><Switch on={!!s?.openAtLogin} disabled={!s?.packaged} onChange={(v) => set({ openAtLogin: v })} /></Row>
      <Row title="Manter em segundo plano ao fechar" hint="Fechar a janela deixa o Cohle na bandeja, e a chamada continua. Desligado, fechar encerra o aplicativo."><Switch on={s?.closeToTray ?? true} onChange={(v) => set({ closeToTray: v })} /></Row>
    </Card>
    <h3 className="text-[11px] uppercase tracking-widest text-muted mt-6 mb-2">Atualizações</h3>
    <Card>
      <Row title={`Versão ${BUILD.n}${s ? ` (${s.version})` : ""}`} hint={label || "O Cohle se atualiza sozinho: ao abrir ou em segundo plano."}>
        {u?.status === "ready"
          ? <button onClick={() => window.cohle?.installUpdate()} className="grad rounded-xl px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"><RefreshCw size={15} /> Reiniciar e atualizar</button>
          : <button onClick={() => window.cohle?.checkUpdate()} disabled={u?.status === "checking" || u?.status === "downloading" || u?.status === "unsupported"} className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">Verificar agora</button>}
      </Row>
    </Card>
  </>);
}

function ThemePicker() {
  const [t, setT] = useState<ThemeId>(getTheme());
  const [color, setColor] = useState(getCustomColor());
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase tracking-widest text-muted mb-2">Tema</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {THEMES.map((x) => (
          <button key={x.id} onClick={() => { setT(x.id); applyTheme(x.id); }} aria-pressed={t === x.id}
            className={`rounded-2xl border p-2.5 text-left transition ${t === x.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-white/25"}`}>
            <div className="h-14 rounded-xl overflow-hidden relative" style={{ background: x.bg }}>
              <div className="absolute -top-4 -left-4 size-16 rounded-full blur-xl opacity-70" style={{ background: x.a }} />
              <div className="absolute bottom-2 left-2 right-2 h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${x.a}, ${x.b})` }} />
            </div>
            <div className="mt-2 text-sm font-medium flex items-center gap-1.5">{x.name}{t === x.id && <Check size={14} className="text-accent" />}</div>
            <div className="text-[11px] text-muted">{x.hint}</div>
          </button>
        ))}
        <div className={`rounded-2xl border p-2.5 text-left transition ${t === "custom" ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-white/25"}`}>
          <button onClick={() => { setT("custom"); applyTheme("custom", color); }} aria-pressed={t === "custom"} className="block w-full text-left">
            <div className="h-14 rounded-xl overflow-hidden relative" style={{ background: paletteFor(color)["--color-surface"] }}>
              <div className="absolute -top-4 -left-4 size-16 rounded-full blur-xl opacity-70" style={{ background: paletteFor(color)["--color-accent"] }} />
              <div className="absolute bottom-2 left-2 right-2 h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${paletteFor(color)["--color-accent"]}, ${paletteFor(color)["--color-accent2"]})` }} />
            </div>
            <div className="mt-2 text-sm font-medium flex items-center gap-1.5">Sua cor{t === "custom" && <Check size={14} className="text-accent" />}</div>
          </button>
          <label className="mt-1 flex items-center gap-2 text-[11px] text-muted cursor-pointer">
            <input type="color" value={color} aria-label="Escolher uma cor" onChange={(e) => { setColor(e.target.value); setT("custom"); applyTheme("custom", e.target.value); }}
              className="size-6 rounded-md border border-line bg-transparent p-0 cursor-pointer" />
            <span className="uppercase tabular-nums">{color}</span>
          </label>
        </div>
      </div>
      <p className="text-[11px] text-muted mt-2">Escolha uma cor e o Cohle monta o tema inteiro com ela (fundo, painéis e brilho).</p>
    </div>
  );
}
