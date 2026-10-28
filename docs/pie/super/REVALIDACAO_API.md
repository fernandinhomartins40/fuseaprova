# Revalidação adversarial da API e do worker: painel superadmin

- **Data:** 28/10/2026
- **Base:** `18f065b` (worktree `agent-a9a0a35e15898acd4`), com as correções `2f71392..HEAD`.
- **Modo:** só revalidação. Nenhum arquivo de código foi alterado. Os testes de prova ficaram no scratchpad (`…\scratchpad\reval\_reval_a.test.ts`, `_reval_b.test.ts` e `_reval_c.test.ts`). Para rodar, cada um foi copiado para `apps/api/test/`, executado e apagado em seguida. O `git status` final está limpo.
- **Bancos:** PGlite (padrão) e Postgres 16 real (`TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres`), com o mesmo resultado nos dois, salvo onde está indicado.
- **Escopo:** os achados de API e worker S-01, S-02, S-03, S-05 a S-18 e S-20 a S-24. A web (S-04, S-19, S-25, S-27) ficou fora.

## 1. Resumo

| Estado | Achados |
|---|---|
| **CORRIGIDO** | S-01, S-02, S-03, S-05, S-06, S-07, S-08, S-09, S-10, S-11, S-13, S-14, S-15, S-16, S-17, S-18, S-20, S-21, S-22 (no `/super`), S-23, S-24 |
| **PARCIAL** | S-12 (o limite do cupom ainda estoura quando o Asaas responde em tempos diferentes: V-03) |
| **NÃO CORRIGIDO** | nenhum |
| **REGRESSÃO** | nenhuma |

- **Matriz de guardas:** 0 violações. Foram 148 rotas do registro contra 6 personas (876 chamadas): aluno pago, aluno sem pagar, admin, superadmin com 2FA, superadmin com 2FA ativo mas sessão sem o código, e superadmin sem 2FA configurado.
- **Suítes:**
  - API: 425/425 no PGlite e no PG16.
  - Worker: 21/21 no PGlite e no PG16.
- **Achados novos:** 7 (V-01 a V-07). Dois são médios: V-01, a troca de senha sem 2FA, e V-03, a corrida do cupom. Nenhum é bloqueador.

## 2. Comandos usados

| Código | Comando (em `apps/api`, com `S=…\scratchpad\reval`) | Resultado |
|---|---|---|
| C1 | `npx vitest run` | 17 arquivos, **425/425** (PGlite) |
| C2 | `TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres npx vitest run` | 17 arquivos, **425/425** (PG16) |
| C3 | `cd apps/worker && npx vitest run`, e o mesmo com `TESTE_DATABASE_URL` | **21/21** nos dois bancos |
| C4 | `cp $S/_reval_a.test.ts test/ && npx vitest run test/_reval_a.test.ts; rm test/_reval_a.test.ts`, e o mesmo com `TESTE_DATABASE_URL` | 16/16 nos dois bancos. Saídas em `$S/saida-a-pglite.txt` e `$S/saida-a-pg16.txt` |
| C5 | o mesmo, com `_reval_b.test.ts` (corridas, limites e cupom) | 10/10 nos dois bancos. `$S/saida-b-*.txt` |
| C6 | o mesmo, com `_reval_c.test.ts` (2FA em rajada com o rate limit ligado e o cabeçalho de segundo plano) | 2/2 nos dois bancos. `$S/saida-c-*.txt` |

As linhas `[REVAL-x]` citadas abaixo são a saída literal desses testes.

## 3. Achados de API e worker

