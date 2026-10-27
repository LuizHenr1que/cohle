import { Flame, Frown, Heart, Laugh, PartyPopper, Eye, Sparkles, ThumbsUp } from "lucide-react";
import { REACTION_KEYS, REACTION_LABEL, type ReactionDTO, type ReactionKey } from "@cohle/shared";

/** Reactions are icons, never emojis: the same eight on web and desktop. */
export const REACTION_ICON: Record<ReactionKey, typeof Heart> = { like: ThumbsUp, love: Heart, laugh: Laugh, fire: Flame, wow: Sparkles, sad: Frown, party: PartyPopper, eyes: Eye };

export function ReactionChips({ reactions, selfId, onToggle }: { reactions: ReactionDTO[]; selfId: string; onToggle: (key: ReactionKey) => void }) {
  if (!reactions.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Reações">
      {reactions.map((r) => {
        const I = REACTION_ICON[r.key], mine = r.userIds.includes(selfId);
        return (
          <button key={r.key} type="button" onClick={() => onToggle(r.key)} aria-pressed={mine} aria-label={`${REACTION_LABEL[r.key]}: ${r.userIds.length}`} title={REACTION_LABEL[r.key]}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition ${mine ? "border-accent/60 bg-accent/20 text-ink" : "border-line bg-white/5 text-muted hover:text-ink hover:bg-white/10"}`}>
            <I size={13} className={mine ? "text-accent" : ""} /><span className="tabular-nums font-medium">{r.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ReactionPicker({ onPick }: { onPick: (key: ReactionKey) => void }) {
  return (
    <div role="menu" aria-label="Reagir" className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {REACTION_KEYS.map((k) => {
        const I = REACTION_ICON[k];
        return <button key={k} role="menuitem" type="button" onClick={() => onPick(k)} title={REACTION_LABEL[k]} aria-label={REACTION_LABEL[k]} className="size-9 rounded-xl grid place-items-center text-muted hover:text-ink hover:bg-white/10 transition"><I size={18} /></button>;
      })}
    </div>
  );
}
