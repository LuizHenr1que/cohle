import { MAX_FILE_MB, MAX_FILES, type AttachmentDTO, type ReactionDTO, type ReactionKey } from "@cohle/shared";
import { assetUrl } from "../api";

export const fileHref = (a: AttachmentDTO) => assetUrl(a.url)!;
export const thumbHref = (a: AttachmentDTO) => assetUrl(a.thumbUrl ?? a.url)!;

export const humanSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Quick checks before uploading, so people learn about a problem at once and not after a long upload. */
export function precheck(file: File, already: number): string | null {
  if (already >= MAX_FILES) return `No máximo ${MAX_FILES} arquivos por mensagem.`;
  if (file.size === 0) return "Esse arquivo está vazio.";
  if (file.size > MAX_FILE_MB * 1048576) return `${file.name}: passa do limite de ${MAX_FILE_MB} MB.`;
  return null;
}

/** Big photos are shrunk in the browser before they travel (saves the person's upload and the server's work); the server still re-encodes everything.
 *  Animated GIFs and small images are left alone. Any failure just sends the original. */
export async function prepareImage(file: File): Promise<{ blob: Blob; name: string }> {
  const same = { blob: file as Blob, name: file.name };
  try {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size < 1.5 * 1048576) return same;
    const bmp = await createImageBitmap(file);
    const edge = 1920, k = Math.min(1, edge / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 4 * 1048576) { bmp.close(); return same; }
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h); bmp.close();
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < file.size ? { blob, name: file.name.replace(/\.[^.]+$/, "") + ".webp" } : same;
  } catch { return same; }
}

/** Reactions with `userId` toggled locally (the server's answer replaces it a moment later). */
export const toggled = (list: ReactionDTO[], key: ReactionKey, userId: string): ReactionDTO[] => {
  const has = list.find((r) => r.key === key);
  if (!has) return [...list, { key, userIds: [userId] }];
  const ids = has.userIds.includes(userId) ? has.userIds.filter((x) => x !== userId) : [...has.userIds, userId];
  return ids.length ? list.map((r) => (r.key === key ? { ...r, userIds: ids } : r)) : list.filter((r) => r.key !== key);
};

/** Short text for a message in lists (sidebar): the text, or what was attached. */
export const previewOf = (m: { content: string; attachments?: AttachmentDTO[] }) =>
  m.content.trim() ? m.content : m.attachments?.length ? (m.attachments[0].kind === "image" ? "Imagem" : `Arquivo: ${m.attachments[0].name}`) : "";
