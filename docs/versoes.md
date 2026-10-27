# Como numerar as versões

O login do app mostra **"Versão N · o que mudou"**, e a landing mostra a mesma frase, lida do título da última release. Assim você sempre sabe qual versão está rodando.

**A cada versão nova:**
1. Em `apps/client/src/version.ts`, aumente `n` e reescreva `note` (uma frase curta, sobre a melhoria).
2. Em `apps/desktop/package.json`, aumente `version` (**Versão N = `0.0.N`**, ex.: 0.0.1 → 0.0.2). **O atualizador automático compara esse número**: sem aumentar, os apps instalados não enxergam a versão nova.
3. Gere os instaladores (com `VITE_API_URL=https://cohle-api.onrender.com`): `pnpm --filter @cohle/desktop dist:mac:prod` e `dist:win:prod`. Saem em `apps/desktop/release/`.
4. Publique **todos** estes arquivos no repositório de releases (os `latest*.yml` são o que os apps leem para se atualizar), usando a mesma frase como título:
   ```sh
   cd apps/desktop/release
   gh release create v0.0.N Cohle-mac-arm64.dmg Cohle-mac-arm64.zip Cohle-mac-x64.dmg Cohle-mac-x64.zip \
     Cohle-win-x64.exe Cohle-win-x64.zip latest-mac.yml latest.yml SHA256SUMS.txt \
     --repo LuizHenr1que/cohle-releases --latest \
     --title "Versão N · <melhoria>" --notes "<o que mudou, em detalhes>"
   ```
5. Dê push no repositório: a landing atualiza sozinha, e o título da release aparece nela.

