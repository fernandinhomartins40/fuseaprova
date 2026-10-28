# Banca R5 (painel superadmin): SRE, operação, observabilidade e desempenho

- **Data:** 28/10/2026 (São Paulo).
- **Commit:** `2f71392` (main), com a árvore local sem mudanças nos arquivos auditados.
- **Modo:** somente auditoria. Nenhum arquivo do repositório foi alterado além deste parecer e de `RELATORIO_PERFORMANCE_VPS.md`.
- **Ambiente:** Windows 11, Node 24, Postgres 16.15 local em `127.0.0.1:55432`, com `shared_buffers` de 128 MB e `work_mem` de 4 MB, os mesmos valores do compose de produção.
  - Os testes de prova e os scripts ficaram no scratchpad (`…/scratchpad/r5/`).
  - O banco sintético `r5_perf` foi criado com as migrações reais e apagado no fim.
- **Produção e VPS:** BLOQUEADO nesta rodada. Nenhuma conclusão abaixo vem de produção.
- **Escopo:** `/super` como ferramenta de operação do dono.
  - `/super/sistema`.
  - Desempenho das consultas do painel.
  - Comunicação em massa.
  - Rate limit e sessões do super.
  - Impacto de infraestrutura dos RQ1 (revisado em 28/10: o Conteúdo vira seção do `/super`), RQ2 e RQ4.

## Tabela-resumo

| ID | Título | Sev. | Estado | Onde |
|---|---|---|---|---|
| R5-01 | Financeiro e estatísticas Asaas fazem `select *` em `pedidos` e trazem o QR Pix em base64 de cada linha. Com 2 anos e 30 mil pedidos: 2 a 3 s e pico de heap de 278 a 331 MB por requisição; 4 simultâneas chegam a 661 MB (a produção tem 384 MB de heap); OOM reproduzido uma vez | ALTA | CONFIRMADO (medido) | `apps/api/src/rotas/super/financeiro.ts:47-58`, `asaas.ts:204-208` |
| R5-02 | `/super/sistema` mostra "Backup OK" com o último backup de 10 dias atrás, e os jobs como "OK" com o worker parado há 3 dias. Não há noção de atraso nem de idade | ALTA | CONFIRMADO (teste) | `apps/web/src/super/telas/Sistema.tsx:40,72-90`; `sistema.ts:29-62,79-91` |
| R5-03 | Nenhum alerta ativo (job falho, backup velho, 5xx, disco). O painel só mostra o que alguém abrir. 5xx e disco não aparecem em lugar nenhum (o achado A-07 continua) | ALTA | CONFIRMADO (código) | `sistema.ts` (sem disco e sem 5xx); `apps/worker/src` (sem job de alerta) |
| R5-04 | Indicadores que dizem "OK" sem testar: "Banco: Falhou" nunca aparece (banco fora → 500 genérico); SMTP, Push e Asaas = "variável preenchida"; versão do worker não aparece | MÉDIA | CONFIRMADO (teste + código) | `sistema.ts:73-77,118-120`; `app.ts` (hook `onRequest`) |
| R5-05 | A ociosidade de 2 h da sessão do superadmin é anulada pelo polling de 60 s da tela Sistema. Com a aba aberta, a sessão só cai nas 12 h | MÉDIA | CONFIRMADO (teste) | `Sistema.tsx:32`; `servicos/sessoes.ts:20,74-90` |
| R5-06 | O rate limit do `/super` e do 2FA fica na memória do processo e é contado por rota: zera a cada deploy ou reinício, e o "120/min por usuário" da D13 vale para cada rota | MÉDIA | CONFIRMADO (teste) | `app.ts:121`; `http/registrar.ts:145-156` |
| R5-07 | A comunicação em massa não tem retentativa nem disjuntor: com o SMTP fora do ar, 95 de 95 envios "falharam" em 4 min, a comunicação ficou "concluída" e o job ficou `ok = true` | MÉDIA | CONFIRMADO (teste) | `apps/worker/src/jobs/comunicacoes.ts:88-127`; `util.ts:79` |
| R5-08 | Os CSVs não usam streaming (a string vai dentro de um JSON) e são cortados sem aviso: pagamentos em 10 000 de 30 000 linhas, usuários em 20 000. O de usuários roda uma subconsulta por linha e lê `senha_hash` e `totp_segredo` | MÉDIA | CONFIRMADO (medido) | `pagamentos.ts:210`; `usuarios.ts:40,83,235` |
| R5-09 | A conciliação em lote faz até 200 chamadas sequenciais ao Asaas, e o extrato até 20 páginas, contra o `proxy_read_timeout` de 60 s dos dois nginx. O resultado provável é 504 com o trabalho seguindo no servidor | MÉDIA | HIPÓTESE (latência do Asaas não medida) | `pagamentos.ts:270-290`; `asaas.ts:150-170`; `infra/nginx/fuseaprova.conf:101` |
| R5-10 | Buscas `ilike '%x%'` sem índice trigram, e DAU/WAU/MAU com 3 varreduras do índice de `tentativas`: de 250 a 550 ms com 200 mil linhas de auditoria e 1 milhão de tentativas | BAIXA | CONFIRMADO (medido) | `sistema.ts:149`; `pagamentos.ts:50-55`; `financeiro.ts:136-142` |
| R5-11 | Backup: falha no `tar` dos arquivos sai com código 0 (job "OK"). O painel não mostra tamanho, idade, cópia externa nem teste de restore. A cópia fora da VPS (A-06) continua manual | BAIXA | CONFIRMADO (código); produção BLOQUEADO | `infra/backup/backup.sh:136-148,157` |
| R5-12 | `enviar-comunicacoes` grava uma execução por minuto mesmo com a fila vazia: 43 200 das 56 880 linhas de `jobs_execucoes` (76%). `/super/sistema` faz 29 consultas sequenciais (3 por job) | BAIXA | CONFIRMADO (medido) | `agenda.ts:70`; `sistema.ts:29-62` |
| R5-13 | A PWA põe no precache de todo aluno ~253 KB de JS e CSS do `/admin` e do `/super`. Com o RQ1 revisado, esse código cresce | BAIXA | CONFIRMADO (build medido) | `apps/web/vite.config.ts:95-100` |

