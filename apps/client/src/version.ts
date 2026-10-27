// Shown on the login screen so people always know which build they are running.
// On every release: bump `n` (it matches the last number of the app version, 0.0.N) and rewrite `note` (same sentence as the GitHub release title).
export const BUILD = { n: 12, note: "Boas-vindas ao entrar (mesmo com servidor) e abertura sem sobreposição depois de atualizar" };
export const BUILD_LABEL = `Versão ${BUILD.n}`;
