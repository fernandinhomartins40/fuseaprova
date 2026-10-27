# Inventário da aplicação: Fuse Aprova

- **Data:** 27/10/2026
- **Commit de partida:** `6a2cb43`
- **Ambiente:** Windows 11, Node 24.21, pnpm 10.28. Banco PGlite em memória nos testes. Sem Docker local.
- **Método:** leitura do registro tipado de rotas (`packages/shared/src/api/rotas.ts`, `superadmin.ts`, `admin-*.ts`), de `apps/api/src/app.ts`, de `apps/worker/src/agenda.ts` e das rotas de tela do `apps/web`.
- **Estado de cada linha:** vem da [MATRIZ_VERIFICACAO.md](MATRIZ_VERIFICACAO.md).

## 1. Arquitetura

| Camada | Pasta | Stack | Observação |
|---|---|---|---|
| API | `apps/api` | Fastify 4, Zod, Drizzle | Todas as 140 rotas de negócio passam por `criarRegistrador` (`apps/api/src/http/registrar.ts`), que aplica a guarda, o rate limit, a validação Zod da entrada e da **resposta** e o modo manutenção. Fora do registro há 3 rotas: `/api/saude`, `/api/arquivos/uploads/:nome` e `/api/super/comprovantes/:nome`. |
| Worker | `apps/worker` | node-cron no fuso de São Paulo | 8 jobs (`JOBS_WORKER` em `packages/shared/src/api/superadmin.ts`). Cada execução fica registrada em `jobs_execucoes`. |
| Web (PWA) | `apps/web` | React, Vite, vite-plugin-pwa (Workbox `generateSW`) | Áreas do aluno, `/admin` e `/super`. Modo offline com IndexedDB (`src/offline`). |
| Regras puras | `packages/shared` | TS + Zod | XP, vidas, gemas, ofensiva, revisão, liga, simulado, CPF, datas em São Paulo. Cobertura de linhas: 100%. |
| Dados | `packages/db` | Drizzle + Postgres (PGlite nos testes) | 5 migrações; a `0004_pacotes_offline` foi criada nesta auditoria. |
| Coletor | `packages/crawler` | Node | Coleta FAU/PCI, importação de PDF para `rascunho` e recorte de figuras. |
| Infra | `deploy/`, `infra/`, `.github/workflows/deploy.yml` | Docker Compose, nginx, GHCR | Deploy por push na `main`. VPS compartilhada. |

## 2. Guardas (negar por padrão)

| Guarda | Efeito | Rotas |
|---|---|---|
| `nenhuma` | pública | cadastro, login, recuperar, redefinir, config pública |
| `webhook` | token Asaas comparado em tempo constante; sem token, 401 | `/webhooks/asaas` |
| `login` | sessão obrigatória (401) | `/me*`, `/auth/sair`, `/pagamento/*` |
| `acesso` (`exigirAcesso`) | sessão + pagamento; sem pagamento, **402**; respeita o modo manutenção | 25 rotas de conteúdo, estudo, offline, push, liga e simulado |
| `admin` | papel admin, ou superadmin com 2FA (403) | 52 rotas `/admin/*` |
| `superadmin` | papel superadmin + 2FA confirmado na sessão | 41 rotas `/super/*` |
| `superadmin_2fa` | papel superadmin (configurar o 2FA) | 4 rotas `/super/2fa*` |

## 3. Jornadas: tela → endpoint → serviço → dado → permissão → teste