O que está bom e foi verificado:
- `/super/sistema` responde em ~93 ms com 57 mil execuções de job.
- As listas paginadas de pagamentos, usuários, auditoria e webhooks (página 1) levam de 16 a 110 ms com o volume sintético.
- O detalhe do pagamento e a ficha do usuário (de 25 a 40 ms quentes) estão bons.
- O limite absoluto de 12 h da sessão do super funciona (medido: caiu no minuto 720).
- `ULTIMO_BACKUP` é lido com aviso específico para `EACCES` e para o arquivo ausente, e o `deploy.sh` faz `chown 1000:1000` depois do backup do host (`deploy.sh:301`).
- A suíte `test/superadmin.test.ts` passou (80/80).

---

## Achados

### R5-01: `select *` em `pedidos` no financeiro e nas estatísticas do Asaas (risco de OOM da API)
- **Categoria:** desempenho e disponibilidade.
- **Severidade:** ALTA. Um clique do dono num período longo pode derrubar a API de todos os alunos. O container tem `mem_limit 512m` e `--max-old-space-size=384`, e `restart: unless-stopped` só religa depois da queda.
- **Estado:** CONFIRMADO (medido). O limiar em produção é HIPÓTESE, porque o volume real está BLOQUEADO.
- **Onde:**
  - `calcularFinanceiro` faz três `db.select().from(pedidos)` (pagos, estornados e criados, `financeiro.ts:47-58`) e agrega em JS.
  - `superAsaasEstatisticas` faz um `select()` com todas as colunas (`asaas.ts:204-208`).
  - As linhas trazem `pix_imagem`: o PNG do QR em base64, uns 4 KB por Pix. No volume sintético foram usados 4 000 caracteres aleatórios, incompressíveis.
- **Reprodução:** `scratchpad/r5/01-popular`, `02-pix`, `03-rotas`, `05-colunas`, `06-conc` (banco `r5_perf`: 20 mil usuários e 30 mil pedidos em 365 dias).
- **Medidas:**
  - Com `GET /api/super/financeiro?de=2024-10-29&ate=2026-10-28`:

    | Agrupamento | Frio | Mediana |
    |---|---|---|
    | por dia | 3,7 s | 2,0 s |
    | por mês | 2,0 s | 2,8 s |

  - O CSV do financeiro leva 3,0 s.
  - As estatísticas do Asaas em 2 anos levam 2,4 s, com só 20 ms de execução no Postgres. O tempo está no tráfego e na decodificação.
  - Mesma consulta, três formas:

    | Consulta | Tempo | JSON |
    |---|---|---|
    | `select *` | 498 ms | 144,7 MB |
    | 9 colunas | 62 ms | 7,1 MB |
    | agregado no SQL | 12 ms | — |

  - Pico de heap da API:
    - 1 requisição: 278 a 303 MB;
    - 2 simultâneas: 317 a 331 MB;
    - 4 simultâneas (financeiro e estatísticas): 661 MB.
  - Numa sequência 1 → 2 com o heap do worker do Vitest em 604 MB, o processo caiu com `FATAL ERROR: Ineffective mark-compacts near heap limit … JavaScript heap out of memory`. Nas execuções seguintes não caiu: a queda depende do GC, então o resultado é intermitente. A conclusão continua: o pico passa dos 384 MB de produção com 2 requisições.
- **Esperado × observado:** o financeiro precisa de soma, contagem e data; ele lê o pedido inteiro, com o QR.
- **Impacto:** a API cai (502 e 503 para todos os alunos) quando os pedidos de um período passam de algumas dezenas de milhares. Mesmo bem abaixo disso, a tela fica lenta. O CSV e a tela, juntos, dobram o consumo.
- **Correção proposta:**
  - Agregar no SQL (`date_trunc` em `America/Sao_Paulo`, `sum`, `count` e `filter`), ou pelo menos selecionar só as colunas usadas.
  - Nunca selecionar `pix_imagem` e `pix_payload` fora do fluxo do Pix.
  - Aplicar o mesmo em `superAsaasEstatisticas` (`group by status, cancelado_em is not null`).
