// Transactional e-mail: sending through Resend + the three templates (confirm address, reset password, welcome).
// Modes: "resend" (RESEND_API_KEY set), "log" (EMAIL_DEV=1: codes are printed in the server log, for development), "off".
const SITE = process.env.APP_URL ?? "https://cohle.verticeapp.com.br";
// Cohle has its OWN sending domain, separate from the company's other products (own DNS, own reputation, own API key).
const FROM = process.env.EMAIL_FROM ?? "Cohle <nao-responda@mail.cohle.verticeapp.com.br>";
export const emailMode: "resend" | "log" | "off" = process.env.RESEND_API_KEY ? "resend" : process.env.EMAIL_DEV === "1" ? "log" : "off";

export type Mail = { to: string; subject: string; html: string; text: string; kind?: string };

export async function sendMail(m: Mail): Promise<void> {
  if (emailMode === "log") { console.log(`[email:dev] to=${m.to} subject="${m.subject}"\n${m.text}\n`); return; }
  if (emailMode === "off") return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, tags: [{ name: "app", value: "cohle" }, { name: "type", value: m.kind ?? "other" }] }),   // tags: filter Cohle mail in the shared Resend dashboard
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ---- layout (table based, inline styles: works in Gmail, Outlook, Apple Mail) ----
const C = { bg: "#0a0507", card: "#12080c", line: "#2c1a22", ink: "#f5eaee", mute: "#b9a5ad", accent: "#ff3b5c", warm: "#ff9a62", box: "#1b0e15" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

function layout(o: { preheader: string; title: string; body: string }): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:28px 14px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:24px;overflow:hidden">
    <tr><td style="padding:0;line-height:0;font-size:0"><img src="${SITE}/email/banner.jpg" width="600" alt="Cohle" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>
    <tr><td style="padding:34px 38px 8px;font-family:${FONT};color:${C.ink}">
      <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-.01em;color:${C.ink}">${o.title}</h1>
      ${o.body}
    </td></tr>
    <tr><td style="padding:26px 38px 30px;font-family:${FONT}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}"><tr><td style="padding-top:20px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle"><img src="${SITE}/email/logo.png" width="30" height="30" alt="" style="display:block;border:0"></td>
          <td style="vertical-align:middle;padding-left:10px;font-size:14px;font-weight:700;color:${C.ink}">Cohle</td>
        </tr></table>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:${C.mute}">Chat, voz e compartilhamento de tela num app só. Leve, bonito e feito para a galera.<br><a href="${SITE}" style="color:${C.warm};text-decoration:none">${SITE.replace(/^https?:\/\//, "")}</a></p>
      </td></tr></table>
    </td></tr>
  </table>
  <p style="margin:18px 0 0;font-family:${FONT};font-size:11px;line-height:1.6;color:#7d6a72;max-width:520px">Este é um e-mail automático, por favor não responda. Você o recebeu porque este endereço foi usado no Cohle.</p>
</td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#d8c6cd">${t}</p>`;
const small = (t: string) => `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${C.mute}">${t}</p>`;

function codeBlock(code: string, minutes: number): string {
  // ONE text node (not six boxes): selecting or double-clicking copies the whole code in a single piece
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px"><tr><td align="center" style="background:${C.box};border:1px solid #3b202b;border-radius:16px;padding:20px 8px">
    <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:38px;font-weight:800;letter-spacing:.42em;padding-left:.42em;color:${C.ink};line-height:1;white-space:nowrap">${code}</span>
  </td></tr></table>
  <p style="margin:0 0 18px;font-size:13px;color:${C.mute}">Selecione o código com um duplo clique para copiar. Ele vale por <b style="color:${C.ink}">${minutes} minutos</b> e só pode ser usado uma vez.</p>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td bgcolor="${C.accent}" style="border-radius:14px;background:${C.accent};background-image:linear-gradient(90deg,${C.accent},${C.warm})">
  <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px">${label}</a></td></tr></table>`;
}

export const CODE_MINUTES = 15;

export function verifyEmail(name: string, code: string): Mail {
  const n = esc(name);
  return {
    to: "", kind: "verify", subject: `${code} é o seu código do Cohle`,
    html: layout({
      preheader: `Seu código de confirmação: ${code}`, title: `Confirme o seu e-mail, ${n}`,
      body: p("Falta só um passo para entrar no Cohle. Digite este código no aplicativo para confirmar que este endereço é seu:") + codeBlock(code, CODE_MINUTES)
        + small("Não foi você? Pode ignorar este e-mail: nenhuma conta será ativada sem o código. Por segurança, nunca compartilhe este código com ninguém."),
    }),
    text: `Confirme o seu e-mail, ${name}\n\nSeu código do Cohle: ${code}\nEle vale por ${CODE_MINUTES} minutos e só pode ser usado uma vez.\n\nNão foi você? Ignore este e-mail. Nunca compartilhe este código.\n\n${SITE}`,
  };
}

export function resetEmail(name: string, code: string): Mail {
  const n = esc(name);
  return {
    to: "", kind: "reset", subject: `${code} é o código para redefinir sua senha`,
    html: layout({
      preheader: `Código para redefinir a senha: ${code}`, title: `Redefinir a sua senha`,
      body: p(`Olá, ${n}. Recebemos um pedido para redefinir a senha da sua conta no Cohle. Digite este código no aplicativo para escolher uma nova senha:`) + codeBlock(code, CODE_MINUTES)
        + small("Não pediu a redefinição? Ignore este e-mail: a sua senha continua a mesma. Nunca compartilhe este código com ninguém, nem com quem diga ser do Cohle."),
    }),
    text: `Redefinir a sua senha\n\nOlá, ${name}. Seu código para escolher uma nova senha: ${code}\nEle vale por ${CODE_MINUTES} minutos e só pode ser usado uma vez.\n\nNão pediu? Ignore este e-mail. Nunca compartilhe este código.\n\n${SITE}`,
  };
}

export function usernameEmail(handle: string): Mail {
  const h = esc(handle);
  return {
    to: "", kind: "username", subject: "Seu usuário no Cohle",
    html: layout({
      preheader: `Seu usuário é @${handle}`, title: "Este é o seu usuário",
      body: p("Recebemos um pedido para lembrar o usuário da conta ligada a este e-mail. Para entrar, use o usuário abaixo ou este próprio e-mail:")
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px"><tr><td align="center" style="background:${C.box};border:1px solid #3b202b;border-radius:16px;padding:20px 8px"><span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:28px;font-weight:800;color:${C.ink};line-height:1">@${h}</span></td></tr></table>`
        + button(`${SITE}/app/`, "Entrar no Cohle")
        + small("Esqueceu também a senha? Na tela de entrada, toque em “Esqueci minha senha”. Não pediu isso? Ignore este e-mail: ninguém além de você recebeu o usuário."),
    }),
    text: `Este é o seu usuário\n\nSeu usuário no Cohle: @${handle}\nPara entrar, use o usuário ou este e-mail.\n\nNão pediu? Ignore este e-mail.\n\n${SITE}/app/`,
  };
}

export function welcomeEmail(name: string): Mail {
  const n = esc(name);
  const row = (t: string, d: string) => `<tr><td style="padding:0 14px 14px 0;vertical-align:top;width:10px"><div style="width:8px;height:8px;border-radius:50%;background:${C.accent};margin-top:7px"></div></td><td style="padding:0 0 14px;font-size:14px;line-height:1.6;color:#d8c6cd"><b style="color:${C.ink}">${t}</b><br>${d}</td></tr>`;
  return {
    to: "", kind: "welcome", subject: `Bem-vindo ao Cohle, ${name}`,
    html: layout({
      preheader: "Sua conta está pronta. Chame a galera.", title: `Bem-vindo ao Cohle, ${n}`,
      body: p("Sua conta está pronta e o e-mail confirmado. A resenha agora tem endereço: crie um servidor, chame a galera e entre numa sala de voz.")
        + `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 10px">${row("Crie o seu servidor", "Canais de texto e de voz, convite por link e você como dono.")}${row("Fale e compartilhe a tela", "Voz com supressão de ruído e tela com fluidez, sem pesar no seu jogo.")}${row("Mensagens diretas", "Converse em particular, com histórico guardado.")}</table>`
        + button(SITE, "Abrir o Cohle") + small(`Ainda não tem o aplicativo? Baixe a versão para Windows ou Mac em <a href="${SITE}/#baixar" style="color:${C.warm};text-decoration:none">${SITE.replace(/^https?:\/\//, "")}</a>. Ele se atualiza sozinho.`),
    }),
    text: `Bem-vindo ao Cohle, ${name}\n\nSua conta está pronta e o e-mail confirmado. Crie um servidor, chame a galera e entre numa sala de voz.\n\nBaixe o aplicativo: ${SITE}/#baixar\n`,
  };
}
