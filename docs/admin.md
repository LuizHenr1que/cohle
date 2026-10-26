# Painel do Cohle (admin)

## Quem é admin
- **Dono (master):** a conta com o e-mail `verticeappempresa@gmail.com`, **desde que o e-mail esteja confirmado**. O papel vem do e-mail, nunca de um nome digitado, e não pode ser removido nem rebaixado por ninguém. Outros donos: variável `OWNER_EMAILS` (separados por vírgula) no Render.
- **Admin:** o dono promove (ou remove) pela aba **Pessoas** do painel. Admin vê tudo, mas não muda papéis.
- O servidor confere o papel no banco em **toda** chamada `/admin/*`. Esconder o botão no app não é a proteção.

## Onde abrir
Configurações (foto no canto) → **Painel do Cohle**. Só aparece para dono/admin. O código do painel só é baixado por quem tem o papel.

## O que mostra
- **Visão geral:** contas, novas contas (24 h/7 d), quem voltou ao app, online agora, em chamada, servidores, mensagens, memória e banco, gráficos de 24 h/7 d/30 d.
- **Plano grátis:** Render (horas e memória), Supabase (tamanho do banco) e LiveKit (minutos de chamada), com uso, **previsão para o fim do mês** e a data em que o limite seria atingido no ritmo atual.
- **Próximo passo e custo:** cada limite mostra o plano que resolve, o que ele traz e o valor estimado em reais; no topo, a linha do tempo (qual limite estoura em qual dia) e o custo mensal "se continuar nesse ritmo". Preços em dólar conferidos nos sites oficiais em 26/10/2026 (Render US$ 7 ou US$ 25, Supabase Pro US$ 25, LiveKit Ship US$ 50); reais pelo câmbio `PLAN_USD_BRL` (padrão 5,50). **Os preços mudam: confirme antes de assinar** e atualize `UPGRADE` em `apps/server/src/admin.ts`.
- **Pessoas:** busca por nome/e-mail, e-mail confirmado, quando entrou, quando foi visto, papel.
- **Acessos:** cadastros, logins e aberturas do app (uma por 30 min por pessoa). **Não guarda IP.**

## De onde vêm os números (e o que é estimativa)
- Contas, acessos, online, chamadas: banco e servidor, exatos.
- **Horas do Render** = medições a cada 5 min enquanto a API está acordada × 5 min. **Minutos do LiveKit** = soma de pessoas na sala por minuto. Os provedores não dão esse dado por API no plano grátis, então são estimativas; a conta oficial está no painel de cada um.
- Limites usados (ajustáveis no Render se um plano mudar): `PLAN_RENDER_HOURS` (750), `PLAN_RENDER_MEM_MB` (512), `PLAN_DB_MB` (500), `PLAN_LIVEKIT_MINUTES` (5000). Confira os valores atuais nos sites dos provedores.
- Com o monitor de 5 min ligado 24 h, o Render fica ~744 h de 750: cabe, mas sem folga. O painel mostra isso como "Atenção".

## Custo
Uma gravação a cada 5 min e uma por minuto só enquanto há alguém em chamada. O painel consulta só enquanto está aberto e a janela visível. Dados antigos são apagados sozinhos (acessos 90 dias, medições 60 dias). Toda tabela nova precisa de `ENABLE ROW LEVEL SECURITY` (ver `docs/render.md`).

## Testes
`tools/bots/admin-test.mjs` (permissões e números; servidor com `OWNER_EMAILS=teste1@cohle.dev`) e `tools/bots/admin-ui-test.mjs` (tela, no Chrome).
