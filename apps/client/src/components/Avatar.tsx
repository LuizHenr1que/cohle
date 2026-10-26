import { nameOf, type UserDTO } from "@cohle/shared";
import { assetUrl } from "../api";

// `size` is px, or any CSS length (e.g. "clamp(36px, 26cqmin, 120px)") so avatars can scale with their container.
export function Avatar({ user, size = 36, className = "", speaking = false }: {
  user: Pick<UserDTO, "username" | "displayName" | "avatarUrl">; size?: number | string; className?: string; speaking?: boolean;
}) {
  const ring = speaking ? "speaking-ring" : "";
  const len = typeof size === "number" ? `${size}px` : size;
  const style = { width: len, height: len, fontSize: `calc(${len} * 0.42)` };
  if (user.avatarUrl)
    return <img src={assetUrl(user.avatarUrl)!} loading="lazy" decoding="async" alt={nameOf(user)} style={style} className={`rounded-full object-cover shrink-0 ${ring} ${className}`} />;
  return (
    <div style={style} className={`rounded-full grad grid place-items-center text-white font-bold shrink-0 ${ring} ${className}`}>
      {nameOf(user)[0]?.toUpperCase()}
    </div>
  );
}
