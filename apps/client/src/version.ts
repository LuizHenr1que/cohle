// Shown on the login screen so people always know which build they are running.
// On every release: bump `n` (it matches the last number of the app version, 0.0.N) and rewrite `note` (same sentence as the GitHub release title).
export const BUILD = { n: 18, note: "Aviso quando você ganha um presente: notificação na tela, selo na Loja e e-mail" };
export const BUILD_LABEL = `Versão ${BUILD.n}`;
