# Cohle

Chat, voz, vídeo e compartilhamento de tela. Desktop (macOS/Windows) primeiro, web depois. Tudo gratuito e open source (Postgres + LiveKit em Docker, sem serviços pagos).

## Rodar em desenvolvimento
Pré-requisitos: Node 20+, Docker Desktop aberto, pnpm (`corepack enable`).

```sh
pnpm install
pnpm infra:up                                   # Postgres + LiveKit
pnpm --filter @cohle/server db:migrate        # primeira vez
pnpm dev:server                                 # API + realtime em :3001
pnpm dev:client                                 # UI em :5173 (abre no navegador)
pnpm dev:desktop                                # app Electron (precisa do client rodando)
```

Para testar chamada, abra dois clientes (app desktop + navegador) com contas diferentes, entre no mesmo servidor com o código de convite e no canal de voz.

## Estrutura
- `apps/client` React + Vite + Tailwind (UI única, desktop e web)
- `apps/desktop` Electron
- `apps/server` Fastify + Prisma + Socket.IO + token LiveKit
- `packages/shared` tipos e schemas zod
- `infra` docker-compose e config do LiveKit

## Próximos passos
DMs, upload de arquivos (disco local), seletor de janela no compartilhamento de tela, notificações, builds `pnpm --filter @cohle/desktop dist`.

## Marca (logo e ícones)
O símbolo é um **C aberto** (de Cohle) com um **orbe luminoso** no vão: a voz entrando no canal. Cores: `#ff3b5c` → `#ff9a62` sobre fundo `#0a0507`.

| Arquivo | Uso |
| --- | --- |
| `brand/cohle-icon.svg` | ícone do app (quadrado arredondado, com fundo) |
| `brand/cohle-mark.svg` | símbolo sozinho, fundo transparente (documentos, telas, redes) |
| `apps/client/src/components/Logo.tsx` | o símbolo como componente React |

Para regenerar **todos** os ícones depois de editar os SVGs (`.icns` do macOS, `.ico` do Windows, PNGs, favicon e ícones web):

```sh
apps/desktop/node_modules/.bin/electron tools/brand/build.cjs
```

Os arquivos saem em `apps/desktop/build/` (usados pelo `electron-builder`) e `apps/client/public/`.

## Testes de chamada (bots)
`tools/bots` entra na sala de voz com bots que falam e compartilham tela, para testar com muita gente:

```sh
cd tools/bots
node bots.mjs --count 8 --share 2        # 8 pessoas, 2 compartilhando tela
node check.mjs                            # áudio no "ao vivo" + silenciar/desconectar/banir
node fps.mjs                              # quadros por segundo que chegam
```

## Testar com um amigo (grátis)
O servidor roda no **seu** computador; o amigo instala o app e conecta no seu IP pelo **Tailscale** (rede privada gratuita: sem abrir portas no roteador e sem expor nada na internet).

**Você:**
1. Instale o Tailscale (tailscale.com/download) e entre na sua conta. Deixe o Docker Desktop aberto.
2. Rode `tools/share/start.sh`. Ele gera senhas próprias (em `tools/share/.secrets`, fora do git), desliga as contas de teste automáticas e mostra o endereço, por exemplo `100.64.0.5:3001`. Deixe esse terminal aberto.
3. No painel do Tailscale (login.tailscale.com/admin/machines), no seu Mac, escolha **Share…** e mande o link ao seu amigo.
4. Mande a ele: o instalador, o **endereço** e o arquivo `docs/amigo.md`. Nos instaladores o botão **Entrar como teste2** está sempre visível (você usa o **teste1**); os dois já estão no "Servidor de Teste", sem convite.

**Instaladores** (em `apps/desktop/release/`):
- `Cohle-0.1.0-mac-arm64.dmg` (Mac M1/M2/M3/M4), `Cohle-0.1.0-mac-x64.dmg` (Mac Intel), `Cohle-0.1.0-win-x64.zip` (Windows).
- Para gerar de novo: `pnpm --filter @cohle/desktop dist:mac` e `dist:win`.
- Ainda **não são assinados** (assinar exige conta paga da Apple e certificado do Windows), então o primeiro abrir pede um clique extra (explicado em `docs/amigo.md`).

**Limites:** o seu Mac precisa ficar ligado, com o Docker e o `start.sh` rodando. Para muita gente de uma vez, o próximo passo é hospedar o servidor em uma máquina na nuvem.

## Landing page
`apps/landing` é o site de divulgação (estático, pronto para a Vercel). Veja `apps/landing/README.md`.

## Produção
O servidor roda no Render (plano grátis), o banco no Neon e a voz no LiveKit Cloud. Passo a passo em `docs/render.md`. Para conferir um servidor no ar: `node tools/bots/smoke.mjs https://cohle-api.onrender.com`.
