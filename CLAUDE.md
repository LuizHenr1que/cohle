# Cohle: regras do projeto

## Desempenho primeiro (sempre)
- Foque sempre em **performance** e em manter o sistema **leve**. As pessoas jogam com o Cohle aberto: nada de CPU/GPU/memória desperdiçados.
- Antes de adicionar efeito, animação, biblioteca ou polling, pergunte "quanto custa?" e **meça** (ex.: `top` no app aberto, em chamada, e parado).
- Prefira: assinar vídeo só do que está visível/assistido, trabalho pausado quando a janela está oculta ou em chamada, requisições raras, imagens por URL com cache (nunca base64 nos DTOs), sem `backdrop-filter` pesado nem `shadowBlur`.
- Toda mudança que mexe em tela, chamada ou áudio deve ser conferida contra o custo anterior; se piorar, corrija antes de entregar.

## Versões de teste
- Toda entrega vira "Versão de teste N · melhoria" (login e título da release). Regra em `docs/versoes.md`.

## Outras preferências
- Landing e app: ícones e imagens, nunca emojis. Responsivo em tudo.
- Prefira testes reais de ponta a ponta com medições reais.
- Nunca entre em salas de voz de produção com contas reais para testar (use só `tools/bots/prod-observe.mjs`, somente leitura).
