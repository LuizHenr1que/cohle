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
