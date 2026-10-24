# Hospedar o Cohle no Render (grátis)

## Como fica

```
App (Mac/Windows) ──https/wss──▶  Render  ── cohle-api (Node + chat em tempo real)
        │                                          │
        │                                          └──▶  Neon  (banco Postgres)
        └──── voz, vídeo e tela ───────────────────▶  LiveKit Cloud
```

**O Render só atende tráfego web (HTTP/HTTPS) e não abre portas UDP**, que voz e vídeo precisam. Por isso no Render roda **só a API**. Voz/vídeo ficam no **LiveKit Cloud** e o banco no **Neon**. Os três têm plano grátis.

## Passo a passo

### 1. Código no GitHub
O Render lê o código de um repositório GitHub. Suba este projeto (o `.gitignore` já deixa de fora senhas, `node_modules` e instaladores).

### 2. LiveKit Cloud (voz, vídeo e tela)
1. Crie uma conta em https://cloud.livekit.io (plano **Build**, grátis, sem cartão).
2. Crie um projeto. Em **Settings → Keys** anote:
   - **URL** (`wss://seu-projeto.livekit.cloud`)
   - **API Key** e **API Secret**

### 3. Banco de dados (Neon)
1. Crie uma conta em https://neon.tech e um projeto (região mais próxima de você).
2. Copie a **connection string** em modo **direto** (sem `-pooler` no endereço). Ela serve para o app e para as migrações.

> Evite o Postgres grátis do próprio Render: ele **expira em 30 dias**. O Supabase grátis também **pausa** projetos parados por uma semana.

### 4. Render
1. https://dashboard.render.com → **New → Blueprint** → escolha o repositório. Ele lê o `render.yaml`.
2. Preencha as 4 variáveis que o Render pedir:
   - `DATABASE_URL` = a string do Neon
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` = os do LiveKit Cloud
3. **Apply**. No primeiro deploy as tabelas do banco são criadas sozinhas.
4. Abra `https://SEU-SERVICO.onrender.com/health`. Deve responder `{"ok":true,"name":"cohle"}`.

### 5. Evitar que "durma"
O serviço grátis **dorme após 15 minutos sem acesso** e leva cerca de 1 minuto para acordar. As 750 horas grátis do mês cobrem um serviço ligado o mês inteiro. Para ele não dormir, crie um monitor grátis no UptimeRobot (https://uptimerobot.com) chamando `https://SEU-SERVICO.onrender.com/health` a cada 5 minutos.

### 6. Apontar o app para ele
- **Rápido:** no login do app, **Servidor › alterar** e cole `https://SEU-SERVICO.onrender.com`.
- **Instalador já apontado para ele** (sem botões de teste):
  ```sh
  VITE_API_URL=https://SEU-SERVICO.onrender.com pnpm --filter @cohle/desktop dist:mac:prod
  VITE_API_URL=https://SEU-SERVICO.onrender.com pnpm --filter @cohle/desktop dist:win:prod
  ```
  Os arquivos saem em `apps/desktop/release/`.

## Limites do plano grátis (leia antes de convidar muita gente)
| Peça | Limite |
| --- | --- |
| LiveKit Cloud (Build) | 5.000 minutos de chamada por mês, 50 GB de banda, 100 conexões. Confirme em livekit.io/pricing. |
| Render (grátis) | Dorme sem acesso; 750 h/mês; 512 MB de memória. |
| Neon (grátis) | Armazenamento e horas de CPU limitados; ótimo para começar. |

Se a chamada travar ao crescer, o primeiro gargalo é o LiveKit Cloud; a alternativa grátis com limites bem mais altos é rodar o próprio LiveKit numa máquina da Oracle (`infra/prod/`).

## Antes de abrir para estranhos
Já está pronto: senhas fortes obrigatórias em produção, bloqueio de tentativas de login e contas de teste desligadas.
Ainda **não existe**: recuperação de senha, confirmação de e-mail e backup automático do banco (o Neon guarda alguns dias de histórico).