| ID | Estado | Reprodução original repetida | Tentativa de contorno | Evidência | Cmd |
|---|---|---|---|---|---|
| **S-01** | CORRIGIDO | As 25 rotas `acesso` com o superadmin, com e sem 2FA: todas dão **403 `proibido`**, nunca 200 nem 402. O superadmin com `acesso=true` legado continua com 403. | Superadmin com 2FA ativo, mas sessão aberta só com a senha. Imagens `/api/arquivos/uploads`. CLI, convite e troca de papel. | Matriz: 0 violações. Arquivos: `superNaoVerif uploads=403`, `superSemConfig uploads=403` e `super uploads=404`, ou seja, passou da guarda para a curadoria. A CLI e o convite gravam `acesso=false` (`superadminCli.ts:7`, `usuarios.ts:602`). **Resíduo do R1-02:** `/me/senha` sem 2FA, ver **V-01**. | C1, C4 |
| **S-02** | CORRIGIDO | O admin chama cada uma das 61 rotas `superadmin`: todas dão 403 `proibido`. As rotas de negócio do `/admin` dão 404 (`d24.test.ts`). | O admin tenta cortesia, liberar, aprovar, estornar e reembolsar pelo `/super`. | Matriz: 0 violações. O `adminPainel` só tem conteúdo (`gestao.ts:18-31`). | C1, C4 |
| **S-03** | CORRIGIDO | Cada papel em cada um dos 3 portais. | Comparação do corpo, do cookie e do tempo; conta bloqueada no portal errado. | Portal errado com a senha certa dá **401** e nenhum cookie. Os corpos de falha (portal errado, senha errada e conta inexistente) são um só: `{"erro":"E-mail ou senha incorretos.","codigo":"credenciais_invalidas"}`. Tempo mediano: portal errado 43/53 ms, senha errada 41/52 ms (PGlite/PG16). A conta bloqueada no portal errado também dá `credenciais_invalidas`, e o bloqueio só aparece no portal certo com a senha certa. A redefinição de senha do superadmin devolve `area: super` e `proximo: dois_fatores`, e a sessão aberta ainda recebe 403 no `/super` e na trilha. | C4 |
| **S-05** | CORRIGIDO | O superadmin com acesso legado rebaixado a aluno dá 402 (`d24.test.ts`). | Ida e volta: aluno sem pagar → admin → aluno; aluno com Pix pago **enquanto era admin**; aluno com cortesia → admin → aluno; aluno promovido a superadmin tenta se dar cortesia. | Nenhum ganho: o Pix pago na promoção vale como pedido legítimo, a cortesia **se perde** na ida e volta (`acesso=false`, 0 pedidos), e o superadmin recém-promovido recebe 403 `dois_fatores_necessario`. Ver a observação O-1 sobre a cortesia. | C4 |
| **S-06** | CORRIGIDO | A aprovação manual do pedido de Siqueira com Palmital pago libera Siqueira com o valor do pedido (`d24.test.ts`). | Aprovar um pedido já pago, estornado, da equipe ou da própria conta (pelo pedido e pela ficha). | Já pago: `jaAprovado=true`, sem pedido novo. Estornado: **409**. Pedido de admin: **403**. Própria conta: **409** (aprovar, ficha, liberar, estornar e cortesia). O superadmin continua com `acesso=false`. **Resíduo:** o Pix pago entre a consulta ao Asaas e o cancelamento fica sem registro, ver **V-06**. | C4 |
| **S-07** | CORRIGIDO | Liberar um pedido pago sem o concurso liberado; a conciliação marca "pago sem liberação" (`d24.test.ts`). | Liberar um pedido pendente ou estornado; liberar com reembolso já pedido. | Pendente: **409**. Estornado: **409**. Reembolso pedido: **409**. **Mas** a "Aprovar manual" e a ficha religam o concurso nesse mesmo caso, ver **V-02**. | C4 |
| **S-08** | CORRIGIDO | O financeiro e as estatísticas não leem `pix_imagem` nem `pix_payload` (`lote2-operacao.test.ts`, S-08, com o SQL capturado no PGlite). | Busca por outros `select()` inteiros em `pedidos` no painel. | Os que restam são por usuário ou por pedido (`usuarios.ts:165,303`, `pagamentos.ts:118`), sem varredura de período. | C1, C2 |
| **S-09** | CORRIGIDO | Backup de 10 dias, job atrasado, worker parado, 5xx e banco fora, que agora dá 503 `banco_indisponivel` (`lote2-operacao.test.ts`). Alertas por e-mail, sem repetir antes de 6 h; `backup.sh` com código 3 (`apps/worker/test/lote2.test.ts`). | — | Suítes verdes nos dois bancos. Produção não testada. | C1, C2, C3 |
| **S-10** | CORRIGIDO | Estorno duas vezes. | `Promise.all` com dois `estornar` e um `reembolso` no mesmo pedido Asaas; três chamadas paralelas (`estornar`, `estornar`, `desfazer-manual`) num pedido manual. | Asaas: `status=200,409,409` e **1** chamada ao Asaas, nos dois bancos. Manual: exatamente um 200 e dois 409. A rota do `/admin` não existe mais. | C4 |
| **S-11** | CORRIGIDO | Trocar o e-mail do admin, forçar a senha do admin e bloquear outro superadmin sem `confirmacao` dá 400. Com a confirmação, o e-mail antigo é avisado e a sessão cai (`lote2-operacao.test.ts`). | Leitura das outras ações sobre a equipe. | Corrigido no que o S-11 pedia. Ver a observação O-2 (revogar sessão e desbloquear sem reconfirmação). | C1, C2 |
| **S-12** | **PARCIAL** | O cupom sem reconfirmação dá 400; o limite 1 com reserva vale (`lote2-operacao.test.ts`). | (a) `Promise.all` de 5 alunos com o cupom de limite 1; (b) o Pix que **começou antes termina depois**, porque o Asaas demora mais para um aluno. | (a) `status=200,400,400,400,400`, 1 pago: ok. (b) `rápido=200 lento=200 pagos com o cupom=2`, no PGlite **e** no PG16: **o limite estoura**. Ver **V-03**. | C5 |
| **S-13** | CORRIGIDO | `DELETE /me` do superadmin e do admin dá 403. O último superadmin não some. | A equipe usa `/me/exportar`, `/me/concursos`, Pix e cupom; o admin escolhe cargo pelo `/me`. | Matriz: as 10 rotas `aluno` dão 403 para as 4 personas da equipe. `meAtualizar` com `cargoId` dá 403 (`d24.test.ts`). | C1, C4 |
| **S-14** | CORRIGIDO (API) | O pagamento tem `concurso`, `cupomCodigo` e `descontoCentavos`, mais o filtro `concursoId` (`superadmin.ts:142-268`). O CSV tem as colunas `concurso`, `cupom` e `desconto_reais` (`pagamentos.ts:258`). Liberar e revogar são por concurso. A lista leve é `superConcursos`. | — | `d24.test.ts` e `lote3-api.test.ts` verdes. As telas ficaram fora. | C1, C2 |
| **S-15** | CORRIGIDO (API) | O polling com o cabeçalho cai depois de 2 h sem uso humano (`lote2-operacao.test.ts`). | Usar o cabeçalho para **manter** a sessão; variar o valor do cabeçalho. | O cabeçalho só **suprime** a renovação e não estende nada. Só o valor exato `1` suprime (`"true"`, `" 1"` e `"0"` renovam, o que é inofensivo). Não dá para prolongar a sessão além das regras normais. | C6 |
| **S-16** | CORRIGIDO | 10 códigos errados geram o bloqueio 429, que vale numa nova instância da API, com auditoria e e-mail (`lote2-operacao.test.ts`). | (a) Alternar portais com o IP fixo; (b) e-mail fixo com IP diferente a cada tentativa; (c) caixa e espaço no e-mail; (d) nova instância; (e) rajada de 30 códigos do 2FA em paralelo, com o rate limit ligado e com uma nova instância. | (a) 429 na 21ª tentativa; (b) 429 na 11ª; (c) 429 na 11ª, porque o e-mail é normalizado; (d) 429 persiste; (e) `rajada 1={"400":10,"429":20}`, `rajada 2 (nova instância)={"429":30}`: **10 códigos conferidos**. Observações em **V-04** (bloqueio do login do dono por terceiros) e **V-05** (corrida do bloqueio sem o limitador em memória). | C5, C6 |
| **S-17** | CORRIGIDO | Reconfirmação; a mesma chave devolve a mesma comunicação; a idêntica dá 409; o limite diário vale com criações em paralelo (`lote2-operacao.test.ts`). O worker tem retentativa, disjuntor, `ok=false` e o cancelamento no meio (`apps/worker/test/lote2.test.ts`). | `Promise.all` de 3 com a mesma chave, 3 sem chave e o mesmo texto, e o texto com um espaço a mais. | Mesma chave: `200,200,200`, **1** criada. Sem chave: um 200 e dois 409, **1** criada. Espaço a mais: 409. | C3, C5 |
| **S-18** | CORRIGIDO | O aviso de corte vai no arquivo e na resposta. O CSV de usuários só lê as colunas exportadas (`lote2-operacao.test.ts`, `usuarios.ts:351-379`). | `celulaCsv` com 20 entradas. | Neutralizados: `=`, ` =`, NBSP`=`, `　=`, `＝`, `\t=`, `\r=`, `\n=`, `@`, `+`, `-1+1`. Continuam números: `-1` e `-397,00`. Passam sem prefixo: `​=1+1` e `﹦1+1`. Nenhum dos dois vira fórmula no Excel nem no LibreOffice, porque o 1º caractere não é `=` (HIPÓTESE, planilha não aberta). | C4 |
| **S-20** | CORRIGIDO | O Asaas lento dá resposta parcial com "não conferidos", em vez de 504 (`lote2-operacao.test.ts`). | — | Não medido contra o Asaas real. | C1, C2 |
| **S-21** | CORRIGIDO | A auditoria e a ficha do excluído ficam sem nome, e-mail e celular. A exportação exige motivo e confirmação. O CPF só é buscado pelos 11 dígitos (`lote2-operacao.test.ts`). | Leitura das outras chaves com dado pessoal na auditoria. | `CAMPOS_PESSOAIS` cobre `para`, `email`, `emailAntigo` e `emailNovo` (`lgpd.ts:102`). Ressalva O-3: texto livre e comprovantes. | C1, C2 |
| **S-22** | CORRIGIDO no `/super` | Com `q=%` e `q=_`: usuários, pagamentos e webhooks voltam com 0 itens, e a auditoria com `alvo=%` também. | As mesmas buscas na seção Conteúdo, que agora faz parte do painel. | `adminQuestoesListar`: todas=95, `q=%`=95, `q=_`=95. **Ainda traz tudo**, ver **V-07**. | C4 |
| **S-23** | CORRIGIDO | O Pix antigo é pago enquanto sai do Asaas: o pedido continua pago (`d24.test.ts`). | Leitura do `gerarPix`. | `update … where status='pendente'` e a releitura depois do `removerCobranca` (`pagamento.ts:115-130`). | C1, C2 |
| **S-24** | CORRIGIDO | Último superadmin, em paralelo (PG16, com transações concorrentes de verdade). | 5 corridas entre dois superadmins: rebaixam um ao outro; bloqueiam um ao outro; excluem um ao outro; A bloqueia B enquanto B rebaixa A; cada um rebaixa a si mesmo. | Em todas, **sobra 1 superadmin ativo**. PG16: `200,401` (a sessão do perdedor cai antes) ou `200,409`. PGlite: `200,409`. | C5 |