- **Teste de aceite:**
  - Com 30 mil pedidos sintéticos, `superFinanceiro` de 2 anos em menos de 300 ms.
  - Pico de heap da API abaixo de 120 MB com 4 requisições simultâneas, rodando com `--max-old-space-size=384`.
  - Um teste que falhe se a consulta do financeiro contiver `pix_imagem`, conferido pelo logger do Drizzle.

### R5-02: "Backup OK" e jobs "OK" sem levar em conta a idade
- **Severidade:** ALTA. É o indicador em que o dono confia para saber que está protegido, e ele mente nos cenários mais prováveis: worker parado, volume desmontado, cron perdido.
- **Estado:** CONFIRMADO (teste `07-operacao`, R5-C).
- **Reprodução:**
  1. Gravar `ULTIMO_BACKUP` com data de 10 dias atrás.
  2. Gravar a última execução do `backup` com `ok = true` 10 dias atrás.
  3. Gravar `enviar-comunicacoes` e `expirar-pix` com `ok` 3 dias atrás.
- **Observado:**
  - A API devolve `backup: { ultimo: "2026-10-10…", ultimoJobOk: true, aviso: null }`.
  - A regra de `Sistema.tsx:40` (`ultimoJobOk === false ? 'Falhou' : ultimo ? 'OK' : '—'`) dá **OK**.
  - Os jobs mostram o selo verde "OK" com a data de 3 dias atrás, e `falhas24h = 0`.
  - Os jobs que nunca rodaram aparecem como "Nunca rodou", em cinza neutro.
- **Esperado:**
  - "Atrasado" quando a última execução é mais velha que o intervalo do cron mais uma folga. Exemplos: `enviar-comunicacoes` com mais de 5 min; `backup` com mais de 26 h.
  - Backup em vermelho quando `ULTIMO_BACKUP` tem mais de 26 h.
- **Impacto:** dias sem backup, sem expirar Pix e sem fila de comunicação passam despercebidos.
- **Correção:**
  - Calcular na API `atrasado` e `proximaEsperada` a partir do cron de `JOBS_WORKER`. `node-cron` já é dependência do worker; há também cron-parser.
  - Calcular `idadeHoras` do backup.
  - A UI usa estado vermelho e amarelo e mostra um resumo "Tudo certo / N problemas" no topo e na Visão geral.
- **Teste de aceite:** o cenário acima produz `backup.estado = 'atrasado'`, os jobs `atrasado = true` e a tela "Backup: Atrasado (10 dias)".

### R5-03: Nenhum alerta (A-07 continua pendente)
- **Severidade:** ALTA.
- **Estado:** CONFIRMADO por leitura de código. Não há job de alerta em `apps/worker/src/jobs/`, e o `grep -i "alerta|statfs|disco"` em `apps/worker/src`, `rotas/super` e `deploy` deu 0.
- **Observado:**
  - O 5xx só vai para o `req.log.error` (`app.ts`, error handler), que no container é `json-file` com 10 MB × 5. Não há contador nem última ocorrência.
  - Não há métrica de disco, nem do volume do Postgres, nem de `backups/` (14 diários, 8 semanais e 14 `tar.gz`).
  - O dono só fica sabendo se abrir o painel.
- **Correção proposta (sem SaaS e sem custo novo):**
  1. Job `alertas` no worker, a cada 15 min, usando o SMTP que já existe. O e-mail vai para `ALERTA_EMAIL`, ou para os superadmins.
     - Dispara quando: um job está atrasado ou falhou (R5-02); o backup tem mais de 26 h; há N 5xx em 15 min; o disco tem menos de 15% livre (`fs.statfs` em `/srv/fuse/backups`); há webhooks com erro.
     - Deduplicação: um e-mail por problema a cada 6 h.
  2. A API conta os 5xx por janela numa tabela leve (`erros_api`: rota, código, hora, sem PII) ou em memória, exposta em `/super/sistema`.
  3. Mostrar `disco: { livreBytes, totalBytes }` no `/super/sistema`.
- **Teste de aceite:**
  - Worker com relógio de teste: um job atrasado gera 1 e-mail no mailer em memória.
  - A segunda rodada em menos de 6 h não reenvia.
  - Uma rota que lança erro aparece em `/super/sistema.erros24h`.

### R5-04: Indicadores que não testam o que dizem
- **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO (teste R5-C e código).
- **Banco:**
  - Com o banco fechado, `GET /api/super/sistema` → **500** `{"erro":"Algo deu errado do nosso lado…","codigo":"interno"}`.
  - O hook `onRequest` carrega a sessão no banco antes da rota. Além disso, `jobs()` (`sistema.ts:79`) não está dentro de `seguro()`.
  - Resultado: o KPI "Banco: Falhou" (`Sistema.tsx:39`) é inalcançável. O dono vê um erro genérico, e não "o banco caiu".
