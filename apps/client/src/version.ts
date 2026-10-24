// Shown on the login screen so people always know which build they are running.
// On every release: bump `n` (it matches the last number of the app version, 0.0.N) and rewrite `note` (same sentence as the GitHub release title).
export const BUILD = { n: 2, note: "Tela de atualização moderna e download direto do instalador" };
export const BUILD_LABEL = `Versão ${BUILD.n}`;