## 4. Achados novos

### V-01: a sessão do superadmin aberta só com a senha troca a senha e derruba a sessão verificada do dono
- **Severidade:** MÉDIA (segurança, disponibilidade). **Estado:** CONFIRMADO (PGlite e PG16).
- **Onde:**
  - `apps/api/src/rotas/me.ts:77-87` (`meSenha`);
  - guarda `login` de `meSenha` em `packages/shared/src/api/rotas.ts`;
  - `exigirGuarda`, caso `login`, em `apps/api/src/http/registrar.ts`.
- **Reprodução** (`_reval_a`, "superadmin com sessão só da senha"):
  1. login em `/auth/login/super`, sem digitar o código;
  2. `POST /me/senha` com a senha atual.
- **Resultado:** `meAtualizar=200 meSenha=200 sessão verificada do dono depois=401`.
- **Impacto:**
  - quem só tem a senha do dono (vazamento ou phishing) troca a senha e derruba todas as sessões verificadas dele;
  - o dono fica sem painel até recuperar a conta pelo e-mail;
  - o 2FA continua impedindo o atacante de entrar no `/super`, mas o 2FA deveria proteger também contra esse bloqueio;
  - é o pedaço do R1-02 que a D24 deixou na guarda `login` de propósito ("`/me`, senha, sair para todos").