- **SMTP:** `configurado: !!config.smtp.host` (`sistema.ts:118`). Não roda `transporter.verify()`, e uma senha errada aparece como "Configurado".
- **Push:** só confere a presença das chaves VAPID.
- **Asaas:** só confere a presença da chave. O teste de conexão existe em outra tela (`superAsaasTestar`).
- **Versão:** a do worker não aparece (só `config.versao` da API), então não dá para ver um worker preso numa imagem antiga.
- **Correção:**
  - `GET /api/saude/detalhe` sem depender da sessão no banco, ou o front interpretar o 500 do `/super/sistema` como "API ou banco indisponível".
  - Botão "Testar SMTP" (com `verify()`, sem enviar e-mail) e "Testar push" (com envio para a própria inscrição).
  - O worker grava `versao` em `jobs_execucoes.resultado`, ou numa linha de batimento.
- **Teste de aceite:**
  - Banco fechado: a tela mostra "Banco indisponível".
  - SMTP com host inválido: "Testar SMTP" devolve erro legível em menos de 10 s.

### R5-05: A ociosidade de 2 h do superadmin não vale com a tela Sistema aberta
- **Severidade:** MÉDIA. É um controle da D13, e o computador do dono pode ficar destravado com o painel aberto.
- **Estado:** CONFIRMADO (teste R5-A).
- **Observado:**
  - Superadmin com 2FA e `superSistema` chamado a cada 60 s por 180 min: **200 em todas**.
  - Controle: outra sessão sem requisições por 2 h 01 → **401**.
  - Com o polling contínuo, a sessão caiu só no **minuto 720** (limite absoluto, R5-A2).
- **Causa:**
  - `refetchInterval: 60_000` (`Sistema.tsx:32`).
  - `carregarSessao` renova `ultimo_uso_em` a cada 10 min de qualquer requisição (`sessoes.ts:20,82-90`).
  - Atividade de máquina conta como atividade humana.
  - O TanStack pausa em aba oculta (`refetchIntervalInBackground` falso), então o caso real é a aba visível, como um monitor ligado.
- **Correção:**
  - O polling manda um cabeçalho (ex.: `X-Fuse-Automatico: 1`), e `carregarSessao` não renova `ultimo_uso_em` quando ele chega.
  - Ou o front pausa o polling após N minutos sem interação.
- **Teste de aceite:** o mesmo cenário (polling de 60 s com o cabeçalho) recebe 401 depois de 2 h sem requisição "humana".

### R5-06: Rate limit em memória e por rota
- **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO (teste R5-B).
- **Observado:**
  - `super2faVerificar` com código errado: 10 respostas **400** e a 11ª **429**.
  - Uma nova instância da API sobre o mesmo banco (simula reinício ou deploy) → **400** de novo. O contador zerou.
  - O `@fastify/rate-limit` está sem `store` (`app.ts:121`), e a chave é `${nome}:u:${id}` (`registrar.ts:150-153`). Por isso:
    - todo deploy (vários por dia, pelo histórico de commits) e todo restart por OOM (R5-01) devolvem as tentativas;
    - "120/min por usuário" (D13) é, na verdade, 120/min **por rota**: são 32 rotas com `LIMITE_SUPER` e 16 com `LIMITE_SENSIVEL`;
    - com mais de uma instância da API, cada uma teria o seu contador. Hoje o `container_name` fixo impede escalar, então isso é HIPÓTESE para o futuro.
- **Impacto:** o 2FA (6 dígitos, janela de ±1 passo) depende desse limite para conter força bruta de quem já tem a senha. A avaliação do risco é do R1; aqui o achado é a persistência.
- **Correção:**
  - Contador persistente de falhas de 2FA e login no banco (ex.: `usuarios.falhas_2fa` e `bloqueado_ate`).
  - Ou `store` do rate limit em Postgres.
  - Rever na D13 se o limite é por usuário ou por rota.
- **Teste de aceite:** 10 falhas, nova instância da API, e a 11ª tentativa → 429.

### R5-07: Comunicação em massa sem retentativa, sem disjuntor e com "sucesso" falso
- **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO (teste R5-D).
- **Observado:**
  - 95 destinatários com opt-in e `EnviadorEmail` lançando `ECONNREFUSED`:

    | Rodada (minuto) | Falhas | Envios concluídos |
    |---|---|---|
    | 1 | 30 | 0 |
    | 2 | 30 | 0 |
    | 3 | 30 | 0 |
    | 4 | 5 | 1 |

  - Foram 95 tentativas SMTP e 95 envios com `falhou`; a comunicação terminou `concluida`.
  - `executarRegistrado` só marca falha quando o resultado tem `ok: false` (`util.ts:79`). `{ falhas: 30 }` é gravado como `ok = true`, e o painel de jobs fica verde.
