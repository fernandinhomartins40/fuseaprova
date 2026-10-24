# Decisões de implementação

Registro das decisões tomadas onde o PRD, o CLAUDE.md e os pacotes de design divergem ou não cobrem o caso.

## D1. Direção visual: nova linguagem 4K (23/10/2026, decisão do dono)
- O visual segue `Fuse_Aprova_Assets_4K/` e `Telas_referencia/`, e não as telas de `design/png` / `design/html`.
- **Paleta:** petróleo `#00545D`, turquesa `#008A92`, laranja `#FF6A16`, marfim `#FAF8F2`, texto `#123F42` (veja `Guias_visuais/10_Paleta_de_cores.png`). Os tokens do kit (`design/tokens.css`) são reescritos com essa paleta em `apps/web/src/styles/tokens.css`, mantendo os papéis semânticos (acerto verde, erro vermelho, seleção azul, simulado roxo, XP dourado) do `docs/DESIGN-SYSTEM.md`.
- **Tipografia:** continua com Baloo 2 e Nunito auto-hospedadas (`design/fonts`), conforme `Guias_visuais/11_Guia_tipografico.png` quando houver diferença de peso/tamanho.
- **Mascote e ícones:** os PNGs 4K são as matrizes. Um script gera versões WebP redimensionadas (nunca se serve o PNG 4K). A Capi em SVG de `design/mascote` não é usada.
- **Layouts:** cada tela usa a composição da tela correspondente em `Telas_referencia/`. Telas do PRD sem referência nova (Simulado e as ✏️) usam a composição de `design/html` restilizada com a nova paleta e os novos assets.
- **Comportamento:** continua 100% o PRD. Ex.: a tela `/aprender` (referência `04_Inicio.png`) mantém a trilha em zigue-zague com nós concluída/atual/bloqueada/baú/troféu, abaixo do bloco de saudação, estatísticas, "Seu próximo treino" e meta do dia.
- **Navegação inferior:** Início · Revisar · Simulados · Liga · Perfil, com os ícones 4K da navegação.
- **Critério de aceite visual:** a comparação de 2% com `design/png` não se aplica mais. Os mockups de `Telas_referencia` são imagens de composição geradas por IA (365 px de largura, sem pixel exato), então o teste Playwright gera um snapshot por tela em 390×844 como linha de base de regressão (tolerância 2%) e um relatório lado a lado com a referência para revisão humana.

## D2. Estrutura do repositório
- O conteúdo de `fuse-aprova-kit/` foi movido para a raiz (`CLAUDE.md`, `docs/`, `design/`, `dados/`), como manda o README do kit.

## D3. Banco nos testes
- Os testes de integração da API e do banco rodam com PGlite (Postgres em WebAssembly, in-process) usando as mesmas migrações Drizzle, para não depender do Docker no ambiente de desenvolvimento. Em produção é PostgreSQL 16 no Docker Compose.

## D4. Monorepo: TypeScript sem build entre pacotes
- Todos os pacotes são ESM (`"type": "module"`), TypeScript estrito (`tsconfig.base.json`, `moduleResolution: NodeNext`, imports relativos com `.js`).
- Os pacotes internos (`@fuse/shared`, `@fuse/db`) exportam o código-fonte pela condição `@fuse/source` (`exports` → `src/*.ts`) e o build (`dist/`) como padrão. TypeScript (`customConditions`), Vite/Vitest (`vitest.shared.ts`) e tsx (`--conditions=@fuse/source`) usam o código-fonte direto; em produção, `pnpm build` gera `dist/`.
- O drizzle-kit roda via tsx (`pnpm --filter @fuse/db generate`), porque o carregador próprio dele não resolve imports `.js` → `.ts`.

