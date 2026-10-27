# Loja de itens visuais (Preview Beta)

Vale igual no app e na web (mesmo cliente, mesmo servidor). **Tudo é grátis durante o beta**; a Loja mostra o selo "Preview Beta" e o aviso "Grátis durante o beta. No futuro alguns itens serão pagos." Não há Pix nem checkout: `price` e `isFreeBeta` já existem no banco, e o único ponto em que o pagamento entra depois é `POST /shop/items/:id/claim`.

## Coleções de temporada (produto único sazonal)
| Coleção | Janela (America/Sao_Paulo) | Tema | Bônus do conjunto completo |
| --- | --- | --- | --- |
| **Natal** | 01/10/2026 a 07/01/2027 | noite estrelada, neve, luzinhas, árvore, contagem para o Natal e o **Papai Noel no trenó** | trenó extra com rastro de luzes |
| **Halloween** | 10/10/2026 a 03/11/2026 | noite roxa, luzes laranja e roxas, abóbora no canto, contagem para o Halloween e a **bruxa de vassoura** | bruxa extra com rastro de faíscas |

Regra: **quem pegou, pegou.** Durante a janela qualquer pessoa pega os itens; quando a temporada acaba a coleção some da vitrine e ninguém novo consegue pegar (403), mas **quem já pegou continua com tudo e pode equipar**. Isso deixa pronto o caminho para limitar quantidade, lançar novos temas de Natal etc. como produtos únicos sazonais.

## Como ligar, desligar ou mudar uma coleção sem deploy
O catálogo (nomes, tipos, arte) vem do código (`apps/server/src/shop/catalog.ts`) e é gravado no boot. As chaves de operação **não são sobrescritas** pelo boot e valem em até 60 s (`SHOP_CACHE_MS`):
```sql
update "Collection" set ativo = false where key = 'halloween';          -- some da vitrine, deixa de ser entregue aos outros, ninguém pega
update "Collection" set fim = '2026-11-10T00:00:00-03:00' where key = 'halloween';   -- estender a temporada
```
Para criar outra coleção: adicione em `COLLECTIONS` e `ITEMS`, crie a arte no cliente (`registry.ts`, `FrameArt.tsx`, `GiantIcons.tsx`, `fx/Pieces.tsx`) e rode o deploy.

## Preferências de cada pessoa (Loja > Preferências)
Desligar efeitos, desligar sons, neve de ambiente da temporada, ocultar itens políticos e Modo leve (Automático / Ligado / Desligado). Ficam no servidor (valem em todos os aparelhos) e aplicam na hora.

## Regras de desempenho (conferidas em `tools/bots/shop-perf.mjs`)
- Só `transform` e `opacity` animam. Nas listas tudo é estático; anima no hover, no perfil, na chamada e no próprio usuário.
- A Loja (chunk `ShopModal`) e os efeitos (`EffectsHost`, `Snow`) são **lazy**: o chat não baixa nada disso antes de precisar. A neve é um canvas próprio (sem biblioteca) a ~24 fps com metade da resolução, parado com a aba oculta ou a janela sem foco.
- Um interruptor só (`useEffectsOn`): efeitos desligados, Modo leve, `prefers-reduced-motion` ou aparelho fraco desligam tudo. Aba oculta não roda timer nem frame.
- Orçamento por etapa: +15 KB gz no bundle principal, JS parado da cena <= 1,5%, aba oculta ~0, >= 30 fps com CPU 4x mais lenta.

## Ao vivo (socket.io, nada gravado no banco)
`fx:entrance` (1 a cada 10 s por pessoa, só para quem está na mesma sala), `fx:giant` (reação gigante: lista permitida + 5 s de espera), `shop:equipped`. Nenhum texto livre de cliente chega a outro cliente.

## Política (infra pronta, itens só na última etapa)
Categoria `politica`: a pessoa pode ocultar nas preferências e o dono do servidor pode bloquear (Configurações do servidor), e o servidor omite a chave no contexto bloqueado. Os itens políticos só serão criados depois da revisão das regras de conteúdo.

## Testes
`node tools/bots/shop-test.mjs` (API), `node tools/bots/shop-ui-test.mjs` (Chrome; `ATTACH=9341` no Electron), `node tools/bots/shop-perf.mjs` (build de produção em `vite preview --port 5191`).