- **Também (por código):**
  - `criarEnviadorSmtp` não usa `pool` (`comunicacoes.ts:21-26`): é uma conexão SMTP e TLS por mensagem.
  - 30 e-mails/min dão ~11 h para 20 mil alunos.
  - O SMTP é o mesmo dos e-mails transacionais (confirmação de pagamento, troca de senha). Uma cota diária do provedor pode ser gasta pela campanha e travar os transacionais. Isso é HIPÓTESE: o provedor e a cota estão BLOQUEADOS.
  - O cancelamento no meio de um lote é sobrescrito: o `marcar('enviado')` não confere o status, então até 30 envios marcados `ignorado` pelo cancelamento viram `enviado`.
- **Correção:**
  - Classificar o erro: falha de conexão ou de autenticação (4xx/5xx de servidor) pausa a comunicação (`status = 'pausada'`, com motivo) e mantém os envios `pendente`.
  - Rejeição por destinatário marca `falhou`.
  - Até 3 tentativas com `proxima_tentativa_em`.
  - `nodemailer` com `pool: true, maxConnections: 1`.
  - O job devolve `ok: false` se houve falha sistêmica.
  - O `update` do envio filtra `status = 'pendente'`.
- **Teste de aceite:**
  - SMTP fora do ar: a comunicação fica "pausada", 0 envios `falhou`, e o job `ok = false`.
  - Com o SMTP de volta e a comunicação retomada, todos são enviados.

### R5-08: CSV sem streaming e truncado sem aviso
- **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO (medido).
- **Pagamentos:** `superPagamentosCsv` com 30 mil pedidos levou 0,9 s (1,5 s frio) e gerou **1,78 MB** de JSON. São **10 000** linhas por causa do `limit(10_000)` (`pagamentos.ts:210`), sem nenhuma indicação no arquivo nem na tela (`Pagamentos.tsx:118`).
- **Usuários:** `superUsuariosCsv` levou 1,0 s e gerou **4,0 MB**, com `limit(20_000)` (`usuarios.ts:235`).
- **Plano do CSV de usuários:**
  - Subconsulta `max(respondida_em)` correlacionada em **20 000 loops**: 448 ms e 63 mil buffers.
  - Ordenação de `usuarios` por `criado_em` sem índice: `external merge Disk: 3488kB` com `work_mem` de 4 MB.
  - `selUsuarios` e `selPagamentos` leem todas as colunas de `usuarios`, inclusive `senha_hash` e `totp_segredo` (o R1 deve avaliar), e de `pedidos`, inclusive `pix_imagem`.
- **Formato:** o conteúdo vai como string dentro do JSON `{ nomeArquivo, conteudo }`: string inteira, JSON, `safeParse` do Zod e gzip, tudo na memória.
- **Correção:**
  - Rota de download que escreve o CSV em streaming (cursor do postgres.js, `reply.raw`), com `Content-Disposition`, selecionando só as colunas exportadas.
  - Trocar a subconsulta por `left join (select usuario_id, max(respondida_em) … group by usuario_id)`.
  - Se mantiver um limite, avisar ("exportadas 10 000 de 30 000; filtre por período") no cabeçalho e na tela.
- **Teste de aceite:**
  - Com 30 mil pedidos, o CSV traz 30 001 linhas (cabeçalho incluído) ou o aviso explícito.
  - Pico de heap abaixo de 100 MB.

### R5-09: Operações longas com o Asaas contra o timeout de 60 s do proxy
- **Severidade:** MÉDIA.
- **Estado:** HIPÓTESE. O código está confirmado; a latência do Asaas não foi medida, porque não há credencial de sandbox.
- **Conciliação em lote:**
  - `superConciliarLote` processa até 200 pedidos **em sequência** (`pagamentos.ts:270-290`), cada um com `obterCobranca` e timeout de 15 s (`integracoes/asaas.ts:158`).
  - O `proxy_read_timeout` é de 60 s no nginx do container (`infra/nginx/fuseaprova.conf:101`) e no do host (`deploy/nginx-host/fuseaprova.com.br:58`).
  - Com mais de 300 ms por chamada, 200 pedidos passam de 60 s. O dono recebe 504, o trabalho continua (inclusive a correção, se marcada) e a auditoria é gravada.
  - Se o dono repetir, o lote roda de novo.
- **Extrato:**
  - Lê até 20 páginas em sequência a cada consulta (`asaas.ts:150-170`), e cada mudança de página da tela relê tudo.
  - A conta é compartilhada (D14), então os lançamentos de outras aplicações consomem as 2 000 linhas.
- **Correção:**
  - Conciliação em lote como tarefa do worker, com progresso numa tabela (ou `jobs_execucoes`) e concorrência de 4.
  - Extrato com cache curto (60 s) por período.
- **Teste de aceite:** cliente Asaas falso com 400 ms por chamada; o lote de 200 responde 202 em menos de 1 s, e o progresso termina em menos de 30 s.

