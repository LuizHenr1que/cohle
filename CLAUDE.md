# Cohle: regras do projeto

## Desempenho primeiro (sempre)
- Foque sempre em **performance** e em manter o sistema **leve**. As pessoas jogam com o Cohle aberto: nada de CPU/GPU/memória desperdiçados.
- Antes de adicionar efeito, animação, biblioteca ou polling, pergunte "quanto custa?" e **meça** (ex.: `top` no app aberto, em chamada, e parado).
- Prefira: assinar vídeo só do que está visível/assistido, trabalho pausado quando a janela está oculta ou em chamada, requisições raras, imagens por URL com cache (nunca base64 nos DTOs), sem `backdrop-filter` pesado nem `shadowBlur`.
- Toda mudança que mexe em tela, chamada ou áudio deve ser conferida contra o custo anterior; se piorar, corrija antes de entregar.

## Versões (produção real a partir da Versão 1)
- Numeração: **Versão N** = app `0.0.N` (ex.: Versão 1 = 0.0.1). Toda entrega aumenta os dois, vira "Versão N · melhoria" no login e no título da release (tag `v0.0.N`). Regra em `docs/versoes.md`.
- O app se atualiza sozinho (electron-updater lendo `latest*.yml` da última release): sem subir `version` do `apps/desktop/package.json`, ninguém recebe a atualização.

## Web e app sempre alinhados (paridade)
- Web (`cohle.verticeapp.com.br/app`) e app desktop são **o mesmo cliente** (`apps/client`) falando com o **mesmo servidor**. Toda função, tela, texto e visual nasce nos dois ao mesmo tempo: nada de "só no app" ou "só na web".
- A única diferença aceitável é o que o navegador não consegue (escolher janela para compartilhar, widget flutuante, bandeja, atualizador, iniciar com o computador). Nesses casos a tela explica e oferece a alternativa. O atalho entre os dois é discreto: clicar na logo da tela de entrada (no app abre a web, na web abre o site para baixar o app); sem cartões nem avisos chamativos.
- Toda mudança de cliente é **testada nos dois**: web com `tools/bots/web-test.mjs` (Chrome) e desktop no Electron. Não entregar uma metade.
- A versão é uma só: `apps/client/src/version.ts` (rótulo "Versão N · melhoria", igual no login da web e do app) e `apps/desktop/package.json` (0.0.N). A web atualiza a cada push; o desktop só com release (`docs/versoes.md`). Não anunciar na landing, nem dar como entregue, o que ainda não está nos dois.
- Compatibilidade: o servidor atende web e apps já instalados ao mesmo tempo. Nunca renomear nem remover campos da API (ex.: o login continua recebendo `email`, que agora aceita e-mail ou @usuário).
- Landing: só anuncia o que funciona; o que falta fica marcado como "em construção".

## Outras preferências
- Landing e app: ícones e imagens, nunca emojis. Responsivo em tudo.
- Prefira testes reais de ponta a ponta com medições reais.
- Nunca entre em salas de voz de produção com contas reais para testar (use só `tools/bots/prod-observe.mjs`, somente leitura).