Histórico (antes da Versão 1 eram "versões de teste" 1 a 13, numeração `0.1.x`; a Versão 1 recomeça em `0.0.1` na produção real):
- **Versão de teste 1:** prévia da sua tela ao compartilhar.
- **Versão de teste 2:** widget de chamada em segundo plano e app mais leve.
- **Versão de teste 3:** chat durante a chamada e supressão de ruído.
- **Versão de teste 4:** lista de quem está na sala de voz sempre correta.
- **Versão de teste 5:** cartão ao passar o mouse, troca de transmissão com um clique, aviso de nova versão e ícones de microfone/áudio desativado ao lado do nome.
- **Versão de teste 6:** widget da chamada arrastável pela tela e sem nomes fantasmas de quem saiu.
- **Versão de teste 7:** mensagens diretas com histórico, confirmação antes de ligar a câmera e sons (susto, fogos, risos, chamando, tatakae) para toda a sala.
- **Versão de teste 8:** botão de nova versão redesenhado, mais claro e chamativo.
- **Versão de teste 9:** botão de sons da sala com nome e destaque na barra da chamada.
- **Versão de teste 10:** botão de sons volta a ser só o ícone na barra da chamada.
- **Versão de teste 11:** câmera com prévia antes de ligar e mensagens de erro claras em português (câmera, microfone e tela).
- **Versão de teste 12:** clique na pessoa amplia (câmera, avatar ou transmissão), botão direito na sala e na lista com volume, mutar só para mim, mensagem e ações do dono; corrigida a tela preta ao desligar a câmera.
- **Versão de teste 10 a 12:** botão de sons só com ícone; câmera com prévia e erros em português; ampliar pessoa, botão direito com volume e opções.
- **Versão de teste 13:** atualização automática (baixa sozinha e instala ao abrir), instalador do Windows e login sem o endereço do servidor.
- **Versão 1 (0.0.1):** primeira versão oficial, com atualização automática.
- **Versão 2 (0.0.2):** tela de atualização moderna (card com progresso ao abrir, card "Cohle atualizado" depois) e download direto do instalador.
- **Versão 3 (0.0.3):** o Cohle.exe agora leva o ícone e o nome do Cohle (antes aparecia "Electron" no Windows) e a prévia da landing deixou de ser interativa.
- **Versão 4 (0.0.4):** a tela de atualização agora usa a arte do banner do Cohle, com frases de boas-vindas que vão passando enquanto baixa.
- **Versão 5 (0.0.5):** ao fechar a janela o Cohle fica na bandeja do sistema (menu: abrir, verificar atualização, iniciar com o computador e sair) e a barra lateral de servidores pode ser expandida para mostrar nomes e botões.
- **Versão 6 (0.0.6):** cadastro com confirmação por e-mail (código de 6 dígitos), "Esqueci minha senha", e-mail de boas-vindas, tour de boas-vindas para contas novas e mensagens de erro em português.
- **Versão 7 (0.0.7):** olhinho para mostrar/ocultar a senha, "Lembrar de mim" no login (e-mail lembrado) e código do e-mail em um só bloco, fácil de copiar.
- **Versão 8 (0.0.8):** telas de boas-vindas quando não há servidor ou canal (cartões para criar ou entrar com convite) e selo de Desenvolvedor para a conta da equipe.
- **Versão 9 (0.0.9):** tela de Configurações (conta, senha, aparência, áudio e sons, aplicativo, sobre), perfil de outras pessoas ao clicar no nome, e o selo de Desenvolvedor passa a valer também para quem já estava logado.
- **Versão 10 (0.0.10):** @usuário único (como no Discord) para entrar e para te adicionarem, "Esqueci meu usuário" e "Esqueci minha senha" por e-mail ou @, bloqueio por tentativas, central de amigos (busca, adicionar por @ ou e-mail, privacidade), painel do Cohle para admins e o Cohle também no navegador (cohle.verticeapp.com.br/app), com atalho entre web e app.
- **Versão 11 (0.0.11):** perfil completo (nome de exibição, descrição, cor da capa, nota privada, atividade ao vivo, amigos e servidores em comum, sugestões de amigos), **arquivos e imagens** nas mensagens (seguros e leves), **respostas e reações** por ícone, histórico de **15 mensagens** por conversa (plano grátis, com aviso na tela), limite de 500 caracteres e chat que rola sozinho até o fim sem esconder a caixa de mensagem. Detalhes em `docs/mensagens.md`.
- **Versão 12 (0.0.12):** depois do login o app sempre abre na tela de boas-vindas (com "Seus servidores"), mesmo para quem já tem servidor, e o logo volta para ela; depois de uma atualização aparece só o cartão "Cohle atualizado!" e, quando ele fecha, o app (antes os dois apareciam juntos).
- **Versão 13 (0.0.13):** **Loja de itens visuais (Preview Beta, tudo grátis)** com as coleções de temporada **Natal** (tema com neve, luzinhas, árvore e Papai Noel no trenó) e **Halloween** (bruxa de vassoura, luzes laranja e roxas, abóbora): molduras, emblemas, entradas na chamada, efeitos de nome, reações gigantes e bônus do conjunto completo. Quem pegou durante a temporada fica com o item; depois ela sai da Loja. Efeitos desligáveis, Modo leve automático em aparelho fraco e nada rodando com a aba oculta. Ver `docs/loja.md`.
- **Versão 14 (0.0.14):** **grupos de servidores** na barra lateral (criar, recolher, editar, mover pelo menu ou arrastando; guardados na conta, valem na web e no app), faixa "Já é seu" e selo "Ativo" nas coleções completas, botão de atualização mais discreto, regra de que **nenhum tema anima ou toca som sozinho** (só ao clicar no ícone do tema) e **sons reais** na Loja (o Papai Noel falando "ho ho ho" e o gemido de fantasma do "Buuu!", gravações CC0, ~30 KB), cliques no trenó e na bruxa tocam o som, **8 auras animadas** (fogo, gelo, raios, sakura, sombra, ouro, cosmos e neon) e **4 novas coleções** completas (Hacker, Gamer, Barbearia e Rainha) com tema, molduras, emblema, entrada, efeitos de nome e reações; a Loja ganhou **banners de venda** nas coleções e uma **prévia grande** de qualquer item ou conjunto (clicou, viu, saiu). Corrige o chat apagar o que você anexava durante um envio.
- **Versão 15 (0.0.15):** coleção de **Ano Novo** (tema dourado Virada, aro dourado, confete, emblema, entrada Feliz 2027, nomes e reações; a garrafa de champanhe no canto solta os **fogos só quando você clica**), o `settings-test` voltou a rodar e passa, e o Lighthouse do login do app deu 99 de desempenho, 98 de acessibilidade e 100 de boas práticas.
- **Versão 16 (0.0.16):** **Loja trancada** ("Em breve": ninguém pega item, dá para ver tudo e usar a prévia) e **presentes**: só o dono do Cohle presenteia itens ou coleções inteiras com recado; quem recebe vê a tela "Você ganhou um presente!" (também ao vivo) e pode equipar na hora. O dono também destranca por coleção sem deploy. Ver `docs/loja.md`.