## D5. Seed de desenvolvimento: `SEED_DEV_PUBLICAR`
- As questões de exemplo do seed são **autorais**, sem prova de origem, e entram como `rascunho` (CLAUDE.md). Como o app não mostra rascunho, `SEED_DEV_PUBLICAR=1 pnpm --filter @fuse/db seed` (ou `semear(db, { publicarAutorais: true })`) marca **só as autorais do seed** como `publicada`, para desenvolvimento.
- O seed recusa essa opção com `NODE_ENV=production`. Em produção, publicar exige revisão humana no painel (PRD 7.4).
- O seed é idempotente: ids determinísticos (UUID v5 a partir de chaves legíveis), `ON CONFLICT DO NOTHING` no conteúdo (não sobrescreve edições do admin) e `ON CONFLICT DO UPDATE` só nos campos de catálogo de `provas_origem`.
- As unidades de Lei Orgânica e Estatuto de Palmital têm só questões genéricas da Constituição Federal (arts. 29–31, 37, 39, 41). **TODO:** obter o texto vigente na Câmara Municipal de Palmital-PR e escrever as questões específicas.
- Estrutura das unidades do seed: 3 lições normais por seção (mínimo do PRD 7.1), baú a cada 3 lições e desafio de 10 questões no fim da unidade. Português e Administrativo têm 10 questões por seção (2 lições inteiras sem repetir); Matemática e Conhecimentos Gerais têm 5 por seção, e as lições seguintes reaproveitam as questões menos vistas.
- `provas_origem` recebe os 246 certames do catálogo FAU e também as 51 provas da amostra do PCI (`fonte = 'pci'`). O catálogo não traz UF: os certames com `relevancia_palmital = true` (Paraná, 2022+) recebem `uf = 'PR'`; os demais ficam sem UF até o coletor confirmar. O `slug_fau` não é único no catálogo (6 páginas FAU têm 2 certames), por isso não há unique nele.

## D6. Banco: colunas e tabelas além da seção 9 do PRD
Marcadas com "extra" em `packages/db/src/schema/tabelas.ts`. As principais:
- `concursos.slug`, `versao_conteudo` (invalida cache do service worker e o pacote offline), `edital_publicado_em`.
- `cargos.generico`, `conteudo_programatico`, `ordem`, `ativo` (edital por cargo, PRD 5.17). `distribuicao` aceita `pesos` opcionais se o edital mudar 2,0/2,8.
- `provas_origem.nome`, `tipo`, `regime`, `data_prova`, `url_pagina`, `relevancia_palmital`, `fonte` e `status` (`ativa`/`retirada`, retirada rápida de uma prova inteira).
- `questoes.dica` (a dica do botão DICA, que o editor do admin pede; sem ela usa a do assunto), `atualizado_em`; unique `(prova_origem_id, numero_origem)` e check que obriga `fau_real` a ter prova e `autoral` a não ter.
- `licoes.titulo` e `dica_*` (dica própria da lição, PRD 5.17 "definindo a dica de cada lição").
- `usuarios.notificacoes`, `asaas_customer_id`, `onboarding_concluido_em`, `ultimo_push_em`, `atualizado_em`; `cpf` e `senha_hash` anuláveis para a anonimização (LGPD).
- `sessoes_estudo.questoes` (sorteio), `sessao_origem_id` (REVISAR ERROS), `id_cliente` (offline).
- `tentativas.offline`; `simulados.distribuicao`, `entrega_automatica`, `xp_ganho`; `xp_eventos.sessao_estudo_id`/`simulado_id`.
- `ligas_membros.semana` (unique por usuário e semana), `posicao_final`, `resultado_visto_em` (modal semanal); `ligas_grupos.fechado_em`.
- `reports.nota`/`resolvido_em`; `pedidos.reembolso_solicitado_em`/`estornado_em`; `webhook_eventos.erro`.
- Tabelas novas: `arquivos_coletados` (hash dos arquivos do coletor) e `importacoes` (fila de importação do painel).
- Enums do Postgres gerados a partir das listas de `@fuse/shared` (fonte única).

