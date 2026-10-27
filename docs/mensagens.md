# Mensagens, arquivos e imagens

Valem igual no app e na web (mesmo cliente, mesmo servidor).

## Limites do plano grátis
| Regra | Valor | Onde fica |
| --- | --- | --- |
| Histórico guardado | **últimas 15 mensagens** por canal e por conversa direta. Ao enviar a 16ª, a mais antiga é apagada, com as reações e os arquivos dela. | `KEEP_MESSAGES` em `packages/shared`, `pruneChannel`/`pruneDm` em `apps/server/src/messaging.ts` |
| Tamanho do texto | **500 caracteres** e no máximo 12 linhas | `MESSAGE_MAX`, `MESSAGE_MAX_LINES` |
| Ritmo | 8 mensagens a cada 10 s por pessoa ("Calma…") | `rate(userId, "send", 8, 10_000)` |
| Arquivos | até **10 MB** cada, **4** por mensagem, 12 envios/min e 8 esperando por pessoa | `MAX_UPLOAD`, `MAX_FILES` |
| Armazenamento total de arquivos | **150 MB** (variável `ATTACH_MAX_TOTAL_MB`); o banco grátis do Supabase tem 500 MB | `STORAGE_CAP` |

O aviso aparece fixo no topo de todo chat ("Plano grátis: o Cohle guarda só as últimas 15 mensagens…"), e a landing explica no FAQ. Mudou o plano? Altere `KEEP_MESSAGES` e `MESSAGE_MAX` (um lugar só) e o texto muda sozinho nas telas.

## Respostas e reações
- Responder guarda uma **cópia** do autor e do trecho: continua legível mesmo depois que a original for apagada pelo limite de 15 (aparece "(apagada)").
- Reações são **ícones**, não emojis (curtir, amei, engraçado, fogo, uau, triste, comemorar, olhando): são 8 chaves fixas validadas no servidor (`REACTION_KEYS`) e no banco.
- Apagar: o autor apaga a própria; o dono do servidor apaga qualquer mensagem do canal dele; em conversa direta só quem enviou.

## Arquivos e imagens: como é feito (e por quê)
**Segurança**
- O servidor **não confia no nome nem no tipo declarado**: os primeiros bytes dizem o que o arquivo é. Executáveis (Windows, Linux, macOS), scripts (`#!`) e extensões perigosas (`exe bat js html svg php…`) são **recusados**, mesmo disfarçados (ex.: um `.txt` que é um `.exe`).
- **Imagens são decodificadas e recodificadas para WebP no servidor** (biblioteca `sharp`): somem os metadados (EXIF/GPS) e qualquer conteúdo escondido. Limite de ~16 megapixels (contra "bomba de descompressão") e de quadros em GIF animado.
- Outros arquivos só entram de uma lista (PDF, Office/Open Document, texto, zip/7z/rar, áudio, vídeo) e **só são entregues como download** (`Content-Disposition: attachment`, tipo `application/octet-stream`), nunca renderizados pelo navegador. Cabeçalhos: `nosniff`, `Content-Security-Policy: sandbox`.
- Links **assinados** (id imprevisível + HMAC): `/files/<id>/<assinatura>`. Assinatura trocada = 404. O nome do arquivo é limpo (sem caminho, sem caracteres de controle ou de direção).
- Sem antivírus no plano grátis: por isso a lista é restrita e nada é executado ou renderizado.

**Desempenho**
- Miniatura de até 480 px (WebP) para o chat; a imagem inteira (até 1920 px) só abre no visualizador. Cache do navegador de 1 ano (`immutable`), `loading="lazy"`, largura e altura conhecidas (a tela não pula).
- Fotos grandes são reduzidas **no navegador** antes de enviar (economiza o envio de quem usa internet lenta); o servidor ainda recodifica tudo.
- O processamento de imagem roda no máximo 2 por vez e sem cache (o Render grátis tem 512 MB).
- Quem cancela ou remove um arquivo antes de enviar o apaga na hora; o que ficar esquecido some em 1 hora.

## Painel do Cohle
Mostra os MB de arquivos guardados ao lado do tamanho do banco.

## Testes
`tools/bots/messages-test.mjs` (limites, 15 mensagens, respostas, reações, apagar, arquivos e segurança) e `tools/bots/chat-ui-test.mjs` (tela, no Chrome e no app: `ATTACH=9341`).
