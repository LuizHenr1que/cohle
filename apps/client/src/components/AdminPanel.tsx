import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, CalendarClock, Wallet, ArrowLeft, BadgeCheck, CheckCircle2, Gauge, KeyRound, LogIn, Search, ShieldCheck, UserPlus, Users, Mic, Server, MessageSquare, X, Eye } from "lucide-react";
import type { AdminAccessRow, AdminOverviewDTO, AdminSeriesDTO, AdminUsageDTO, AdminUserRow, QuotaDTO, UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Logo } from "./Logo";

type Tab = "overview" | "plan" | "people" | "access";
const TABS: [Tab, string, typeof Users][] = [["overview", "Visão geral", Activity], ["plan", "Plano grátis", Gauge], ["people", "Pessoas", Users], ["access", "Acessos", LogIn]];
const OK = "#3ddc84", WARN = "#ffb347", BAD = "#ff5c5c";
const LEVEL = { ok: { c: OK, t: "Tranquilo", I: CheckCircle2 }, warn: { c: WARN, t: "Atenção", I: AlertTriangle }, over: { c: BAD, t: "Vai estourar", I: AlertTriangle } } as const;

const nf = (n: number) => n.toLocaleString("pt-BR");
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca");
const ago = (iso: string | null) => {
  if (!iso) return "nunca";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  return s < 90 ? "agora" : s < 3600 ? `há ${Math.round(s / 60)} min` : s < 86400 ? `há ${Math.round(s / 3600)} h` : `há ${Math.round(s / 86400)} d`;
};
const up = (s: number) => (s >= 86400 ? `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h` : s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`);

/** Polls only while the panel is open AND the window is visible: an admin tab left in the background costs nothing. */
function usePoll<T>(load: () => Promise<T>, ms: number, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [err, setErr] = useState("");
  const fn = useRef(load); fn.current = load;
  const run = useCallback(() => { if (document.hidden) return; fn.current().then((d) => { setData(d); setErr(""); }).catch((e: Error) => setErr(e.message)); }, []);
  useEffect(() => {
    setData(undefined); run();
    const id = setInterval(run, ms);
    const vis = () => { if (!document.hidden) run(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [ms, run, ...deps]);   // eslint-disable-line react-hooks/exhaustive-deps
  return { data, err, reload: run };
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-2xl border border-line bg-white/[0.03] p-4 ${className}`}>{children}</div>;
const Err = ({ msg }: { msg: string }) => (msg ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-4 py-3">{msg}</div> : null);

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Users; label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-xs text-muted"><Icon size={14} style={tone ? { color: tone } : undefined} className={tone ? "" : "text-accent"} />{label}</div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">{typeof value === "number" ? nf(value) : value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </Card>
  );
}

/** Tiny SVG line/area chart: no library, no animation, drawn once per refresh. */
function Spark({ values, labels, color = "var(--color-accent)", unit = "" }: { values: number[]; labels: string[]; color?: string; unit?: string }) {
  const [hover, setHover] = useState<number>();
  if (values.length < 2) return <div className="h-28 grid place-items-center text-xs text-muted">Coletando dados… a primeira medição sai em até 5 minutos.</div>;
  const max = Math.max(...values, 1), W = 100, H = 36;
  const x = (i: number) => (i / (values.length - 1)) * W, y = (v: number) => H - (v / max) * (H - 3) - 1.5;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  return (
    <div className="relative" style={{ color }} onMouseLeave={() => setHover(undefined)}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - r.left) / r.width) * (values.length - 1))))); }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-28 block overflow-visible">
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="currentColor" opacity="0.14" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover !== undefined && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />}
      </svg>
      <div className="flex justify-between text-[10px] text-muted mt-1"><span>{labels[0]}</span><span>máx. {nf(max)}{unit}</span><span>{labels[labels.length - 1]}</span></div>
      {hover !== undefined && <div className="absolute top-0 right-0 rounded-lg bg-black/70 border border-line px-2 py-1 text-[11px] text-ink">{labels[hover]} · <b>{nf(values[hover])}{unit}</b></div>}
    </div>
  );
}

function Bars({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className="flex items-end gap-[3px] h-24">
        {values.map((v, i) => <div key={i} title={`${labels[i]}: ${v}`} className="flex-1 rounded-t-sm min-h-[2px]" style={{ height: `${Math.max((v / max) * 100, 2)}%`, background: color, opacity: v ? 0.9 : 0.2 }} />)}
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-1"><span>{labels[0]}</span><span>máx. {nf(max)}</span><span>{labels[labels.length - 1]}</span></div>
    </div>
  );
}

