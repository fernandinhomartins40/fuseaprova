# Validação V2: UX, front-end e infraestrutura (commits `6a2cb43..HEAD`)

Data: 27/10/2026. Revisor V2 (somente auditoria; nenhum arquivo do projeto alterado).
Escopo: `git diff 6a2cb43..HEAD -- apps/web infra .github apps/worker/src/jobs/backup.ts packages/db/src/teste.ts`.

Evidência executada:
- `pnpm --filter @fuse/web build`: verde. `dist/sw.js` contém `importScripts("/sw-push.js")` e `sw-push.js` está no precache com `revision`.
- `pnpm --filter @fuse/web exec vitest run src/offline/offline.test.ts src/ui/ui.test.tsx`: 23/23 verdes.
- `bash -n` em `infra/backup/{backup,restore,teste-restore}.sh`: ok.
- Simulação do `backup.sh` (pg_dump e pg_restore falsos, `BACKUP_MODO=local`) com 16 execuções no mesmo dia e com um `tar` que falha.
- Simulação dos handlers `push`/`notificationclick` do `sw-push.js` em Node, com `self` falso.
- `deploy.yml` lido com js-yaml: estrutura válida.

Scripts temporários em `C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\5c01e833-c735-4764-be3d-7df5d2680052\scratchpad\v2\`.

---

## Achados

### V2-01: falha do `tar` deixa `.parcial` órfão, marca o backup inteiro como falho e trava o deploy
- **Severidade:** MÉDIA. **Estado:** CONFIRMADO (simulado).
- **Onde:** `infra/backup/backup.sh:137-138`. O `trap` da linha 113 só apaga `$TEMP` (o dump).
- **Reprodução:** coloque um `tar` falso no PATH que escreve no destino e sai com 1 (é o código do GNU tar para "file changed as we read it"). O script então:
  - sai com 1;
  - deixa `arquivos/fuse_arquivos_…tar.gz.parcial`, que o glob da retenção (`fuse_arquivos_*.tar.gz`) nunca apaga;
  - não atualiza o `ULTIMO_BACKUP`, embora o dump do banco tenha sido feito e validado.
- **Impacto:**
  - No `deploy/deploy.sh:298-299`, o backup roda antes da migração com `|| fail "o backup falhou; nada foi migrado nem trocado"`. Um upload do admin durante o deploy, ou um arquivo ilegível, agora **bloqueia o deploy** mesmo com o dump em ordem.
  - No worker, isso vira "backup falhou" no painel.
  - Com disco cheio, os `.parcial` ainda se acumulam.
- **Correção:**
  - incluir `"$ARQ.parcial"` no `trap` (ou apagar antes do `fail`);
  - tratar o código 1 do tar como aviso (`--warning=no-file-changed` e aceitar o exit 1);
  - ou gravar o `ULTIMO_BACKUP` do banco antes do bloco de arquivos e reportar a falha dos arquivos à parte.

### V2-02: retenção dos arquivos por quantidade, e o deploy faz um tar completo a cada push
- **Severidade:** MÉDIA. **Estado:** CONFIRMADO (simulado).
- **Onde:** `infra/backup/backup.sh:139-140` (`tail -n +KEEP_DAILY+1`) contra `podar_diarios` (por **dia**). No host, `deploy/deploy.sh:298` roda o mesmo script sem `ARQUIVOS_DIR`, então o default vira `/root/fuseaprova/arquivos` (não há `/.dockerenv`).
- **Reprodução:** 16 execuções no mesmo dia geram 16 dumps em `diario/` (o dia conta como 1) e só **14** tarballs em `arquivos/`. Com cerca de 45 commits por semana (cada push na main faz um deploy), os 14 tarballs cobrem horas ou poucos dias. Já os dumps cobrem 14 dias.
- **Impacto:**
  - Não existe tarball de arquivos contemporâneo a um dump de 10 dias atrás.
  - Cada deploy fica mais lento, porque compacta tudo: PDFs do coletor e figuras.
- **Correção:**
  - podar por dia, como os dumps;
  - pular o tar no backup pré-migração (ex.: `BACKUP_ARQUIVOS=0` no `deploy.sh`);
  - ou usar cópia incremental (`rsync --link-dest`).

### V2-03: espaço em disco (14 cópias completas de PDFs já comprimidos)
- **Severidade:** BAIXA a MÉDIA. **Estado:** HIPÓTESE. O tamanho de `/root/fuseaprova/arquivos` em produção não foi medido (sem acesso à VPS).
- **Onde:** `infra/backup/backup.sh:136-141`.
- **Impacto:** o gzip quase não reduz PDFs. Na VPS compartilhada, 14 cópias completas podem pesar no disco junto com os dumps.
- **Correção:** medir (`du -sh /root/fuseaprova/arquivos`) e, se for grande, adotar a cópia incremental do V2-02.

### V2-04: restauração dos arquivos não existe nos scripts nem no `DEPLOY.md`
- **Severidade:** MÉDIA (operacional). **Estado:** CONFIRMADO.
- **Onde:**
  - `infra/backup/restore.sh` e `teste-restore.sh` não mencionam `arquivos` nem `tar`;
  - `docs/DEPLOY.md` §4.1 lista só os dumps;
  - §5 ("Restore") não fala dos tarballs;
  - §5, "Restore em outra VPS", manda "copiar `/root/fuseaprova/arquivos`", o que supõe a VPS antiga viva.
- **Impacto:** no desastre real (VPS perdida), quem restaura não sabe que existe `backups/arquivos/*.tar.gz` nem como extrair. O §4.3 (rsync de `backups/`) até leva os tarballs, mas o procedimento não existe.
- **Correção:**
  - documentar `tar -xzf backups/arquivos/fuse_arquivos_<carimbo>.tar.gz -C /root/fuseaprova/arquivos && chown -R 1000:1000 /root/fuseaprova/arquivos`;
  - escolher o tarball mais próximo do dump;
  - opcionalmente, uma flag `--arquivos` no `restore.sh` e a checagem de `tar -tzf` no `teste-restore.sh`.

### V2-05: o filtro de URL do `sw-push.js` aceita `"/\host"` e abre outro domínio
- **Severidade:** BAIXA (defesa em profundidade). **Estado:** CONFIRMADO no SW. Não alcançável pelas entradas atuais.
- **Onde:** `apps/web/public/sw-push.js:14`.
- **Reprodução:** um payload `{"url":"/\\mal.com"}` passa em `startsWith('/') && !startsWith('//')`, e `openWindow` resolve para **`https://mal.com/`** (simulado: `abre= ['https://mal.com/']`). O WHATWG URL trata `\` como `/` em esquemas especiais.
- **Por que não é explorável hoje:**
  - `ComunicacaoCriarEntrada.link` (`packages/shared/src/api/superadmin.ts:746-750`) usa a regex `^\/[\w\-/?=&#.]*$`, sem `\`;
  - os lembretes usam `/aprender` fixo.
- **Correção:** `const u = new URL(dados.url, self.location.origin); url = u.origin === self.location.origin ? u.pathname + u.search + u.hash : '/aprender'`.

### V2-06: payload JSON `null` derruba o handler de push
- **Severidade:** BAIXA. **Estado:** CONFIRMADO (simulado).
- **Onde:** `apps/web/public/sw-push.js:10-14`.
- **Reprodução:** `evento.data.json()` devolve `null`, e `dados.url` lança `TypeError: Cannot read properties of null`. Nenhuma notificação sai e o Chrome mostra a genérica "site atualizado em segundo plano". No Safari, pushes sem notificação podem levar o navegador a revogar a inscrição.
- **Payload que não é JSON:** resiste. Cai no `catch` e vira o corpo em texto.
- **Correção:** `if (!dados || typeof dados !== 'object') dados = {};`.

### V2-07: `notificationclick` não navega numa janela não controlada
- **Severidade:** BAIXA. **Estado:** FORTE INDÍCIO (comportamento da especificação; simulado com um `navigate` que rejeita).
- **Onde:** `apps/web/public/sw-push.js:33-36`. O `dist/sw.js` gerado tem `skipWaiting()`, mas **não** tem `clientsClaim()`, e o `matchAll` usa `includeUncontrolled: true`.
- **Reprodução:** na 1ª visita, o aluno ativa o push no onboarding e a aba continua aberta sem controle do SW até recarregar. Ao clicar na notificação, `focus()` funciona, mas `WindowClient.navigate()` rejeita com `TypeError`. A aba ganha foco e fica na tela atual, e o `waitUntil` rejeita.
- **Observação de UX:** com uma janela controlada, o clique navega para fora de uma lição em andamento sem a confirmação de "sair da lição".
- **Correção:** encadear `.catch(() => self.clients.openWindow(url))` ou só navegar se `j` estiver controlada. Avaliar `clientsClaim: true` no Workbox.

### V2-08: retentativa automática do simulado com mensagem "sem conexão" para qualquer erro e sem fim
- **Severidade:** BAIXA. **Estado:** CONFIRMADO (leitura do código).
- **Onde:** `apps/web/src/telas/simulado/SimuladoProva.tsx:72-85`.
- **Reprodução:** qualquer erro que não seja `simulado_encerrado` (500 `interno`, 402, 404 `nao_encontrado`, 401) entra no mesmo ramo. O aluno lê "Sem conexão agora: a prova será entregue assim que a internet voltar" e o `tic` tenta de novo a cada 10 s **para sempre**. Cada falha ainda invalida `simulados`, `me` e `revisao` (refetch a cada 10 s) e pisca o `entregando`.
- **O que resiste:** o toast é um só e não sai mais o falso "a prova foi entregue".
- **Correção:**
  - mensagem de rede só para `codigo === 'sem_conexao'` (status 0);
  - em 4xx permanente, parar de tentar e mostrar `mensagemDeErro(e)`;
  - opcionalmente, backoff.

### V2-09: SAIR pode ficar preso em "carregando" com rede ruim
- **Severidade:** BAIXA. **Estado:** FORTE INDÍCIO.
- **Onde:** `apps/web/src/telas/Configuracoes.tsx:341`. `sincronizar()` → `chamar('syncTentativas')` não tem timeout nem `AbortSignal` (`apps/web/src/api/cliente.ts` só repassa um `signal` opcional).
- **Reprodução:** a rede responde que está online (`navigator.onLine === true`) mas a requisição pendura (lie-fi). O botão fica `carregando` até o fetch do navegador desistir. O `authSair` já não tinha timeout antes; agora são duas esperas em sequência.
- **Correção:** `Promise.race` com cerca de 8 s ou `AbortSignal.timeout(8000)` no sync de saída. Se estourar, contar os pendentes e mostrar o modal.

### V2-10: nenhuma das correções de front e do backup tem teste de regressão
- **Severidade:** BAIXA (processo). **Estado:** CONFIRMADO.
- **Sem teste:**
  - `grep` por `sessao_encerrada`, `SAIR MESMO`, `O tempo acabou`, `conflito` nos testes do web não acha a Lição (repetir o concluir e `sessao_encerrada`), o Pagamento (409), o modal de Configurações nem o Simulado;
  - não há teste de `sw-push.js`;
  - `executarBackup` (`apps/worker/src/jobs/backup.ts`) não tem teste. A volta de `bash` para `sh` (R5-01) não seria detectada. O pré-teste do `deploy.sh:190` só faz `test -x`.
- **Correção:**
  - testes de tela com MSW e o cliente simulado;
  - um teste do worker que roda um `.sh` com `[[ ]]`/`mapfile`;
  - no pré-teste do deploy, `bash -n /app/infra/backup/backup.sh` dentro da imagem.

### V2-11: 409 `conflito` leva ao `/onboarding` mesmo com o onboarding já concluído
- **Severidade:** BAIXA. **Estado:** HIPÓTESE (cenário raro).
- **Onde:** `apps/web/src/telas/Pagamento.tsx:71-75` e `:111-114`. O efeito da celebração sempre navega para `/onboarding`, e `Onboarding.tsx` não redireciona quem já concluiu.
- **Cenário:** o `me` em cache diz `acesso=false`, mas o servidor já diz `true` com o onboarding concluído (ex.: acesso revogado e reaprovado manualmente com a aba aberta). O aluno refaz o onboarding.
- **Segurança:** não há problema. O único 409 `conflito` de `gerarPix` é `u.acesso === true` (ver "Resistiu").
- **Correção:** após `invalidateQueries`, navegar conforme `me.onboardingConcluido`, como o efeito da linha 51-54.

### V2-12: CI com Node 22 e produção com Node 24; 30 min para duas rodadas da API
- **Severidade:** INFORMATIVA. **Estado:** HIPÓTESE (pré-existente, só agravado).
- **Onde:** `.github/workflows/deploy.yml:166` (`node-version: 22`) contra `infra/docker/*.Dockerfile` (`node:24-bookworm-slim`). O job `testes` mantém `timeout-minutes: 30` e agora roda a suíte da API duas vezes.
- **Correção:** alinhar o Node do CI e acompanhar a duração do job.

---

## O que resistiu

1. **SW e push.**
   - O `importScripts("/sw-push.js")` fica dentro do callback `define([...workbox])` do `dist/sw.js`, o mesmo padrão em que o Workbox registra o fetch e o message. Os listeners entram na avaliação inicial.
   - `sw-push.js` entra no precache com revisão. Mudar o arquivo muda o `sw.js` e dispara a atualização.
   - **CSP:** o `sw.js` é servido com a própria CSP (`script-src 'self'`, `worker-src 'self'`), o que permite `importScripts` do mesmo domínio.
   - **nginx interno:** `/sw-push.js` cai em `location /` (`infra/nginx/fuseaprova.conf:157-161`) com `try_files $uri`, `Cache-Control: no-cache` (igual ao `sw.js`), cabeçalhos de segurança e MIME JS do `mime.types` (o `nosniff` está ok). O nginx do host só faz proxy.
   - URLs externas (`https://…`) e `//host` viram `/aprender`. Payload que não é JSON vira texto. Sem dados, a notificação padrão aparece.
2. **Lição.**
   - `sessao_encerrada` só nasce de `concluidaEm` preenchido (`apps/api/src/servicos/estudo.ts:360`). Nada mais conclui uma sessão online (o sync offline usa outro id).
   - Não há loop automático: tentar de novo é manual e o "Voltar" existe.
   - Na sessão offline, repetir o concluir é idempotente: `db.put` de `concluidaEm` e `marcarFeito`. Ela nunca recebe `sessao_encerrada`.
3. **Pagamento.**
   - O único `conflito` de `POST /pagamento/pix` é `u.acesso` (`apps/api/src/servicos/pagamento.ts:46`), lido sob `FOR UPDATE`.
   - Violação de unicidade dentro do `try` vira `pix_indisponivel`. O `setErrorHandler` global (`apps/api/src/app.ts:150-160`) não gera `conflito`.
   - Mesmo um falso "pago" não liberaria nada: a `Guarda` de nível `acesso` (`apps/web/src/app/Guarda.tsx:46`) redireciona e o servidor responde 402 via `exigirAcesso`.
   - Cópia do Pix: o toast agora é honesto. `navigator.clipboard` ausente cai no fallback.
4. **Celular.** `formatarCelular` → `limparCelular` corta em 11 dígitos, então digitar além disso não passa de 15 caracteres mascarados. `+55 (42) 99999-9999` (19 caracteres) cabe. O teste de UI do `Campo` passa.
5. **Sair com fila offline.** Os outros caminhos de `sair()`/`limparLocal()` são o Pagamento (aluno sem acesso não tem pacote offline) e a exclusão da conta (intencional). O 401 não apaga a fila.
6. **Simulado.** Um toast só por falha automática. "Prova entregue" só aparece com `ok`. O servidor fecha o simulado vencido ao ser consultado (`apps/api/src/servicos/simulado.ts:319/333/358`).
7. **Backup no worker.**
   - `node:24-bookworm-slim` tem `bash`, `tar`, `gzip`, `find -printf`, `du` e `sort`. O `util-linux` (flock) é instalado.
   - `/srv/fuse/arquivos` está montado e `ARQUIVOS_DIR` definido no worker (`deploy/docker-compose.yml:180,186`). API e worker rodam como `node` (uid 1000), então a leitura funciona.
   - A simulação gerou o tarball correto (`./uploads/a.png`), registrou a retenção no log e o `bash -n` passou nos três scripts.
8. **CI e `teste.ts`.**
   - O YAML é válido. O service fica em `localhost:5432` (o job roda no host do runner).
   - O `pg_isready -U fuse` sem `-d` só verifica se o servidor aceita conexões.
   - Os nomes `teste_<base36>_<base36>` são identificadores válidos em minúsculas.
   - Bancos nunca apagados não são problema num runner efêmero.
   - Só `apps/api/src/teste/index.ts` e `apps/worker/test/jobs.test.ts` criam banco, e todos os 11 arquivos de teste da API e o do worker fecham a conexão. Pool máximo de 10 vezes os workers do vitest fica abaixo de 100 conexões.
   - `new URL(...).pathname` funciona no esquema `postgres:`.
