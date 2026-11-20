# Cohle

Plataforma completa de comunicação em tempo real com chat, chamadas de voz e vídeo, compartilhamento de tela e recursos de personalização. Disponível como aplicativo desktop (macOS/Windows) e versão web.

🌐 **Demo ao vivo:** [https://cohle.vercel.app](https://cohle.vercel.app)

## 📋 Sobre o Projeto

Cohle é uma aplicação de comunicação em tempo real desenvolvida com foco em performance, escalabilidade e experiência do usuário. O projeto demonstra competências em desenvolvimento full-stack, arquitetura de sistemas distribuídos e implementação de tecnologias modernas de WebRTC.

### 🚀 Principais Funcionalidades

- **Comunicação em tempo real:** Chat de texto, chamadas de voz e vídeo com múltiplos participantes
- **Compartilhamento de tela:** Recursos avançados para apresentações e colaboração
- **Servidores e canais:** Sistema de organização com canais de texto e voz
- **DMs e grupos:** Mensagens diretas e conversas em grupo
- **Personalização:** Sistema de perfis, avatares, temas e loja de itens customizáveis
- **Sistema de presença:** Status online/offline e indicadores de atividade em tempo real

### 🛠️ Stack Tecnológica

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Socket.IO Client
- LiveKit Client SDK
- Electron (aplicativo desktop)

**Backend:**
- Node.js + Fastify
- Prisma ORM
- Socket.IO (comunicação em tempo real)
- PostgreSQL
- LiveKit (infraestrutura de vídeo/áudio)
- JWT para autenticação

**Infraestrutura:**
- Docker + Docker Compose
- Vercel (web)
- Render (API)
- Neon (PostgreSQL)
- LiveKit Cloud

## 👨‍💻 Autor

**Luiz Henrique Francisco da Conceição**  
Desenvolvedor Full Stack & Mobile

---

## 🔧 Configuração e Execução Local

### Pré-requisitos

- Node.js 20+
- Docker Desktop
- pnpm (habilite com `corepack enable`)

### Configuração

1. **Clone o repositório:**
   ```sh
   git clone https://github.com/LuizHenr1que/cohle.git
   cd cohle
   ```

2. **Instale as dependências:**
   ```sh
   pnpm install
   ```

3. **Configure as variáveis de ambiente:**
   
   Para desenvolvimento local, copie os arquivos de exemplo:
   ```sh
   cp apps/server/.env.example apps/server/.env
   ```
   
   O arquivo `.env.example` contém valores padrão para desenvolvimento local. Para produção, você precisará configurar:
   - `DATABASE_URL`: String de conexão PostgreSQL
   - `JWT_SECRET`: Chave secreta para autenticação (24+ caracteres aleatórios)
   - `LIVEKIT_URL`: URL do servidor LiveKit
   - `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`: Credenciais do LiveKit

4. **Inicie a infraestrutura (Postgres + LiveKit):**
   ```sh
   pnpm infra:up
   ```

5. **Execute as migrations do banco de dados (primeira vez):**
   ```sh
   pnpm --filter @cohle/server db:migrate
   ```

6. **Inicie o servidor de desenvolvimento:**
   ```sh
   pnpm dev:server    # API + WebSocket em localhost:3001
   pnpm dev:client    # Interface web em localhost:5173
   pnpm dev:desktop   # Aplicativo Electron (requer dev:client rodando)
   ```

### Testando

Para testar chamadas de voz/vídeo, abra dois clientes (navegador + app desktop ou duas janelas do navegador) com contas diferentes, entre no mesmo servidor e acesse um canal de voz.

## 📁 Estrutura do Projeto

```
cohle/
├── apps/
│   ├── client/          # Interface React (compartilhada entre web e desktop)
│   │   ├── src/
│   │   │   ├── components/  # Componentes React
│   │   │   ├── api.ts       # Cliente HTTP/WebSocket
│   │   │   └── ...
│   │   └── package.json
│   ├── desktop/         # Wrapper Electron para o cliente
│   ├── server/          # Backend Node.js
│   │   ├── src/
│   │   │   ├── index.ts     # Servidor Fastify + Socket.IO
│   │   │   ├── auth.ts      # Autenticação e JWT
│   │   │   ├── db.ts        # Cliente Prisma
│   │   │   └── ...
│   │   └── prisma/schema.prisma
│   └── landing/         # Landing page estática
├── packages/
│   └── shared/          # Tipos TypeScript e schemas Zod compartilhados
├── infra/               # Configuração Docker (Postgres + LiveKit)
└── tools/               # Scripts de teste e utilitários
```

## 🏗️ Arquitetura

O projeto segue uma arquitetura monorepo com separação clara de responsabilidades:

- **Cliente universal:** O código do frontend (`apps/client`) é compartilhado entre a versão web e desktop, garantindo paridade de funcionalidades
- **Comunicação em tempo real:** WebSocket (Socket.IO) para chat e eventos, WebRTC (LiveKit) para mídia
- **Autenticação:** JWT com refresh tokens, suporte a verificação de e-mail
- **Banco de dados:** PostgreSQL com Prisma ORM para type-safety
- **Validação:** Schemas Zod compartilhados entre cliente e servidor para validação consistente

## 🧪 Testes Automatizados

O projeto inclui uma suite de testes automatizados com bots que simulam usuários reais:

```sh
cd tools/bots
node bots.mjs --count 8 --share 2  # Simula 8 usuários, 2 compartilhando tela
node check.mjs                      # Testa áudio ao vivo + funcionalidades
node fps.mjs                        # Medição de performance (FPS)
```

## 🎨 Design e Identidade Visual

A identidade visual do Cohle é baseada em um **C aberto** com um **orbe luminoso**, simbolizando a comunicação em tempo real. Paleta de cores: gradiente `#ff3b5c` → `#ff9a62` sobre fundo escuro `#0a0507`.

**Recursos de marca:**
- `brand/cohle-icon.svg` - Ícone do aplicativo
- `brand/cohle-mark.svg` - Marca para uso em documentos
- `apps/client/src/components/Logo.tsx` - Componente React do logo

Para regenerar os assets (ícones do app, favicon, etc.):
```sh
apps/desktop/node_modules/.bin/electron tools/brand/build.cjs
```

## 🚀 Deploy em Produção

O projeto está configurado para deploy em diferentes plataformas:

**Frontend (Web):**
- Hospedado na Vercel
- Build otimizado com Vite
- Demo: [https://cohle.vercel.app](https://cohle.vercel.app)

**Backend (API):**
- Render (ou qualquer plataforma Node.js)
- Requer configuração de variáveis de ambiente
- Documentação completa em `docs/render.md`

**Banco de Dados:**
- PostgreSQL (Neon, Supabase, ou self-hosted)
- Migrations gerenciadas pelo Prisma

**Infraestrutura de Mídia:**
- LiveKit Cloud para produção
- Docker para desenvolvimento local

**Aplicativo Desktop:**
Para gerar builds de produção:
```sh
pnpm --filter @cohle/desktop dist:mac   # macOS (Intel e Apple Silicon)
pnpm --filter @cohle/desktop dist:win   # Windows x64
```

### Teste de Smoke em Produção
```sh
node tools/bots/smoke.mjs https://cohle-api.onrender.com
```

## 📚 Documentação Adicional

- `docs/render.md` - Guia completo de deploy no Render
- `docs/email.md` - Configuração de e-mail (verificação e recuperação de senha)
- `apps/landing/README.md` - Landing page e marketing
- `tools/bots/` - Scripts de teste automatizado

## 🔒 Segurança

- Autenticação JWT com tokens de acesso e refresh
- Validação de entrada com Zod em cliente e servidor
- Sanitização de dados do usuário
- Rate limiting implementado
- Variáveis de ambiente para secrets (nunca commitadas)

## 📝 Licença

Este projeto é open source e está disponível como portfólio técnico.

---

**Desenvolvido por Luiz Henrique Francisco da Conceição**
