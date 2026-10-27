// The "card" shown while Cohle updates or opens right after an update: the brand artwork on top,
// progress and friendly messages below.
const { BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const ART = fs.readFileSync(path.join(__dirname, "splash-art.svg"), "utf8");
const CHECK = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

const MESSAGES = [
  "Bem-vindo ao Cohle.", "Afinando os microfones...", "Polindo os pixels do compartilhamento de tela.", "Seu servidor sentiu a sua falta.",
  "Avisando a galera que você já vem.", "Deixando tudo leve para o seu jogo respirar.", "Conferindo se alguém mutou o amigo de novo.",
  "Quase lá. Respire fundo uma vez.", "A sala de voz já está esquentando.",
];

const HTML = `<!doctype html><meta charset="utf-8"><title>splash</title><style>
  *{box-sizing:border-box}html,body{margin:0;height:100%;background:transparent;overflow:hidden;font:500 13px -apple-system,"Segoe UI",Inter,system-ui,sans-serif;color:#f5eaee;-webkit-user-select:none;user-select:none}
  .wrap{height:100%;padding:20px}
  .card{height:100%;border-radius:28px;position:relative;overflow:hidden;display:flex;flex-direction:column;-webkit-app-region:drag;
    background:linear-gradient(135deg,#1e0d14,#12080c 55%,#0a0507);border:1px solid rgba(255,255,255,.10);
    box-shadow:0 22px 70px rgba(0,0,0,.6),0 0 0 1px rgba(255,59,92,.10),inset 0 1px 0 rgba(255,255,255,.06);animation:in .4s cubic-bezier(.2,.8,.2,1) both}
  @keyframes in{from{opacity:0;transform:translateY(10px) scale(.97)}}
  .art{flex:none;height:300px;position:relative}
  .art svg{position:absolute;inset:0;width:100%;height:100%}
  .art::after{content:"";position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(180deg,transparent,#12080c)}
  .ok{position:absolute;left:50%;top:50%;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;display:none;place-items:center;z-index:2;background:linear-gradient(135deg,#ff3b5c,#ff9a62);box-shadow:0 0 44px rgba(255,59,92,.7);animation:pop .45s cubic-bezier(.2,1.4,.4,1) both}
  .ok svg{position:static;width:26px;height:26px}
  @keyframes pop{from{transform:scale(.3);opacity:0}}
  .done .ok{display:grid}
  .info{flex:1;padding:6px 34px 20px;display:flex;flex-direction:column;justify-content:center;gap:10px;position:relative;z-index:1}
  h1{margin:0;font-size:20px;font-weight:750;letter-spacing:-.015em}
  .bar{height:8px;border-radius:9px;background:rgba(255,255,255,.10);overflow:hidden}
  .fill{height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#ff3b5c,#ff9a62);transition:width .25s ease;box-shadow:0 0 14px rgba(255,90,100,.6)}
  .bar.ind .fill{width:34%;animation:slide 1.3s ease-in-out infinite}
  @keyframes slide{from{margin-left:-36%}to{margin-left:104%}}
  .row{display:flex;justify-content:space-between;gap:16px;align-items:baseline;min-height:18px}
  .msg{color:#ffd9de;font-size:13px;transition:opacity .35s,transform .35s}.msg.out{opacity:0;transform:translateY(4px)}
  .stat{color:#b9a5ad;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
  .foot{position:absolute;right:30px;top:14px;font-size:11px;color:rgba(255,240,243,.55);letter-spacing:.06em;z-index:3;background:rgba(18,8,12,.5);padding:4px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.08)}
  .hide{visibility:hidden}
  /* artwork: gentle motion, transform/opacity only */
  .orbits .o1{transform-box:view-box;transform-origin:800px 320px;animation:rot 40s linear infinite}
  .orbits .o3{transform-box:view-box;transform-origin:800px 320px;animation:rot 70s linear infinite reverse}
  @keyframes rot{to{transform:rotate(360deg)}}
  .fl{animation:fl 4.2s ease-in-out infinite}.fl.b{animation-delay:-.8s}.fl.c{animation-delay:-1.6s}.fl.d{animation-delay:-2.4s}.fl.e{animation-delay:-3.1s}.fl.f{animation-delay:-3.7s}
  @keyframes fl{50%{transform:translateY(-9px)}}
  .pulse{animation:pl 1.8s ease-in-out infinite}@keyframes pl{50%{opacity:.35}}
  .bars rect{transform-box:fill-box;transform-origin:50% 100%;animation:bar 1.4s ease-in-out infinite}
  .bars rect:nth-child(2n){animation-delay:-.45s}.bars rect:nth-child(3n){animation-delay:-.9s}.bars rect:nth-child(5n){animation-delay:-.2s}
  @keyframes bar{50%{transform:scaleY(.55)}}
</style><div class="wrap"><div class="card" id="c">
  <div class="art">${ART}<div class="ok">${CHECK}</div></div>
  <div class="foot" id="v"></div>
  <div class="info">
    <h1 id="t">Cohle</h1>
    <div class="bar ind" id="b"><div class="fill" id="f"></div></div>
    <div class="row"><div class="msg" id="m"></div><div class="stat" id="s"></div></div>
  </div>
</div></div>
<script>
const MSGS=${JSON.stringify(MESSAGES)};let mi=0,timer=null;
const $=(i)=>document.getElementById(i);
function rotate(on){clearInterval(timer);const m=$("m");if(!on){m.textContent="";return}
  const order=MSGS.slice(1).sort(()=>Math.random()-.5);order.unshift(MSGS[0]);mi=0;m.textContent=order[0];
  timer=setInterval(()=>{m.classList.add("out");setTimeout(()=>{mi=(mi+1)%order.length;m.textContent=order[mi];m.classList.remove("out")},350)},2800)}
window.ui=(o)=>{if(o.title!=null)$("t").textContent=o.title;if(o.stat!=null)$("s").textContent=o.stat;if(o.foot!=null)$("v").textContent=o.foot;
  const b=$("b");if(o.pct==null){b.classList.add("ind");$("f").style.width=""}else{b.classList.remove("ind");$("f").style.width=Math.max(3,o.pct)+"%"}
  b.classList.toggle("hide",!!o.done);$("c").classList.toggle("done",!!o.done);
  if(o.msg!==undefined){ if(o.msg===true&&!timer)rotate(true); else if(typeof o.msg==="string"){clearInterval(timer);timer=null;$("m").textContent=o.msg} }}
</script>`;

/** Opens the card (hidden until it painted) and returns a handle to update and close it. */
function open(ui = {}) {
  const w = new BrowserWindow({
    width: 780, height: 500, frame: false, transparent: true, resizable: false, movable: true, center: true, show: false, hasShadow: false,
    backgroundColor: "#00000000", alwaysOnTop: true, skipTaskbar: true, fullscreenable: false,
    webPreferences: { sandbox: true, contextIsolation: true, spellcheck: false },
  });
  const opened = Date.now();
  let ready = false, pending = ui;
  const push = (o) => { pending = { ...pending, ...o }; if (ready && !w.isDestroyed()) w.webContents.executeJavaScript(`ui(${JSON.stringify(pending)})`).catch(() => {}); };
  w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(HTML));
  w.webContents.once("did-finish-load", () => { ready = true; push({}); w.show(); if (process.env.COHLE_TEST) console.log(`[splash] cartão ABERTO`); });
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
