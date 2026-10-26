# Critérios de aceite (PRD, seção 12): evidências

Situação em 23/10/2026. Legenda: ✅ atendido, com teste ou comando como evidência · ⚠️ parcial ou dependente de ambiente que não existe nesta máquina (Docker, VPS, Asaas sandbox real, Lighthouse) · ❌ não atendido.

**Resumo: 20 ✅ · 6 ⚠️ · 0 ❌** (26 itens).

## Como reproduzir

| O quê | Comando |
| --- | --- |
| Unidade e integração (458 testes) | `pnpm -r test` |
| Tipos e lint | `pnpm -r typecheck` · `pnpm -r lint` |
| Fim a fim (17 testes, Chromium 390×844) | `pnpm e2e` (instale antes o navegador: `pnpm --filter @fuse/e2e exec playwright install chromium`) |
| Relatório visual lado a lado | `pnpm e2e:relatorio` → `e2e/relatorio-visual/index.html` |
| Cobertura de `packages/shared` | `pnpm --filter @fuse/shared exec vitest run --coverage` |
| Bundle inicial | `pnpm --filter @fuse/web build && pnpm --filter @fuse/web tamanho` |

O E2E roda a API real sobre um PGlite novo em memória, com o Asaas falso e o webhook real (D11). Os caminhos `e2e/testes/…` abaixo são os arquivos do Playwright. "API" são os testes de integração Vitest em `apps/api/test/`.

---

## Acesso e pagamento

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 1 | Conta sem pagamento confirmado recebe 402 em qualquer rota de conteúdo, e a PWA a redireciona para `/pagamento` | ✅ | API `guardas.test.ts` › "há rotas de conteúdo e todas exigem acesso" (percorre todo o registro `ROTAS`). E2E `01-acesso-pagamento.spec.ts` › "sem pagamento: rotas de conteúdo dão 402 e a PWA manda para /pagamento" (7 rotas da API com 402 e 5 telas redirecionadas). |
| 2 | No sandbox do Asaas, pagar o Pix libera o acesso em menos de 10 s, sem recarregar a página | ⚠️ | Com o Asaas **simulado**: E2E `01-acesso-pagamento.spec.ts` › "cadastro → Pix (QR e copia e cola) → webhook → acesso liberado → onboarding → /aprender" mede menos de 10 s entre o webhook e a tela "Seu acesso está liberado", sem reload (polling de 4 s). API `pagamento.test.ts` › "status consulta o Asaas depois de 60 s pendente (webhook atrasado)". **Falta** validar com o sandbox real: subir com `ASAAS_API_KEY` de sandbox, cadastrar o webhook (docs/DEPLOY.md, seção 1.6), pagar o QR pelo painel do sandbox e cronometrar. |
| 3 | Repetir o mesmo webhook 5 vezes não duplica nada | ✅ | API `pagamento.test.ts` › "webhook repetido 5 vezes não duplica nada". E2E `01-acesso-pagamento.spec.ts` › "webhook: token errado dá 401 e o repetido 5 vezes não duplica nada" (pedido `pago` e um só e-mail de boas-vindas). |
| 4 | Webhook com token errado recebe 401 e não altera nada | ✅ | API `pagamento.test.ts` › "webhook com token errado recebe 401 e não altera nada". E2E: mesmo teste do item 3 (continua 402 depois do 401). |
| 5 | O estorno revoga o acesso e derruba as sessões | ✅ | API `pagamento.test.ts` › "estorno revoga o acesso e derruba as sessões". E2E `01-acesso-pagamento.spec.ts` › "estorno (PAYMENT_REFUNDED) revoga o acesso e derruba as sessões" (`/api/me` → 401 e a PWA vai para `/entrar`). |

