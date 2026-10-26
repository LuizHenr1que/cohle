/** Where the same Cohle lives outside this window. Web and desktop link to each other so people can pick (or switch) any time. */
export const SITE = "https://cohle.verticeapp.com.br";
export const WEB_URL = `${SITE}/app/`;
export const DOWNLOAD_URL = `${SITE}/#baixar`;
export const isDesktop = () => !!window.cohle;

/** Desktop: hand the address to the system browser (the Electron main process allows only this site). Web: a normal new tab. */
export function openLink(url: string) {
  if (window.cohle?.openExternal) void window.cohle.openExternal(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