- **Correção sugerida:** em `meSenha`, quando `papel === 'superadmin'`, chamar `exigirDoisFatores(usuario)`, que responde 403 `dois_fatores_pendente`. Outra opção é uma guarda `login_2fa`, que exige o 2FA verificado nesta sessão para o superadmin e vale para `meSenha` e `meAtualizar`.
- **Teste de aceite:** uma sessão sem o código recebe 403 em `/me/senha`, e a sessão verificada do dono continua 200.

### V-02: com o reembolso já pedido ao Asaas, "Aprovar manual" e a aprovação pela ficha religam o concurso
- **Severidade:** BAIXA (receita). **Estado:** CONFIRMADO (PGlite e PG16).
- **Onde:** `apps/api/src/servicos/pagamentoManual.ts:216-226`, no ramo `jaPago` de `aprovarPedidoManual`, e `:312-323`, no ramo `jaPago` de `aprovarPagamentoManual`. Os dois chamam `liberar` sem olhar `reembolsoSolicitadoEm`. Já o `liberarPedido` (`:435`) e a conciliação (`conciliacao.ts:22`) recusam.
- **Reprodução** (`_reval_a`, "estorno pedido ao Asaas…"):
  1. pedido pago;
  2. `estornar`, que grava `reembolsoSolicitadoEm`;
  3. `superUsuarioConcursoRevogar`, para revogar já;
  4. `liberar` dá **409**;
  5. `aprovar-manual` no mesmo pedido dá **200** com `jaAprovado=true`.
