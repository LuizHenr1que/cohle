# Como entrar no Cohle (guia para o amigo)

Você vai precisar de **duas coisas grátis**: o app do Cohle e o Tailscale (uma rede privada que liga o seu computador ao do seu amigo, sem abrir nada na internet).

## 1. Tailscale (2 minutos)
1. Instale em https://tailscale.com/download e entre com uma conta (Google/GitHub servem).
2. Aceite o convite/link que o seu amigo te mandou (ele "compartilhou" o computador dele com você).

## 2. Instalar o Cohle
**Mac**: abra o `.dmg` e arraste o Cohle para Aplicativos. Na primeira vez, clique com o **botão direito → Abrir** (o app ainda não é assinado). Se aparecer "danificado", rode no Terminal: `xattr -cr /Applications/Cohle.app`.
- Escolha o arquivo certo: `mac-arm64` (Mac com chip M1/M2/M3/M4) ou `mac-x64` (Mac Intel).

**Windows**: abra o instalador `Cohle-win-x64.exe` (instala e abre sozinho). Se o Windows avisar, clique em **Mais informações → Executar assim mesmo**.

## 3. Conectar
1. (Só nos instaladores de teste `dist:mac`/`dist:win`; os de produção já vêm travados no servidor.) Na tela de login, em **Servidor**, clique em **alterar**, cole o endereço que o seu amigo te passou (parece com `100.64.0.5:3001`) e clique em **Testar e salvar**.
2. Clique em **Entrar como teste2** (em "Contas de teste"). Não precisa criar conta.
3. Você já aparece no **Servidor de Teste**. Entre na **Sala de voz**, permita o microfone (e a câmera) e converse.
4. No Mac, para compartilhar tela: *Ajustes do Sistema → Privacidade e Segurança → Gravação de Tela → Cohle* (depois reabra o app).

Se não conectar: confira se o Tailscale está ligado (ícone na barra) e se o seu amigo está com o servidor ligado.
