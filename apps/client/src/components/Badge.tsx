import { Code2 } from "lucide-react";
import type { UserDTO } from "@cohle/shared";

/** "Desenvolvedor" badge: shown next to the name of the team's own accounts (granted by the server). */
export function DevBadge({ user, full }: { user?: Pick<UserDTO, "badge"> | null; full?: boolean }) {
  if (user?.badge !== "DEV") return null;
  return (
    <span title="Desenvolvedor do Cohle" aria-label="Desenvolvedor do Cohle"
      className="inline-flex items-center gap-1 align-middle rounded-md px-1.5 py-[1px] text-[10px] leading-[14px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-[#ff3b5c] to-[#ff9a62] shadow-[0_0_10px_rgba(255,59,92,0.45)] shrink-0 ring-1 ring-white/25">
      <Code2 size={10} strokeWidth={3} />{full ? "Desenvolvedor" : "Dev"}
    </span>
  );
}