## Lição e gamificação

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 6 | Uma lição tem 5 questões e o VERIFICAR fica desabilitado até a seleção | ✅ | API `licao.test.ts` › "lição tem 5 questões, nunca envia gabarito antes e traz a dica da lição". E2E `02-licao.spec.ts` › "lição completa: …" ("Questão 1 de 5" e VERIFICAR `disabled` até marcar). Web `telas.test.tsx`. |
| 7 | O feedback mostra a explicação | ✅ | API `licao.test.ts` › "XP: 4 de 5 = 45; 5 de 5 = 65; feedback traz a explicação". E2E `02-licao.spec.ts` › "lição completa: …" (a folha contém a explicação do banco, no acerto e no erro). |
| 8 | Errar numa lição de trilha tira 1 vida; com 0 vidas a lição inicia e continua normalmente (vidas não travam o treino) | ✅ | API `licao.test.ts` › "errar tira 1 vida, mas com 0 vidas a lição continua: vidas nunca travam o treino". E2E `02-licao.spec.ts` › "lição completa: …" (5 → 4 vidas) e "com 0 vidas a lição inicia normalmente: vidas não travam o treino". `packages/shared/src/vidas.test.ts`. |
| 9 | XP de uma lição com 4 de 5 acertos é 45; com 5 de 5, é 65 | ✅ | `packages/shared/src/xp.test.ts`. API `licao.test.ts` › "XP: 4 de 5 = 45; 5 de 5 = 65 …". E2E `02-licao.spec.ts` › "lição completa: …" (45 XP) e "lição perfeita (5 de 5) vale 65 XP". |
| 10 | Uma questão errada aparece na revisão no dia seguinte e some depois de 4 acertos espaçados | ✅ | `packages/shared/src/revisao-dominio.test.ts`. API `revisao-simulado.test.ts` › "a questão errada aparece no dia seguinte e some depois de 4 acertos espaçados". E2E `03-revisao.spec.ts` › "a questão errada aparece em /revisar no dia seguinte, pode ser praticada e sai após 4 acertos espaçados" (relógio da API +1, +3, +7 e +15 dias, prática pela UI). |
| 11 | A ofensiva sobe com a primeira lição do dia e zera depois de um dia sem estudo e sem protetor | ✅ | `packages/shared/src/gemas-ofensiva.test.ts`. API `licao.test.ts` › "sobe com a primeira lição do dia e zera depois de um dia sem estudo e sem protetor" e "protetor salva a ofensiva". Worker `jobs.test.ts` › "00:05 ofensiva zera sem protetor e consome protetor quando há". E2E `02-licao.spec.ts` › "lição completa: …" (tela "1 dia de ofensiva!"). |
| 12 | A liga fecha no domingo, move os 3 primeiros e os 3 últimos e cria os grupos novos | ✅ | `packages/shared/src/liga-conquistas.test.ts`. Worker `jobs.test.ts` › "3 primeiros sobem (+50 gemas), 3 últimos descem, cria grupos novos", "empate: vence quem chegou primeiro; …" e "todos os jobs da seção 8.7 com os horários certos" (domingo 23:59, São Paulo). |

## Simulado

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 13 | O simulado tem exatamente 5/5/5/25 questões do cargo (ou a distribuição do edital) | ✅ | `packages/shared/src/simulado.test.ts`. API `revisao-simulado.test.ts` › "tem exatamente 5/5/5/25 do cargo, relógio de 4 h no servidor e sem gabarito". E2E `04-simulado.spec.ts` › "iniciar, responder, entregar e ver o resultado com os pesos 2,0 e 2,8" (40 questões: 5/5/5/25). Modo edital: API `admin.test.ts` › "modo edital: publicar troca os cargos, …". |
| 14 | O cronômetro é do servidor e a entrega é automática ao fim das 4 h | ✅ | API `revisao-simulado.test.ts` › "entrega automática quando as 4 h acabam (verificada na leitura)" e "a varredura entrega os simulados vencidos de todos". E2E `04-simulado.spec.ts` › "o cronômetro é do servidor e a entrega é automática ao fim das 4 h" (relógio da API +4 h 1 min → "Entregue automaticamente quando o tempo acabou."). |
| 15 | A nota é calculada com os pesos 2,0 e 2,8 | ✅ | `packages/shared/src/simulado.test.ts`. API `revisao-simulado.test.ts` › "nota com pesos 2,0 e 2,8; …". E2E `04-simulado.spec.ts` › "iniciar, responder, entregar …" (3 comuns + 2 específicas certas = "11,6 de 100,0 pontos", blocos "3/5 · 6,0 pts" e "2/25 · 5,6 pts"). |