- **Resultado:** `acesso Palmital=true`.
- **Impacto:** o aluno volta a estudar enquanto o reembolso está em andamento, até o webhook `PAYMENT_REFUNDED`. A janela é curta e exige uma ação do superadmin, mas fura a regra que o "Liberar" aplica.
- **Correção sugerida:** nos dois ramos `jaPago`, se `jaPago.reembolsoSolicitadoEm`, responder 409 com a mesma mensagem do `liberarPedido`, ou devolver `jaAprovado` sem liberar.

### V-03: o limite do cupom ainda estoura quando o Asaas responde em tempos diferentes
- **Severidade:** MÉDIA (receita). **Estado:** CONFIRMADO (PGlite e PG16). Fecha o S-12 só em parte.
- **Onde:**
  - `apps/api/src/servicos/precos.ts:107-130` (`reservasAntes` ordena por `(criadoEm, id)`) e `:167-182` (`garantirReservaCupom`);
  - `apps/api/src/servicos/pagamento.ts:157-177`: `criadoEm = agora`, o instante em que a **requisição começou**, e a conferência roda depois das chamadas ao Asaas.
- **Reprodução** (`_reval_b`, "o Pix que começou antes termina depois"), com cupom de limite 1:
  1. o aluno "lento" pede o Pix em T, e o `criarCobranca` dele fica preso;
  2. o aluno "rápido" pede em T+1 s, insere e confere: não há reserva antes dele, então passa;
  3. o "lento" é solto e insere com `criadoEm=T`: na conferência dele, o pedido do "rápido" vem **depois** (T+1 s) e não conta, então também passa.

  Os dois pagam. Resultado: `rápido=200 lento=200 pagos com o cupom=2`.