### R5-10: Buscas sem índice adequado
- **Severidade:** BAIXA hoje.
- **Estado:** CONFIRMADO (medido; a escala de produção é HIPÓTESE).
- **Auditoria por alvo:** `alvo ilike '%…%'` (`sistema.ts:149`) faz Parallel Seq Scan em 200 mil linhas: **552 ms** de mediana e 4 349 buffers lidos.
- **Pagamentos por nome:** `ilike` em nome, e-mail e `asaas_payment_id` levou 252 ms. A contagem e a lista são duas consultas, de 62 e 125 ms.
- **DAU/WAU/MAU:** são 3 consultas sequenciais (`financeiro.ts:136-142`), cada uma um Index Only Scan do índice **inteiro** `tentativas_usuario_questao_respondida_idx`, porque `respondida_em` não é a coluna líder.
  - Com o cache frio: 200 a 300 ms cada (8 576 buffers lidos).
  - Com o cache quente: ~33 ms.
  - Um índice `(respondida_em, usuario_id)` não melhorou com o cache quente (53 ms). O ganho esperado é só no cache frio, com a tabela maior que os 128 MB de `shared_buffers` da VPS (HIPÓTESE).
- **`pg_trgm`:** está disponível no Postgres 16 (`pg_available_extensions`) e não está instalado.
- **Correção:**
  - `pg_trgm` com GIN em `auditoria.alvo`, `usuarios.nome` e `usuarios.email`, ou busca de alvo por prefixo (`like 'pedido:…%'`, que usa o btree que já existe).
  - DAU/WAU/MAU numa consulta só com `count(distinct) filter`, que mediu 65 ms.
  - Índice em `usuarios(criado_em)`.
- **Teste de aceite:** com 200 mil linhas de auditoria, `alvo=pedido:<uuid>` em menos de 20 ms.

### R5-11: O backup "OK" não garante nada além do dump
- **Severidade:** BAIXA.
- **Estado:** CONFIRMADO por código; a produção está BLOQUEADA.
- **Observado:**
  - Uma falha no `tar` dos uploads só gera `AVISO` no log e o script sai com 0 (`backup.sh:145-148`), então o job fica "OK".
  - `ULTIMO_BACKUP` grava só a data e o caminho (`:157`), sem tamanho, tabelas nem resultado do `tar`.
  - O painel não mostra:
    - o resultado do `teste-restore.sh`;
    - a cópia fora da VPS (A-06, que continua manual por `rsync` em `docs/DEPLOY.md` 4.3);
    - o espaço em disco.
- **Correção:**
  - `ULTIMO_BACKUP` em JSON (`em`, `dump`, `bytes`, `tabelas`, `arquivosOk`, `arquivosBytes`).
  - O job devolve `ok: false` se `arquivosOk` for falso.
  - O `teste-restore.sh` grava `ULTIMO_TESTE_RESTORE`, e o `/super/sistema` mostra os dois e alerta quando têm mais de 35 dias.
- **Teste de aceite:** `backup.sh` com `ARQUIVOS_DIR` ilegível → o job fica vermelho no painel.

### R5-12: Ruído em `jobs_execucoes` e N+1 no `/super/sistema`
- **Severidade:** BAIXA.
- **Estado:** CONFIRMADO (medido).
- **Volume:** em 30 dias de retenção, o volume sintético fiel ao cron tem 56 880 linhas, das quais 43 200 (76%) são do `enviar-comunicacoes`, que roda a cada minuto, inclusive com a fila vazia.
- **Consultas:** `jobs()` faz 1 `select distinct` (Seq Scan de 34 ms) mais 3 consultas por job, 29 no total.
- **Tempo:** ~93 ms hoje, o que não é problema, mas o histórico de falhas reais fica diluído.
- **Correção:**
  - Não registrar a execução quando não houve trabalho (`enviados + falhas + ignorados = 0`), ou registrar só o batimento.
  - Uma consulta com `distinct on (job)` e `count(*) filter`.

### R5-13: Código do painel no precache de todo aluno
- **Severidade:** BAIXA.
- **Estado:** CONFIRMADO (build medido).
- **Medida:**
  - `vite build --outDir <scratchpad>` gerou `precache 302 entries (2828.37 KiB)`.
  - Os chunks das telas do `/admin` e do `/super` (`rotas-*`, `Concursos`, `Trilhas`, `EditorQuestao`, `UsuarioFicha`, `Precos`, `Asaas`, `Sistema`…) somam **259 004 bytes** e estão todos no manifesto do `sw.js`.
- **Causa:** `globPatterns: ['**/*.{js,css,…}']` (`vite.config.ts:95`).
- **Impacto:**
  - ~9% do precache baixado e guardado por cada aluno, sem uso.
  - Todo deploy que mexe no painel invalida esses arquivos para todos os alunos.
  - Com o RQ1 revisado (Conteúdo dentro do `/super`), o volume aumenta.
  - Não é segredo (a autorização é da API), mas é peso e superfície desnecessários.
- **Correção:** nomear os chunks do painel (`manualChunks` ou um `import()` com prefixo, ex.: `painel-*`) e colocá-los em `globIgnores`. Eles são carregados da rede quando o painel abre.
- **Teste de aceite:** o `sw.js` do build não lista nenhum arquivo `painel-*`, e o `/super` abre online.

---

## Avaliação RQ1, RQ2, RQ3 e RQ4 (ótica de operação e infraestrutura)

