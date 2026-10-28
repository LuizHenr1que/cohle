# Loja de itens visuais (Preview Beta)

Vale igual no app e na web (mesmo cliente, mesmo servidor). Decisão do dono: **a Loja está trancada ("Em breve") para todo mundo**: dá para ver tudo e usar a prévia, mas ninguém pega item; só a conta dona (`verticeappempresa@gmail.com`) **presenteia**. A Loja **não será grátis**: quando abrir, os itens terão preço (os campos `price` e `isFreeBeta` já existem e o pagamento entra no `claim`); a Loja mostra o selo "Preview Beta" e o aviso "Grátis durante o beta. No futuro alguns itens serão pagos." Não há Pix nem checkout: `price` e `isFreeBeta` já existem no banco, e o único ponto em que o pagamento entra depois é `POST /shop/items/:id/claim`.

## Coleções de temporada (produto único sazonal)
| Coleção | Janela (America/Sao_Paulo) | Tema | Bônus do conjunto completo |
| --- | --- | --- | --- |
| **Natal** | 01/10/2026 a 07/01/2027 | noite estrelada, neve, luzinhas, árvore, contagem para o Natal; **clique na árvore e o Papai Noel passa no trenó** (com o ho ho ho real) | trenó com rastro de luzes |
| **Halloween** | 10/10/2026 a 03/11/2026 | noite roxa, luzes laranja e roxas, contagem para o Halloween; **clique na abóbora e a bruxa de vassoura passa** (com o buuu real) | bruxa com rastro de faíscas |

| **Ano Novo** | 20/12/2026 a 10/01/2027 | céu escuro e dourado, luzes douradas, contagem para a virada; **clique na garrafa de champanhe do canto e os fogos estouram** (com som) | – |

Regra: **quem pegou, pegou.** Durante a janela qualquer pessoa pega os itens; quando a temporada acaba a coleção some da vitrine e ninguém novo consegue pegar (403), mas **quem já pegou continua com tudo e pode equipar**. Isso deixa pronto o caminho para limitar quantidade, lançar novos temas de Natal etc. como produtos únicos sazonais.

## Coleções permanentes (sem temporada)
| Coleção | O que traz |
| --- | --- |
| **Auras** | 8 molduras que giram, queimam ou brilham em volta do avatar: fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon (só animam no hover, no perfil e na chamada) |
| **Hacker** | tema terminal verde, "chuva de código", emblema Root, entrada ACCESS GRANTED, nomes terminal e glitch |
| **Gamer** | tema arena neon, moldura controle e pixel, emblema Player 1, entrada GAME ON!, nomes Neon Arena e Chefão final |
| **Barbearia** | tema madeira e dourado, poste de barbeiro girando, tesoura de ouro, emblema Navalha, entrada Na régua! |
| **Rainha** | tema rosé, coroa e flores, emblema Rainha, entrada Chegou a Rainha!, nomes rosé e diamante |

Ficam sempre pegáveis (`sazonal = false`). Para criar outra: `COLLECTIONS` e `ITEMS` em `apps/server/src/shop/catalog.ts`, arte em `registry.ts`, `FrameArt.tsx`, `art.tsx` e `GiantIcons.tsx`.

## Sons reais
`apps/client/public/sfx/` (créditos em `CREDITS.txt`): `santa-hohoho.mp3` (CC0, canucklovingbrit) e `ghost-boo.mp3` (CC0, qubodup), ~30 KB no total, baixados só na primeira vez que tocam. As entradas Hacker, Gamer, Barbearia e Rainha usam sons sintetizados (0 byte). Se um arquivo não carregar, entra o som sintetizado.

## Como ligar, desligar ou mudar uma coleção sem deploy
O catálogo (nomes, tipos, arte) vem do código (`apps/server/src/shop/catalog.ts`) e é gravado no boot. As chaves de operação **não são sobrescritas** pelo boot e valem em até 60 s (`SHOP_CACHE_MS`):
```sql
update "Collection" set ativo = false where key = 'halloween';          -- some da vitrine, deixa de ser entregue aos outros, ninguém pega
update "Collection" set fim = '2026-11-10T00:00:00-03:00' where key = 'halloween';   -- estender a temporada
```
Para criar outra coleção: adicione em `COLLECTIONS` e `ITEMS`, crie a arte no cliente (`registry.ts`, `FrameArt.tsx`, `GiantIcons.tsx`, `fx/Pieces.tsx`) e rode o deploy.

## Regra: nada acontece sozinho
Nenhum tema anima algo grande nem toca som por conta própria. Cada tema deixa um **ícone clicável** no canto (árvore, abóbora, terminal, controle, poste, coroa): clicou, sai a animação com som, e uma pausa de 1,5 s evita empilhar cliques. Decoração parada e silenciosa (luzes de borda, neve leve) e efeitos causados por outra pessoa (entrada na sala, reação gigante) continuam, e todos respeitam "Desligar efeitos" e "Sons". A regra está no `CLAUDE.md`.

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

