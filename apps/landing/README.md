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

## Ligar os botões de download
Hoje os botões mostram um aviso ("em breve"), porque os instaladores ainda não têm um endereço público. Quando publicá-los, edite o topo de `app.js`:

```js
const DOWNLOADS = {
  live: true,
  base: "https://github.com/SEU-USUARIO/cohle-releases/releases/latest/download/",
  files: { "mac-arm64": "Cohle-0.1.0-mac-arm64.dmg", "mac-x64": "Cohle-0.1.0-mac-x64.dmg", "win-x64": "Cohle-0.1.0-win-x64.zip" },
};
```
Este repositório é **privado**, então os arquivos precisam ficar em outro lugar público (por exemplo, um repositório só de releases no GitHub, ou um bucket). Os instaladores têm de 97 a 107 MB, perto do limite de arquivo da Vercel, por isso não os coloque na pasta do site.

O botão principal já reconhece o sistema de quem visita (macOS, Windows, celular) e destaca o instalador certo.

## Regenerar as imagens
```sh
node apps/landing/scripts/build-sprite.mjs                              # icons.svg (mesmo conjunto de ícones do app)
apps/desktop/node_modules/.bin/electron apps/landing/scripts/og.cjs     # og.png (imagem de compartilhamento)
```
As capturas em `shots/` vêm do app real: ver `tools/bots/ui-check/app-shots.cjs`.

## Regras do conteúdo
- Sem emojis: só ícones (lucide) e ilustrações próprias.
- Nenhum outro serviço é citado pelo nome, e o rodapé informa que o Cohle é independente.
- Só se anuncia o que já funciona; o resto fica marcado como "em construção", "planejado" ou "sonhando alto".
