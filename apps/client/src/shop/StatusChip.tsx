// Animated status: a small chip beside the name (profile card, lists). Static everywhere; it moves only on hover or in the open profile (`live`), never by itself in a list.
import { memo } from "react";
import { Coffee, Gamepad2, Headphones, Moon, Radio, Code2, Flame, BookOpen, type LucideIcon } from "lucide-react";
import { STATUS_OF } from "./registry";
import "./status.css";

export type StatusKind = "playing" | "busy" | "music" | "sleep" | "code" | "live" | "afk" | "study";
export const STATUS_INFO: Record<StatusKind, { label: string; Icon: LucideIcon; color: string }> = {
  playing: { label: "Jogando", Icon: Gamepad2, color: "#b57bff" },
  busy: { label: "Ocupado", Icon: Flame, color: "#ff5c5c" },
  music: { label: "Ouvindo música", Icon: Headphones, color: "#3ddc84" },
  sleep: { label: "Dormindo", Icon: Moon, color: "#8fb8ff" },
  code: { label: "Codando", Icon: Code2, color: "#3dff7a" },
  live: { label: "Ao vivo", Icon: Radio, color: "#ff4f6d" },
  afk: { label: "Já volto", Icon: Coffee, color: "#e0b050" },
  study: { label: "Estudando", Icon: BookOpen, color: "#19c2ff" },
};

export const StatusChip = memo(function StatusChip({ statusKey, live = false, compact = false }: { statusKey?: string; live?: boolean; compact?: boolean }) {
  const kind = statusKey ? (STATUS_OF[statusKey] as StatusKind | undefined) : undefined; if (!kind) return null;
  const { label, Icon, color } = STATUS_INFO[kind];
  return (
    <span className={`st-chip st-${kind} ${live ? "st-live" : ""}`} style={{ ["--st" as any]: color }} title={label} data-status={statusKey}>
      <span className="st-ic" aria-hidden="true">
        {kind === "music" ? <span className="st-bars"><i /><i /><i /><i /></span>
          : kind === "sleep" ? <><Icon size={12} /><span className="st-z">z</span></>
          : kind === "code" ? <><Icon size={12} /><span className="st-cursor" /></>
          : <Icon size={12} />}
      </span>
      {!compact && <span className="st-label">{label}</span>}
    </span>
  );
});
