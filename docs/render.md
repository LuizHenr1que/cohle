# Hospedar o Cohle no Render (grátis)

## Como fica

```
App (Mac/Windows) ──https/wss──▶  Render  ── cohle-api (Node + chat em tempo real)
        │                                          │
        │                                          └──▶  Supabase  (banco Postgres)
        └──── voz, vídeo e tela ───────────────────▶  LiveKit Cloud
```

**O Render só atende tráfego web (HTTP/HTTPS) e não abre portas UDP**, que voz e vídeo precisam. Por isso no Render roda **só a API**. Voz/vídeo ficam no **LiveKit Cloud** e o banco no **Supabase**. Os três têm plano grátis.

## Passo a passo

### 1. Código no GitHub
O Render lê o código de um repositório GitHub. Suba este projeto (o `.gitignore` já deixa de fora senhas, `node_modules` e instaladores).

### 2. LiveKit Cloud (voz, vídeo e tela)
1. Crie uma conta em https://cloud.livekit.io (plano **Build**, grátis, sem cartão).
2. Crie um projeto. Em **Settings → Keys** anote:
   - **URL** (`wss://seu-projeto.livekit.cloud`)
   - **API Key** e **API Secret**

### 3. Banco de dados (Supabase)
1. Crie um projeto em https://supabase.com (plano grátis, região **us-east-1**).
2. **Connect → Session pooler** e copie a string (`...pooler.supabase.com:5432`). Use ela, **não** a conexão direta: a direta é só IPv6 e o Render não alcança.
3. As tabelas são criadas no deploy (`prisma migrate deploy`). Toda tabela nova precisa de `ENABLE ROW LEVEL SECURITY` na migração: o Supabase expõe o schema `public` por uma API REST, e o RLS sem policies a mantém fechada (o servidor acessa como dono e não é afetado).

> O Supabase grátis **pausa** projetos sem atividade por 7 dias: use o monitor do passo 5 em `/health/db`.

### 4. Render
1. https://dashboard.render.com → **New → Blueprint** → escolha o repositório. Ele lê o `render.yaml`.
2. Preencha as 4 variáveis que o Render pedir:
   - `DATABASE_URL` = a string do Supabase (Session pooler)
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` = os do LiveKit Cloud
3. **Apply**. No primeiro deploy as tabelas do banco são criadas sozinhas.
4. Abra `https://SEU-SERVICO.onrender.com/health`. Deve responder `{"ok":true,"name":"cohle"}`.

### 5. Evitar que "durma"
O serviço grátis **dorme após 15 minutos sem acesso** e leva cerca de 1 minuto para acordar. As 750 horas grátis do mês cobrem um serviço ligado o mês inteiro. Para ele não dormir, crie um monitor grátis no UptimeRobot (https://uptimerobot.com) chamando `https://SEU-SERVICO.onrender.com/health/db` a cada 5 minutos (também mantém o Supabase ativo).

### 6. Apontar o app para ele
- **Teste (build de desenvolvimento):** no login aparece **Servidor › alterar**; cole `https://SEU-SERVICO.onrender.com`. Os instaladores de produção ficam travados no servidor definido em `VITE_API_URL` e não mostram esse campo.
- **Instalador já apontado para ele** (sem botões de teste):
  ```sh
  VITE_API_URL=https://SEU-SERVICO.onrender.com pnpm --filter @cohle/desktop dist:mac:prod
  VITE_API_URL=https://SEU-SERVICO.onrender.com pnpm --filter @cohle/desktop dist:win:prod
  ```
  Os arquivos saem em `apps/desktop/release/`.

## E-mail (opcional, recomendado)
Para confirmação de e-mail e "esqueci a senha", configure o Resend: veja `docs/email.md` (variável `RESEND_API_KEY`).

## Limites do plano grátis (leia antes de convidar muita gente)
| Peça | Limite |
| --- | --- |
| LiveKit Cloud (Build) | 5.000 minutos de chamada por mês, 50 GB de banda, 100 conexões. Confirme em livekit.io/pricing. |
| Render (grátis) | Dorme sem acesso; 750 h/mês; 512 MB de memória. |
| Supabase (grátis) | 500 MB de banco; pausa após 7 dias sem atividade (o monitor evita). |

Se a chamada travar ao crescer, o primeiro gargalo é o LiveKit Cloud; a alternativa grátis com limites bem mais altos é rodar o próprio LiveKit numa máquina da Oracle (`infra/prod/`).

## Antes de abrir para estranhos
Já está pronto: senhas fortes obrigatórias em produção, bloqueio de tentativas de login e contas de teste desligadas.
Ainda **não existe**: recuperação de senha, confirmação de e-mail e backup automático do banco (o Supabase grátis não faz backup: exporte de vez em quando).
