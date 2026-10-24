export type MediaKind = "camera" | "microphone" | "screen";

const ONE: Record<MediaKind, string> = { camera: "a câmera", microphone: "o microfone", screen: "a captura de tela" };

/** Browser/LiveKit media errors in clear Portuguese, with what the person can do about it. */
export function friendlyMediaError(e: unknown, kind: MediaKind): string {
  const err = e as { name?: string; message?: string } | undefined;
  const text = `${err?.name ?? ""} ${err?.message ?? ""}`;
  const mac = window.cohle?.platform === "darwin";
  const where = mac
    ? `Ajustes do Sistema > Privacidade e Segurança > ${kind === "camera" ? "Câmera" : kind === "microphone" ? "Microfone" : "Gravação de Tela"}`
    : `Configurações do Windows > Privacidade e segurança > ${kind === "camera" ? "Câmera" : "Microfone"}`;
  if (/NotFound|DevicesNotFound|Requested device not found|no .* (device|camera)/i.test(text))
    return kind === "camera" ? "Nenhuma câmera foi encontrada. Conecte uma webcam e tente novamente."
      : kind === "microphone" ? "Nenhum microfone foi encontrado. Conecte um microfone e tente novamente."
      : "Não encontrei o que compartilhar. Tente escolher outra tela ou janela.";
  if (/NotAllowed|PermissionDenied|Permission denied|denied/i.test(text))
    return `O Cohle não tem permissão para usar ${ONE[kind]}. Libere o acesso em ${where} e tente novamente.`;
  if (/NotReadable|TrackStart|Could not start|in use|Device busy/i.test(text))
    return `Não foi possível acessar ${ONE[kind]}: ela pode estar em uso por outro aplicativo. Feche-o e tente novamente.`;
  if (/Overconstrained|Constraint/i.test(text)) return `${kind === "camera" ? "A câmera selecionada" : "O dispositivo selecionado"} não é compatível. Escolha outro e tente novamente.`;
  if (/AbortError|Abort/i.test(text)) return `O acesso a ${ONE[kind]} foi interrompido. Tente novamente.`;
  if (/Security/i.test(text)) return `O acesso a ${ONE[kind]} foi bloqueado por segurança. Reinicie o Cohle e tente novamente.`;
  return err?.message && /[ãçéíóúâêô]| o | a | não /i.test(err.message) ? err.message : `Não foi possível usar ${ONE[kind]}. Tente novamente.`;
}
