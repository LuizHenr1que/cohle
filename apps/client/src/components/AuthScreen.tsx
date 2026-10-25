import { useEffect, useState } from "react";
import { Mic, MonitorUp, MessagesSquare, FlaskConical, MailCheck, KeyRound, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { BUILD, BUILD_LABEL } from "../version";
import { api, API, SERVER_LOCKED, checkServer, normalizeServerUrl, switchServer } from "../api";
import type { UserDTO } from "@cohle/shared";

const SLIDES = [
  { icon: MessagesSquare, title: "Conversas em tempo real", text: "Servidores, canais e mensagens instantâneas, organizados do seu jeito." },
  { icon: Mic, title: "Voz cristalina", text: "Salas de voz leves e rápidas, com indicador de quem está falando." },
  { icon: MonitorUp, title: "Compartilhe sua tela", text: "Mostre o que está fazendo em um clique, com vídeo fluido." },
];

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.9S6.9 21.5 12 21.5c5.2 0 8.6-3.6 8.6-8.8 0-.6-.1-1-.2-1.5H12z"/></svg>
);
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.200-1.200 3.200-1.200.6 1.600.2 2.800.1 3.100.8.8 1.200 1.800 1.200 3.100 0 4.400-2.700 5.400-5.300 5.700.4.4.8 1.100.8 2.200v3.200c0 .3.2.7.8.6A11.500 11.500 0 0 0 23.500 12C23.500 5.700 18.300.5 12 .5z"/></svg>
);

// Quick login for the shared test accounts. On in dev and in installers built with VITE_TEST_LOGIN=1.
const SHOW_TEST_LOGIN = import.meta.env.DEV || import.meta.env.VITE_TEST_LOGIN === "1";

