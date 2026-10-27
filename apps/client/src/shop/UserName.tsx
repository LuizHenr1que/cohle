import { memo } from "react";
import { nameOf, type UserDTO } from "@cohle/shared";
import { NAME_CLASS, BADGES } from "./registry";
import { useFxView } from "./categories";

/** A person's name with the effect they equipped (static gradient; it only moves while hovered or when `live`). Falls back to the plain name. */
export const UserName = memo(function UserName({ user, live = false }: { user: Pick<UserDTO, "username" | "displayName" | "fx">; live?: boolean }) {
  const fx = useFxView(user.fx), name = nameOf(user), cls = fx?.nameEffect ? NAME_CLASS[fx.nameEffect] : undefined;
  return cls ? <span className={`fx-name ${cls}${live ? " fx-live" : ""}`} data-text={name}>{name}</span> : <>{name}</>;
});

/** The shop badge someone chose to show (the "Dev" badge keeps its own component). */
export const ItemBadge = memo(function ItemBadge({ user, full = false }: { user?: Pick<UserDTO, "fx"> | null; full?: boolean }) {
  const key = useFxView(user?.fx ?? undefined)?.badge, b = key ? BADGES[key] : undefined;
  if (!b) return null;
  return (
    <span title={b.label} aria-label={b.label} className="inline-flex items-center gap-1 align-middle rounded-md px-1.5 py-[1px] text-[10px] leading-[14px] font-bold shrink-0"
      style={{ background: `${b.color}26`, color: b.color, border: `1px solid ${b.color}55` }}><b.Icon size={10} strokeWidth={2.6} />{full ? b.label : null}</span>
  );
});