- **Por que acontece na prática:** a latência do Asaas varia por aluno. O aluno sem `asaasCustomerId` faz uma chamada a mais (`criarCliente`). Basta que a requisição que começou antes termine depois.
- **Correção sugerida:** serializar a reserva por cupom.
  - Depois de criar a cobrança, abrir uma transação com `select … from cupons where id = $1 for update` (ou `pg_advisory_xact_lock(hashtext('cupom:'||id))`), contar as reservas vivas (todas, não "as anteriores") e inserir o pedido nessa mesma transação.
  - Se passar do limite, não inserir, remover a cobrança no Asaas e responder 400.
  - Outra opção: ordenar pela ordem de inserção, com `clock_timestamp()` no insert ou uma sequência, e não pelo `agora` da requisição.
- **Teste de aceite:** o mesmo cenário com o "portão" no `criarCobranca` termina com um 200 e um 400, e no máximo 1 pago.

### V-04: terceiros bloqueiam o login do dono com 10 tentativas a cada 15 minutos
- **Severidade:** BAIXA (disponibilidade). **Estado:** CONFIRMADO.
- **Onde:** `apps/api/src/rotas/auth.ts:49,124`. O balde `login:email:<e-mail>` conta toda tentativa, de qualquer IP e com qualquer resultado.
- **Reprodução** (`_reval_b`, item (d)):
  1. 10 tentativas erradas com o e-mail do superadmin, cada uma de um IP;
  2. o dono entra com a senha certa, de um IP novo.
- **Resultado:** **429 `limite_requisicoes`**.
- **Impacto:** quem souber o e-mail do dono o mantém fora do login com 10 requisições a cada 15 min. As sessões já abertas continuam. É o custo conhecido de um limite por conta, e o RQ2 reduz a exposição, porque o login do super não fica na página pública.
- **Correção sugerida** (decisão do dono):
  - contar no balde do e-mail só as **falhas**;
  - somar um balde por (e-mail, IP) mais apertado, deixando o do e-mail com teto maior;
  - mandar um e-mail ao dono quando a conta dele atingir o limite.

  Não liberar a senha certa acima do limite, porque isso viraria um oráculo para a força bruta.

### V-05: o bloqueio do 2FA confere antes de contar (defesa em profundidade)
- **Severidade:** BAIXA (informativa). **Estado:** CONFIRMADO só com o limitador em memória desligado.
- **Onde:** `apps/api/src/servicos/doisfatores.ts:70-78,113,193`. `exigirSemBloqueio2fa` **lê** o contador, e `registrarFalha2fa` só soma depois de conferir o código.
- **Reprodução:** 30 códigos em `Promise.all` com o `rateLimit` desligado.
  - PG16: `{"400":21,"429":9}`, ou seja, **21 códigos conferidos** com o limite em 10;
  - PGlite: 10.
- **Em produção** (`rateLimit` ligado, `_reval_c`): o limitador em memória da rota (10 a cada 15 min por usuário) segura a rajada: `{"400":10,"429":20}`. Depois de "reiniciar" a API, outros 30 dão `{"429":30}`, com **10 conferidos** no total. Hoje não é explorável.
- **Correção sugerida:** consumir o balde **antes** de conferir (`consumirLimite` atômico) e recusar quando `n > max`. Assim o limite persistente vale sozinho, mesmo sem o limitador em memória.

### V-06: um Pix pago no Asaas entre a consulta e o cancelamento da aprovação manual fica sem registro
- **Severidade:** BAIXA (receita). **Estado:** CONFIRMADO, com a corrida forçada no Asaas falso. É o resíduo do R1-09(b).
- **Onde:**
  - `apps/api/src/servicos/pagamentoManual.ts:379-420` (`tratarCobrancaAberta` só avisa `ok:false`);
  - `apps/api/src/servicos/webhook.ts:44` e `pagamento.ts:307`: o `confirmarPagamento` de um pedido já `pago` (manual) devolve `sem_mudanca`.
- **Reprodução** (`_reval_a`, "Pix pago no Asaas entre a consulta e o cancelamento"):
  1. a consulta diz PENDING;
  2. o aluno paga;
  3. o `removerCobranca` falha;
  4. chega o webhook `PAYMENT_RECEIVED`.
