import { memo } from "react";
import { nameOf, type UserDTO } from "@cohle/shared";
import { assetUrl } from "../api";
import { FrameArt } from "../shop/FrameArt";
import { useFxView } from "../shop/categories";

// `size` is px, or any CSS length (e.g. "clamp(36px, 26cqmin, 120px)") so avatars can scale with their container.
// A frame (shop item) is drawn around it. In lists it is static; `live` (profile, call tiles) lets it move, and `speaking` makes it glow.
export const Avatar = memo(function Avatar({ user, size = 36, className = "", speaking = false, live = false }: {
  user: Pick<UserDTO, "username" | "displayName" | "avatarUrl" | "fx">; size?: number | string; className?: string; speaking?: boolean; live?: boolean;
}) {
  const frame = useFxView(user.fx)?.frame;
  const ring = speaking && !frame ? "speaking-ring" : "";
  const len = typeof size === "number" ? `${size}px` : size;
  const style = { width: len, height: len, fontSize: `calc(${len} * 0.42)` };
  const cls = frame ? "" : className;
  const face = user.avatarUrl
    ? <img src={assetUrl(user.avatarUrl)!} loading="lazy" decoding="async" alt={nameOf(user)} style={style} className={`rounded-full object-cover shrink-0 ${ring} ${cls}`} />
    : <div style={style} className={`rounded-full grad grid place-items-center text-white font-bold shrink-0 ${ring} ${cls}`}>{nameOf(user)[0]?.toUpperCase()}</div>;
  if (!frame) return face;
  return (
    <span className={`fx-frame ${typeof size === "number" && size <= 44 ? "fx-compact" : ""} ${live ? "fx-live" : ""} ${speaking ? "fx-speaking" : ""} ${className}`} style={{ width: len, height: len }}>
      {face}<span className="fx-glow" aria-hidden="true" /><FrameArt frame={frame} />
    </span>
  );
});