### RQ1 (revisado: superadmin fora do app de estudo, Conteúdo como seção do `/super`, admin restrito ao Conteúdo)
- **nginx:** nada muda. `/super/*` e qualquer rota nova de SPA caem no `location /` → `index.html` (`fuseaprova.conf:172-176`), e as rotas da API ficam em `/api/`.
- **CSP:** nada muda (`'self'`).
- **Service worker:**
  - `navigateFallbackDenylist` (`/^\/api\//, /^\/$/, /^\/lp\//`) não precisa mudar enquanto tudo for SPA.
  - Se `/admin` passar a redirecionar para `/super/conteudo`, o SW serve o shell, e o redirecionamento tem de ser feito no React Router (ou numa `location = /admin` do nginx, com 301).
- **Chunks:**
  - Juntar o módulo `admin` ao `super` aumenta o chunk lazy do painel.
  - Recomendo manter as telas de Conteúdo como imports dinâmicos próprios (o admin não deve baixar o código de Financeiro/Asaas) e aplicar o R5-13.
  - O isolamento real é da API, não do chunk.
- **Caches de API do SW:**
  - `fuse-estado` guarda `/api/me` de qualquer papel (NetworkFirst, até 7 dias). `sair.ts` limpa (`limparCachesApi`), o que é suficiente.
  - O `Sincronizador` (pacote offline) só monta nas rotas de aluno, com a guarda `acesso`. Com o RQ1, o superadmin perde `acesso` e nunca baixa o pacote.
  - Atenção: `superadminCli.ts:52` liga `acesso: true` (do R1/R3).
- **Manutenção:** `exigirForaDeManutencao` libera quem é `ehAdmin` (`registrar.ts:121`). Com o RQ1, isso só importa para conteúdo de aluno, que o super não vai mais usar. Não muda nada em infra.

### RQ2 (logins separados)
- **Infra:** páginas de login próprias como rotas de SPA (ex.: `/super/entrar` e `/conteudo/entrar`) não exigem mudança em nginx, CSP nem SW.
  - Se forem HTML separados (MPA), é preciso:
    - acrescentar uma entrada no Vite;
    - acrescentar uma `location` sem cache;
    - pôr o caminho no `navigateFallbackDenylist`.
- **Rate limit:**
  - Hoje o `authLogin` tem 20 tentativas a cada 15 min por IP (`rotas.ts:80`), por rota e em memória.
  - Com três endpoints, o atacante ganha 3 × 20 por IP, a menos que a chave seja comum (ex.: `login:ip:<ip>`).
  - Os três herdam o problema do R5-06 (zera no deploy).
- **Recuperação de senha:** se for separada por papel, vale o mesmo cuidado com a chave do limite. O e-mail sai pelo SMTP compartilhado (R5-07).

### RQ3 (painel completo e funcionando), pela operação
- **O `/super/sistema` não cumpre o "funcionando" como ferramenta de operação.** Ele mostra "OK" para backup atrasado e jobs parados (R5-02), não detecta banco fora do ar (R5-04), SMTP com senha errada (R5-04), 5xx nem disco (R5-03).
- **O financeiro e as estatísticas funcionam com volume pequeno, mas não escalam e arriscam a disponibilidade da API (R5-01).**
- **Os CSVs cortam dados em silêncio (R5-08).**
- **A comunicação diz "concluída" quando nada foi enviado (R5-07).**
- As listas, as fichas e o detalhe estão adequados no volume sintético.
- **Conteúdo dentro do `/super`:** as consultas do `/admin` não foram medidas nesta rodada (fora do foco original). É preciso medir antes de liberar.

### RQ4 (estornar e liberar acesso no pagamento)
- **Infra:** o estorno chama o Asaas com timeout de 15 s, dentro do limite do proxy. A liberação manual é só banco.
- **Pedido de operação:**
  - a liberação precisa ser idempotente (duplo clique e repetição depois de 504) e registrada na auditoria;
  - o painel deve mostrar no Sistema ou na Visão geral os "pedidos pagos sem liberação" como alerta (R5-03).
- A regra de negócio fica com R1, R3 e R4.

---

## Fechamento

### Inspecionado
- **Escopo e decisões:** `docs/pie/super/ESCOPO_BANCA.md` (inclusive a revisão do RQ1 e o RQ4), as seções 1, 2 e 7 do protocolo, D13, D14 e D23 de `docs/DECISOES.md`, `docs/DEPLOY.md` (seções 4 e 5) e os achados A-03, A-05, A-06, A-07, A-24, A-25 e A-36.
- **Infra:**
  - `deploy/docker-compose.yml`, `deploy/deploy.sh` (backup e `chown`) e `deploy/nginx-host/*` (timeouts);
  - `infra/nginx/fuseaprova.conf` e `seguranca.conf`, `infra/backup/backup.sh` e os Dockerfiles (usuário `node`, `APP_VERSION`);
  - `.github/workflows/deploy.yml` (`APP_VERSION`).
