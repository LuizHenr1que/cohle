import { useState } from "react";
import { Sparkles, Gamepad2, Users, GraduationCap, Globe, Palette, ChevronRight, ArrowLeft } from "lucide-react";
import type { ServerDTO, ServerTemplate } from "@cohle/shared";
import { api } from "../api";
import { Modal, inputCls, primaryCls, ghostCls } from "./Modal";
import { IconPicker } from "./IconPicker";

const TEMPLATES: { id: ServerTemplate; label: string; hint: string; icon: typeof Sparkles }[] = [
  { id: "gaming", label: "Jogos", hint: "Lobby, clipes e sala de jogo", icon: Gamepad2 },
  { id: "friends", label: "Amigos", hint: "Memes, fotos e sala de filmes", icon: Users },
  { id: "study", label: "Grupo de estudo", hint: "Anotações, materiais e salas de estudo", icon: GraduationCap },
  { id: "community", label: "Comunidade", hint: "Boas-vindas, anúncios e bate-papo", icon: Globe },
  { id: "creators", label: "Artistas e criadores", hint: "Projetos, feedback e sala de criação", icon: Palette },
];

type Step = "template" | "customize" | "join";

export function ServerModal({ initial = "create", username, onClose, onDone }: {
  initial?: "create" | "join"; username: string; onClose: () => void; onDone: (s: ServerDTO) => void;
}) {
  const [step, setStep] = useState<Step>(initial === "join" ? "join" : "template");
  const [template, setTemplate] = useState<ServerTemplate>("custom");
  const [name, setName] = useState(`Servidor de ${username}`);
  const [icon, setIcon] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const back = (to: Step) => { setErr(""); setStep(to); };
  async function run(fn: () => Promise<ServerDTO>) {
    setErr(""); setBusy(true);
    try { onDone(await fn()); onClose(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  const pick = (t: ServerTemplate) => { setTemplate(t); setStep("customize"); };

  const row = (t: { id: ServerTemplate; label: string; hint?: string; icon: typeof Sparkles }, accent = false) => (
    <button key={t.id} onClick={() => pick(t.id)}
      className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-3 text-left transition hover:bg-white/10 hover:border-accent/50 ${accent ? "border-accent/40 bg-accent/10" : "border-line bg-white/5"}`}>
      <span className={`size-11 rounded-xl grid place-items-center shrink-0 ${accent ? "grad text-white" : "bg-white/10 text-accent2"}`}><t.icon size={20} /></span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium">{t.label}</span>
        {t.hint && <span className="block text-xs text-muted truncate">{t.hint}</span>}
      </span>
      <ChevronRight size={18} className="text-muted" />
    </button>
  );

  if (step === "template")
    return (
      <Modal title="Crie seu servidor" subtitle="Seu servidor é onde você e seus amigos se encontram. Crie o seu e comece a conversar." onClose={onClose}>
        <div className="space-y-2 overflow-y-auto pr-1">
          {row({ id: "custom", label: "Criar o meu", hint: "Comece do zero, do seu jeito", icon: Sparkles }, true)}
          <p className="text-xs uppercase tracking-widest text-muted pt-2 pb-1">Ou comece com um modelo</p>
          {TEMPLATES.map((t) => row(t))}
        </div>
        <div className="pt-3 border-t border-line text-center space-y-2">
          <p className="text-sm text-muted">Já tem um convite?</p>
          <button onClick={() => back("join")} className={`${ghostCls} w-full`}>Entrar em um servidor</button>
        </div>
      </Modal>
    );

  if (step === "customize")
    return (
      <Modal title="Personalize seu servidor" subtitle="Dê uma personalidade ao seu servidor com um nome e um ícone. Você pode mudar depois." onClose={onClose}>
        <form onSubmit={(e) => { e.preventDefault(); run(() => api.createServer(name.trim(), icon, template)); }} className="space-y-5">
          <div className="grid place-items-center"><IconPicker name={name} value={icon} onChange={setIcon} /></div>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted">Nome do servidor</span>
            <input autoFocus className={inputCls} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {err && <p className="text-accent text-sm">{err}</p>}
          <p className="text-[11px] text-muted">Ao criar, você é o dono do servidor e pode convidar pessoas, gerenciar canais e membros.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => back("template")} className={`${ghostCls} inline-flex items-center gap-2`}><ArrowLeft size={15} /> Voltar</button>
            <button disabled={busy || name.trim().length < 2} className={`${primaryCls} flex-1`}>{busy ? "Criando..." : "Criar servidor"}</button>
          </div>
        </form>
      </Modal>
    );

  return (
    <Modal title="Entre em um servidor" subtitle="Digite o código de convite abaixo para entrar em um servidor existente." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.join(code.trim())); }} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-widest text-muted">Código de convite</span>
          <input autoFocus className={inputCls} placeholder="ex.: 4f9a1c0b7e" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => back("template")} className={`${ghostCls} inline-flex items-center gap-2`}><ArrowLeft size={15} /> Voltar</button>
          <button disabled={busy || !code.trim()} className={`${primaryCls} flex-1`}>{busy ? "Entrando..." : "Entrar no servidor"}</button>
        </div>
      </form>
    </Modal>
  );
}