## Conteúdo

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 16 | Nenhuma questão `rascunho`, `anulada` ou `retirada` aparece para o aluno | ✅ | API `conteudo-offline.test.ts` › "rascunho, revisão, anulada e retirada nunca aparecem para o aluno". `packages/db/src/db.test.ts` › "todas as questões do seed são autorais, rascunho, …". E2E `05-admin.spec.ts` › "login de admin, painel abre, editar e publicar uma questão" (volta a questão para rascunho e publica de novo, com revisão humana obrigatória). |
| 17 | Retirar uma questão no admin a remove do app do aluno no próximo carregamento, inclusive offline | ✅ | API `conteudo-offline.test.ts` › "retirar uma questão no admin a remove do pacote offline e muda a versão do conteúdo" e "sync rejeita questão retirada e sessão desconhecida". Web `offline.test.ts` › "invalida o pacote quando a versão do conteúdo muda". |
| 18 | Toda questão `fau_real` mostra o chip de origem | ✅ | API `conteudo-offline.test.ts` › "questão fau_real mostra o chip de origem; retirar a prova some com ela". A PWA mostra o `chipOrigem` vindo da API (`apps/web/src/telas/licao/Licao.tsx`). No E2E o seed só tem autorais, que mostram "Questão Fuse Aprova · estilo FAU" (captura `05-Questao`). |

## PWA

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 19 | O app é instalável no Android e iOS. O Lighthouse PWA passa | ⚠️ | O build gera `manifest.webmanifest` (nome, `start_url /aprender`, `display standalone`, ícones 192/512 e maskable), `sw.js` (Workbox, precache do shell) e `apple-touch-icon` (`apps/web/vite.config.ts`). O E2E `07-offline.spec.ts` confirma que o service worker controla a página e serve o app sem rede. **Falta:** instalar num Android e num iPhone de verdade, em HTTPS, e rodar o Lighthouse. Atenção: o Lighthouse 12 tirou a categoria "PWA"; use o Lighthouse 11 (`npx lighthouse@11 https://app… --only-categories=pwa`) ou o painel Application › Manifest do Chrome. |
| 20 | Em modo avião, o aluno faz a próxima lição e a revisão vencida. Ao voltar a conexão, o XP sincroniza sem duplicar | ✅ | E2E `07-offline.spec.ts` › "em modo avião faz a próxima lição; ao voltar a conexão o XP sincroniza sem duplicar" (contexto offline, lição inteira pelo pacote, sync automático +65 XP e reenvio do mesmo lote com 0 aceitas e 0 XP). Web `offline.test.ts` › "em modo avião faz a próxima lição pelo pacote, enfileira e sincroniza sem duplicar". API `conteudo-offline.test.ts` › "pacote com as próximas 3 lições e a revisão vencida, gabarito cifrado" e "sync idempotente por id_cliente: …". A revisão vencida offline está coberta pelo pacote (API e web); o E2E não a percorre na UI. |

