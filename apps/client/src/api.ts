import { io, type Socket } from "socket.io-client";
import type { FriendSuggestionDTO, UsernameCheckDTO, AdminAccessRow, AdminOverviewDTO, AdminSeriesDTO, AdminUsageDTO, AdminUserRow, AccountDTO, FriendsDTO, ProfileDTO, DirectMessageDTO, DmConversationDTO, ServerDTO, MessageDTO, UserDTO, MemberDTO, BanDTO, ServerTemplate } from "@cohle/shared";

// The server address is chosen inside the app (login screen) so one installer works against any Cohle server.
const DEFAULT_API: string = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const SERVER_KEY = "cohle:server";
/** Release builds are locked to their server: no address on screen, no way to point the app elsewhere (nothing to phish). */
export const SERVER_LOCKED = !!import.meta.env.VITE_API_URL && !import.meta.env.VITE_TEST_LOGIN;
export const API: string = SERVER_LOCKED ? DEFAULT_API : (() => { try { return localStorage.getItem(SERVER_KEY) || DEFAULT_API; } catch { return DEFAULT_API; } })();

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
  try { localStorage.setItem(SERVER_KEY, url); clearStored("token", "me"); } catch { /* ignore */ }
  location.reload();
}

// Image URLs from the API are paths (cacheable); data: URLs are local previews.
export const assetUrl = (u?: string | null) => (!u ? null : u.startsWith("data:") || u.startsWith("http") ? u : API + u);

// "Remember me": the session lives in localStorage (survives closing the app) or only in sessionStorage (until the app is quit).
export const getStored = (k: string): string | null => { try { return sessionStorage.getItem(k) ?? localStorage.getItem(k); } catch { return null; } };
export const setStored = (k: string, v: string, remember: boolean) => { try { (remember ? localStorage : sessionStorage).setItem(k, v); (remember ? sessionStorage : localStorage).removeItem(k); } catch { /* storage unavailable */ } };
export const clearStored = (...ks: string[]) => { try { ks.forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }); } catch { /* ignore */ } };

let token: string | null = getStored("token");
export const getToken = () => token;
export const setToken = (t: string | null, remember = true) => {
  token = t;
  t ? setStored("token", t, remember) : clearStored("token");
};
// Fired when a stored token no longer matches an account (401 unauthorized). The shell drops back to login.
let onSessionGone: (() => void) | null = null;
export const setOnSessionGone = (fn: () => void) => { onSessionGone = fn; };