| ID | Domínio | Jornada | UI | API | Serviço / persistência | Permissão | Teste (evidência) |
|---|---|---|---|---|---|---|---|
| J01 | Conta | Cadastro com CPF, celular e aceite | `/cadastro` | `POST /auth/cadastro` | `rotas/auth.ts` → `usuarios` | nenhuma + rate limit | `apps/api/test/auth.test.ts`, `apps/web/src/telas/telas.test.tsx`, `e2e/testes/01-*` |
| J02 | Conta | Login e sessão por cookie | `/entrar` | `POST /auth/login`, `/auth/sair` | `servicos/sessoes.ts` → `sessoes` | nenhuma / login | `auth.test.ts`, E2E |
| J03 | Conta | Recuperação de senha | `/recuperar`, `/recuperar/:token` | `POST /auth/recuperar`, `/auth/redefinir` | `servicos/senhas.ts` → `redefinicoes_senha` + e-mail | nenhuma | `auth.test.ts` (API); sem teste de UI |
| J04 | Pagamento | Pix R$ 397, status, webhook | `/pagamento` | `POST /pagamento/pix`, `GET /pagamento/status`, `POST /webhooks/asaas` | `servicos/pagamento.ts`, `webhook.ts` → `pedidos`, `webhook_eventos` | login / webhook | `apps/api/test/pagamento.test.ts`, E2E com Asaas falso |
| J05 | Onboarding | Cargo, meta, push | `/onboarding` | `PATCH /me`, `/push/*` | `rotas/me.ts`, `social.ts` | login / acesso | `telas.test.tsx` (parcial) |
| J06 | Estudo | Trilha e guia | `/aprender`, `/guia/:id` | `GET /trilha`, `/guia/:id`, `/concurso` | `servicos/trilha.ts` | acesso | `licao.test.ts`, E2E |
| J07 | Estudo | Lição (responder, dica, concluir, baú) | `/licao/:id` | `POST /licoes/:id/iniciar`, `/sessoes/:id/*`, `/licoes/:id/abrir-bau` | `servicos/estudo.ts`, `progresso.ts` → `sessoes_estudo`, `tentativas`, `xp_eventos` | acesso | `licao.test.ts`, E2E 02 |
| J08 | Estudo | Revisão espaçada | `/revisar`, `/revisar/praticar` | `GET /revisao`, `POST /revisao/iniciar` | `estudo.ts` → `revisoes` | acesso | `revisao-simulado.test.ts`, E2E |
| J09 | Estudo | Simulado de 4 h | `/simulado`, `/simulado/:id` | `/simulados*` | `servicos/simulado.ts` → `simulados` | acesso | `revisao-simulado.test.ts`, E2E |
| J10 | Social | Liga semanal | `/liga` | `GET /liga`, `POST /liga/resultado/visto` | `progresso.ts` + job `fechar-liga` | acesso | `social.test.ts`, `worker/test/jobs.test.ts` |
| J11 | Perfil | Estatísticas, conquistas, protetor | `/perfil`, `/configuracoes` | `GET /perfil/estatisticas`, `POST /me/protetores` | `social.ts`, `me.ts` | acesso | `social.test.ts` |
| J12 | Offline | Pacote e sync | todas as telas de estudo | `GET /offline/pacote`, `POST /sync/tentativas` | `servicos/offline.ts` → `pacotes_offline` (novo), `tentativas` | acesso | `conteudo-offline.test.ts`, `apps/web/src/offline/offline.test.ts` |
| J13 | Notificação | Push e lembretes | `/onboarding`, `/configuracoes` | `/push/*` | job `enviar-lembretes`, SW `public/sw-push.js` (novo) | acesso | `social.test.ts`, `jobs.test.ts` |
| J14 | LGPD | Exportar e excluir conta | `/configuracoes` | `GET /me/exportar`, `DELETE /me` | `servicos/lgpd.ts` | login | `auth.test.ts`/`social.test.ts` (API) |
| J15 | Admin | Questões, lote, importação, uploads, reports | `/admin/questoes*`, `/admin/importacao*`, `/admin/reports` | `/admin/questoes*`, `/admin/importacoes*`, `/admin/uploads`, `/admin/reports*` | `rotas/admin/conteudo.ts` | admin | `admin.test.ts` (parcial: uploads e reports sem teste funcional) |
| J16 | Admin | Trilhas, concursos, cargos, edital, provas | `/admin/trilhas`, `/admin/concursos`, `/admin/edital` | `/admin/unidades|secoes|licoes|trilhas|concursos|cargos|edital|provas*` | `rotas/admin/conteudo.ts` | admin | `admin.test.ts` (parcial) |
| J17 | Admin | Usuários, pedidos, reembolso, auditoria | `/admin/usuarios*`, `/admin/pedidos`, `/admin/auditoria` | `/admin/usuarios*`, `/admin/pedidos*`, `/admin/auditoria` | `rotas/admin/gestao.ts` | admin | `admin.test.ts` |
| J18 | Superadmin | 2FA, usuários, pagamentos, Asaas, webhooks, financeiro, comunicação, sistema, equipe | `/super/*` | 45 rotas `/super/*` | `rotas/super/*` | superadmin (+2FA) | `superadmin.test.ts`, `totp.test.ts`, `superadmin-cli.test.ts` |
| J19 | Arquivos | Imagens de enunciado e comprovantes | `<img>` nas questões / ficha do super | `GET /api/arquivos/uploads/:nome`, `/api/super/comprovantes/:nome` | `app.ts` (regex de nome, sem traversal) | acesso ou admin / superadmin | prova R1 (402 sem acesso; `..%2f` barrado) |
| J20 | Worker | 8 jobs: liga, vidas, ofensivas, lembretes, Pix, limpeza, backup, comunicações | n/a | n/a | `apps/worker/src/jobs/*` | interno | `apps/worker/test/jobs.test.ts` |
| J21 | Coletor | Coleta FAU/PCI, PDF para rascunho, figuras | CLI | n/a | `packages/crawler` | operador | `packages/crawler/test/*` (fixtures) |
| J22 | Infra | Deploy, rollback, backup, HTTPS | n/a | `/api/saude` | `deploy/`, `infra/`, workflow | n/a | ver BANCA_R5 e RELATORIO_PERFORMANCE_VPS |

## 4. Dados pessoais e recursos pagos

- **Dados pessoais:**
  - Em `usuarios`: nome, e-mail, CPF, celular, IP e user agent da sessão.
  - Em `pedidos`: id do cliente Asaas.
  - Em `auditoria`: detalhes, que podem incluir nome, e-mail e celular (R1-09).
  - Também nos backups `pg_dump`.
- **Recurso pago:**
  - Todo o conteúdo fica atrás da guarda `acesso`, que exige `usuarios.acesso = true`.
  - Quem liga o acesso:
    - o webhook ou a consulta ao Asaas;
    - a aprovação manual do superadmin;
    - a liberação manual do admin (prevista no PRD).
  - Quem desliga o acesso:
    - o estorno ou chargeback;
    - a revogação pelo admin ou pelo superadmin;
    - a exclusão da conta.
- **IA:** não há recursos de IA na aplicação. A seção 5.5 do protocolo **não se aplica**.
- **Multi-tenant:** não há. Os alunos são isolados pelo `usuarioId` em cada consulta, o que é verificado como IDOR em R1.
