import { useEffect, useState } from "react";
import { Crown, Hash, Volume2, Trash2, RefreshCw, Copy, Check, LogOut, UserMinus, Plus, MicOff, Mic, Ban, Undo2, MessageCircle, Lock, LockOpen } from "lucide-react";
import type { ServerDTO, MemberDTO, BanDTO, UserDTO } from "@cohle/shared";
import { nameOf } from "@cohle/shared";
import { api } from "../api";
import { Modal, inputCls, primaryCls, ghostCls } from "./Modal";
import { IconPicker } from "./IconPicker";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import { Switch } from "./Switch";

type Tab = "general" | "channels" | "members" | "bans";

export function ServerSettings({ server, selfId, online, rev, onClose, onAddChannel, onMessage, onProfile }: {
  server: ServerDTO; selfId: string; online: Set<string>; rev: number; onClose: () => void; onAddChannel: (t: "TEXT" | "VOICE") => void; onMessage?: (u: UserDTO) => void; onProfile?: (id: string) => void;
}) {
  const owner = server.ownerId === selfId;
  const [tab, setTab] = useState<Tab>(owner ? "general" : "members");
  const [name, setName] = useState(server.name);
  const [icon, setIcon] = useState<string | null>(server.iconUrl);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [bans, setBans] = useState<BanDTO[]>([]);
  const [msg, setMsg] = useState("");
  const [blockPol, setBlockPol] = useState<boolean>();            // "block political items in this server" (owner)
  useEffect(() => { if (owner) api.serverSettings(server.id).then((r) => setBlockPol(r.blockedCategories.includes("politica"))).catch(() => {}); }, [server.id, owner]);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<string>();   // id of the thing awaiting a 2nd click
  const [delText, setDelText] = useState("");
  const [renaming, setRenaming] = useState<Record<string, string>>({});

  useEffect(() => {
    api.members(server.id).then(setMembers).catch(() => {});
    if (owner) api.bans(server.id).then(setBans).catch(() => {});
  }, [server.id, rev]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setErr(""); setMsg("");
    try { await fn(); if (ok) { setMsg(ok); setTimeout(() => setMsg(""), 2000); } } catch (x: any) { setErr(x.message); }
  };
  const dirty = name.trim() !== server.name || icon !== server.iconUrl;

  const tabs: [Tab, string][] = owner ? [["general", "Geral"], ["channels", "Canais"], ["members", `Membros (${members.length})`], ["bans", `Banidos (${bans.length})`]] : [["members", `Membros (${members.length})`]];

  return (
    <Modal wide title="Configurações do servidor" subtitle={server.name} onClose={onClose}>
      <div className="flex gap-1 border-b border-line overflow-x-auto shrink-0">
        {tabs.map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setErr(""); setConfirm(undefined); }}
            className={`px-3 sm:px-4 py-2 text-sm -mb-px border-b-2 whitespace-nowrap transition ${tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>{label}</button>
        ))}
      </div>
      {err && <p className="text-accent text-sm bg-accent/10 rounded-xl px-4 py-2">{err}</p>}
      {msg && <p className="text-emerald-400 text-sm">{msg}</p>}

      <div className="overflow-y-auto min-h-[260px] space-y-5 pr-1">
        {tab === "general" && owner && (<>
          <IconPicker name={name} value={icon} onChange={setIcon} />
          <label className="block space-y-1"><span className="text-xs text-muted">Nome do servidor</span>
            <input className={inputCls} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <button disabled={!dirty || name.trim().length < 2} className={primaryCls}
            onClick={() => run(() => api.updateServer(server.id, { name: name.trim(), ...(icon !== server.iconUrl ? { iconUrl: icon } : {}) }), "Salvo!")}>Salvar alterações</button>

          <div className="space-y-2 pt-2 border-t border-line">
            <span className="text-xs text-muted">Código de convite</span>
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-line p-2 pl-4">
              <code className="flex-1 font-mono tracking-wider selectable truncate">{server.inviteCode}</code>
              <button className={ghostCls} onClick={() => { navigator.clipboard.writeText(server.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check size={15} /> : <Copy size={15} />}</button>
              <button className={ghostCls} title="Gerar novo código (o antigo deixa de funcionar)" onClick={() => run(() => api.regenInvite(server.id), "Novo código gerado")}><RefreshCw size={15} /></button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-line">
            <span className="text-xs text-accent uppercase tracking-wider">Zona de perigo</span>
            {confirm === "delete" ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">Digite <b className="text-ink">{server.name}</b> para excluir para sempre, com todos os canais e mensagens.</p>
                <input className={inputCls} value={delText} onChange={(e) => setDelText(e.target.value)} />
                <div className="flex gap-2">
                  <button className={ghostCls} onClick={() => setConfirm(undefined)}>Cancelar</button>
                  <button disabled={delText !== server.name} className="rounded-xl px-5 py-3 bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
                    onClick={() => run(async () => { await api.deleteServer(server.id); onClose(); })}>Excluir servidor</button>
                </div>
              </div>
            ) : (
              <button className="rounded-xl px-5 py-3 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm inline-flex items-center gap-2"
                onClick={() => setConfirm("delete")}><Trash2 size={15} /> Excluir servidor</button>
            )}
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-white/[0.03] p-4 flex items-center gap-4" aria-label="Itens da loja neste servidor">
            <div className="min-w-0 flex-1"><div className="text-sm font-medium">Bloquear itens políticos aqui</div><div className="text-xs text-muted mt-0.5 leading-relaxed">Molduras, nomes e badges da categoria política de quem está neste servidor não aparecem nas mensagens nem nas chamadas dele.</div></div>
            <Switch on={!!blockPol} disabled={blockPol === undefined} label="Bloquear itens políticos neste servidor" onChange={(v) => { setBlockPol(v); api.putServerSettings(server.id, v ? ["politica"] : []).catch(() => setBlockPol(!v)); }} />
          </div>
        </>)}

        {tab === "channels" && owner && (<>
          <div className="flex gap-2">
            <button className={ghostCls + " inline-flex items-center gap-2"} onClick={() => onAddChannel("TEXT")}><Plus size={14} /> Canal de texto</button>
            <button className={ghostCls + " inline-flex items-center gap-2"} onClick={() => onAddChannel("VOICE")}><Plus size={14} /> Canal de voz</button>
          </div>
          <div className="space-y-2">
            {server.channels.map((c) => {
              const draft = renaming[c.id];
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 border border-line px-4 py-2.5">
                  {c.type === "VOICE" ? <Volume2 size={16} className="text-muted" /> : <Hash size={16} className="text-muted" />}
                  <input className="flex-1 bg-transparent outline-none min-w-0" value={draft ?? c.name}
                    onChange={(e) => setRenaming({ ...renaming, [c.id]: e.target.value })} />
                  {c.type === "VOICE" && (<>
                    <button title={c.locked ? "Destrancar a sala" : "Trancar a sala"} aria-label={c.locked ? "Destrancar a sala" : "Trancar a sala"}
                      className={`p-2 rounded-xl ${c.locked ? "text-accent bg-accent/15" : "text-muted hover:text-ink hover:bg-white/10"}`}
                      onClick={() => run(() => api.updateChannel(c.id, { locked: !c.locked }))}>{c.locked ? <Lock size={15} /> : <LockOpen size={15} />}</button>
                    <select aria-label="Limite de pessoas" value={c.userLimit ?? ""}
                      onChange={(e) => run(() => api.updateChannel(c.id, { userLimit: e.target.value ? Number(e.target.value) : null }))}
                      className="rounded-xl bg-white/5 border border-line px-2 py-1.5 text-xs outline-none">
                      <option value="">Sem limite</option>
                      {[2, 5, 10, 15, 25, 50].map((n) => <option key={n} value={n}>{n} pessoas</option>)}
                    </select>
                  </>)}
                  {draft !== undefined && draft.trim() && draft !== c.name && (
                    <button className="text-xs text-accent2 hover:underline"
                      onClick={() => run(async () => { await api.updateChannel(c.id, { name: draft.trim() }); setRenaming(({ [c.id]: _, ...r }) => r); })}>Salvar</button>
                  )}
                  {confirm === c.id ? (
                    <button className="text-xs text-red-400 font-semibold" onClick={() => run(async () => { await api.deleteChannel(c.id); setConfirm(undefined); })}>Confirmar exclusão</button>
                  ) : (
                    <button className="text-muted hover:text-red-400" title="Excluir canal" onClick={() => setConfirm(c.id)}><Trash2 size={15} /></button>
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {tab === "bans" && owner && (
          <div className="space-y-2">
            {bans.length === 0 && <p className="text-sm text-muted py-6 text-center">Ninguém foi banido.</p>}
            {bans.map((b) => (
              <div key={b.user.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-line px-4 py-2.5">
                <Avatar user={b.user} size={34} />
                <span className="flex-1 truncate">{nameOf(b.user)}<span className="text-muted text-xs"> · banido em {new Date(b.createdAt).toLocaleDateString()}</span></span>
                <button className="text-xs text-accent2 hover:underline inline-flex items-center gap-1" onClick={() => run(() => api.unban(server.id, b.user.id), "Banimento removido")}><Undo2 size={13} /> Desbanir</button>
              </div>
            ))}
          </div>
        )}

        {tab === "members" && (<>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-line px-4 py-2.5">
                <button onClick={() => { onClose(); onProfile?.(m.user.id); }} title="Ver perfil" className="relative"><Avatar user={m.user} size={34} />
                  <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online.has(m.user.id) ? "bg-emerald-400" : "bg-muted"}`} /></button>
                <span className="flex-1 truncate">{nameOf(m.user)} <DevBadge user={m.user} />{m.user.id === selfId && <span className="text-muted text-xs"> (você)</span>}</span>
                {m.user.id !== selfId && onMessage && <button className="text-muted hover:text-accent" title="Enviar mensagem" onClick={() => { onClose(); onMessage(m.user); }}><MessageCircle size={16} /></button>}
                {m.role === "OWNER" && <span className="text-xs text-accent2 inline-flex items-center gap-1"><Crown size={13} /> Dono</span>}
                {owner && m.user.id !== selfId && (<>
                  <button className={m.muted ? "text-accent" : "text-muted hover:text-ink"} title={m.muted ? "Liberar o microfone" : "Silenciar nas chamadas"}
                    onClick={() => run(() => api.muteMember(server.id, m.user.id, !m.muted))}>{m.muted ? <MicOff size={16} /> : <Mic size={16} />}</button>
                  {confirm === m.user.id ? (
                    <span className="flex items-center gap-2 text-xs">
                      <button className="text-red-400 font-semibold" onClick={() => run(async () => { await api.kick(server.id, m.user.id); setConfirm(undefined); })}>Expulsar</button>
                      <button className="text-red-400 font-semibold" onClick={() => run(async () => { await api.ban(server.id, m.user.id); setConfirm(undefined); })}>Banir</button>
                      <button className="text-muted" onClick={() => setConfirm(undefined)}>Cancelar</button>
                    </span>
                  ) : (
                    <button className="text-muted hover:text-red-400" title="Expulsar ou banir" onClick={() => setConfirm(m.user.id)}><UserMinus size={16} /></button>
                  )}
                </>)}
              </div>
            ))}
          </div>
          {!owner && (
            <div className="pt-4 border-t border-line">
              {confirm === "leave" ? (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted flex-1">Sair de {server.name}?</span>
                  <button className={ghostCls} onClick={() => setConfirm(undefined)}>Cancelar</button>
                  <button className="rounded-xl px-5 py-3 bg-red-600 text-white text-sm font-semibold" onClick={() => run(async () => { await api.leaveServer(server.id); onClose(); })}>Sair</button>
                </div>
              ) : (
                <button className="rounded-xl px-5 py-3 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm inline-flex items-center gap-2" onClick={() => setConfirm("leave")}>
                  <LogOut size={15} /> Sair do servidor</button>
              )}
            </div>
          )}
        </>)}
      </div>
    </Modal>
  );
}
