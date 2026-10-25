import { z } from "zod";

const emailField = z.string().trim().toLowerCase().email().max(200);
export const registerSchema = z.object({
  email: emailField,
  username: z.string().min(2).max(24).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(100),
});
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});
const codeField = z.string().regex(/^\d{6}$/);
export const verifySchema = z.object({ email: emailField, code: codeField });
export const forgotSchema = z.object({ email: emailField });
export const resetSchema = z.object({ email: emailField, code: codeField, password: z.string().min(8).max(100) });
const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,/;
const iconSchema = z.string().regex(IMG_RE).max(400_000);
export const SERVER_TEMPLATES = ["custom", "gaming", "friends", "study", "community", "creators"] as const;
export type ServerTemplate = (typeof SERVER_TEMPLATES)[number];
export const createServerSchema = z.object({
  name: z.string().min(2).max(40),
  iconUrl: iconSchema.nullable().optional(),
  template: z.enum(SERVER_TEMPLATES).optional(),
});
export const updateServerSchema = z.object({ name: z.string().min(2).max(40).optional(), iconUrl: iconSchema.nullable().optional() });
export const updateChannelSchema = z.object({ name: z.string().min(1).max(40) });
export const createChannelSchema = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(["TEXT", "VOICE"]),
});
export const sendMessageSchema = z.object({ content: z.string().min(1).max(4000) });

export const updateProfileSchema = z.object({
  username: z.string().min(2).max(24).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
  avatarUrl: iconSchema.nullable().optional(),
});
export interface VoiceStateDTO { channelId: string; users: UserDTO[]; }

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserDTO { id: string; username: string; avatarUrl?: string | null; sharing?: boolean; muted?: boolean; micOff?: boolean; deaf?: boolean; }
export interface ChannelDTO { id: string; serverId: string; name: string; type: "TEXT" | "VOICE"; }
export interface ServerDTO {
  id: string; name: string; inviteCode: string; iconUrl: string | null; ownerId: string; channels: ChannelDTO[];
}
export interface MemberDTO { user: UserDTO; role: "OWNER" | "MEMBER"; muted: boolean; }
export interface BanDTO { user: UserDTO; createdAt: string; }
export const banSchema = z.object({ userId: z.string().min(1) });
export const muteSchema = z.object({ muted: z.boolean() });
export interface DirectMessageDTO { id: string; fromId: string; toId: string; content: string; createdAt: string; }
export interface DmConversationDTO { peer: UserDTO; last: DirectMessageDTO; unread: number; }
export interface MessageDTO {
  id: string; channelId: string; content: string; createdAt: string; author: UserDTO;
}