// Server messages are in English: show them to the person in clear Portuguese.
const MESSAGES: Record<string, string> = {
  "unauthorized": "Sua sessão não é mais válida. Entre de novo.",
  "invalid credentials": "E-mail, @usuário ou senha incorretos.",
  "too many attempts": "Muitas tentativas de entrada nessa conta. Aguarde cerca de 15 minutos ou redefina a senha.",
  "email or username already in use": "Este e-mail ou @usuário já está em uso.",
  "invalid input": "Confira os dados informados.",
  "invalid code": "Código inválido. Confira e tente de novo.",
  "wrong": "Código incorreto. Confira e tente de novo.",
  "expired": "Este código expirou. Peça um novo.",
  "locked": "Muitas tentativas erradas. Peça um novo código.",
  "email delivery failed": "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
  "email unavailable": "A recuperação de senha está indisponível no momento.",
  "email not verified": "Confirme o seu e-mail para entrar.",
  "username already in use": "Esse @usuário já está em uso.",
  "forbidden": "Você não tem permissão para isso.",
  "owner is fixed": "A conta do dono da empresa não pode ser alterada.",
  "not found": "Não encontramos essa pessoa.",
  "user not found": "Não encontramos ninguém com esse @usuário. Confira se está escrito certo.",
  "bad handle": "Digite um @usuário (por exemplo @luiz) ou um e-mail.",
  "self": "Esse é o seu próprio @usuário.",
  "already friends": "Vocês já são amigos.",
  "already requested": "Você já enviou um pedido para essa pessoa. Agora é só esperar.",
};
function friendly(raw: unknown, status: number): string {
  const key = typeof raw === "string" ? raw : "";
  if (MESSAGES[key]) return MESSAGES[key];
  if (status === 429 || /rate limit/i.test(key)) return "Muitas tentativas. Aguarde um minuto e tente novamente.";
  if (status >= 500) return "Algo deu errado do nosso lado. Tente novamente em instantes.";
  return key && /[ãçéíóúâêô]/i.test(key) ? key : "Não foi possível concluir. Tente novamente.";
}

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
    throw new Error(SERVER_LOCKED ? "Não foi possível conectar ao Cohle. Verifique sua internet e tente novamente." : `Não consegui falar com o servidor (${API}). Confira o endereço e se ele está ligado.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && data?.error === "unauthorized" && token) {
      setToken(null);
      clearStored("me");
      onSessionGone?.();
    }
    throw Object.assign(new Error(friendly(data.error ?? data.message, res.status)), { status: res.status, data });
  }
  return data as T;
}

export const api = {
  register: (b: { email: string; username: string; password: string }) =>
    req<{ token: string; user: UserDTO } | { needsVerification: true; email: string }>("/auth/register", "POST", b),
  login: (b: { email: string; password: string }) => req<{ token: string; user: UserDTO }>("/auth/login", "POST", b),
  adminOverview: () => req<AdminOverviewDTO>("/admin/overview"),
  adminUsage: () => req<AdminUsageDTO>("/admin/usage"),
  adminSeries: (range: "24h" | "7d" | "30d") => req<AdminSeriesDTO>(`/admin/series?range=${range}`),
  adminUsers: (q: string, page: number) => req<{ rows: AdminUserRow[]; total: number }>(`/admin/users?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  adminAccesses: () => req<AdminAccessRow[]>("/admin/accesses"),
  adminRole: (id: string, role: "USER" | "ADMIN") => req<{ ok: true }>(`/admin/users/${id}/role`, "POST", { role }),
  friends: () => req<FriendsDTO>("/friends"),
  friendRequest: (handle: string) => req<{ status: "sent" | "accepted"; user: { username: string } | null }>("/friends/request", "POST", { handle }),
  usernameAvailable: (u: string) => req<UsernameCheckDTO>(`/auth/username-available?u=${encodeURIComponent(u)}`),
  forgotUsername: (email: string) => req<{ ok: true }>("/auth/forgot-username", "POST", { email }),
  setPrivacy: (findByEmail: boolean) => req<{ ok: true }>("/me/privacy", "POST", { findByEmail }),
  friendAccept: (id: string) => req(`/friends/${id}/accept`, "POST", {}),
  friendDecline: (id: string) => req(`/friends/${id}/decline`, "POST", {}),
  friendRemove: (userId: string) => req(`/friends/${userId}`, "DELETE"),
  account: () => req<AccountDTO>("/me/account"),
  changePassword: (b: { current: string; password: string }) => req<{ ok: true }>("/me/password", "POST", b),
  profile: (id: string) => req<ProfileDTO>(`/users/${id}/profile`),
  verify: (b: { email: string; code: string }) => req<{ token: string; user: UserDTO }>("/auth/verify", "POST", b),
  resend: (email: string) => req<{ ok: true }>("/auth/resend", "POST", { email }),
  forgot: (email: string) => req<{ ok: true }>("/auth/forgot", "POST", { email }),
  reset: (b: { email: string; code: string; password: string }) => req<{ token: string; user: UserDTO }>("/auth/reset", "POST", b),
  me: () => req<UserDTO>("/me"),
  updateProfile: (b: { username?: string; displayName?: string | null; bio?: string | null; bannerColor?: string | null; avatarUrl?: string | null }) => req<UserDTO>("/me", "PATCH", b),
  saveNote: (id: string, text: string) => req<{ ok: true }>(`/users/${id}/note`, "PUT", { text }),
  friendSuggestions: () => req<FriendSuggestionDTO[]>("/friends/suggestions"),
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
  dms: () => req<DmConversationDTO[]>("/dms"),
  dmPeople: () => req<UserDTO[]>("/dms/people"),
  dmMessages: (peerId: string, before?: string) =>
    req<{ messages: DirectMessageDTO[]; more: boolean }>(`/dms/${peerId}/messages${before ? `?before=${before}` : ""}`),
  dmRead: (peerId: string) => req(`/dms/${peerId}/read`, "POST"),
  voiceToken: (channelId: string) => req<{ token: string; url: string }>(`/channels/${channelId}/voice-token`, "POST"),
};

export function connectSocket(): Socket {
  return io(API, { auth: { token } });
}
