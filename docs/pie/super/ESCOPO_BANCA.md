# Escopo comum da banca: painel superadmin (`/super`)

- **Data:** 28/10/2026
- **Commit de partida:** `2f71392` (main)
- **Modo:** AUDITORIA + CORREÇÃO (a banca só audita; as correções são do Auditor-Chefe depois da consolidação)
- **Protocolo:** `PROTOCOLO_UNIVERSAL_AUDITORIA_INTEGRAL_PIE_V2.md` (raiz do repositório)
- **Auditoria anterior:** `docs/pie/*.md` (27/10/2026, app inteiro). Não reutilize as provas dela como atuais.

## Requisitos do dono para esta rodada (critérios de aceite)

- **RQ1. Superadmin fora do app de estudo, com a gestão de conteúdo dentro do painel dele.** Revisado pelo dono em 28/10/2026, substitui a versão anterior.
  - **O superadmin é o dono e administra tudo.** Cuida do negócio (dinheiro, Asaas, preços, cupons, usuários, equipe, comunicação, sistema, auditoria) **e** da gestão de conteúdo.
  - **Fora do app de estudo do aluno.** Ele **não** entra no app de estudo do aluno nem consome o conteúdo como aluno: trilha, lições, revisão, simulado, liga, guias, offline e a guarda `acesso`.
  - **Conteúdo como seção do `/super`.** A gestão de conteúdo (questões, assuntos, concursos, editais, provas, importação, tudo o que o `/admin` faz hoje) deixa de ser um painel à parte. Hoje há o link "Conteúdo (/admin)" na sidebar, que leva a outro painel. Passa a ser uma seção do próprio painel `/super`, com a mesma sidebar, o mesmo layout e a mesma navegação.
  - **O papel `admin` continua, restrito**, para a equipe de conteúdo. Tem login próprio e vê **só** a seção Conteúdo, no mesmo layout, sem dinheiro, usuários, Asaas, equipe, comunicação, sistema e auditoria. Também não entra no app de estudo.
- **RQ2. Logins separados.** Cada papel tem a sua página de login e o seu endpoint de login:
  - aluno em `/entrar`;
  - admin (equipe de conteúdo) em uma página própria;
  - superadmin em uma página própria.

  Uma conta de um papel não entra pela página de outro.
- **RQ3. Painel completo e funcionando.** Tudo o que a D13 e a D23 (`docs/DECISOES.md`) descrevem, mais tudo o que a interface do `/super` oferece (botões, links, filtros, exportações), precisa estar implementado de ponta a ponta e funcionar: UI → API → regra → banco → auditoria. Hoje o painel depende de rotas do `/admin` para algumas ações (por exemplo, liberar ou revogar acesso). Isso precisa ser revisto à luz do RQ1 revisado:
  - **Ações de negócio** do `/admin` (gestão de alunos, liberar e revogar acesso, painel) passam a ser só do superadmin.
  - **Conteúdo** é compartilhado pelo superadmin e pelo admin.
  - Todas as telas do `/admin` também entram no RQ3: a seção Conteúdo precisa funcionar.

- **RQ4. Estorno e liberação manual no pagamento (pedido do dono, 28/10/2026).** A tela do pagamento (`/super/pagamentos/:id`) precisa de dois botões claros:
  - **Estornar.**
  - **Liberar acesso manualmente.** Serve para quando o sistema falhou em liberar, mesmo com o Pix comprovado. Os casos:
    - o pedido está pago e o concurso não foi liberado;
    - o Pix foi pago e o webhook nunca chegou;
    - o aluno já tem outro concurso liberado.
  - **O que se sabe hoje** (`PagamentoDetalhe.tsx:132-137`):
    - "Aprovar pagamento manual" só aparece com `status !== 'pago' && !usuario.acesso`. Some quando o aluno tem acesso a **qualquer** concurso (D21) e quando o pedido já está pago sem a liberação.
    - Não existe ação para refazer a liberação do concurso de um pedido pago.
    - "Reembolsar" só aparece para Pix do Asaas pago.
  - **O que verificar:**
    - se a liberação manual respeita o concurso e o valor do pedido (D21/D23);
    - se é idempotente e auditada;
    - se não vira acesso gratuito.