const tlabel = (iso: string, range: string) => new Date(iso).toLocaleString("pt-BR", range === "24h" ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit" });

function Overview() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const ov = usePoll<AdminOverviewDTO>(api.adminOverview, 15_000);
  const se = usePoll<AdminSeriesDTO>(() => api.adminSeries(range), 60_000, [range]);
  const o = ov.data;
  return (
    <div className="space-y-4">
      <Err msg={ov.err} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Contas" value={o?.users.total ?? "…"} hint={o ? `${o.users.verified} com e-mail confirmado` : undefined} />
        <Stat icon={UserPlus} label="Novas contas" value={o ? `${o.users.new24h} / ${o.users.new7d}` : "…"} hint="24 horas / 7 dias" />
        <Stat icon={Eye} label="Voltaram ao app" value={o ? `${o.users.active24h} / ${o.users.active7d}` : "…"} hint="24 horas / 7 dias" />
        <Stat icon={Activity} label="Online agora" value={o?.live.online ?? "…"} tone={OK} hint={o ? `${o.live.voice} em chamada · ${o.live.rooms} sala(s)` : undefined} />
        <Stat icon={Server} label="Servidores" value={o?.content.servers ?? "…"} hint={o ? `${o.content.channels} canais` : undefined} />
        <Stat icon={MessageSquare} label="Mensagens" value={o?.content.messages ?? "…"} hint={o ? `${nf(o.content.dms)} diretas` : undefined} />
        <Stat icon={Gauge} label="Memória do servidor" value={o ? `${o.process.rssMb} MB` : "…"} hint={o ? `ligado há ${up(o.process.uptimeSec)}` : undefined} />
        <Stat icon={Mic} label="Banco de dados" value={o ? `${o.dbMb} MB` : "…"} hint={o ? `${o.content.attachmentsMb} MB em arquivos · limite grátis: 500 MB` : "limite grátis: 500 MB"} />
      </div>
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="font-semibold text-sm">Pessoas online ao longo do tempo</div>
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">{(["24h", "7d", "30d"] as const).map((r) => <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-lg text-xs transition ${range === r ? "bg-accent/20 text-ink font-semibold" : "text-muted hover:text-ink"}`}>{r === "24h" ? "24 horas" : r === "7d" ? "7 dias" : "30 dias"}</button>)}</div>
        </div>
        {se.data && <Spark values={se.data.points.map((p) => p.peak)} labels={se.data.points.map((p) => tlabel(p.t, range))} color={OK} />}
        {!se.data && <div className="h-28" />}
        <div className="text-[11px] text-muted mt-2">Cada ponto é o maior número de pessoas online naquele intervalo.</div>
      </Card>
      {se.data && (
        <div className="grid md:grid-cols-3 gap-3">
          <Card><div className="font-semibold text-sm mb-3">Cadastros por dia <span className="text-muted font-normal">· 30 dias</span></div><Bars values={se.data.days.map((d) => d.register)} labels={se.data.days.map((d) => d.day.slice(5).replace("-", "/"))} color="var(--color-accent)" /></Card>
          <Card><div className="font-semibold text-sm mb-3">Aberturas do app por dia</div><Bars values={se.data.days.map((d) => d.login + d.open)} labels={se.data.days.map((d) => d.day.slice(5).replace("-", "/"))} color="var(--color-accent2)" /></Card>
          <Card><div className="font-semibold text-sm mb-3">Minutos em chamada por dia</div><Bars values={se.data.days.map((d) => d.voiceMinutes)} labels={se.data.days.map((d) => d.day.slice(5).replace("-", "/"))} color={OK} /></Card>
        </div>
      )}
    </div>
  );
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

/** The sentence an owner actually needs: what happens, when, and what it costs to avoid it. */
function nextStep(q: QuotaDTO) {
  const n = q.next, price = `${brl(n.brl)}/mês (US$ ${n.usd})`;
  if (q.level === "over") return q.runsOutAt && new Date(q.runsOutAt) > new Date()
    ? `No ritmo atual o limite acaba em ${day(q.runsOutAt)}. Para não parar: ${n.plan}, cerca de ${price}.`
    : `O limite já foi atingido ou será neste mês. Para não parar: ${n.plan}, cerca de ${price}.`;
  if (q.level === "warn") return `Ainda cabe no grátis, com pouca folga. Plano de reserva: ${n.plan}, cerca de ${price}.`;
  return `Nada a pagar por enquanto. Quando crescer: ${n.plan}, cerca de ${price}.`;
}

function Quota({ q }: { q: QuotaDTO }) {
  const L = LEVEL[q.level], isMem = q.id === "render-mem";
  const pct = (v: number) => Math.min((v / q.limit) * 100, 100);
  const num = (v: number) => `${nf(v)} ${q.unit}`;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-sm leading-snug">{q.label}</div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: L.c, background: `${L.c}22` }}><L.I size={12} />{L.t}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl font-bold tabular-nums">{nf(q.used)}</span><span className="text-sm text-muted">de {num(q.limit)}</span></div>
      <div className="relative mt-2 h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${pct(q.projected)}%`, background: L.c }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct(q.used)}%`, background: L.c }} />
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted">
        <div className="flex justify-between gap-3"><span>{isMem ? "Pico neste mês" : "Previsão para o fim do mês"}</span><b className="text-ink tabular-nums">{num(q.projected)}</b></div>
        <div className="flex justify-between gap-3"><span>No ritmo de hoje</span><b className="text-ink">{isMem ? (q.level === "ok" ? "sobra memória" : "risco de reinício") : q.runsOutAt ? `acaba em ${day(q.runsOutAt)}` : "dura até o fim do mês"}</b></div>
      </div>
      <div className="mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed border" style={{ borderColor: `${L.c}44`, background: `${L.c}10` }}>
        <div className="font-semibold text-ink mb-0.5 flex items-center gap-1.5"><Wallet size={13} style={{ color: L.c }} />Próximo passo</div>
        <div className="text-muted">{nextStep(q)}</div>
        <div className="text-muted/80 mt-1">{q.next.plan} traz: {q.next.gives.charAt(0).toLowerCase() + q.next.gives.slice(1)}.</div>
      </div>
      {q.note && <p className="text-[11px] text-muted mt-3 leading-relaxed">{q.note}</p>}
    </Card>
  );
}