- **API:**
  - `apps/api/src/rotas/super/{sistema,financeiro,pagamentos,usuarios,asaas,comunicacao,comum}.ts`;
  - `app.ts` (rate limit, error handler, saúde), `http/registrar.ts`, `servicos/sessoes.ts` e `servicos/conciliacao.ts`;
  - `integracoes/asaas.ts` (timeout).
- **Worker:** `apps/worker/src/{index,agenda,util}.ts`, `jobs/{backup,comunicacoes}.ts`.
- **Web:** `Sistema.tsx` e `Pagamentos.tsx` (CSV), `apps/web/vite.config.ts` (SW), `App.tsx`, `Sincronizador.tsx` e `offline/pacote.ts`.
- **Schema:** índices de `packages/db/src/schema/tabelas.ts`.

### Medido (comando e números)
Todos os comandos rodaram em `apps/api`, com a configuração própria em `<scratchpad>/r5/vitest.config.ts`, no formato `npx vitest run --config <scratchpad>/r5/vitest.config.ts --root <scratchpad>/r5 <arquivo>`.

1. **`01-popular` e `02-pix`:** banco `r5_perf` com as migrações reais e o seed, mais o volume sintético.
   - Volume: 20 mil alunos, 30 mil pedidos (QR de 4 KB aleatório), 1 milhão de tentativas, 200 mil de auditoria, 30 mil webhooks, 56 880 execuções de job e 5 mil sessões.
   - Tamanho: `tentativas` 233 MB, `auditoria` 65 MB, `pedidos` 186 MB depois do update, banco ~358 MB antes do QR.
2. **`03-rotas`:** 24 chamadas às rotas reais via `app.inject` (4 repetições, frio e mediana) com o SQL capturado pelo logger do Drizzle. A tabela completa está em `RELATORIO_PERFORMANCE_VPS.md`.
3. **`04-explain`:** `EXPLAIN (ANALYZE, BUFFERS)` das consultas geradas.
4. **`05-colunas`:**

   | Consulta | Tempo | JSON |
   |---|---|---|
   | `select *` | 498 ms | 144,7 MB |
   | 9 colunas | 62 ms | 7,1 MB |
   | agregado | 12 ms | — |

   O MAU com o cache quente levou 33 ms sem índice novo e 53 ms com ele.
5. **`06-conc`:** pico de heap de 278 a 331 MB com 1 ou 2 requisições, e de 661 MB com 4. Houve um `heap out of memory`, com o limite de heap do Vitest em 604 MB.
6. **`07-operacao`:**
   - R5-A: 180 polls → 200; 2 h 01 parado → 401.
   - R5-B: 10 × 400, depois 429, e 400 depois do reinício.
   - R5-C: KPI "OK" com backup de 10 dias; banco fechado → 500 interno.
   - R5-D: 95/95 `falhou`, `concluida`.
7. **`08-absoluto`:** a sessão caiu no minuto 720.
8. **`09-cfg`:** Postgres local 16.15, `shared_buffers` 128 MB, `work_mem` 4 MB, `pg_trgm` e `pg_stat_statements` disponíveis e não instalados.
9. **`vite build --outDir <scratchpad>/r5/webdist`:** precache de 302 entradas e 2 828 KiB, dos quais 259 004 bytes são do `/admin` e do `/super`. A pasta foi apagada depois.
10. **`pnpm --filter @fuse/api exec vitest run test/superadmin.test.ts`:** 80/80 passaram (7,2 s).
11. **`99-limpar`:** `drop database r5_perf`. Não sobrou nenhum banco `r5%`.

### Não medido, e por quê
- **Produção (VPS 72.60.10.112):** BLOQUEADO pela política da sessão. Ficam sem medição:
  - o volume real de pedidos e tentativas;
  - a RAM real da API;
  - o disco;
  - se o backup das 03:30 já roda depois da correção do A-03;
  - a cópia externa (A-06);
  - as cotas do provedor SMTP;
  - os limites e a contenção de CPU (A-25).
- **Latência e rate limit do Asaas:** não há credencial de sandbox, então o R5-09 fica como hipótese.
- **SMTP real:** o throughput e o comportamento do pool não foram medidos. O R5-07 usou um enviador falso.
- **Consultas do `/admin` (Conteúdo):** não foram medidas. Entram no RQ1 revisado e devem ser medidas antes da liberação.
- **Comportamento do nginx com 504:** não foi executado. A conclusão vem só da configuração.

### Limitações
- Os tempos foram medidos num desktop Windows, não numa VPS de 2 vCPU compartilhada: servem para comparação relativa (antes e depois, `select *` contra colunas), não como tempo de produção.
- O pico de heap foi medido no worker do Vitest, que tem sobrecarga própria (~50 MB de base) e outro limite de heap. O OOM foi intermitente.
- O volume sintético é plausível, mas a distribuição (datas uniformes em 365 dias, 50 tentativas por aluno) é uma escolha minha.
- Os testes de PGlite (R5-A a R5-D) usam o relógio de teste da API. O comportamento do rate limit é o do `@fastify/rate-limit` real, com `rateLimit: true`.