- **Resultado:** `asaas={"acao":"cancelar","ok":false,…}`, `resultado=sem_mudanca`, `pedido=manual/pago`.
- **Impacto:**
  - o aluno pagou duas vezes (por fora e no Asaas);
  - o dinheiro do Asaas não entra no financeiro e não gera alerta;
  - a mensagem `ok:false` manda "cancelar no detalhe", mas a cobrança já foi paga e não pode mais ser cancelada.

  A janela é estreita, porque a consulta prévia ao Asaas fecha o caso comum.
- **Correção sugerida:**
  - quando o `removerCobranca` ou o `receberEmDinheiro` falhar, reconsultar a cobrança. Se ela estiver paga, avisar "pago também no Asaas: estorne um dos dois";
  - no webhook de confirmação para um pedido `metodo='manual'` com `asaasPaymentId`, gravar `resultado='pago_em_dobro'` e mostrar isso no `/super` e no alerta.

### V-07: a busca da seção Conteúdo não escapa `%` nem `_`
- **Severidade:** BAIXA. **Estado:** CONFIRMADO.
- **Onde:** `apps/api/src/rotas/admin/conteudo.ts:203` (provas de origem), `:249` (questões) e `:496` (assuntos), que usam `ilike` com `%${query.q}%`, sem o `contem()`/`escaparLike()` de `util.ts:38-45`.
- **Reprodução:** `adminQuestoesListar` sem filtro, com `q=%` e com `q=_`: **95 / 95 / 95**.
- **Impacto:** a busca fica imprecisa. Agora a seção Conteúdo faz parte do painel único (S-04), e o S-22 só foi corrigido nas rotas `/super`.
- **Correção sugerida:** trocar as três por `contem(coluna, query.q)`.

### Observações (sem achado)

- **O-1, cortesia sem pedido.**
  - `superUsuarioConcursoLiberar` libera um concurso **sem pagamento** ("cortesia"), com reconfirmação, motivo e auditoria (`usuarios.ts:511-549`).
  - Só o superadmin com 2FA faz isso, nunca para a equipe nem para si mesmo (testado: 403 e 409), e a cortesia não sobrevive à troca de papel.
  - É uma decisão da D24, mas contraria o texto da regra inegociável do `CLAUDE.md` ("Sem acesso gratuito"). Convém o dono confirmar e deixar isso explícito na D24.
- **O-2, ações sobre a equipe ainda sem reconfirmação.** `superUsuarioRevogarSessao` e `superUsuarioDesbloquear` não pedem reconfirmação, nem quando o alvo é da equipe (`usuarios.ts:552-561` e `:449-456`). Com uma sessão sequestrada, isso permite desbloquear um superadmin bloqueado, por exemplo uma conta do próprio atacante já desligada. O S-11 não pedia isso, mas o R1-07 citava revogar sessão.
- **O-3, LGPD.** A anonimização não toca nestes dados, que podem conter dados pessoais:
  - texto livre: `auditoria.motivo`, `pedidos.manual_observacao` e `manual_referencia`;
  - os arquivos de comprovante.

  A retenção é decisão jurídica (P-10).
- **O-4, tempo do login.** A conta inexistente variou ±25% contra a existente (33 contra 41 ms no PGlite e 67 contra 52 ms no PG16), com sinal trocado entre os bancos. Isso é ruído do argon2. O portal errado e a senha errada empatam.
- **O-5, comunicação "igual".** A trava contra comunicação repetida compara o texto exato. Uma variação de um caractere passa, mas o duplo clique é coberto pela chave de idempotência.

## 5. Regressões procuradas

