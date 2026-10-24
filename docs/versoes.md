# Como numerar as versões de teste

O login do app mostra **"Versão de teste N · o que mudou"**, e a landing mostra a mesma frase, lida do título da última release. Assim você sempre sabe qual versão está rodando.

**A cada versão nova:**
1. Em `apps/client/src/version.ts`, aumente `n` e reescreva `note` (uma frase curta, sobre a melhoria).
2. Gere os instaladores (`pnpm --filter @cohle/desktop dist:mac:prod` e `dist:win:prod`, com `VITE_API_URL=https://cohle-api.onrender.com`).
3. Publique no repositório de releases, usando **a mesma frase como título**:
   ```sh
   gh release create teste-N Cohle-mac-arm64.dmg Cohle-mac-x64.dmg Cohle-win-x64.zip SHA256SUMS.txt \
     --repo LuizHenr1que/cohle-releases --latest \
     --title "Versão de teste N: <melhoria>" --notes "<o que mudou, em detalhes>"
   ```
4. Dê push no repositório: a landing atualiza sozinha, e o título da release aparece nela.

Histórico:
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
