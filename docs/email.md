# E-mail do Cohle (Resend)

O Cohle envia três e-mails: **código de confirmação** (cadastro), **código para redefinir a senha** e **boas-vindas**. Os modelos ficam em `apps/server/src/email.ts` (HTML próprio do Cohle, sem nada da Vértice).

## Separação da Vértice
A conta do Resend é compartilhada com outros produtos da empresa. Para não misturar:
- **Domínio de envio só do Cohle:** `mail.cohle.verticeapp.com.br` (região São Paulo, sem rastreamento de abertura/clique). Reputação e DNS próprios; o `verticeapp.com.br` e o `rentnow.app.br` não são usados.
- **Remetente:** `Cohle <nao-responda@mail.cohle.verticeapp.com.br>` (variável `EMAIL_FROM`).
- **Chave de API própria**, com permissão só de envio e restrita a esse domínio. Não reutilize a chave de outro produto.
- Todo e-mail sai com as etiquetas `app=cohle` e `type=verify|reset|welcome`, para filtrar no painel do Resend.

## DNS (registro.br → Editar zona de `verticeapp.com.br`)
| Tipo | Nome | Valor |
| --- | --- | --- |
| TXT | `resend._domainkey.mail.cohle` | (a chave DKIM mostrada no Resend em *Domains → mail.cohle.verticeapp.com.br*) |
| MX | `send.mail.cohle` (prioridade 10) | `feedback-smtp.sa-east-1.amazonses.com` |
| TXT | `send.mail.cohle` | `v=spf1 include:amazonses.com ~all` |
| CNAME | `rsend.mail.cohle` | `send.forge.rmta.net` |

Depois, no Resend, clique em **Verify** no domínio.

## Variáveis no servidor (Render → cohle-api → Environment)
- `RESEND_API_KEY` = a chave do Cohle (obrigatória para ligar o e-mail).
- `EMAIL_FROM` (opcional) e `APP_URL` (opcional, padrão `https://cohle.verticeapp.com.br`, de onde vêm as imagens dos e-mails).

Sem `RESEND_API_KEY` o servidor funciona como antes: contas novas entram sem confirmação e "Esqueci minha senha" fica indisponível. Em desenvolvimento use `EMAIL_DEV=1` no `apps/server/.env`: os códigos aparecem no log do servidor.

## Regras de segurança
Código de 6 dígitos, só o hash é guardado, vale 15 minutos, 5 tentativas erradas bloqueiam, 45 s entre envios, e "esqueci a senha" responde igual exista ou não a conta. Contas criadas antes desta função continuam entrando (foram marcadas como verificadas).