## D7. Regras de jogo onde o PRD não detalha
- **Desafio da unidade** é uma lição: soma +10 por acerto, +5 de conclusão, +10 se perfeito e +30 com 70%+ (coroa). Não gasta vida.
- **Revisão** dá só +10 por acerto (não é "concluir lição") e +1 vida por acerto. Contar 10 questões de revisão no dia vale a ofensiva.
- **Vencimento da revisão**: "+N dias" vence às 00:00 (São Paulo) de hoje + N, para a questão errada à noite já aparecer de manhã ("volta na sua revisão amanhã"). Acertar um item antes de vencer (por exemplo, numa lição nova) não avança a etapa.
- **Vidas**: `vidas_atualizado_em` é a referência da recarga (+1 a cada 4 h). Perder vida com o estoque cheio inicia a contagem na hora da perda. A normalização (meia-noite e recarga) é preguiçosa, feita a cada leitura, além do job das 00:00.
- **Ofensiva**: `ultimo_dia_estudo` guarda o último dia coberto (estudado ou salvo por protetor). Cada dia perdido consome 1 protetor; se não houver protetores para todos os dias perdidos, a ofensiva zera e nenhum protetor é gasto. Marcos 7/30/100 dão gemas sempre que atingidos.
- **Liga**: da Diamante não se sobe; `alcancado_em` muda a cada ganho de XP (empate: quem chegou primeiro). Novo membro vai para o grupo com vaga mais cheio.
- **Lição**: 4 novas + 1 revisão vencida (nunca a primeira); faltando novas, completa com revisões. Novas priorizam as nunca respondidas e depois as vistas há mais tempo.
- **Protetor de ofensiva**: compra por `POST /me/protetores` (o PRD lista o custo, mas não a rota).
- **Gabarito offline**: AES-GCM com chave por pacote, enviada no próprio pacote (a cifra evita gabarito legível em cache; a fonte da verdade continua o servidor, que recalcula tudo no sync).
- **Rotas além da tabela do PRD 10**: `POST /me/senha`, `POST /me/protetores`, `POST /licoes/:id/abrir-bau`, `POST /liga/resultado/visto`, `GET /push/chave` e as rotas `/admin/**` detalhadas em `packages/shared/src/api/rotas.ts`.

