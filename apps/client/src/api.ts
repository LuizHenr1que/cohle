import { io, type Socket } from "socket.io-client";
import type { ServerDTO, MessageDTO, UserDTO, MemberDTO, BanDTO, ServerTemplate } from "@cohle/shared";

// The server address is chosen inside the app (login screen) so one installer works against any Cohle server.
const DEFAULT_API: string = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const SERVER_KEY = "cohle:server";
export const API: string = (() => { try { return localStorage.getItem(SERVER_KEY) || DEFAULT_API; } catch { return DEFAULT_API; } })();

export const normalizeServerUrl = (raw: string) => {
  let u = raw.trim().replace(/\/+$/, "");
  if (u && !/^https?:\/\//i.test(u)) u = "http://" + u;
  return u;
};
export async function checkServer(url: string): Promise<boolean> {
  try {
    const r = await fetch(url + "/health", { signal: AbortSignal.timeout(5000) });
    return r.ok && (await r.json()).ok === true;
  } catch { return false; }
}
/** Switch server: accounts belong to one server, so sign out and reload. */
export function switchServer(url: string) {
  try { localStorage.setItem(SERVER_KEY, url); localStorage.removeItem("token"); localStorage.removeItem("me"); } catch { /* ignore */ }
  location.reload();
}

// Image URLs from the API are paths (cacheable); data: URLs are local previews.
export const assetUrl = (u?: string | null) => (!u ? null : u.startsWith("data:") || u.startsWith("http") ? u : API + u);

let token: string | null = localStorage.getItem("token");
export const getToken = () => token;
export const setToken = (t: string | null) => {
  token = t;
  t ? localStorage.setItem("token", t) : localStorage.removeItem("token");
};

async function req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Não consegui falar com o servidor (${API}). Confira o endereço e se ele está ligado.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "erro");
  return data as T;
}

export const api = {
  register: (b: { email: string; username: string; password: string }) =>
    req<{ token: string; user: UserDTO }>("/auth/register", "POST", b),
  login: (b: { email: string; password: string }) => req<{ token: string; user: UserDTO }>("/auth/login", "POST", b),
  me: () => req<UserDTO>("/me"),
  updateProfile: (b: { username?: string; avatarUrl?: string | null }) => req<UserDTO>("/me", "PATCH", b),
  servers: () => req<ServerDTO[]>("/servers"),
  createServer: (name: string, iconUrl?: string | null, template?: ServerTemplate) =>
    req<ServerDTO>("/servers", "POST", { name, iconUrl, template }),
  updateServer: (id: string, b: { name?: string; iconUrl?: string | null }) => req<ServerDTO>(`/servers/${id}`, "PATCH", b),
  deleteServer: (id: string) => req(`/servers/${id}`, "DELETE"),
  regenInvite: (id: string) => req<ServerDTO>(`/servers/${id}/invite/regenerate`, "POST"),
  leaveServer: (id: string) => req(`/servers/${id}/leave`, "POST"),
  members: (id: string) => req<MemberDTO[]>(`/servers/${id}/members`),
  kick: (id: string, userId: string) => req(`/servers/${id}/members/${userId}`, "DELETE"),
  muteMember: (id: string, userId: string, muted: boolean) => req(`/servers/${id}/members/${userId}/mute`, "POST", { muted }),
  disconnectMember: (id: string, userId: string) => req(`/servers/${id}/members/${userId}/voice-disconnect`, "POST"),
  ban: (id: string, userId: string) => req(`/servers/${id}/bans`, "POST", { userId }),
  unban: (id: string, userId: string) => req(`/servers/${id}/bans/${userId}`, "DELETE"),
  bans: (id: string) => req<BanDTO[]>(`/servers/${id}/bans`),
  updateChannel: (id: string, name: string) => req(`/channels/${id}`, "PATCH", { name }),
  deleteChannel: (id: string) => req(`/channels/${id}`, "DELETE"),
  join: (code: string) => req<ServerDTO>(`/servers/join/${code}`, "POST"),
  createChannel: (serverId: string, name: string, type: "TEXT" | "VOICE") =>
    req(`/servers/${serverId}/channels`, "POST", { name, type }),
  messages: (channelId: string) => req<MessageDTO[]>(`/channels/${channelId}/messages`),
  voiceToken: (channelId: string) => req<{ token: string; url: string }>(`/channels/${channelId}/voice-token`, "POST"),
};

export function connectSocket(): Socket {
  return io(API, { auth: { token } });
}
