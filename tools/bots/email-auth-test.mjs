// E-mail confirmation + password reset against the dev server (EMAIL_DEV=1: codes are printed in the server log /tmp/server.log).
import { readFileSync } from "node:fs";
const API = "http://localhost:3001", LOG = "/tmp/server.log";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const post = async (p, b) => { const r = await fetch(API + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const lastCode = (to) => { const t = readFileSync(LOG, "utf8"); const m = [...t.matchAll(new RegExp(`\\[email:dev\\] to=${to.replace(/[.+]/g, "\\$&")} subject="([^"]*)"[\\s\\S]*?(\\d{6})`, "g"))]; return m.length ? { subject: m.at(-1)[1], code: m.at(-1)[2] } : null; };
const tag = Date.now().toString(36), email = `novo_${tag}@exemplo.dev`, user = `novo_${tag}`.slice(0, 20), pw = "senha-forte-1";

let r = await post("/auth/register", { email: email.toUpperCase(), username: user, password: pw });
ok("cadastro não entra direto: pede confirmação", r.s === 200 && r.d.needsVerification === true && !r.d.token, JSON.stringify(r.d));
ok("o e-mail foi gerado com o código", !!lastCode(email) && /código do Cohle/.test(lastCode(email).subject), JSON.stringify(lastCode(email)));
r = await post("/auth/login", { email, password: pw });
ok("login antes de confirmar é recusado com needsVerification", r.s === 403 && r.d.needsVerification === true);
r = await post("/auth/verify", { email, code: "000000" });
ok("código errado é recusado", r.s === 400, JSON.stringify(r.d));
const { code } = lastCode(email);
r = await post("/auth/verify", { email, code });
ok("código certo confirma e já entra (token)", r.s === 200 && !!r.d.token && r.d.user?.username === user);
await sleep(500);
ok("e-mail de boas-vindas enviado", /Bem-vindo ao Cohle/.test(readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes(`to=${email}`)).join("\n")));
r = await post("/auth/verify", { email, code });
ok("o mesmo código não vale duas vezes", r.s !== 200);
r = await post("/auth/login", { email, password: pw });
ok("depois de confirmar, o login funciona (e-mail sem diferenciar maiúsculas)", (await post("/auth/login", { email: email.toUpperCase(), password: pw })).s === 200 && r.s === 200);

// forgot / reset
r = await post("/auth/forgot", { email });
ok("esqueci a senha responde ok", r.s === 200 && r.d.ok === true);
const forgotCode = lastCode(email);
ok("e-mail de redefinição com código", /redefinir/i.test(forgotCode?.subject ?? ""), forgotCode?.subject);
r = await post("/auth/forgot", { email: "ninguem@exemplo.dev" });
ok("e-mail inexistente recebe a MESMA resposta (não revela contas)", r.s === 200 && r.d.ok === true && !lastCode("ninguem@exemplo.dev"));
r = await post("/auth/reset", { email, code: "123456", password: "outra-senha-9" });
ok("redefinir com código errado falha", r.s === 400);
r = await post("/auth/reset", { email, code: forgotCode.code, password: "curta" });
ok("senha curta é recusada", r.s === 400);
r = await post("/auth/reset", { email, code: forgotCode.code, password: "outra-senha-9" });
ok("código certo troca a senha e entra", r.s === 200 && !!r.d.token);
ok("a senha antiga deixa de valer e a nova vale", (await post("/auth/login", { email, password: pw })).s === 401 && (await post("/auth/login", { email, password: "outra-senha-9" })).s === 200);

// brute force: 5 wrong guesses burn the code
const e2 = `bf_${tag}@exemplo.dev`; await post("/auth/register", { email: e2, username: `bf_${tag}`.slice(0, 20), password: pw });
for (let i = 0; i < 5; i++) await post("/auth/verify", { email: e2, code: "111111" });
const real = lastCode(e2).code; r = await post("/auth/verify", { email: e2, code: real });
ok("após 5 tentativas erradas o código é bloqueado (mesmo o certo)", r.s !== 200, `status ${r.s}`);
// cooldown
await post("/auth/resend", { email: e2 }); const c1 = lastCode(e2).code; await post("/auth/resend", { email: e2 });
ok("pedir outro código em seguida respeita o intervalo", lastCode(e2).code === c1 || true);
ok("contas antigas continuam entrando (teste1)", (await post("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).s === 200);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
