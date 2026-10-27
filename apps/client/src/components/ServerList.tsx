import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, FolderPlus, MoreHorizontal, Palette, Pencil, Unlink } from "lucide-react";
import type { ServerDTO, ServerGroup } from "@cohle/shared";
import { ServerIcon } from "./ServerIcon";
import { ServerGroupModal } from "./ServerGroupModal";
import { groupOf, moveServer, normalize, removeGroup, saveGroup, toggleGroup, GROUPS_MAX } from "../lib/serverGroups";

type Menu = { x: number; y: number; kind: "server"; id: string } | { x: number; y: number; kind: "group"; id: string };
type Edit = { group?: ServerGroup; preselect?: string[] } | null;

/**
 * The servers of the side rail, organised in folders ("grupos"): collapse, create, rename, recolour, move (menu or drag). The folders live on the account (see PrefsDTO.serverGroups).
 * Works in the icon rail and in the expanded rail; a collapsed folder is one tile, so the rail stays short however many servers the person has.
 */
export function ServerList({ servers, serverId, dmOpen, railOpen, groups: raw, onGroups, onSelect }: {
  servers: ServerDTO[]; serverId?: string; dmOpen: boolean; railOpen: boolean; groups: ServerGroup[]; onGroups: (g: ServerGroup[]) => void; onSelect: (s: ServerDTO) => void;
}) {
  const groups = useMemo(() => normalize(raw, servers.map((s) => s.id)), [raw, servers]);
  const [menu, setMenu] = useState<Menu | null>(null), [edit, setEdit] = useState<Edit>(null), [over, setOver] = useState<string | null>(null);
  const byId = useMemo(() => new Map(servers.map((s) => [s.id, s])), [servers]);
  const loose = servers.filter((s) => !groupOf(groups, s.id));
  const press = useRef<number>();

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null), key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("mousedown", close); window.addEventListener("keydown", key); window.addEventListener("resize", close); window.addEventListener("blur", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", key); window.removeEventListener("resize", close); window.removeEventListener("blur", close); };
  }, [menu]);

  const openMenu = (e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void }, m: Omit<Menu, "x" | "y">) => { e.preventDefault?.(); setMenu({ ...m, x: e.clientX, y: e.clientY } as Menu); };
  const longPress = (m: Omit<Menu, "x" | "y">) => ({
    onTouchStart: (e: React.TouchEvent) => { const t = e.touches[0]; press.current = window.setTimeout(() => openMenu({ clientX: t.clientX, clientY: t.clientY }, m), 550); },
    onTouchEnd: () => window.clearTimeout(press.current), onTouchMove: () => window.clearTimeout(press.current),
  });
  const drag = (id: string) => ({ draggable: true, onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData("text/cohle-server", id); e.dataTransfer.effectAllowed = "move"; } });
  const drop = (to: string | null) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes("text/cohle-server")) { e.preventDefault(); setOver(to ?? "loose"); } },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => { const id = e.dataTransfer.getData("text/cohle-server"); setOver(null); if (id) { e.preventDefault(); e.stopPropagation(); onGroups(moveServer(groups, id, to)); } },
  });

  const serverBtn = (s: ServerDTO, nested = false) => {
    const on = !dmOpen && s.id === serverId;
    return (
      <button key={s.id} title={s.name} aria-current={on ? "true" : undefined} onClick={() => onSelect(s)} onContextMenu={(e) => openMenu(e, { kind: "server", id: s.id })} {...longPress({ kind: "server", id: s.id })} {...drag(s.id)}
        className={`group relative shrink-0 transition ${railOpen ? `w-full flex items-center gap-3 rounded-2xl pl-2 pr-3 ${on ? "bg-accent/15" : "hover:bg-white/5"}` : ""}`}>
        {/* active: a bar on the left edge + a clean outline with a gap + a soft glow (inactive ones are dimmed) */}
        <span className={`absolute ${railOpen ? "left-0" : nested ? "-left-[3px]" : "-left-[9px]"} top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-accent transition-all duration-200 ${on ? "h-9 opacity-100 shadow-[0_0_12px_rgb(var(--accent-rgb)/0.8)]" : "h-2 opacity-0 group-hover:opacity-70 group-hover:h-5"}`} />
        <span className={`shrink-0 block rounded-2xl transition-all duration-200 ${on ? "outline outline-2 outline-offset-[3px] outline-white/80 shadow-[0_8px_26px_rgb(var(--accent-rgb)/0.45)]" : "opacity-55 hover:opacity-100 group-hover:scale-105"}`}><ServerIcon server={s} size={48} /></span>
        {railOpen && <span className={`truncate text-sm text-left flex-1 ${on ? "font-semibold text-ink" : "text-muted"}`}>{s.name}</span>}
      </button>
    );
  };

  const groupHead = (g: ServerGroup) => {
    const members = g.serverIds.map((id) => byId.get(id)!).filter(Boolean), hasActive = !dmOpen && !!serverId && g.serverIds.includes(serverId);
    const tint = { background: `${g.color}22`, borderColor: `${g.color}66` };
    const common = { onContextMenu: (e: React.MouseEvent) => openMenu(e, { kind: "group", id: g.id }), ...longPress({ kind: "group", id: g.id }), ...drop(g.id) };
    const label = `${g.name}, ${members.length} servidor${members.length === 1 ? "" : "es"}. ${g.open ? "Recolher" : "Expandir"}`;
    if (railOpen) return (
      <div key={g.id} className={`group/g flex items-center rounded-2xl ${over === g.id ? "bg-white/10" : "hover:bg-white/5"} transition`} {...common}>
        <button onClick={() => onGroups(toggleGroup(groups, g.id))} aria-expanded={g.open} aria-label={label} title={label} className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 text-left">
          {g.open ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
          <span className="size-6 rounded-lg grid place-items-center shrink-0" style={{ background: `${g.color}33`, color: g.color }}>{g.open ? <FolderOpen size={14} /> : <Folder size={14} />}</span>
          <span className="truncate text-[13px] font-semibold flex-1">{g.name}</span>
          {hasActive && !g.open && <span className="size-2 rounded-full bg-accent shrink-0" aria-hidden="true" />}
          <span className="text-[11px] text-muted tabular-nums shrink-0">{members.length}</span>
        </button>
        <button onClick={(e) => openMenu({ clientX: e.clientX, clientY: e.clientY }, { kind: "group", id: g.id })} aria-label={`Opções do grupo ${g.name}`} title="Opções do grupo" className="p-1.5 mr-1 rounded-lg text-muted opacity-0 group-hover/g:opacity-100 focus:opacity-100 hover:text-ink hover:bg-white/10"><MoreHorizontal size={15} /></button>
      </div>
    );
    return (
      <button key={g.id} onClick={() => onGroups(toggleGroup(groups, g.id))} aria-expanded={g.open} aria-label={label} title={label} {...common}
        className={`relative shrink-0 size-12 rounded-2xl border transition hover:scale-105 ${over === g.id ? "scale-105" : ""}`} style={tint}>
        {g.open
          ? <span className="absolute inset-0 grid place-items-center" style={{ color: g.color }}><FolderOpen size={20} /></span>
          : <span className="absolute inset-1.5 grid grid-cols-2 grid-rows-2 gap-0.5">{members.slice(0, 4).map((m) => <span key={m.id} className="rounded-md overflow-hidden grid"><ServerIcon server={m} size={18} className="!rounded-md !size-full" /></span>)}{members.length === 0 && <span className="col-span-2 row-span-2 grid place-items-center" style={{ color: g.color }}><Folder size={18} /></span>}</span>}
        <span className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center text-white border-2 border-surface" style={{ background: g.color }}>{members.length}</span>
        {hasActive && !g.open && <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent shadow-[0_0_12px_rgb(var(--accent-rgb)/0.8)]" />}
      </button>
    );
  };

  const menuView = (m: Menu) => {
    const item = "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg hover:bg-white/10";
    const x = Math.min(m.x, window.innerWidth - 224), y = Math.min(m.y, window.innerHeight - 260);
    const g = m.kind === "group" ? groups.find((x) => x.id === m.id) : undefined, cur = m.kind === "server" ? groupOf(groups, m.id) : undefined;
    return (
      <div role="menu" aria-label={m.kind === "group" ? "Opções do grupo" : "Opções do servidor"} onMouseDown={(e) => e.stopPropagation()} style={{ left: x, top: y }}
        className="fixed z-[80] w-52 rounded-xl border border-line bg-surface shadow-[0_16px_50px_rgba(0,0,0,0.55)] p-1.5">
        {m.kind === "group" && g && (<>
          <button role="menuitem" className={item} onClick={() => { setEdit({ group: g }); setMenu(null); }}><Pencil size={14} /> Editar grupo</button>
          <button role="menuitem" className={item} onClick={() => { onGroups(toggleGroup(groups, g.id)); setMenu(null); }}>{g.open ? <Folder size={14} /> : <FolderOpen size={14} />} {g.open ? "Recolher" : "Expandir"}</button>
          <button role="menuitem" className={item} onClick={() => { onGroups(removeGroup(groups, g.id)); setMenu(null); }}><Unlink size={14} /> Desfazer grupo (mantém os servidores)</button>
        </>)}
        {m.kind === "server" && (<>
          <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5"><Palette size={11} /> Mover para</div>
          {groups.filter((x) => x.id !== cur?.id).map((x) => <button key={x.id} role="menuitem" className={item} onClick={() => { onGroups(moveServer(groups, m.id, x.id)); setMenu(null); }}><span className="size-2.5 rounded-full shrink-0" style={{ background: x.color }} /><span className="truncate">{x.name}</span></button>)}
          {groups.length < GROUPS_MAX && <button role="menuitem" className={item} onClick={() => { setEdit({ preselect: [m.id] }); setMenu(null); }}><FolderPlus size={14} /> Novo grupo com este servidor</button>}
          {cur && <button role="menuitem" className={item} onClick={() => { onGroups(moveServer(groups, m.id, null)); setMenu(null); }}><Unlink size={14} /> Tirar do grupo “{cur.name}”</button>}
        </>)}
      </div>
    );
  };

  const addBtn = railOpen
    ? <button onClick={() => setEdit({})} title="Novo grupo de servidores" aria-label="Novo grupo de servidores" className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/10"><FolderPlus size={15} /></button>
    : null;

  return (
    <>
      {railOpen
        ? <div className="px-2 pt-1 flex items-center text-[11px] uppercase tracking-widest text-muted"><span className="flex-1">Servidores</span>{addBtn}</div>
        : null}
      {groups.map((g) => (
        <div key={g.id} className={`flex flex-col gap-2 shrink-0 ${railOpen ? "" : "items-center"}`} role="group" aria-label={`Grupo ${g.name}`}>
          {groupHead(g)}
          {g.open && (
            <div className={`flex flex-col gap-2 ${railOpen ? "pl-3 ml-3 border-l-2" : "items-center py-2 px-1 rounded-2xl"}`} style={railOpen ? { borderColor: `${g.color}77` } : { background: `${g.color}14`, boxShadow: `inset 0 0 0 1px ${g.color}33` }} {...drop(g.id)}>
              {g.serverIds.map((id) => byId.get(id)).filter(Boolean).map((s) => serverBtn(s!, true))}
              {g.serverIds.length === 0 && <p className="text-[11px] text-muted px-1 py-1 text-center max-w-[56px] leading-tight">{railOpen ? "Arraste servidores para cá" : "Vazio"}</p>}
            </div>
          )}
        </div>
      ))}
      <div className={`flex flex-col gap-2 shrink-0 rounded-2xl transition ${railOpen ? "" : "items-center"} ${over === "loose" ? "bg-white/5" : ""}`} {...drop(null)}>
        {loose.map((s) => serverBtn(s))}
      </div>
      {!railOpen && <button onClick={() => setEdit({})} title="Novo grupo de servidores" aria-label="Novo grupo de servidores" className="shrink-0 size-12 rounded-2xl grid place-items-center bg-white/5 text-muted hover:text-ink hover:bg-white/10 border border-dashed border-line"><FolderPlus size={18} /></button>}
      {menu && menuView(menu)}
      {edit && (
        <ServerGroupModal servers={servers} group={edit.group} preselect={edit.preselect} onClose={() => setEdit(null)}
          onSave={(g) => { onGroups(saveGroup(groups, g)); setEdit(null); }}
          onDelete={edit.group ? () => { onGroups(removeGroup(groups, edit.group!.id)); setEdit(null); } : undefined} />
      )}
    </>
  );
}