export function AuthScreen({ onDone }: { onDone: (token: string, user: UserDTO) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "verify" | "forgot" | "reset">("form");   // e-mail confirmation / password reset
  const [code, setCode] = useState("");
  const [pw2, setPw2] = useState("");
  const [wait, setWait] = useState(0);                                               // seconds until another code can be requested
  const [info, setInfo] = useState("");
  const [f, setF] = useState({ email: "", username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const [editServer, setEditServer] = useState(false);
  const [serverInput, setServerInput] = useState(API);
  const [serverMsg, setServerMsg] = useState("");
  async function saveServer(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeServerUrl(serverInput);
    setServerMsg("Testando...");
    if (!(await checkServer(url))) return setServerMsg("Não consegui conectar nesse endereço. Confira o IP, a porta (3001) e se o servidor está ligado.");
    if (url === API) { setEditServer(false); return setServerMsg(""); }
    switchServer(url);
  }

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const toVerify = (email: string) => { setF((x) => ({ ...x, email })); setCode(""); setInfo(""); setStep("verify"); setWait(45); };

  async function run(fn: () => Promise<any>) {
    setErr(""); setBusy(true);
    try {
      const r = await fn();
      if (r?.needsVerification) toVerify(r.email ?? f.email);
      else if (r?.token) onDone(r.token, r.user);
    } catch (e: any) {
      if (e?.data?.needsVerification) { toVerify(e.data.email ?? f.email); api.resend(e.data.email ?? f.email).catch(() => {}); }   // the old code may have expired: send a fresh one
      else setErr(e.message);
    } finally { setBusy(false); }
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => (mode === "login" ? api.login({ email: f.email, password: f.password }) : api.register(f)));
  };
  const resendCode = async () => {
    if (wait > 0) return;
    setErr(""); setInfo(""); setWait(45);
    try { await (step === "verify" ? api.resend(f.email) : api.forgot(f.email)); setInfo("Enviamos um novo código. Confira a caixa de entrada e o spam."); }
    catch (e: any) { setErr(e.message); setWait(0); }
  };
  const sendForgot = (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo("");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Digite um e-mail válido.");
    setBusy(true);
    api.forgot(f.email).then(() => { setCode(""); setPw2(""); setWait(45); setStep("reset"); }).catch((x) => setErr(x.message)).finally(() => setBusy(false));
  };
  const confirmCode = (value = code) => { if (value.length === 6) run(() => api.verify({ email: f.email, code: value })); };
  const doReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setErr("Digite o código de 6 dígitos que enviamos por e-mail.");
    if (f.password.length < 8) return setErr("A nova senha precisa ter pelo menos 8 caracteres.");
    if (f.password !== pw2) return setErr("As senhas não conferem.");
    run(() => api.reset({ email: f.email, code, password: f.password }));
  };
  const back = () => { setStep("form"); setErr(""); setInfo(""); setCode(""); };
  const quick = (n: number) => run(() => api.login({ email: `teste${n}@cohle.dev`, password: "teste12345" }));

  const input = "w-full rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent focus:bg-white/[0.07] transition placeholder:text-muted";
  const Icon = SLIDES[slide].icon;

  return (
    <div className="h-full flex p-2 sm:p-4 gap-4">
      {/* LEFT: animated showcase */}
      <section className="hidden lg:flex flex-1 relative overflow-hidden rounded-[2rem] glass flex-col items-center justify-center p-10">
        <div className="absolute inset-0 grid-bg" />
        <div className="blob size-80 bg-accent/40 -top-16 -left-16" />
        <div className="blob size-72 bg-accent2/30 bottom-0 right-0" style={{ animationDelay: "-6s" }} />

        <div className="relative flex items-center gap-2 self-start">
          <Logo size={40} />
          <span className="text-xl font-bold tracking-tight">Cohle</span>
        </div>

        <div className="relative flex-1 grid place-items-center">
          <div className="orb"><div className="ring" /><div className="ring r2" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex items-center gap-1.5 h-14">
                {[0, 0.15, 0.3, 0.45, 0.6, 0.45, 0.3, 0.15, 0].map((d, i) => (
                  <span key={i} className="bar" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full max-w-md text-center min-h-32" key={slide}>
          <div className="rise glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-accent2 mb-4">
            <Icon size={14} /> Novidade
          </div>
          <h2 className="rise text-3xl font-bold grad-text" style={{ animationDelay: ".08s" }}>{SLIDES[slide].title}</h2>
          <p className="rise text-muted mt-2" style={{ animationDelay: ".16s" }}>{SLIDES[slide].text}</p>
        </div>
        <div className="relative flex gap-2 mt-4">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 grad" : "w-3 bg-white/20"}`} />
          ))}
        </div>
      </section>

      {/* RIGHT: auth */}
      <section className="flex-1 lg:max-w-xl flex overflow-y-auto">
        {step !== "form" ? (
        <div className="w-full max-w-sm space-y-4 p-4 m-auto">
          <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Voltar</button>
          {step === "verify" && (<>
            <div className="size-12 rounded-2xl bg-accent/15 text-accent grid place-items-center"><MailCheck size={24} /></div>
            <h1 className="text-3xl font-bold">Confirme o seu e-mail</h1>
            <p className="text-muted text-sm">Enviamos um código de 6 dígitos para <b className="text-ink">{f.email}</b>. Digite-o abaixo para ativar a conta.</p>
            <CodeInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) confirmCode(v); }} disabled={busy} />
            <button type="button" disabled={busy || code.length !== 6} onClick={() => confirmCode()} className="grad w-full rounded-xl py-3 font-semibold text-white hover:brightness-110 transition disabled:opacity-50">{busy ? "Confirmando..." : "Confirmar"}</button>
          </>)}
          {step === "forgot" && (
            <form onSubmit={sendForgot} className="space-y-4">
              <div className="size-12 rounded-2xl bg-accent/15 text-accent grid place-items-center"><KeyRound size={24} /></div>
              <h1 className="text-3xl font-bold">Esqueceu a senha?</h1>
              <p className="text-muted text-sm">Digite o e-mail da sua conta. Enviaremos um código para você escolher uma nova senha.</p>
              <input className={input} placeholder="E-mail" type="email" autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <button disabled={busy} className="grad w-full rounded-xl py-3 font-semibold text-white hover:brightness-110 transition disabled:opacity-60">{busy ? "Enviando..." : "Enviar código"}</button>
            </form>
          )}
          {step === "reset" && (
            <form onSubmit={doReset} className="space-y-4">
              <div className="size-12 rounded-2xl bg-accent/15 text-accent grid place-items-center"><KeyRound size={24} /></div>
              <h1 className="text-3xl font-bold">Escolha uma nova senha</h1>
              <p className="text-muted text-sm">Se existir uma conta com <b className="text-ink">{f.email}</b>, o código chegou por e-mail. Digite-o e crie a nova senha.</p>
              <CodeInput value={code} onChange={setCode} disabled={busy} />
              <input className={input} placeholder="Nova senha (mín. 8 caracteres)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              <input className={input} placeholder="Repita a nova senha" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <button disabled={busy} className="grad w-full rounded-xl py-3 font-semibold text-white hover:brightness-110 transition disabled:opacity-60">{busy ? "Salvando..." : "Redefinir senha e entrar"}</button>
            </form>
          )}
          {err && <p className="text-accent text-sm">{err}</p>}
          {info && <p className="text-emerald-300 text-sm">{info}</p>}
          {step !== "forgot" && (
            <button type="button" onClick={resendCode} disabled={wait > 0} className="w-full text-sm text-muted hover:text-ink disabled:opacity-60 disabled:hover:text-muted">
              {wait > 0 ? `Reenviar código em ${wait}s` : "Não recebeu? Reenviar código"}
            </button>
          )}
        </div>
        ) : (
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 p-4 m-auto">
          <h1 className="text-3xl font-bold">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
          <p className="text-muted text-sm">{mode === "login" ? "Entre para continuar suas conversas." : "Comece grátis em poucos segundos."}</p>

          <div className="grid grid-cols-2 gap-2">
            {[{ n: "Google", i: <GoogleIcon /> }, { n: "GitHub", i: <GithubIcon /> }].map((p) => (
              <button key={p.n} type="button" disabled title="Em breve"
                className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white/5 py-3 text-sm opacity-60 cursor-not-allowed">
                {p.i} {p.n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted text-center -mt-2">Login social em breve</p>

          <div className="flex items-center gap-3 text-xs text-muted"><span className="flex-1 h-px bg-line" />ou com e-mail<span className="flex-1 h-px bg-line" /></div>

          <input className={input} placeholder="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          {mode === "register" && (
            <input className={input} placeholder="Nome de usuário" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          )}
          <input className={input} placeholder="Senha (mín. 8 caracteres)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          {mode === "login" && <button type="button" onClick={() => { setErr(""); setInfo(""); setStep("forgot"); }} className="text-sm text-accent2 hover:underline -mt-1 block ml-auto">Esqueci minha senha</button>}
          {err && <p className="text-accent text-sm">{err}</p>}

          <button disabled={busy} className="grad w-full rounded-xl py-3 font-semibold text-white hover:brightness-110 transition shadow-[0_8px_30px_rgba(255,59,92,0.35)] disabled:opacity-60">
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          <button type="button" className="w-full text-sm text-muted hover:text-ink" onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>

          {!SERVER_LOCKED && <div className="pt-3 border-t border-line text-xs text-muted space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Servidor: <b className="text-ink/80 selectable">{API.replace(/^https?:\/\//, "")}</b></span>
              <button type="button" onClick={() => { setEditServer((v) => !v); setServerMsg(""); }} className="text-accent2 hover:underline">{editServer ? "cancelar" : "alterar"}</button>
            </div>
            {editServer && (
              <div className="space-y-2">
                <input className={input} placeholder="ex.: 100.64.0.5:3001" value={serverInput} onChange={(e) => setServerInput(e.target.value)} />
                <button type="button" onClick={saveServer as any} className="w-full rounded-xl bg-white/5 border border-line py-2 hover:border-accent transition text-ink">Testar e salvar</button>
                {serverMsg && <p className={serverMsg === "Testando..." ? "" : "text-accent"}>{serverMsg}</p>}
              </div>
            )}
          </div>}

          {SHOW_TEST_LOGIN && (
            <div className="pt-4 border-t border-line space-y-2">
              <p className="text-xs text-muted">Contas de teste</p>
              <div className="flex gap-2">
                {[1, 2].map((n) => (
                  <button key={n} type="button" onClick={() => quick(n)}
                    className="flex-1 rounded-xl bg-white/5 border border-line py-2 text-sm hover:border-accent transition">
                    Entrar como teste{n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="flex items-start justify-center gap-2 text-center text-xs text-muted pt-1" title="Versão deste aplicativo">
            <FlaskConical size={14} className="mt-px shrink-0 text-accent2" />
            <span><b className="text-ink/80 font-semibold">{BUILD_LABEL}</b> <span aria-hidden="true">·</span> {BUILD.note}</span>
          </p>
        </form>
        )}
      </section>
    </div>
  );
}

/** Six boxes' worth of digits in one field: easy to paste, easy to type. */
function CodeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input value={value} disabled={disabled} autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-label="Código de 6 dígitos"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="w-full rounded-xl bg-white/5 border border-line px-4 py-4 text-center text-3xl font-bold tracking-[0.55em] pl-[0.55em] outline-none focus:border-accent focus:bg-white/[0.07] transition placeholder:text-muted/40 tabular-nums" />
  );
}