## Grupos de servidores (barra lateral)
Quem tem muitos servidores organiza em **grupos**: botão "Novo grupo" (ou clique direito num servidor > "Novo grupo com este servidor"), nome, cor e servidores. O grupo recolhido vira um só ícone (com a contagem e uma marca se o servidor aberto está dentro). Mover: menu do servidor ("Mover para" / "Tirar do grupo") ou arrastar para o grupo. Editar, recolher e "Desfazer grupo" (os servidores voltam soltos) no menu do grupo. Ficam em `UserPrefs.serverGroups` (até 30 grupos, nome de até 24 caracteres), então valem em qualquer aparelho. Teste: `tools/bots/server-groups-ui-test.mjs`.

## Ano Novo (Etapa 2)
Coleção sazonal de 8 itens: tema **Virada**, molduras Aro dourado e Confete, emblema Virada, entrada **Feliz 20XX!** (champanhe, fogos e relógios caindo), nomes Ouro e Fogos e reações (fogos, champanhe, relógio). O ano mostrado na contagem e nos textos é sempre o da próxima virada. **Os fogos não estouram à meia-noite sozinhos**: seguem a regra "nada acontece sozinho" e só saem quando a pessoa clica na garrafa. A coleção só aparece na janela; para ver antes no banco de desenvolvimento, ajuste `inicio`/`fim` em `Collection` (o `shop-test` e o `shop-ui-test` fazem isso e restauram no fim).

## Loja trancada e presentes
- **Trancada:** todo item nasce com `ShopItem.locked = true` (coluna runtime: o seed nunca a sobrescreve). `POST /shop/items/:id/claim` responde 403 `item locked`. A tela mostra o cadeado e "Em breve" no lugar de "Pegar grátis", nos itens, nos banners das coleções e na prévia. A prévia continua liberada.
- **Presentear (só o dono):** botão "Presentear" em cada item e coleção, e "Presentear alguém" no aviso do topo. Janela: busca a pessoa por @usuário, nome ou e-mail, marca itens ou "coleção inteira", recado de até 140 caracteres. Funciona com item trancado ou fora de temporada (dá para presentear Ano Novo antes de 20/12). `POST /shop/gifts`, `GET /shop/gift-targets`, `GET /shop/admin/catalog` (todos 403 para quem não é dono; o dono é a conta com `OWNER_EMAILS`/`verticeappempresa@gmail.com` confirmada).
- **Quem recebe:** vê a tela "Você ganhou um presente!" uma vez (remetente, recado e itens), com "Equipar agora" e "Ver na Loja"; online, aparece na hora (`shop:gift`). `UserItem.seen` controla isso.
- **Destrancar sem deploy:** botão "Destrancar" por coleção na tela (dono) ou `PUT /shop/admin/lock` com `itemIds` ou `collectionId`. SQL: `update "ShopItem" set locked = false where key = 'natal.theme';`.
- **Aviso (v18):** online, aparece um aviso discreto no canto (`role=status`, "Abrir"), o botão da Loja no rail mostra o selo `data-gift-badge` e, com a janela sem foco, sai `Notification` do sistema; a janela só abre sozinha ao abrir o app com presentes não vistos. Offline: e-mail `giftEmail` (só com e-mail confirmado, no máximo 1 a cada 10 min por pessoa).
- Testes: `shop-test.mjs` (API: trava, autorização, presentes, recado, pulo de itens que já tem, evento ao vivo, destrancar) e `shop-gift-ui-test.mjs` (tela, web e Electron).

## Pets, status animados e banners animados
- **Pets** (`pet.cat/dog/fox/dragon/ghost/robot`, slot `pet`): ficam pousados na borda do seu cartão de usuário (só você vê o widget; os outros veem o pet pequeno e parado no seu perfil). **Só reagem a você:** hover = balança; clique = pula, solta corações, fala no balão e faz um barulhinho; 5 cliques em 5 s = dança. Respeitam "Sons" desligados e o Modo leve. Código em `shop/pets.tsx` + `pets.css`, carregado sob demanda só para quem tem pet.
- **Status animados** (`status.*`, slot `status`): chip ao lado do nome no perfil (animado com o perfil aberto), nas linhas de pessoas e no seu cartão (parado; anima no hover). `shop/StatusChip.tsx`.
- **Banners animados** (`banner.*`, slot `banner`): a capa do perfil vira aurora, chuva neon, ondas, estrelas, lava, sakura, pôr do sol ou código verde (só `transform`/`opacity`, só com o perfil aberto). `shop/AnimatedBanner.tsx`.
- **Coleções novas:** Brasil, Memes, Anime (permanentes) e Carnaval (sazonal, 25/01 a 20/02/2027), cada uma com 8 itens como as outras. Coleções de escolha (Pets, Status, Banners, Auras) mostram todos os itens em grade clicável e não têm "conjunto completo".
- Tudo nasce **trancado** e o dono presenteia (ou destranca). Testes: `shop-pet-ui-test.mjs` (web e Electron) e o bloco de pets/status/banners no `shop-test.mjs`.