## D8. API e worker: decisões de implementação (23/10/2026)
- **Migração 0001** `sessoes_estudo.dicas_usadas uuid[]`: questões em que o aluno comprou a dica na sessão. A dica não é cobrada duas vezes e a tentativa grava `usou_dica`.
- **Rotas fora do registro `ROTAS`**: `GET /api/saude` (healthcheck do compose, faz `select 1`) e `GET /api/arquivos/uploads/:nome` (imagens dos enunciados enviadas pelo admin; exige login e acesso, ou papel admin).
- **Sessão**: o banco guarda o HMAC-SHA256 do token com `SESSION_SECRET`. A renovação dos 60 dias acontece no máximo a cada 10 min por sessão, para não gravar a cada requisição. `COOKIE_SECURE=0` desliga o `Secure` (só para dev em http fora de localhost).
- **Admin criado pela CLI** (`pnpm --filter api cli admin:criar`) nasce com `acesso = true` (é o dono). `exigirAcesso` não abre exceção para o papel admin.
- **Webhook**: grava o evento com `ON CONFLICT DO NOTHING`; se o processamento falhar, apaga o evento e responde 500 para o Asaas reenviar. E-mails saem em segundo plano, então a resposta não espera o SMTP.
- **Pix**: a validade é o `expirationDate` do QR do Asaas (horário de Brasília, UTC−3). Um pendente expirado vira `vencido` ao gerar outro. A consulta direta ao Asaas no status, depois de 60 s, acontece no máximo a cada 15 s por pedido. O cliente HTTP manda `access_token` e `User-Agent: FuseAprova/1.0`.
- **XP**: o +10 de cada acerto é creditado na resposta. Os bônus de conclusão, lição perfeita e desafio são creditados no concluir. O total continua o de `xpDaSessao` (45/65). Concluir exige todas as questões respondidas.
- **Ordem da trilha**: as seções comuns e específicas são intercaladas com `intercalarSecoes` (3:5), e as unidades seguem a ordem da primeira aparição. Assim cada unidade fica contígua, o que mantém "UNIDADE n · SEÇÃO n".
- **Desafio** conclui sempre (libera o caminho). A coroa exige `melhor_precisao >= 70`.
- **Ofensiva**: "Sua ofensiva zerou" também aparece quando o job das 00:05 já tinha zerado a ofensiva. "O protetor salvou" só aparece quando o protetor é consumido no próprio registro, antes do job. O sync offline não registra a ofensiva em dia anterior ao último dia coberto.
- **Simulado**: as respostas viram tentativas numa `sessoes_estudo` do tipo `simulado`, o que alimenta o domínio e as estatísticas. Só as respostas erradas entram na revisão (em branco não entra). A entrega automática registra `entregue_em = termina_em`. Ela é verificada em toda leitura e por uma varredura de 60 s no processo da API (`entregarExpirados`). Simulado em andamento é reaproveitado ao chamar `POST /simulados` de novo. No modo edital, ficam de fora os assuntos que só aparecem em seções "Fora do edital".
- **Reports**: a auto-retirada conta alunos distintos com report aberto (3 ou mais), para um aluno sozinho não tirar a questão do ar.
- **Sync offline**: o servidor recalcula o acerto com o próprio gabarito. Ficam de fora a questão retirada (rejeitada), a sessão desconhecida (rejeitada) e o `id_cliente` repetido (duplicada). Vidas não são descontadas no sync (o aparelho já aplicou a regra offline). O XP do sync entra na liga da semana em que o sync acontece.
- **Excluir conta (LGPD)**: anonimiza nome, e-mail, CPF, celular e senha; apaga sessões, inscrições de push, links de senha e participações na liga; mantém pedidos, tentativas e simulados sem dados pessoais.
- **Mensagens do Zod em pt-BR**: `instalarMensagensPtBr()` (de `@fuse/shared/api`) define o mapa global. A API chama ao subir, e a PWA pode chamar também. Ele não sobrepõe as mensagens próprias dos schemas nem o `required_error`. Não use `safeParse(v, { errorMap })`, porque o mapa por chamada passa por cima do `required_error`.
- **Lacunas do painel admin**:
  1. `ImportacaoDetalhe.confronto[].gabaritoExtraido` (letra lida no PDF do gabarito para aquele número; null se anulada ou ausente). O caderno impresso não marca resposta.
  2. Não foram criados os status `aprovada` e `descartada`, porque mudariam `STATUS_IMPORTACAO`, que a PWA usa em `Record<StatusImportacao, …>`. Continua assim: aprovar = lote de questões + `concluido`; descartar = lote `retirar` + `erro`.
  3. Não há DELETE de concurso, cargo ou prova: valem `ativo = false` e `status = 'retirada'`, para manter o histórico e as origens.
  4. `POST /admin/questoes/retirar-origem` marca a prova (ou todas as provas da banca) como `retirada` junto com as questões `fau_real`.
  5. `PUT /admin/edital`: cargos não genéricos fora da lista ficam `ativo = false`; os genéricos não mudam. Cargo enviado sem `id` com nome já existente no concurso é atualizado (upsert por concurso e nome).
  6. `QuestaoAdmin.prova` traz o resumo da prova de origem (null para autoral).
  7. Mensagens do Zod em pt-BR (acima).
  8. `QuestoesLoteEntrada` exige `motivo` (3+ caracteres) para `retirar` e `anular`.

## D9. Lacunas do coletor (migração 0002, 23/10/2026)
1. `questoes.gabarito` aceita null **só** em `anulada` (check `questoes_gabarito_ck`). O importador grava null quando a banca anula sem letra. `QuestaoAdmin.gabarito` e `QuestaoPreviaResposta.gabarito` passam a aceitar null. Para o aluno nada muda: questão anulada não aparece. Num simulado em que ela foi anulada depois do início, a questão conta como acerto, e o campo `gabarito` traz a 1ª alternativa só para cumprir o contrato (`anulada: true` indica o caso). Responder uma questão anulada sem letra numa sessão aberta dá 409, e o sync a rejeita.
2. Assunto `a-classificar` (`SLUG_ASSUNTO_A_CLASSIFICAR` em `@fuse/shared`): publicar uma questão nele responde **422** `assunto_a_classificar` (código novo em `CODIGOS_ERRO`). O lote `publicar` a ignora com o motivo. A reclassificação é o `PUT /admin/questoes/:id` com outro `assuntoId`.
3. `importacoes.cargo` e `importacoes.arquivo_preliminar`. No `confronto`, cada item ganha `letraPreliminar` e `statusGravado`, além de `gabaritoExtraido` (D8). O importador do coletor (`packages/crawler/src/importacao/importar.ts`) já preenche tudo.
4. `arquivos_coletados` continua com um `prova_origem_id` (a prova que motivou o download). O PDF de gabarito com vários cargos é ligado a cada prova pela linha de `importacoes` (`arquivo_gabarito`), e o hash evita baixar de novo. Uma tabela N:N não traria ganho agora.
5. `provas_origem.situacao_certame` (enum `aberto` · `andamento` · `encerrado`, opcional), exposto em `ProvaOrigemAdmin` e editável em `ProvaOrigemEntrada`.