function Plan() {
  const { data, err } = usePoll<AdminUsageDTO>(api.adminUsage, 60_000);
  const worst = data?.quotas.some((q) => q.level === "over") ? "over" : data?.quotas.some((q) => q.level === "warn") ? "warn" : "ok";
  const L = LEVEL[worst];
  const days = data ? Math.max(0, Math.ceil((new Date(data.resetsAt).getTime() - Date.now()) / 86_400_000)) : 0;
  const timeline = data?.quotas.filter((q) => q.runsOutAt && q.level !== "ok").sort((a, b) => +new Date(a.runsOutAt!) - +new Date(b.runsOutAt!)) ?? [];
  return (
    <div className="space-y-4">
      <Err msg={err} />
      {data && (<>
        <Card className="flex items-start gap-3">
          <L.I size={22} style={{ color: L.c }} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{worst === "over" ? "No ritmo de hoje, algum limite grátis estoura neste mês" : worst === "warn" ? "Dentro do grátis, mas vale ficar de olho" : "Tudo dentro do plano grátis"}</div>
            <div className="text-sm text-muted mt-0.5">Mês de {data.month.split("-").reverse().join("/")} · os contadores mensais zeram em {days} dia(s). As previsões usam o ritmo médio do mês até agora, então ficam mais confiáveis com o passar dos dias.</div>
          </div>
        </Card>
        <div className="grid md:grid-cols-3 gap-3">
          <Card><div className="flex items-center gap-2 text-xs text-muted"><Wallet size={14} className="text-accent" />Você paga hoje</div><div className="mt-1.5 text-2xl font-bold">{brl(0)}<span className="text-sm text-muted font-normal">/mês</span></div><div className="text-xs text-muted mt-0.5">tudo no plano grátis</div></Card>
          <Card><div className="flex items-center gap-2 text-xs text-muted"><AlertTriangle size={14} style={{ color: data.costNeeded.usd ? BAD : OK }} />Se continuar nesse ritmo</div>
            <div className="mt-1.5 text-2xl font-bold">{data.costNeeded.usd ? brl(data.costNeeded.brl) : brl(0)}<span className="text-sm text-muted font-normal">/mês</span></div>
            <div className="text-xs text-muted mt-0.5">{data.costNeeded.usd ? data.costNeeded.items.join(" + ") : "nenhum limite estoura neste mês"}</div></Card>
          <Card><div className="flex items-center gap-2 text-xs text-muted"><Gauge size={14} style={{ color: WARN }} />Se pagar também o que está em atenção</div>
            <div className="mt-1.5 text-2xl font-bold">{brl(data.costIfWarn.brl)}<span className="text-sm text-muted font-normal">/mês</span></div>
            <div className="text-xs text-muted mt-0.5">{data.costIfWarn.items.length ? data.costIfWarn.items.join(" + ") : "nada em atenção"}</div></Card>
        </div>
        <Card>
          <div className="font-semibold text-sm mb-3 flex items-center gap-2"><CalendarClock size={15} className="text-accent" />Linha do tempo: o que vai exigir upgrade</div>
          {timeline.length ? (
            <ol className="space-y-2.5">{timeline.map((q) => (
              <li key={q.id} className="flex gap-3 text-sm"><span className="shrink-0 w-24 font-semibold tabular-nums" style={{ color: LEVEL[q.level].c }}>{day(q.runsOutAt!)}</span><span className="text-muted"><b className="text-ink">{q.label.split(":")[0]}</b> chega ao limite de {q.label.split(": ")[1] ?? q.label}. Para seguir: {q.next.plan}, cerca de {brl(q.next.brl)}/mês.</span></li>
            ))}</ol>
          ) : <div className="text-sm text-muted">Nenhum limite é atingido até o fim do mês no ritmo atual. Os cartões abaixo mostram o plano de reserva de cada serviço.</div>}
        </Card>
      </>)}
      <div className="grid md:grid-cols-2 gap-3">{data?.quotas.map((q) => <Quota key={q.id} q={q} />)}</div>
      {data && <p className="text-xs text-muted leading-relaxed">Valores em reais são estimativas (câmbio de R$ {data.rate.toFixed(2).replace(".", ",")} por dólar, ajustável em <code>PLAN_USD_BRL</code>). Preços em dólar conferidos nos sites oficiais do Render, Supabase e LiveKit em {new Date(data.pricesCheckedAt).toLocaleDateString("pt-BR")}: confirme antes de assinar, pois mudam. Horas do Render e minutos do LiveKit são medidos pelo próprio Cohle (os provedores não entregam esse dado por API no plano grátis). Limites ajustáveis no Render: <code>PLAN_RENDER_HOURS</code>, <code>PLAN_RENDER_MEM_MB</code>, <code>PLAN_DB_MB</code>, <code>PLAN_LIVEKIT_MINUTES</code>.</p>}
    </div>
  );
}