| Fluxo | Resultado |
|---|---|
| Aluno cadastra, paga pelo Pix e recebe o acesso pelo webhook | ok (`alunoPago` em todas as provas e na suíte) |
| Lição completa | ok (`fazerLicao` em `_reval_a` e em `licao.test.ts`) |
| D21: 2º concurso (Siqueira) | o Pix sai com **19700** (adicional); o webhook libera Siqueira e mantém Palmital; `meuConcursoAtivar` e a trilha dão 200 |
| Conteúdo para o admin e para o superadmin com 2FA | `adminQuestoesListar`, `adminPainel`, `adminConcursosListar`, `adminTrilhas`, `adminReportsListar` e `adminImportacoesListar` dão 200 nos dois. Matriz: as 44 rotas `conteudo` passam da guarda para os dois. |
| Suítes do repositório | API 425/425 (PGlite e PG16); worker 21/21 (PGlite e PG16) |

Nenhuma regressão encontrada.

## 6. O que não foi testado, e por quê

- **Web** (S-04, S-19, S-25, S-27 e a parte web do S-14 e do S-15): fora do escopo, e outro agente está alterando `apps/web`. Não conferi se **todas** as requisições automáticas da web mandam `x-fuse-segundo-plano` (a prova web do lote 3 cobre o polling do Sistema).
- **Produção e VPS:** sem acesso. O nginx (`X-Forwarded-For`, tempo limite de 60 s), o backup real, o disco e o SMTP real ficaram de fora.
- **Asaas real ou sandbox:** sem credencial. A latência real (S-20), a resposta do Asaas a um estorno repetido e a validade real do QR depois de `pixExpiraEm` (reserva do cupom que expira, mas continua pagável) são HIPÓTESE.
- **Planilhas:** o comportamento do Excel e do LibreOffice com `​=` e `﹦` não foi aberto (S-18).
- **Desempenho com volume** (S-08, S-22, índices `pg_trgm`): não medi de novo com volume sintético. Fica a medição do R5 e o teste que captura o SQL.
- **Worker com duas instâncias em paralelo** (dois `enviar-comunicacoes` ao mesmo tempo): não exercitado. O desenho supõe um worker só.
- **Limitação:** as corridas no PGlite são intercaladas numa conexão só. As conclusões sobre concorrência valem pelo resultado no PG16.

## 7. Correções depois da revalidação (Auditor-Chefe, commit `23c3816`)

| ID | Situação | Correção | Teste |
|---|---|---|---|
| V-01 | **CORRIGIDO** | `/me/senha` exige o 2FA desta sessão quando a conta é de superadmin (403 `dois_fatores_pendente`) | `d24.test.ts` › revalidação › V-01 |
| V-02 | **CORRIGIDO** | a aprovação manual (pela tela do pedido e pela ficha) recusa com 409 quando o pagamento já tem reembolso pedido ao Asaas | `d24.test.ts` › revalidação › V-02 |
| V-03 (S-12) | **CORRIGIDO** | `garantirReservaCupom` confere sob `select … for update` da linha do cupom e conta os outros pedidos já gravados (pagos e Pix pendentes não expirados de outros alunos), sem depender de `criado_em`. Sempre sobra exatamente um | `lote2-operacao.test.ts` › S-12 › corrida (lento × rápido e paralelo) |
| V-04 | **CORRIGIDO** | limite por e-mail **e IP** (10 em 15 min) e por e-mail somando IPs (50 em 15 min), no limitador persistente. O dono, de outro IP, continua entrando | `auth.test.ts` › rate limit |
| V-05 | ACEITO (informativo) | o limitador persistente da rota segura em 10 tentativas, mesmo depois de reinício. A leitura antes da soma só pesa sem ele | — |
| V-06 | ABERTO (BAIXA) | uma corrida rara entre a consulta ao Asaas e o cancelamento na aprovação manual. O `webhook_eventos` guarda o evento, e a conciliação do pedido mostra a divergência | — |
| V-07 | **CORRIGIDO** | a busca da seção Conteúdo usa `contem()` (escapa `%` e `_`) | `d24.test.ts` › revalidação › V-07 |

**Suítes depois das correções:**
- API: 428/428 no PGlite e 428/428 no Postgres 16.
- Typecheck e lint: 8/8.

**S-12 passa a CORRIGIDO.**