## Estado atual conhecido (ponto de partida, verifique)

- **Papéis:** `PAPEIS = aluno | admin | superadmin` (`packages/shared/src/dominio.ts:56`). `ehAdmin` inclui o superadmin (`:66`).
- **Guardas da API:** `apps/api/src/http/registrar.ts:86-118`.
  - `admin`: aceita superadmin com 2FA.
  - `acesso`: aceita qualquer papel com `usuarios.acesso = true`, e `superadminCli.ts:52` liga `acesso: true` para o superadmin.
  - A manutenção (`:121`) e `app.ts:177` liberam quem é `ehAdmin`.
- **Login:** um único `POST /auth/login` (`apps/api/src/rotas/auth.ts`), que devolve `proximo` (`dois_fatores` | `admin` | ...). Uma única tela, `/entrar` (`apps/web/src/telas/Entrar.tsx`). A recuperação de senha também é única.
- **Web:** guardas `apps/web/src/app/Guarda.tsx`. `/admin/*` e `/super/*` estão em `apps/web/src/app/App.tsx:210-228`. Módulo do painel em `apps/web/src/super/` (13 telas em `telas/`, `Layout.tsx` com link para o `/admin`, `acoes.tsx`, `componentes.tsx`).
- **API do super:** `apps/api/src/rotas/super/*.ts` (asaas, comum, comunicacao, financeiro, pagamentos, precos, seguranca, sistema, usuarios), com 55 rotas de guarda `superadmin` e `superadmin_2fa` em `packages/shared/src/api/rotas.ts` (~linhas 900-1380). Contratos Zod em `packages/shared/src/api/superadmin.ts`.
- **Rotas de admin usadas pelo super:** `apps/api/src/rotas/admin/gestao.ts`. Ver as linhas 272 e 369 (casos especiais de superadmin).
- **Worker:** `apps/worker/src/jobs/` (`enviar-comunicacoes`, backup, ...). O `/super/sistema` lê as execuções em `jobs_execucoes`.
- **Testes:**
  - `apps/api/test/superadmin.test.ts`, `superadmin-cli.test.ts`, `admin.test.ts`, `auth.test.ts`;
  - `apps/web/src/super/testes/super.test.tsx`;
  - `e2e/testes/`.

## Ambiente disponível

- **Sistema:** Windows 11, Node 24, pnpm 10. Comandos:
  - `pnpm --filter @fuse/api test`;
  - `pnpm --filter @fuse/web test`;
  - `pnpm typecheck`;
  - `pnpm lint`.
- **Testes com PGlite:** por padrão, os testes usam PGlite em memória.
- **Postgres 16 real:** já está rodando em `127.0.0.1:55432`, usuário `fuse`, sem senha. Use `TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres` para rodar os testes da API no banco real (um banco novo por arquivo).
- **Produção:** **sem acesso nesta rodada.** A leitura via SSH foi negada pela política da sessão. Não tente. O que depender de produção vira **BLOQUEADO**.
- **Asaas:** sem credencial de sandbox. Os testes usam o cliente falso dos testes.

## Regras para os revisores

- **Somente auditoria.** Não altere nenhum arquivo do repositório além do seu próprio parecer em `docs/pie/super/`.
  - Testes de prova ficam no seu scratchpad, fora do repositório.
  - O PIE V1 usou `npx vitest run --globals --dir <scratchpad>/...` com imports apontando para o projeto.
- **Cada achado:** ID (`Rn-xx`), severidade, estado (CONFIRMADO, FORTE INDÍCIO, HIPÓTESE ou NÃO REPRODUZIDO), arquivo:linha, reprodução, esperado × observado, evidência, impacto, correção proposta e teste de aceite.
- **Avaliação dos requisitos:** RQ1, RQ2 e RQ3 são avaliados por todos, cada um pela sua ótica.
- **Seu parecer termina com:**
  - o que foi inspecionado;
  - o que foi testado (comando e resultado);
  - o que não foi testado e por quê;
  - limitações.
- **Idioma:** português do Brasil. Não invente cliques, capturas, métricas nem execuções. Não exponha segredos nem dados pessoais.
