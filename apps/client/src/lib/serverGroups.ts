// Folders of servers in the side rail. Pure helpers (no React) so the rules are in one place: a server is in at most one folder, folders drop servers the person left.
import { GROUP_COLORS, GROUP_NAME_MAX, GROUPS_MAX, type ServerGroup } from "@cohle/shared";

export { GROUP_COLORS, GROUP_NAME_MAX, GROUPS_MAX };
export const newGroupId = () => "g" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
/** Drops servers that no longer exist and repeated ones (a server lives in one folder only). Keeps empty folders: the person just created them. */
export function normalize(groups: ServerGroup[], serverIds: string[]): ServerGroup[] {
  const alive = new Set(serverIds), seen = new Set<string>();
  return groups.map((g) => ({ ...g, serverIds: g.serverIds.filter((id) => alive.has(id) && !seen.has(id) && seen.add(id)) }));
}
export const groupOf = (groups: ServerGroup[], serverId: string) => groups.find((g) => g.serverIds.includes(serverId));
/** Moves a server into a folder (or out of every folder when `to` is null). Opens the destination so the move is visible. */
export const moveServer = (groups: ServerGroup[], serverId: string, to: string | null): ServerGroup[] =>
  groups.map((g) => { const without = g.serverIds.filter((id) => id !== serverId); return g.id === to ? { ...g, serverIds: [...without, serverId], open: true } : { ...g, serverIds: without }; });
export const toggleGroup = (groups: ServerGroup[], id: string) => groups.map((g) => (g.id === id ? { ...g, open: !g.open } : g));
export const removeGroup = (groups: ServerGroup[], id: string) => groups.filter((g) => g.id !== id);
export function saveGroup(groups: ServerGroup[], g: ServerGroup): ServerGroup[] {
  const claimed = new Set(g.serverIds);                                              // a server picked here leaves its old folder
  const others = groups.filter((x) => x.id !== g.id).map((x) => ({ ...x, serverIds: x.serverIds.filter((id) => !claimed.has(id)) }));
  const exists = groups.some((x) => x.id === g.id);
  return exists ? groups.map((x) => (x.id === g.id ? g : others.find((o) => o.id === x.id)!)) : [...others, g];
}
