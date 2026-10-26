// @username, login by e-mail or @user, lockout, forgot password / forgot username, friends by @user or e-mail. Dev API with EMAIL_DEV=1, log in SERVER_LOG.
import { readFileSync } from "node:fs";
const API = "http://localhost:3001", LOG = process.env.SERVER_LOG;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const t0 = Date.now(); const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})), ms: Date.now() - t0 }; };
const last = (re) => { const m = [...readFileSync(LOG, "utf8").matchAll(re)]; return m.at(-1)?.[1]; };
const run = Date.now().toString(36), pw = "senhaSegura123";
const U = (n) => `${n}${run}`.slice(0, 20);
const mk = async (name, email) => {                                    // register + confirm with the code printed in the dev log
  const r = await http("/auth/register", { email, username: name, password: pw });
  if (r.d.token) return r.d;
  await sleep(500); const code = last(/Seu código do Cohle: (\d{6})/g);
  return (await http("/auth/verify", { email, code })).d;
};
// ---- availability + rules ----
for (const [h, why] of [["ab", "short"], ["a".repeat(21), "long"], ["com espaco", "chars"], ["nome-com-hifen", "chars"], [".ponto", "edges"], ["dois..pontos", "edges"], ["123456", "letters"], ["admin", "reserved"], ["Cohle", "reserved"]]) {
  const r = await http(`/auth/username-available?u=${encodeURIComponent(h)}`); ok(`@${h}: ${why}`, r.d.available === false && r.d.reason === why, JSON.stringify(r.d));
}
ok("nome livre aparece como disponível", (await http(`/auth/username-available?u=${U("livre_")}`)).d.available === true);
ok("@ na frente e maiúsculas são ignorados", (await http("/auth/username-available?u=%40TESTE1")).d.reason === "taken");
// ---- register: lowercase, unique ignoring case, reserved refused ----
const A = U("ana_"), a = await mk("ANA_" + run.slice(0, 8).toUpperCase().slice(0, 16), `ana.${run}@cohle.dev`);
ok("o cadastro grava o @ em minúsculas", a.user?.username === ("ana_" + run.slice(0, 8)).slice(0, 20).toLowerCase(), a.user?.username);
const aHandle = a.user.username;
let r = await http("/auth/register", { email: `outra.${run}@cohle.dev`, username: aHandle.toUpperCase(), password: pw });
ok("mesmo @ com outra caixa é recusado (único)", r.s === 409);
r = await http("/auth/register", { email: `res.${run}@cohle.dev`, username: "suporte", password: pw }); ok("nome reservado é recusado", r.s === 400);
r = await http("/auth/register", { email: `x.${run}@cohle.dev`, username: "ab", password: pw }); ok("nome curto é recusado", r.s === 400);
const b = await mk(U("bia_"), `bia.${run}@cohle.dev`); const bHandle = b.user.username;
// ---- login by e-mail or @user ----
r = await http("/auth/login", { email: `ana.${run}@cohle.dev`, password: pw }); ok("entra com o e-mail", r.s === 200 && r.d.user.username === aHandle);
r = await http("/auth/login", { email: "@" + aHandle.toUpperCase(), password: pw }); ok("entra com @usuario (qualquer caixa)", r.s === 200 && r.d.user.username === aHandle);
r = await http("/auth/login", { email: aHandle, password: pw }); ok("entra com usuario sem @", r.s === 200);
// ---- same answer for wrong password and unknown account; lockout per account ----
const wrongPw = await http("/auth/login", { email: aHandle, password: "errada" }), ghost = await http("/auth/login", { email: "@nao_existe_" + run, password: "errada" });
ok("senha errada e conta inexistente respondem igual", wrongPw.s === 401 && ghost.s === 401 && wrongPw.d.error === ghost.d.error, `${wrongPw.s}/${ghost.s} ${wrongPw.d.error}`);
ok("tempo parecido (não revela se a conta existe)", Math.abs(wrongPw.ms - ghost.ms) < 400, `${wrongPw.ms} ms vs ${ghost.ms} ms`);
const victim = U("vit_"); await mk(victim, `vit.${run}@cohle.dev`);
let st = []; for (let i = 0; i < 9; i++) st.push((await http("/auth/login", { email: victim, password: "errada" + i })).s);
ok("depois de 8 erros a conta é bloqueada por um tempo", st.slice(0, 8).every((x) => x === 401) && st[8] === 429, st.join(","));
ok("mesmo com a senha certa, bloqueada continua bloqueada", (await http("/auth/login", { email: victim, password: pw })).s === 429);
ok("o bloqueio é só daquela conta", (await http("/auth/login", { email: aHandle, password: pw })).s === 200);
// ---- forgot password by e-mail or @user ----
r = await http("/auth/forgot", { email: "@" + bHandle }); ok("esqueci a senha aceita @usuario", r.s === 200 && r.d.ok);
await sleep(600); const code = last(/Seu código para escolher uma nova senha: (\d{6})/g);
ok("o código chegou ao e-mail da conta (log de desenvolvimento)", /^\d{6}$/.test(code ?? ""));
r = await http("/auth/reset", { email: "@" + bHandle, code, password: "novaSenha456" }); ok("redefine a senha pelo @usuario + código", r.s === 200 && r.d.token);
ok("a senha antiga deixa de valer e a nova vale", (await http("/auth/login", { email: bHandle, password: pw })).s === 401 && (await http("/auth/login", { email: `bia.${run}@cohle.dev`, password: "novaSenha456" })).s === 200);
r = await http("/auth/forgot", { email: "@fantasma_" + run }); ok("conta inexistente: mesma resposta (não revela)", r.s === 200 && r.d.ok);
// ---- forgot username ----
r = await http("/auth/forgot-username", { email: `ana.${run}@cohle.dev` }); await sleep(600);
ok("esqueci o usuário envia o @ por e-mail", r.s === 200 && last(/Seu usuário no Cohle: @(\S+)/g) === aHandle, String(last(/Seu usuário no Cohle: @(\S+)/g)));
r = await http("/auth/forgot-username", { email: `ninguem.${run}@cohle.dev` }); ok("e-mail sem conta: mesma resposta", r.s === 200 && r.d.ok);
// ---- change @ in the profile ----
const novo = U("ana2_"); r = await http("/me", { username: novo.toUpperCase() }, a.token, "PATCH"); ok("trocar o @ grava em minúsculas", r.s === 200 && r.d.username === novo, r.d.username ?? r.d.error);
r = await http("/me", { username: bHandle }, a.token, "PATCH"); ok("trocar para um @ que já existe é recusado", r.s === 409);
r = await http("/me", { username: "admin" }, a.token, "PATCH"); ok("trocar para nome reservado é recusado", r.s === 400);
// ---- friends: by @user, by e-mail (generic), privacy ----
const ana = (await http("/auth/login", { email: novo, password: pw })).d, bia = (await http("/auth/login", { email: `bia.${run}@cohle.dev`, password: "novaSenha456" })).d;
r = await http("/friends/request", { handle: "@" + bia.user.username.toUpperCase() }, ana.token); ok("pedido por @usuario", r.s === 200 && r.d.status === "sent" && r.d.user.username === bia.user.username);
r = await http("/friends/request", { handle: "@" + bia.user.username }, ana.token); ok("pedir de novo avisa", r.s === 409);
r = await http("/friends/request", { handle: "@nao_existe_" + run }, ana.token); ok("@ inexistente: não encontrado", r.s === 404);
const f = (await http("/friends", null, bia.token)).d; ok("a outra pessoa vê o pedido recebido", f.incoming.some((x) => x.user.username === ana.user.username));
await http(`/friends/${f.incoming[0].id}/accept`, {}, bia.token);
const eve = await mk(U("eve_"), `eve.${run}@cohle.dev`);
r = await http("/friends/request", { handle: `EVE.${run}@cohle.dev` }, ana.token); ok("pedido por e-mail responde 'enviado'", r.s === 200 && r.d.status === "sent" && r.d.user === null);
ok("e o pedido chegou de verdade", (await http("/friends", null, eve.token)).d.incoming.some((x) => x.user.username === ana.user.username));
r = await http("/friends/request", { handle: `fantasma.${run}@cohle.dev` }, ana.token); ok("e-mail sem conta: resposta idêntica (não revela)", r.s === 200 && r.d.status === "sent" && r.d.user === null);
r = await http("/friends/request", { handle: `bia.${run}@cohle.dev` }, ana.token); ok("e-mail de quem já é amigo: resposta idêntica", r.s === 200 && r.d.status === "sent" && r.d.user === null);
await http("/me/privacy", { findByEmail: false }, bia.token);
const zed = await mk(U("zed_"), `zed.${run}@cohle.dev`); await http("/me/privacy", { findByEmail: false }, zed.token);
r = await http("/friends/request", { handle: `zed.${run}@cohle.dev` }, ana.token); ok("quem desligou 'achar por e-mail': mesma resposta", r.s === 200 && r.d.status === "sent");
ok("…e nenhum pedido foi criado", (await http("/friends", null, zed.token)).d.incoming.length === 0);
ok("por @usuario continua achando quem desligou o e-mail", (await http("/friends/request", { handle: "@" + zed.user.username }, ana.token)).s === 200);
ok("a conta mostra a opção de privacidade", (await http("/me/account", null, zed.token)).d.findByEmail === false);
ok("formato antigo '@nome #código' ainda funciona", (await http("/friends/request", { handle: `@${eve.user.username} #xx99` }, bia.token)).s === 200);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