## D10. Web do aluno e PWA (23/10/2026)
- **Manifesto:** `theme_color #00545D` e `background_color #FAF8F2`, seguindo a paleta D1 em vez do `#D9480F`/`#FFFFFF` do PRD 8.4.
- **Contraste AA:** o fundo dos botões turquesa usa `#007C83`, porque branco sobre `#008A92` dá 4,2:1. Laranja em texto usa `#C44C0A` ou `#B84308`.
- **Mascote:** não há pose 4K triste ou dormindo; usamos a pose "incentivando".
- **Cache da API no service worker:** `/concurso` e `/guia/*` usam stale-while-revalidate. As rotas de estado (`/me`, `/trilha`, `/revisao`, `/liga`, `/perfil/estatisticas`, `/simulados`) usam NetworkFirst, porque o servidor é a fonte da verdade e o SWR mostraria a trilha velha logo depois de uma lição.
- **Offline:** não há dica (ela gasta gemas no servidor), e XP, vidas e gemas não aparecem até o sync.
- **Suporte:** o contato vem de `VITE_SUPORTE_WHATSAPP` e `VITE_SUPORTE_EMAIL` no build, já que não existe rota para isso.
- **Baú:** um baú com status `atual` e `podeAbrir` aparece como "abrir". O marco de ofensiva mostra "você ganhou gemas", sem a quantidade, porque `ConcluirSessaoResposta` não a traz.

## D11. Testes fim a fim (Playwright, 23/10/2026)
- **Pacote `e2e/`** (`@fuse/e2e`, no `pnpm-workspace.yaml`). Na raiz: `pnpm e2e` (build da web + testes), `pnpm e2e:atualizar` (regrava a linha de base visual) e `pnpm e2e:relatorio` (relatório lado a lado). `E2E_SEM_BUILD=1` reaproveita `apps/web/dist`. O script do pacote chama `e2e`, e não `test`, para o `pnpm -r test` continuar rápido.
- **Servidores sem Docker:** o Playwright sobe `e2e/servidor.ts` (porta 3100), que é a API real (`criarApp`) sobre um PGlite **novo em memória** a cada execução (migrações + seed com `publicarAutorais`, equivalente a `SEED_DEV_PUBLICAR=1`), e a PWA de produção (`vite build` + `vite preview`, porta 4173) com o proxy de `/api` para ela. `reuseExistingServer: false` garante banco limpo.
- **Asaas falso, webhook real:** o servidor usa `criarAsaasFalso` (sem rede). O teste confirma o pagamento com `POST /api/webhooks/asaas` de verdade, com o token de teste `token-webhook-e2e` e o `paymentId` gerado pelo falso. O mesmo caminho cobre token errado (401), repetição (5×) e estorno.
- **Rotas de controle `/__e2e/*`** existem só nesse servidor e ficam fora de `/api` (o proxy não as expõe): relógio, semente do sorteio, último pedido do usuário, gabarito pelo enunciado, criar admin, ajustar vidas e e-mails enviados. Não há nada disso na API de produção.
- **Determinismo:** o relógio da API anda junto com o tempo real a partir de um instante escolhido por teste (cada arquivo usa uma semana própria, para a liga não misturar alunos), e o do navegador é o mesmo (`page.clock.install`). O sorteio usa `criarRng` com semente, reiniciada no teste visual. Os testes rodam em série (1 worker), porque o relógio é um só. Para o sorteio depender só da semente, as consultas de candidatas da lição e do simulado ganharam `ORDER BY id` (antes a ordem física das linhas mudava depois de um UPDATE).
- **Respostas certas ou erradas** vêm do gabarito do banco, buscado pelo enunciado que está na tela. Assim o teste não depende de qual questão foi sorteada.
- **Service worker bloqueado** nos testes (a rede é a fonte da verdade), exceto no teste offline, que precisa do shell em cache e do pacote em IndexedDB.
- **Visual (D1):** uma captura por tela em 390×844 com `toHaveScreenshot` (`maxDiffPixelRatio 0.02`, animações desligadas). A linha de base fica em `e2e/testes/__capturas__/<plataforma>/`, porque a fonte renderiza diferente no Windows e no Linux do CI. Num sistema sem linha de base (por exemplo, a 1ª execução no CI), o teste grava a captura e segue, com a anotação "linha de base criada". Ficam mascarados os avatares (a cor vem do id), a contagem e o copia e cola do Pix e o tempo da lição. O confete (canvas aleatório) fica oculto. O relatório `e2e/relatorio-visual/index.html` põe cada captura ao lado da imagem de `Telas_referencia/`, para revisão humana. A tela 13 (Simulado) não tem referência nova.
- **Acessibilidade:** o axe-core vem do `node_modules` (sem CDN) e roda nas telas reais. Falha com violação `serious` ou `critical` (WCAG 2.0/2.1 A e AA).

