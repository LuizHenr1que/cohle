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