const ROLE = { OWNER: { t: "Dono", c: "from-[#ff3b5c] to-[#ff9a62] text-white" }, ADMIN: { t: "Admin", c: "from-[#8b5cf6] to-[#e056d9] text-white" } } as const;

function People({ me }: { me: UserDTO }) {
  const [q, setQ] = useState(""), [qs, setQs] = useState(""), [page, setPage] = useState(0), [busy, setBusy] = useState(""), [msg, setMsg] = useState("");
  useEffect(() => { const t = setTimeout(() => { setQs(q.trim()); setPage(0); }, 350); return () => clearTimeout(t); }, [q]);
  const { data, err, reload } = usePoll<{ rows: AdminUserRow[]; total: number }>(() => api.adminUsers(qs, page), 30_000, [qs, page]);
  const setRole = async (u: AdminUserRow, role: "USER" | "ADMIN") => {
    setBusy(u.id); setMsg("");
    try { await api.adminRole(u.id, role); reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  };
  const pages = data ? Math.ceil(data.total / 25) : 0;
  return (
    <div className="space-y-3">
      <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" className="w-full rounded-xl bg-white/5 border border-line pl-10 pr-4 py-3 outline-none focus:border-accent text-sm" /></div>
      <Err msg={err || msg} />
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line"><th className="px-4 py-3 font-medium">Pessoa</th><th className="px-4 py-3 font-medium">E-mail</th><th className="px-4 py-3 font-medium">Entrou em</th><th className="px-4 py-3 font-medium">Visto</th><th className="px-4 py-3 font-medium text-right">Papel</th></tr></thead>
            <tbody>
              {data?.rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3"><div className="flex items-center gap-2 font-medium"><span className="size-2 rounded-full shrink-0" style={{ background: u.online ? OK : "rgba(255,255,255,.2)" }} title={u.online ? "Online" : "Offline"} />@{u.username}</div></td>
                  <td className="px-4 py-3 text-muted"><span className="selectable">{u.email}</span> {u.verified ? <BadgeCheck size={13} className="inline text-emerald-300 -mt-0.5" aria-label="E-mail confirmado" /> : <span className="text-[11px] text-amber-300 ml-1">não confirmado</span>}</td>
                  <td className="px-4 py-3 text-muted tabular-nums">{dt(u.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{u.online ? "agora" : ago(u.lastSeenAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "USER" && <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide bg-gradient-to-r ${ROLE[u.role].c}`}>{ROLE[u.role].t}</span>}
                    {me.role === "OWNER" && u.role !== "OWNER" && (
                      <button disabled={busy === u.id} onClick={() => setRole(u, u.role === "ADMIN" ? "USER" : "ADMIN")} className="ml-2 rounded-lg px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-50">{u.role === "ADMIN" ? "Remover admin" : "Tornar admin"}</button>
                    )}
                  </td>
                </tr>
              ))}
              {data && !data.rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Ninguém encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{data ? `${nf(data.total)} conta(s)` : ""}</span>
        {pages > 1 && <div className="flex items-center gap-2"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40">Anterior</button><span>{page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40">Próxima</button></div>}
      </div>
    </div>
  );
}

const KIND = { register: { t: "Criou a conta", I: UserPlus, c: OK }, login: { t: "Entrou", I: LogIn, c: "var(--color-accent2)" }, open: { t: "Abriu o app", I: KeyRound, c: "var(--color-muted)" } } as const;
function Access() {
  const { data, err } = usePoll<AdminAccessRow[]>(api.adminAccesses, 20_000);
  return (
    <div className="space-y-3">
      <Err msg={err} />
      <Card className="!p-0 overflow-hidden">
        {data?.map((r) => { const K = KIND[r.kind]; return (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
            <K.I size={16} style={{ color: K.c }} className="shrink-0" />
            <div className="min-w-0 flex-1"><div className="text-sm"><b>{r.username}</b> <span className="text-muted">· {K.t}</span></div><div className="text-xs text-muted truncate selectable">{r.email}</div></div>
            <div className="text-xs text-muted text-right shrink-0">{dt(r.at)}<div>{ago(r.at)}</div></div>
          </div>); })}
        {data && !data.length && <div className="px-4 py-10 text-center text-muted text-sm">Ainda sem acessos registrados.</div>}
      </Card>
      <p className="text-xs text-muted">Mostra os 40 mais recentes. “Abriu o app” conta uma vez a cada 30 minutos por pessoa. O endereço de IP não é guardado.</p>
    </div>
  );
}

export default function AdminPanel({ me, onClose }: { me: UserDTO; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col" role="dialog" aria-label="Painel do Cohle">
      <div className="titlebar-drag hidden electron-mac:block" />
      <header className="shrink-0 border-b border-line px-3 sm:px-6 py-3 flex items-center gap-3">
        <button onClick={onClose} aria-label="Voltar" className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink"><ArrowLeft size={18} /></button>
        <Logo size={26} />
        <div className="min-w-0"><div className="font-bold leading-tight flex items-center gap-2">Painel do Cohle<span className="inline-flex items-center gap-1 rounded-md px-1.5 py-[1px] text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-[#ff3b5c] to-[#ff9a62]"><ShieldCheck size={10} strokeWidth={3} />{me.role === "OWNER" ? "Dono" : "Admin"}</span></div><div className="text-xs text-muted truncate">{me.username}</div></div>
        <button onClick={onClose} aria-label="Fechar" className="ml-auto p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink"><X size={18} /></button>
      </header>
      <nav className="shrink-0 border-b border-line px-3 sm:px-6 flex gap-1 overflow-x-auto">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${tab === id ? "border-accent text-ink font-semibold" : "border-transparent text-muted hover:text-ink"}`}><Icon size={16} className={tab === id ? "text-accent" : ""} />{label}</button>
        ))}
      </nav>
      <main className="flex-1 min-h-0 overflow-y-auto"><div className="max-w-6xl mx-auto p-3 sm:p-6">
        {tab === "overview" && <Overview />}{tab === "plan" && <Plan />}{tab === "people" && <People me={me} />}{tab === "access" && <Access />}
      </div></main>
    </div>
  );
}