## Qualidade

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 21 | As 13 telas batem visualmente com `design/png` em 390×844 (Playwright, tolerância de 2%) | ⚠️ | Pela D1, o visual segue `Telas_referencia/` (mockups gerados por IA, sem pixel exato), e a comparação com `design/png` não se aplica mais. E2E `06-visual.spec.ts` › "Visual: as 13 telas em 390×844": `toHaveScreenshot` com `maxDiffPixelRatio 0.02` contra a linha de base em `e2e/testes/__capturas__/win32/` (regressão estável em 4 execuções seguidas). `pnpm e2e:relatorio` monta o lado a lado com `Telas_referencia/`. **Falta:** a revisão humana do relatório e a aprovação do dono. A tela 13 (Simulado) não tem referência nova. |
| 22 | Axe sem violações sérias. Toda a lição é navegável por teclado | ✅ | E2E `08-acessibilidade.spec.ts` › "telas públicas e pagamento sem violações sérias" e "telas do aluno e lição sem violações sérias" (axe-core, WCAG 2.0/2.1 A e AA, falha em `serious`/`critical`; 13 telas, incluindo a questão e o feedback). E2E `02-licao.spec.ts` › "a lição inteira é navegável só pelo teclado" (letra, Enter para verificar e continuar, foco no CONTINUAR do fim e da ofensiva). Web `ui.test.tsx` (axe nos componentes). |
| 23 | LCP < 2,5 s em 4G lento no Moto G (Lighthouse mobile). Bundle inicial < 200 kB gzip | ⚠️ | Bundle ✅: `pnpm --filter @fuse/web tamanho` → **111,9 kB gzip** (limite 200 kB). LCP: **não medido** (sem Lighthouse nesta máquina). Para validar: `npx lighthouse https://app… --preset=perf --form-factor=mobile --throttling-method=simulate` (o padrão mobile do Lighthouse emula o Moto G Power em 4G lento) e conferir LCP < 2,5 s. |
| 24 | Testes de unidade de `packages/shared` (XP, ofensiva, revisão, liga, CPF, nota do simulado) com 100% de linhas | ✅ | `pnpm --filter @fuse/shared exec vitest run --coverage` → **100% de linhas**, 100% de funções e de statements (99,44% de branches). O `vitest.config.ts` de shared trava os limites em 100%. |

## Infra

| # | Critério | Situação | Evidência |
| --- | --- | --- | --- |
| 25 | `docker compose up -d` na VPS sobe tudo com HTTPS | ⚠️ | Docker indisponível nesta máquina. O compose, os Dockerfiles e o nginx estão em `infra/` e `deploy/`, e o TLS fica no nginx do host com certbot (D12, `docs/DEPLOY.md`). **Validar na VPS:** seguir `docs/DEPLOY.md` (seções 1.3 e 1.4), depois `docker compose ps` (todos `healthy`) e `curl -I https://www.fuseaprova.com.br/api/saude`. |
| 26 | O backup diário existe e o restore está documentado e testado | ⚠️ | Existem `infra/backup/backup.sh`, `restore.sh` e `teste-restore.sh`. O worker agenda o backup (worker `jobs.test.ts` › "roda o script e registra a falha" e "todos os jobs da seção 8.7 com os horários certos"), e o restore está documentado em `docs/DEPLOY.md` (seções 4 e 5). **Falta** rodar na VPS: `bash /root/fuseaprova/deploy/backup/teste-restore.sh` deve terminar com "TESTE DE RESTORE OK". |

---

## Itens ⚠️ (o que falta)

1. **#2 Pix no sandbox real:** testar com a chave de sandbox do Asaas e o webhook cadastrado.
2. **#19 Instalável e Lighthouse PWA:** instalar em Android e iOS e rodar o Lighthouse 11 em HTTPS.
3. **#21 Visual:** revisão humana do `e2e/relatorio-visual/index.html` (a linha de base de regressão já passa).
4. **#23 LCP:** Lighthouse mobile em produção (o bundle já está dentro do limite).
5. **#25 Docker + HTTPS** na VPS.
6. **#26 Restore testado** na VPS com `teste-restore.sh`.

Fora da seção 12, segue pendente o conteúdo da Câmara de Palmital (Lei Orgânica e Estatuto, D5): as unidades têm só questões genéricas da Constituição Federal.
