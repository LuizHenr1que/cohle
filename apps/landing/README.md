# Landing page do Cohle

Site estático (HTML + CSS + JS puro, sem build e sem dependências): carrega rápido e hospeda em qualquer lugar.

## Ver localmente
```sh
pnpm dev:landing        # http://localhost:5174
```

## Publicar na Vercel
1. Vercel → **Add New → Project** → escolha este repositório.
2. **Root Directory:** `apps/landing`. **Framework Preset:** `Other`. Deixe **Build Command** e **Output Directory** vazios.
3. Deploy. O `vercel.json` já define os cabeçalhos de segurança e de cache.

## Download dos instaladores
Os botões apontam para a Release pública do repositório **LuizHenr1que/cohle-releases** (o código do Cohle continua privado). Os nomes dos arquivos não levam a versão, então `releases/latest/download/` sempre entrega a versão mais nova.

Para lançar uma nova versão:
```sh
VITE_API_URL=https://cohle-api.onrender.com pnpm --filter @cohle/desktop dist:mac:prod -- --config.directories.output=release-x
VITE_API_URL=https://cohle-api.onrender.com pnpm --filter @cohle/desktop dist:win:prod -- --config.directories.output=release-x
gh release create v0.2.0 apps/desktop/release-x/Cohle-*.dmg apps/desktop/release-x/Cohle-*.zip --repo LuizHenr1que/cohle-releases --latest
```
O botão principal já reconhece o sistema de quem visita (macOS, Windows, celular) e destaca o instalador certo. Se mudar o nome dos arquivos, ajuste `DOWNLOADS` no topo de `app.js`. Os .dmg saem com assinatura ad-hoc válida (passo `build/adhoc-sign.cjs`), o que evita o aviso de "app danificado".

## Regenerar as imagens
```sh
node apps/landing/scripts/build-sprite.mjs                              # icons.svg (mesmo conjunto de ícones do app)
apps/desktop/node_modules/.bin/electron apps/landing/scripts/og.cjs     # og.png (imagem de compartilhamento)
```
As capturas em `shots/` vêm do app real: ver `tools/bots/ui-check/app-shots.cjs`.

## Regras do conteúdo
- Sem emojis: só ícones (lucide) e ilustrações próprias.
- Nenhum outro serviço é citado pelo nome, e o rodapé informa que o Cohle é independente.
- Só se anuncia o que já funciona; o resto fica marcado como "em construção" (hoje só o app de celular), "planejado" ou "sonhando alto".