## D12. Deploy: GitHub Actions → VPS compartilhada, nginx e imagens por digest (23/10/2026)
- **nginx no lugar do Caddy.** A VPS 72.60.10.112 é compartilhada com o fusai.com.br, cujo nginx do host já ocupa as portas 80/443 e emite o TLS com o certbot. Por isso o TLS do Fuse Aprova também fica no nginx do host (`deploy/nginx-host/fuseaprova.com.br`), que faz proxy de `www.fuseaprova.com.br` para `127.0.0.1:3600`. O apex `fuseaprova.com.br` dá 301 para o www, mas só se resolver para a VPS. O `infra/Caddyfile` e o `infra/docker-compose.yml` antigos foram removidos. O PRD 8.x cita o Caddy, mas o que ele exige (HTTPS, HSTS, CSP `'self'` com `img-src data:`, sem CDN) continua igual, agora em `infra/nginx/`.
- **A web vira imagem própria** (`fuseaprova-web` = nginx + estático, `infra/docker/web.Dockerfile`), em vez de copiar o estático de uma imagem de build para um volume. É o mais simples: uma imagem por digest, o rollback troca tudo junto e o `nginx -t` roda no build. A base é `nginxinc/nginx-unprivileged:1.28-alpine` (a variante oficial sem root do nginx; uid 101, porta 8080), para que nenhum container do projeto rode como root.
- **O proxy usa `resolver 127.0.0.11` + variável** para `api:3000`. Assim o nginx sobe mesmo sem a API e acompanha o IP novo do container depois de cada deploy, sem reload.
- **IP real e rate limit:** a API já tinha `trustProxy: true` (lê o primeiro IP do `X-Forwarded-For`), e não foi alterada. Para o aluno não conseguir forjar esse IP, os dois nginx **sobrescrevem** o `X-Forwarded-For` com o IP da conexão em vez de acrescentar. O do host manda o `$remote_addr` do aluno; o do container só confia no `X-Real-IP` vindo de redes privadas e de loopback (`set_real_ip_from`). Os cookies `Secure` vêm de `COOKIE_SECURE=1`, independentes do protocolo visto pela API.
- **Imagens por digest no GHCR** (`ghcr.io/fernandinhomartins40/fuseaprova-{api,web,worker}`, tags `sha-<commit>` e `main`, `provenance: false` para o digest ser o do manifesto da imagem). O compose exige `FUSEAPROVA_*_IMAGE` (`${VAR:?}`), e o `deploy.sh` grava as imagens em uso no `.env` da VPS, de modo que `docker compose ps/logs/exec` funcionam depois.
- **O coletor entra na imagem da api** (`turbo prune @fuse/api @fuse/crawler`), já que ele não é dependência da api nem do worker. Ele roda com `docker compose run --rm coletor <comando>`, que já traz o `pdftotext` da imagem. O `poppler-utils` também é instalado no host, como pedido.
- **`migrate` e `coletor` ficam no perfil `ferramentas`.** A api e o worker não dependem mais do `migrate`. Quem faz backup → migração → troca é o `deploy.sh`, e assim o rollback consegue pular a migração (`SKIP_MIGRATIONS=1`). O `restore.sh` agora roda `docker compose run --rm migrate` antes do `up -d`.
- **SSH por chave** (decisão do dono, no mesmo modelo da fusai). A secret única é `FUSEAPROVA_DEPLOY_SSH_KEY`. O runner a grava em `~/.ssh/fuseaprova_deploy` e usa `IdentitiesOnly yes`, `PasswordAuthentication no`, `BatchMode yes` e `StrictHostKeyChecking yes`. A chave de host ed25519 fica versionada em `.github/vps_known_hosts`. O workflow confere a impressão dela contra `VPS_HOST_FINGERPRINT` (`SHA256:6ZU1oyYc…`) e aborta se não bater. Gerar a chave de deploy, pôr a pública no `authorized_keys` do root e cadastrar a secret ficam com o dono e o coordenador. Nenhum script mexe no sshd: o `PasswordAuthentication` do servidor continua como está, porque outros projetos da VPS dependem dele.
- **O deploy acontece só pelo GitHub Actions** (deploy, rollback e setup-host). O `deploy.sh` não é rodado à mão na VPS.
- **Login no GHCR na VPS:** o `GITHUB_TOKEN` da execução vai pela entrada padrão do ssh. O login é feito num `DOCKER_CONFIG` temporário, com logout no `trap`, para não tocar no `~/.docker/config.json` do root, que o fusai pode usar.
- **Nomes e recursos:** a VPS (2 vCPU, 7,8 GB, cerca de 4 GB livres) já roda fusai, palmital e outros projetos. Os containers fixos são `fuseaprova-postgres`, `fuseaprova-api`, `fuseaprova-worker` e `fuseaprova-nginx`; a rede é `fuseaprova-interna` e o volume `fuseaprova-pgdata`. Todos têm `mem_limit`: postgres 512m (shared_buffers 128MB, max_connections 40), api 512m, worker 384m, nginx 64m, migrate e coletor 512m sob demanda. O Node usa `--max-old-space-size` abaixo do limite. A porta 3600 estava livre na consulta do coordenador (as ocupadas eram 22, 80, 443, 3010, 3096, 3180, 3190, 3230, 3300, 3400, 3500, 7000, 8088 e 8109).
- **Caminhos na VPS:** `/root/fuseaprova/{deploy,backups,arquivos,estado}`. Dentro dos containers os caminhos continuam `/srv/fuse/arquivos` e `/srv/fuse/backups`, porque o usuário `node` não atravessa `/root` dentro do container. Os scripts de backup escolhem sozinhos o padrão de host (`/root/fuseaprova/backups`) ou de container.
- **O `.env` de produção** nasce de `deploy/env.modelo`, com os segredos gerados na própria VPS (openssl e o `web-push` da imagem da api; o VAPID tem fallback em openssl). Valores existentes nunca são sobrescritos. O deploy aborta se o volume do banco existir sem `.env` ou sem senha. Valores com `$` (a chave do Asaas) vão entre aspas simples, porque o Compose interpola `$` no `.env`.
- **Migrações imutáveis no CI:** em `packages/db/drizzle/` só entram arquivos novos, e o `meta/_journal.json` só pode crescer no fim. A válvula é `[migracao-revertida]` na mensagem do commit. Como o rollback não desfaz o banco, as migrações precisam ser compatíveis com o código anterior.
- **CI em Node 22** (pedido do dono); as imagens seguem em `node:24-bookworm-slim`. O `engines` aceita `>=22`.
- **E2E:** o workflow usa `pnpm --filter @fuse/e2e exec playwright install --with-deps chromium`, porque o `playwright` não é dependência da raiz e o `pnpm exec` na raiz não acharia o binário. Em seguida roda `pnpm e2e`.
- **`CLAUDE.md`** ainda lista `infra/Caddyfile` e `infra/docker-compose.yml` na estrutura esperada. Não foi editado (é instrução do projeto); a estrutura real de deploy é a descrita aqui e em `docs/DEPLOY.md`.
