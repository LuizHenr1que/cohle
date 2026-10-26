// Uploads: what may come in, what comes out, and how links to files are signed.
//
// The rules, in short:
//  - never trust the name or the declared type: the first bytes decide what a file really is;
//  - images are decoded and re-encoded to WebP by the server (so metadata, hidden payloads and polyglot tricks do not survive), with a hard
//    pixel budget against decompression bombs, and a small thumbnail so chats stay light;
//  - everything else is kept as it came, only from an allow-list of document / archive / media types, never executables or scripts,
//    and is only ever served as a download (never rendered by the browser);
//  - links are signed: unguessable ids + an HMAC, so a file is reachable only by someone who was shown the message.
import sharp from "sharp";
import { createHmac, timingSafeEqual } from "node:crypto";

sharp.cache(false);          // a small server: no decoded-image cache,
sharp.concurrency(1);        // one thread per image,
const MAX_PARALLEL = 2;      // and at most two images being processed at once

export const MAX_UPLOAD = 10 * 1024 * 1024;       // bytes per file (MAX_FILE_MB in @cohle/shared)
const MAX_PIXELS = 4096 * 4096;                   // ~16.7 MP: bigger images are refused before they are decoded into memory
const MAX_ANIM_PIXELS = 40_000_000;               // width x height x frames
const MAIN_EDGE = 1920, THUMB_EDGE = 480;

export type Processed = { kind: "image" | "file"; mime: string; name: string; data: Buffer; thumb?: Buffer; width?: number; height?: number };
export type RejectCode = "empty" | "blocked" | "type" | "image" | "heavy";
export class Reject extends Error { constructor(public code: RejectCode, msg?: string) { super(msg ?? code); } }

// ---- names ----
const HIDDEN = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
export const extOf = (n: string) => (n.includes(".") ? n.slice(n.lastIndexOf(".") + 1).toLowerCase() : "");
/** A file name that is safe to show and to put in a download header: no path, no control / direction characters, bounded. */
export function safeName(raw: string): string {
  let n = String(raw ?? "").normalize("NFC").replace(HIDDEN, "").split(/[\\/]/).pop() ?? "";
  n = n.replace(/[<>:"|?*]/g, "_").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  if (n.length > 100) { const dot = n.lastIndexOf("."); const ext = dot > 0 ? n.slice(dot, dot + 11) : ""; n = n.slice(0, 100 - ext.length) + ext; }
  return n || "arquivo";
}

// ---- what a file really is ----
type Family = "png" | "jpeg" | "gif" | "webp" | "pdf" | "zip" | "exe" | "elf" | "macho" | "script" | "unknown";
function sniff(b: Buffer): Family {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  const str = (i: number, s: string) => b.subarray(i, i + s.length).toString("latin1") === s;
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (str(0, "GIF87a") || str(0, "GIF89a")) return "gif";
  if (str(0, "RIFF") && str(8, "WEBP")) return "webp";
  if (str(0, "%PDF-")) return "pdf";
  if (at(0, 0x50, 0x4b, 0x03, 0x04) || at(0, 0x50, 0x4b, 0x05, 0x06)) return "zip";
  if (str(0, "MZ")) return "exe";
  if (at(0, 0x7f, 0x45, 0x4c, 0x46)) return "elf";
  if (at(0, 0xcf, 0xfa, 0xed, 0xfe) || at(0, 0xce, 0xfa, 0xed, 0xfe) || at(0, 0xfe, 0xed, 0xfa, 0xce) || at(0, 0xfe, 0xed, 0xfa, 0xcf) || at(0, 0xca, 0xfe, 0xba, 0xbe)) return "macho";   // also Java classes
  if (str(0, "#!")) return "script";
  return "unknown";
}

const BLOCKED_EXT = new Set(("exe dll bat cmd com scr pif msi msp jar js jse mjs cjs vbs vbe wsf wsh ps1 psm1 sh bash zsh fish app dmg pkg deb rpm apk ipa lnk reg hta cpl inf gadget " +
  "html htm xhtml svg svgz xml xsl swf php py rb pl cgi asp aspx jsp").split(" "));
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const TEXT_EXT = new Set(["txt", "csv", "md", "json", "log", "rtf"]);
const ZIP_EXT = new Set(["zip", "docx", "xlsx", "pptx", "odt", "ods", "odp"]);
const FILE_EXT: Record<string, string> = {
  pdf: "application/pdf", txt: "text/plain", csv: "text/csv", md: "text/markdown", json: "application/json", log: "text/plain", rtf: "application/rtf",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet", odp: "application/vnd.oasis.opendocument.presentation",
  zip: "application/zip", "7z": "application/x-7z-compressed", rar: "application/vnd.rar", gz: "application/gzip", tgz: "application/gzip", tar: "application/x-tar",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac", m4a: "audio/mp4", aac: "audio/aac",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo",
};

// ---- bounded parallelism for image work ----
let running = 0; const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await fn(); } finally { running--; waiting.shift()?.(); }
}

