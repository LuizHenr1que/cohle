// The small "card" shown while Cohle updates or opens right after an update.
const { BrowserWindow } = require("electron");

const LOGO = `<svg viewBox="216 216 592 592" width="64" height="64" fill="none"><defs>
<linearGradient id="r" x1="250" y1="260" x2="780" y2="780" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff3b5c"/><stop offset="1" stop-color="#ff9a62"/></linearGradient>
<radialGradient id="o" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff1f3"/><stop offset=".35" stop-color="#ff7a8f"/><stop offset="1" stop-color="#ff3b5c"/></radialGradient></defs>
<path d="M672.9 377A210 210 0 1 0 672.9 647" stroke="url(#r)" stroke-width="92" stroke-linecap="round"/><circle cx="684" cy="512" r="56" fill="url(#o)"/></svg>`;
const CHECK = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

const HTML = `<!doctype html><meta charset="utf-8"><title>splash</title><style>
  *{box-sizing:border-box}html,body{margin:0;height:100%;background:transparent;overflow:hidden;font:500 13px -apple-system,"Segoe UI",Inter,system-ui,sans-serif;color:#f5eaee;-webkit-user-select:none;user-select:none}
  .wrap{height:100%;padding:18px}
  .card{height:100%;border-radius:26px;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px 28px;-webkit-app-region:drag;
    background:radial-gradient(120% 90% at 50% -10%,rgba(255,59,92,.30),transparent 62%),linear-gradient(180deg,#1d0d14,#12080c);
    border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,59,92,.10),inset 0 1px 0 rgba(255,255,255,.06);animation:in .35s cubic-bezier(.2,.8,.2,1) both}
  @keyframes in{from{opacity:0;transform:translateY(8px) scale(.97)}}
  .logo{width:72px;height:72px;display:grid;place-items:center;position:relative}
  .logo::before{content:"";position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,59,92,.45),transparent);animation:glow 2.2s ease-in-out infinite}
  .logo svg{position:relative;animation:spin 3.2s linear infinite;transform-origin:50% 50%}
  @keyframes spin{to{transform:rotate(360deg)}}@keyframes glow{50%{opacity:.45;transform:scale(1.15)}}
  .ok{width:64px;height:64px;border-radius:50%;display:none;place-items:center;background:linear-gradient(135deg,#ff3b5c,#ff9a62);box-shadow:0 0 34px rgba(255,59,92,.55);animation:pop .4s cubic-bezier(.2,1.4,.4,1) both}
  @keyframes pop{from{transform:scale(.4);opacity:0}}
  .done .logo{display:none}.done .ok{display:grid}
  h1{margin:2px 0 0;font-size:17px;font-weight:700;letter-spacing:-.01em;text-align:center}
  .sub{color:#b9a5ad;font-size:12.5px;text-align:center;min-height:16px}
  .bar{width:100%;max-width:260px;height:7px;border-radius:9px;background:rgba(255,255,255,.10);overflow:hidden;position:relative}
  .fill{height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#ff3b5c,#ff9a62);transition:width .25s ease;position:relative}
  .bar.ind .fill{width:38%;animation:slide 1.3s ease-in-out infinite}
  @keyframes slide{from{margin-left:-40%}to{margin-left:105%}}
  .foot{position:absolute;bottom:12px;font-size:11px;color:rgba(185,165,173,.7);letter-spacing:.04em}
  .hide{visibility:hidden}
</style><div class="wrap"><div class="card" id="c">
  <div class="logo">${LOGO}</div><div class="ok">${CHECK}</div>
  <h1 id="t">Cohle</h1>
  <div class="bar ind" id="b"><div class="fill" id="f"></div></div>
  <div class="sub" id="s"></div>
  <div class="foot" id="v"></div>
</div></div>
<script>window.ui=(o)=>{const $=(i)=>document.getElementById(i);if(o.title!=null)$("t").textContent=o.title;if(o.sub!=null)$("s").textContent=o.sub;if(o.foot!=null)$("v").textContent=o.foot;
const b=$("b");if(o.pct==null){b.classList.add("ind");$("f").style.width=""}else{b.classList.remove("ind");$("f").style.width=Math.max(3,o.pct)+"%"}
b.classList.toggle("hide",!!o.done);$("c").classList.toggle("done",!!o.done)}</script>`;

/** Opens the card (hidden until it painted) and returns a handle to update and close it. */
function open(ui = {}) {
  const w = new BrowserWindow({
    width: 400, height: 262, frame: false, transparent: true, resizable: false, movable: true, center: true, show: false, hasShadow: false,
    backgroundColor: "#00000000", alwaysOnTop: true, skipTaskbar: true, fullscreenable: false,
    webPreferences: { sandbox: true, contextIsolation: true, spellcheck: false },
  });
  const opened = Date.now();
  let ready = false, pending = ui;
  const push = (o) => { pending = { ...pending, ...o }; if (ready && !w.isDestroyed()) w.webContents.executeJavaScript(`ui(${JSON.stringify(pending)})`).catch(() => {}); };
  w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(HTML));
  w.webContents.once("did-finish-load", () => { ready = true; push({}); w.show(); });
  return {
    window: w,
    set: push,
    /** closes after the card was visible for at least `minMs` (no flash) */
    close: (minMs = 0) => new Promise((res) => {
      const wait = Math.max(0, minMs - (Date.now() - opened));
      setTimeout(() => { if (!w.isDestroyed()) w.close(); res(); }, wait);
    }),
  };
}

module.exports = { open };
