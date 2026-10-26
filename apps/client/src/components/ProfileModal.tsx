import { useRef, useState } from "react";
import { Camera, X, Trash2, Check } from "lucide-react";
import { cleanHandle, cleanDisplayName, DISPLAY_MAX, BIO_MAX, nameOf, type UserDTO } from "@cohle/shared";
import { api } from "../api";
import { Avatar } from "./Avatar";
import { DevBadge } from "./Badge";
import { fileToSquareDataUrl } from "../lib/image";
import { useHandleCheck } from "../lib/handle";
import { BANNER_COLORS, bannerBg } from "../lib/profile";

const field = "w-full rounded-xl bg-white/5 border border-line px-4 py-3 outline-none focus:border-accent transition placeholder:text-muted";

/** Edit your own profile: photo, display name, @username, about me and cover colour, with a live preview. Same screen on web and desktop. */
export function ProfileModal({ user, onClose, onSaved, onTour }: { user: UserDTO; onClose: () => void; onSaved: (u: UserDTO) => void; onTour?: () => void }) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [banner, setBanner] = useState<string | null>(user.bannerColor ?? null);
  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl ?? null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const check = useHandleCheck(username, true, user.username);
  const preview = { username, displayName: cleanDisplayName(displayName) || undefined, avatarUrl: avatar };

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { setAvatar(await fileToSquareDataUrl(f)); setErr(""); } catch (x: any) { setErr(x.message); }
  }
  async function save() {
    if (check.state === "bad" || check.state === "checking") return setErr(check.state === "bad" ? check.msg : "Aguarde a verificação do @usuário.");
    setBusy(true); setErr("");
    try {
      const dn = cleanDisplayName(displayName), b = bio.trim();
      const u = await api.updateProfile({                                        // only what changed (the photo is big)
        ...(username !== user.username ? { username } : {}),
        ...(dn !== (user.displayName ?? "") ? { displayName: dn || null } : {}),
        ...(b !== (user.bio ?? "") ? { bio: b || null } : {}),
        ...(banner !== (user.bannerColor ?? null) ? { bannerColor: banner } : {}),
        ...(avatar !== (user.avatarUrl ?? null) ? { avatarUrl: avatar } : {}),
      });
      onSaved(u); onClose();
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-label="Editar perfil" onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[94dvh] overflow-y-auto rounded-3xl border border-line bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        {/* live preview of the card */}
        <div className="relative h-24" style={{ background: bannerBg(banner) }}>
          <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60"><X size={16} /></button>
        </div>
        <div className="px-5 sm:px-6 pb-6 -mt-10 relative z-10 space-y-5">
          <div className="flex items-end gap-3">
            <button onClick={() => file.current?.click()} className="relative group rounded-full ring-4 ring-surface" aria-label="Trocar foto">
              <Avatar user={preview} size={80} />
              <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center"><Camera size={20} /></span>
            </button>
            <div className="min-w-0 pb-1"><div className="font-bold truncate flex items-center gap-2">{nameOf(preview)}<DevBadge user={user} /></div><div className="text-xs text-muted truncate">@{username || "usuario"}</div></div>
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
          <div className="flex gap-3 text-xs -mt-2">
            <button onClick={() => file.current?.click()} className="text-accent2 hover:underline">Trocar foto</button>
            {avatar && <button onClick={() => setAvatar(null)} className="text-muted hover:text-ink inline-flex items-center gap-1"><Trash2 size={12} /> Remover</button>}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Nome de exibição (aparece no chat e nas chamadas)</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 80))} maxLength={80} placeholder={user.username} className={field} />
            <span className={`text-xs ${cleanDisplayName(displayName).length > DISPLAY_MAX ? "text-accent" : "text-muted"}`}>{cleanDisplayName(displayName).length > DISPLAY_MAX ? `Use no máximo ${DISPLAY_MAX} caracteres.` : "Opcional. Pode ter espaços e acentos; se ficar vazio, aparece o seu @usuário."}</span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">@usuário (nome único, usado para entrar e para te adicionarem)</span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted select-none">@</span>
              <input value={username} onChange={(e) => setUsername(cleanHandle(e.target.value))} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="profile-uname-help" className={`${field} pl-9`} />
            </div>
            <p id="profile-uname-help" className={`text-xs ${check.state === "ok" ? "text-emerald-300" : check.state === "bad" ? "text-accent" : "text-muted"}`}>{check.msg || "Letras minúsculas, números, _ e ponto."}</p>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Sobre mim</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} rows={3} placeholder="Conte um pouco sobre você" aria-label="Sobre mim" className={`${field} resize-none`} />
            <span className="block text-right text-[11px] text-muted">{bio.length}/{BIO_MAX}</span>
          </label>

          <div className="space-y-2">
            <span className="text-xs text-muted">Cor da capa</span>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Cor da capa">
              <button type="button" role="radio" aria-checked={banner === null} onClick={() => setBanner(null)} title="Padrão do tema" className={`h-8 rounded-full px-3 text-xs border transition ${banner === null ? "border-accent text-ink bg-accent/15" : "border-line text-muted hover:text-ink"}`}>Padrão</button>
              {BANNER_COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={banner === c} aria-label={`Cor ${c}`} onClick={() => setBanner(c)} style={{ background: c }}
                  className={`size-8 rounded-full grid place-items-center ring-offset-2 ring-offset-surface transition ${banner === c ? "ring-2 ring-white" : "hover:scale-110"}`}>{banner === c && <Check size={15} className="text-white drop-shadow" />}</button>
              ))}
              <label className="size-8 rounded-full border border-dashed border-line grid place-items-center cursor-pointer text-muted hover:text-ink text-base" title="Escolher outra cor">+
                <input type="color" value={banner ?? "#ff3b5c"} onChange={(e) => setBanner(e.target.value)} aria-label="Escolher outra cor" className="sr-only" />
              </label>
            </div>
          </div>

          {err && <p className="text-accent text-sm" role="alert">{err}</p>}
          <button onClick={save} disabled={busy} className="grad w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60">{busy ? "Salvando..." : "Salvar"}</button>
          {onTour && <button type="button" onClick={() => { onClose(); onTour(); }} className="w-full text-sm text-muted hover:text-ink">Rever o tour de boas-vindas</button>}
        </div>
      </div>
    </div>
  );
}