async function processImage(buf: Buffer, name: string): Promise<Processed> {
  const opts = { limitInputPixels: MAX_PIXELS, failOn: "error" as const };
  let meta: sharp.Metadata;
  try { meta = await sharp(buf, { ...opts, animated: true }).metadata(); }
  catch (e: any) { throw new Reject(/pixel limit/i.test(String(e?.message)) ? "heavy" : "image"); }          // too many pixels is "too big", not "not an image"
  const pages = meta.pages ?? 1, w = meta.width ?? 0, h = meta.pageHeight ?? meta.height ?? 0;
  if (!w || !h) throw new Reject("image");
  if (pages > 1 && (pages > 150 || w * h * pages > MAX_ANIM_PIXELS)) throw new Reject("heavy");
  try {
    return await slot(async () => {
      const main = await sharp(buf, { ...opts, animated: pages > 1 }).rotate()
        .resize({ width: MAIN_EDGE, height: MAIN_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 85, effort: 3 }).toBuffer({ resolveWithObject: true });
      const outW = main.info.width, outH = main.info.pageHeight ?? main.info.height;
      let thumb: Buffer | undefined;
      if (outW > THUMB_EDGE || outH > THUMB_EDGE || pages > 1) {      // animated: the thumbnail is a still of the first frame (light), the full file still moves
        thumb = await sharp(buf, opts).rotate().resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 72, effort: 3 }).toBuffer();
        if (thumb.length >= main.data.length) thumb = undefined;
      }
      const base = name.replace(/\.[^.]*$/, "") || "imagem";
      return { kind: "image" as const, mime: "image/webp", name: `${base}.webp`, data: main.data, thumb, width: outW, height: outH };
    });
  } catch (e: any) { if (e instanceof Reject) throw e; throw new Reject(/pixel limit/i.test(String(e?.message)) ? "heavy" : "image"); }
}

/** Validates and prepares an upload. Throws Reject with a code the apps turn into a clear message. */
export async function processUpload(buf: Buffer, rawName: string): Promise<Processed> {
  if (!buf.length) throw new Reject("empty");
  const name = safeName(rawName), ext = extOf(name), fam = sniff(buf);
  if (fam === "exe" || fam === "elf" || fam === "macho" || fam === "script" || BLOCKED_EXT.has(ext)) throw new Reject("blocked");
  const imageFam = fam === "png" || fam === "jpeg" || fam === "gif" || fam === "webp";
  if (imageFam || IMAGE_EXT.has(ext)) {
    if (!imageFam) throw new Reject("image");                      // named like a picture but is not one
    return processImage(buf, name);
  }
  const mime = FILE_EXT[ext];
  if (!mime) throw new Reject("type");
  if (ext === "pdf" && fam !== "pdf") throw new Reject("type");
  if (ZIP_EXT.has(ext) && fam !== "zip") throw new Reject("type");
  if (TEXT_EXT.has(ext) && buf.subarray(0, 4096).includes(0)) throw new Reject("type");      // a "text" file with binary in it
  return { kind: "file", mime, name, data: buf };
}

// ---- signed links ----
const secret = () => process.env.JWT_SECRET ?? "dev-secret";
export const fileSig = (id: string) => createHmac("sha256", secret()).update("file:" + id).digest("base64url").slice(0, 24);
export const sigOk = (id: string, sig: string) => { const a = Buffer.from(fileSig(id)), b = Buffer.from(String(sig)); return a.length === b.length && timingSafeEqual(a, b); };

/** Content-Disposition with a safe ASCII fallback and the real name encoded (RFC 5987). */
export const dispositionOf = (kind: "image" | "file", name: string) =>
  `${kind === "image" ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()]/g, escape)}`;
