# Banca R1: segurança, LGPD e receita do painel superadmin (`/super`)

- **Revisor:** R1 (Red Team), auditoria PIE V2 do painel superadmin
- **Data:** 28/10/2026
- **Base:** `main` em `2f71392`
- **Modo:** somente auditoria. Nenhum arquivo do projeto foi alterado além deste parecer.
- **Requisitos avaliados:** RQ1 (versão revisada pelo dono em 28/10/2026), RQ2, RQ3 e RQ4 de `docs/pie/super/ESCOPO_BANCA.md`.
- **Provas executadas:** três arquivos Vitest temporários fora do repositório, em `C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\445488ab-e48b-411b-a2b8-1b53b73ae451\scratchpad\r1\test\` (`r1.test.ts`, `r1-me.test.ts` e `r1-limite.test.ts`). Eles montam a API real com `criarAmbienteTeste` e `app.inject`, usando o Asaas falso e o mailer em memória, sem rede. Rodaram no PGlite e no Postgres 16 real (`127.0.0.1:55432`), com o mesmo resultado nos dois. Nada rodou contra a produção, a VPS ou o Asaas real.

## 1. Resumo

O que está sólido:
- As rotas `/api/super/*` negam aluno e admin, e o superadmin sem 2FA confirmado na sessão.
- O comprovante resiste a path traversal e só sai para o superadmin.
- O webhook do Asaas só é cadastrado na URL do próprio app.
- O convite é de uso único e expira em 72 h.
- O preço do Pix sai do servidor e nunca fica abaixo de R$ 5.
- O valor pago menor que o do pedido não libera acesso.
- O CSV neutraliza os prefixos clássicos de fórmula.

Os problemas graves vêm da **separação de papéis**, que hoje não existe no servidor:
1. O superadmin entra no app de estudo. Basta a senha, sem 2FA, porque a CLI cria a conta com `acesso = true` e a guarda `acesso` não olha o papel.
2. A sessão do superadmin aberta só com senha usa todas as rotas `login`. Ela troca a senha, exporta os dados e **exclui (anonimiza) o único superadmin**.
3. O login é um só para os três papéis.
4. O papel `admin`, que no RQ1 revisado é só da equipe de conteúdo e não tem 2FA, ainda pode:
   - liberar acesso sem pedido;
   - pedir reembolso ao Asaas, inclusive de pedido manual e mais de uma vez;
   - ver usuários, pedidos e a auditoria inteira.

Do lado da receita:
- a aprovação manual vale para a equipe e para o próprio superadmin;
- com "não mexer no Pix", o Pix pago depois some sem registro;
- cupons de até 99% contornam a reconfirmação que o preço exige;
- o limite de usos do cupom não se sustenta.

| ID | Sev. | Estado | Arquivo:linha | Descrição |
|---|---|---|---|---|
| R1-01 | ALTA | CONFIRMADO | apps/api/src/http/registrar.ts:101-104, 122; apps/api/src/app.ts:177; apps/api/src/servicos/superadminCli.ts:52, 80 | O superadmin entra no app de estudo do aluno (trilha, lição, revisão, liga, simulado, offline, perfil e arquivos) e ignora o modo manutenção. Viola o RQ1. |
| R1-02 | ALTA | CONFIRMADO | apps/api/src/http/registrar.ts:97-104; apps/api/src/rotas/me.ts:74, 86, 88 | Com a sessão aberta só pela senha (2FA não confirmado), o superadmin usa o conteúdo, troca a senha (e derruba as outras sessões), exporta os dados e se exclui, mesmo sendo o último superadmin. |
| R1-03 | ALTA | CONFIRMADO | apps/api/src/rotas/auth.ts:26-33, 108-118; apps/web/src/app/rotaInicial.ts:11-14; apps/web/src/telas/Entrar.tsx | Login, recuperação e redefinição são únicos para os três papéis, e a resposta revela o papel. O app nativo manda qualquer papel com acesso para `/aprender`. Viola o RQ2. |
| R1-04 | ALTA | CONFIRMADO | apps/api/src/rotas/admin/gestao.ts:103, 135, 162, 236, 260, 304, 310, 322, 333 | Ações de negócio estão na guarda `admin`, que o admin de conteúdo usa sem 2FA: liberar acesso sem pedido, revogar acesso e sessões, reembolso, usuários com dados pessoais, pedidos, painel e auditoria completa. Viola o RQ1 e o RQ3. |
| R1-05 | MÉDIA | CONFIRMADO | apps/api/src/rotas/admin/gestao.ts:162-178 | O reembolso do admin aceita pedido **manual** com `asaasPaymentId` (a rota do super recusa) e repete o estorno (não confere `reembolsoSolicitadoEm`). Não pede reconfirmação. |
| R1-06 | MÉDIA | CONFIRMADO | apps/api/src/rotas/super/usuarios.ts:300-312; superadminCli.ts:52, 80 | Rebaixar um superadmin (ou um admin com `acesso`) para aluno mantém `acesso = true` sem pedido: é acesso gratuito. |
| R1-07 | MÉDIA | CONFIRMADO | apps/api/src/rotas/super/usuarios.ts:249-289 | Um superadmin troca o e-mail de outra conta da equipe sem reconfirmação, força a senha para o e-mail novo e toma a conta do admin. O e-mail antigo não recebe aviso. Bloqueia outro superadmin sem reconfirmação. |
| R1-08 | MÉDIA | CONFIRMADO | apps/api/src/rotas/super/precos.ts:118-153 | Criar ou editar um cupom não pede reconfirmação. Um cupom fixo de R$ 4.990 leva todo Pix ao mínimo de R$ 5,00, o que contorna a reconfirmação exigida para mudar o preço (D23). |
| R1-09 | MÉDIA | CONFIRMADO | apps/api/src/servicos/pagamentoManual.ts:52-130 | Aprovação manual: (a) vale para admin e para o próprio superadmin; (b) com `acaoAsaas = nenhuma`, o Pix pago depois vira `sem_mudanca`, e o dinheiro entra no Asaas sem registro nem estorno; (c) o valor é sempre o preço cheio, ignorando o adicional e o cupom do pedido; (d) usa o concurso ativo, não o do pedido. |
| R1-10 | BAIXA | CONFIRMADO | apps/api/src/servicos/precos.ts:93-95; servicos/pagamento.ts (gerarPix) | O limite de usos do cupom não se sustenta: com `limiteUsos = 1`, três alunos pagaram com o cupom. |
| R1-11 | BAIXA | CONFIRMADO | apps/api/src/servicos/lgpd.ts:61-86; rotas/super/usuarios.ts:213-220, 264, 275 | A anonimização deixa nome, e-mail e celular na `auditoria`, e a ficha do usuário excluído continua mostrando esses dados. O `pixPayload` dos pedidos e os comprovantes ficam. |
| R1-12 | BAIXA | CONFIRMADO | apps/api/src/rotas/super/usuarios.ts:59-63, 314-318; rotas/super/pagamentos.ts:52 | A exportação LGPD de qualquer conta (CPF completo) sai sem motivo nem reconfirmação, e a busca por dígitos reconstrói o CPF que a lista mascara. |
| R1-13 | BAIXA | CONFIRMADO | apps/api/src/servicos/doisfatores.ts:121-150; packages/shared/src/api/rotas.ts (super2faVerificar 10/15 min; authLogin 20/15 min por IP); apps/api/src/app.ts:111-115 | No 2FA, os erros não vão para a auditoria e não há bloqueio nem alerta. O rate limit fica em memória. O login limita só por IP, sem limite por conta. |
| R1-14 | BAIXA | CONFIRMADO (leitura) / HIPÓTESE (corrida) | apps/api/src/rotas/super/comunicacao.ts:101-140 | A comunicação em massa não pede reconfirmação. O limite de 5 por dia é contado antes de inserir, sem trava, então pode estourar com pedidos em paralelo. |
| R1-15 | BAIXA | CONFIRMADO (cobertura) / HIPÓTESE (exploração) | packages/shared/src/api/superadmin.ts:939-944 | O CSV não neutraliza um espaço antes do `=` nem o `＝` de largura total. |

Itens testados que **não** viraram achado estão na seção 4.

## 2. Achados detalhados

### R1-01: o superadmin entra no app de estudo do aluno (ALTA, CONFIRMADO)
- **Causa:**
  - a guarda `acesso` (`registrar.ts:101-104`) só confere `u.acesso`;
  - `criarOuPromoverSuperadmin` liga `acesso: true` ao criar e ao promover (`superadminCli.ts:52, 80`);
  - a manutenção pula quem é `ehAdmin` (`registrar.ts:122`);
  - `/api/arquivos/uploads` aceita `ehAdmin` (`app.ts:177`).
- **Reprodução executada** (`r1.test.ts`, blocos "RQ1"):
  - superadmin com 2FA: `trilha`, `revisao`, `liga`, `simuladosListar`, `offlinePacote`, `perfilEstatisticas`, `concurso` e `licaoIniciar` respondem 200. `simuladoCriar` deu 400 por validação, não por guarda, e `arquivos` deu 404 porque o arquivo não existe, depois de passar pela guarda;
  - conta criada pela CLI: `acesso = true`, login com `proximo = dois_fatores` e `trilha` 200 **sem 2FA**;
  - com a manutenção ligada: aluno 503 e superadmin 200.
- **Esperado × observado:** pelo RQ1 revisado, o superadmin fica fora da guarda `acesso` (403). Hoje, 200.
- **Impacto:**
  - viola o RQ1;
  - o superadmin consome o conteúdo pago sem pedido;
  - entra na liga e no ranking como aluno;
  - gera tentativas, XP e revisão, o que contamina as métricas de DAU/WAU do `/super`;
  - somado a R1-02, isso tudo vale sem 2FA.
- **Correção proposta:**
  - na guarda `acesso`, recusar `papel !== 'aluno'` com 403 (`codigo: 'proibido'` ou um novo `area_do_aluno`);
  - em `app.ts:177`, servir a imagem a quem tem acesso de aluno ou a `ehEquipe` (admin e superadmin), para a prévia da questão na seção Conteúdo, mas sem passar pela trilha;
  - na manutenção, a exceção deixa de importar, porque a equipe não usa mais a guarda `acesso`;
  - a CLI e o convite gravam `acesso = false` para a equipe;
  - uma migração zera `acesso` e `usuarios_concursos.acesso` de quem não é aluno;
  - na web, `Guarda nivel="acesso"` manda a equipe para o seu painel, e `rotaInicial` nunca leva a equipe para `/aprender`, nem no app nativo.
- **Teste de aceite:** para cada rota de `rotasComGuarda('acesso')`, o superadmin (com e sem 2FA) e o admin recebem 403, e o aluno pago recebe 200. A CLI cria a conta com `acesso = false`.

### R1-02: a sessão do superadmin aberta só com senha age fora do `/super` (ALTA, CONFIRMADO)
- **Causa:** o 2FA só é exigido nas guardas `admin` e `superadmin`. As guardas `login` e `acesso` (`registrar.ts:97-104`) aceitam a sessão sem `doisFatoresEm`. Em `me.ts`:
  - `meSenha` (:74) troca a senha e encerra as outras sessões;
  - `meExportar` (:86) exporta os dados;
  - `meExcluir` (:88) anonimiza a conta e apaga o TOTP, **sem `garantirOutroSuperadmin`**.
- **Reprodução executada:**
  - superadmin com 2FA ativo faz um login novo e não digita o código (`r1.test.ts`, "troca de senha do super"): `/me/senha` 200, `/me/exportar` 200;
  - `r1-me.test.ts`, com um banco que só tem esse superadmin: `super2faStatus.verificadoNestaSessao = false`, `DELETE /me` com a senha e `EXCLUIR` responde **200**, e **sobram 0 superadmins ativos**. Rodou no PGlite e no PG16.
  - Também R1-01: conteúdo 200 sem 2FA.
- **Impacto:** quem tem só a senha do dono, por vazamento ou phishing:
  - exclui a única conta superadmin e trava o painel até alguém rodar a CLI na VPS;
  - ou troca a senha e derruba a sessão verificada do dono;
  - e lê os dados pessoais dele.

  Isso anula o objetivo do 2FA obrigatório (D13).
- **Correção proposta:**
  - para `papel = 'superadmin'`, toda guarda que não seja `superadmin_2fa` ou `nenhuma` exige `exigirDoisFatores`;
  - `meExcluir` recusa o superadmin, que se exclui pelo `/super` com `garantirOutroSuperadmin`, ou aplica essa garantia;
  - `meSenha` do superadmin exige reconfirmação TOTP;
  - o admin, se ganhar 2FA, segue a mesma regra.
- **Teste de aceite:** um superadmin com sessão sem 2FA recebe 403 `dois_fatores_pendente` em `/me/senha`, `/me/exportar`, `DELETE /me` e em toda rota `acesso`. O último superadmin não consegue se excluir (`ultimo_superadmin`).

### R1-03: login único para os três papéis (ALTA, CONFIRMADO, requisito RQ2)
- **Causa:**
  - um só `POST /auth/login` (`auth.ts:108-118`), uma só tela `/entrar` e um só `authRecuperar` e `authRedefinir`;
  - a resposta traz `usuario.papel` e `proximo`, que é `dois_fatores` para o superadmin e `admin` para o admin (`auth.ts:26-33`);
  - `rotaInicial.ts:11`: no app nativo, qualquer papel com `acesso` vai para `/aprender`.
- **Reprodução executada** (`r1.test.ts`, "RQ2"):
  - superadmin, admin e aluno entram pelo mesmo endpoint (200, `proximo` de cada papel);
  - "esqueci a senha" do superadmin pelo fluxo do aluno manda o link (200).
  - Ponto positivo: a senha errada e a conta inexistente dão a mesma resposta (401 `credenciais_invalidas`), e o argon2 gasta o mesmo tempo nos dois casos. Não há enumeração **antes** da autenticação.
- **Impacto:**
  - descumpre o RQ2;
  - a senha do superadmin trafega na página pública de login dos alunos, a mesma da campanha de marketing, o que aumenta a exposição a phishing e a força bruta distribuída (R1-13);
  - o `proximo` confirma o papel a quem acertar a senha.
- **Correção proposta:**
  - três endpoints: `POST /auth/login` só de aluno, `POST /auth/equipe/login` só de admin e `POST /auth/super/login` só de superadmin;
  - cada um recusa os outros papéis com a **mesma** resposta 401 `credenciais_invalidas`, sem revelar que a conta existe em outro papel;
  - três telas (`/entrar`, `/conteudo/entrar` e `/super/entrar`, por exemplo) e recuperação e redefinição por papel (o link carrega o papel e o endpoint confere);
  - o cookie de sessão marca o papel de origem, e a guarda confere que a sessão foi aberta pelo endpoint do papel;
  - o app nativo usa só o login de aluno;
  - o login do super tem rate limit por conta e um alerta por e-mail a cada login.
- **Teste de aceite:** para cada par (papel, endpoint) diferente, a resposta é 401 `credenciais_invalidas`, idêntica à de senha errada. O login certo de cada papel dá 200. A recuperação pelo endpoint errado não manda e-mail.

### R1-04: ações de negócio na guarda `admin` (ALTA, CONFIRMADO, RQ1 e RQ3)
- **Causa:** `rotas/admin/gestao.ts` usa a guarda `admin`, que aceita o admin **sem 2FA**, em:
  - `adminPainel` (:103, receita e alunos);
  - `adminPedidosListar` (:135);
  - `adminPedidoReembolso` (:162);
  - `adminUsuariosListar` e `adminUsuarioObter` (:236, :260, nome, e-mail, CPF por busca, pedidos e sessões de alunos);
  - `adminUsuarioRevogarSessoes` (:304);
  - `adminUsuarioLiberarAcesso` (:310);
  - `adminUsuarioRevogarAcesso` (:322);
  - `adminAuditoria` (:333, a auditoria **inteira**, inclusive os `detalhes` das ações do superadmin, como `forcar_senha {para: e-mail}`).

  O `/super` depende de duas delas (`UsuarioFicha.tsx:344, 358`) e de `adminConcursosListar` (`Precos.tsx:178`).
- **Reprodução executada:** o admin chama `adminUsuarioLiberarAcesso` para um aluno recém-cadastrado. Resposta 200, `trilha` do aluno 200 e **0 pedidos**. O superadmin com 2FA chama todas essas rotas e recebe 200.
- **Impacto:**
  - a equipe de conteúdo libera acesso gratuito sem 2FA nem reconfirmação, e isso não aparece no financeiro, porque não há pedido;
  - ela pede reembolso (R1-05) e vê dados pessoais de todos os alunos;
  - descumpre o RQ1 revisado ("admin sem dinheiro, usuários etc.") e o RQ3.
- **Correção proposta:** ver o mapa da seção 3. Em resumo:
  - as rotas de negócio passam para `/super/*`, com guarda `superadmin`, reconfirmação e motivo nas que liberam, revogam ou reembolsam;
  - `adminAuditoria` vira auditoria só de conteúdo (ou sai do admin);
  - a lista de concursos do `/super/precos` passa a uma rota `superadmin` (ou `conteudo`);
  - a liberação de acesso sem pedido deixa de existir como ação solta: no `/super`, ela é a "Liberar acesso" do pagamento (RQ4), com pedido e valor.
- **Teste de aceite:** o admin recebe 403 em todas as rotas listadas. O superadmin opera pelas rotas `/super` equivalentes, com auditoria.

### R1-05: o reembolso do admin aceita pedido manual e repete o estorno (MÉDIA, CONFIRMADO)
- **Causa:** `gestao.ts:162-178` confere só `status = 'pago'` e `asaasPaymentId`. Não olha `metodo`, nem `reembolsoSolicitadoEm`, e não pede reconfirmação. Quando a aprovação manual reaproveita o pedido de um Pix pendente, ele fica `metodo = 'manual'` **com** `asaasPaymentId` (`pagamentoManual.ts:101-103`).
- **Reprodução executada** (`r1.test.ts`, "admin reembolsa pedido manual"):
  - aprovação manual de um aluno com Pix pendente (`acaoAsaas = nenhuma`);
  - `superPagamentoReembolso` responde 409 `conflito`, que está certo;
  - `adminPedidoReembolso` responde **200** e, chamado de novo, **200** outra vez.
- **Impacto:**
  - estorno pedido ao Asaas para uma cobrança que nunca foi paga no Asaas: se ela foi "recebida em dinheiro" (`receber_em_dinheiro`), a resposta depende do Asaas, o que é uma HIPÓTESE;
  - chamadas repetidas a uma operação financeira;
  - a equipe de conteúdo opera dinheiro.
- **Correção proposta:**
  - tirar a rota do admin (R1-04);
  - em qualquer reembolso, exigir `metodo = 'asaas'` e `reembolsoSolicitadoEm IS NULL`, com update condicional para evitar a corrida;
  - pedir reconfirmação e motivo.
- **Teste de aceite:** o reembolso de um pedido manual dá 409. O segundo reembolso do mesmo pedido dá 409, e o Asaas falso registra uma única chamada.

### R1-06: rebaixar um superadmin para aluno mantém o acesso sem pagamento (MÉDIA, CONFIRMADO)
- **Causa:** `superUsuarioPapel` (`usuarios.ts:300-312`) só troca o papel e derruba as sessões. O `acesso = true` dado pela CLI (e o `usuarios_concursos`, se houver) continua.
- **Reprodução executada:** `superUsuarioPapel(s2 → aluno)` responde 200. Em seguida, `acesso = true`, o login devolve `proximo = onboarding` e a `trilha` responde 200, sem nenhum pedido.
- **Impacto:** acesso gratuito disfarçado de mudança de papel. O mesmo vale para um admin criado com `acesso = true` (o helper de teste faz isso).
- **Correção proposta:**
  - ao mudar o papel, recalcular o acesso pelos pedidos pagos (`sincronizarAcesso` a partir de `pedidos`), ou zerar o acesso de quem sai da equipe;
  - com R1-01, a equipe nunca tem `acesso = true`.
- **Teste de aceite:** o superadmin rebaixado a aluno, sem pedido pago, recebe 402 na `trilha`.

### R1-07: troca de e-mail e bloqueio de contas da equipe sem reconfirmação (MÉDIA, CONFIRMADO)
- **Causa:** `superUsuarioEditar` (`usuarios.ts:249-266`), `superUsuarioForcarSenha` (:268-277), `superUsuarioBloquear` (:279-289) e `superUsuarioRevogarSessao` (:336) pedem só o motivo (ou nada), mesmo quando o alvo é admin ou superadmin. A troca de e-mail não avisa o endereço antigo.
- **Reprodução executada:**
  - o superadmin troca o e-mail de um admin para `atacante.*@evil.test` (200);
  - força a senha (200), e o link chega ao e-mail novo;
  - o e-mail antigo recebe 0 mensagens;
  - `authRedefinir` responde 200 e a sessão nova abre `adminQuestoesListar` (200). A conta foi tomada.
  - Contra outro superadmin, trocar o e-mail e bloquear respondem 200 sem reconfirmação, e a sessão do alvo cai (401).
- **Impacto:**
  - uma sessão de superadmin sequestrada (cookie roubado, sem a senha nem o TOTP) toma as contas da equipe;
  - ela também tranca os outros superadmins (`garantirOutroSuperadmin` só impede bloquear o último);
  - com o alvo superadmin, a tomada completa ainda esbarra no TOTP da vítima, mas o e-mail de recuperação passa a ser do atacante.
- **Correção proposta:**
  - reconfirmação (senha ou TOTP) em editar, forçar senha, bloquear e revogar sessão quando o alvo for da equipe;
  - trocar o e-mail de uma conta da equipe exige confirmação pelo e-mail novo e aviso ao antigo;
  - a troca de e-mail derruba as sessões e, para o superadmin, zera os links de redefinição pendentes.
- **Teste de aceite:** editar o e-mail ou bloquear um admin ou superadmin sem `confirmacao` dá 400 ou 403. Com a reconfirmação, o e-mail antigo recebe o aviso.

### R1-08: cupom sem reconfirmação contorna o controle de preço (MÉDIA, CONFIRMADO)
- **Causa:** `superCupomCriar` e `superCupomAtualizar` (`rotas/super/precos.ts:118-153`) pedem só o motivo. O cupom `fixo` aceita até R$ 5.000, e `aplicarCupom` limita o resultado a R$ 5,00.
- **Reprodução executada:** o cupom `fixo` de 499.000 centavos é criado sem `confirmacao` (200). Três Pix gerados com ele saíram com `valorCentavos = 500`.
- **Esperado × observado:** a D23 exige reconfirmação para mudar o preço. Um cupom sem limite de usos e sem concurso é, na prática, um preço novo de R$ 5,00, e foi criado sem ela.
- **Impacto:** perda de receita com uma sessão sequestrada ou um descuido. O código do cupom é escolhido por gente e pode vazar ou ser adivinhado. `pagamentoCupom` limita 20 tentativas a cada 15 min por **usuário**, e o cadastro de contas novas vale 10 por hora por IP.
- **Correção proposta:**
  - reconfirmação e motivo em criar e editar cupom;
  - teto do desconto fixo menor que o preço;
  - aviso quando o resultado ficar no mínimo;
  - rate limit de `pagamentoCupom` também por IP;
  - opcionalmente, um alerta para o desconto acima de X%.
- **Teste de aceite:** criar ou atualizar um cupom sem `confirmacao` dá 400. Um cupom cujo resultado fique abaixo do piso configurado pede a confirmação explícita.

### R1-09: aprovação manual (MÉDIA, CONFIRMADO)
- **Arquivo:** `apps/api/src/servicos/pagamentoManual.ts:52-130`.
- **(a) Vale para qualquer papel, inclusive o próprio superadmin.**
  - Executado: `superAprovarManual` para um **admin** e para **o próprio superadmin** responde 200 e cria um pedido `pago`, com `metodo = manual` e o valor do preço cheio.
  - Com R1-01, isso dá conteúdo ao superadmin e infla a receita "manual" do financeiro sem dinheiro verificável. O comprovante é opcional.
- **(b) `acaoAsaas = 'nenhuma'` com Pix pendente: pagamento em dobro sem registro.**
  - Executado: o pedido pendente vira `metodo = manual, status = pago` e mantém o `asaasPaymentId`.
  - O webhook `PAYMENT_CONFIRMED` daquele Pix, recebido depois, termina em `resultado = sem_mudanca`.
  - O aluno pagou duas vezes. O valor do Asaas não entra no financeiro, que conta o pedido como manual, e não há alerta nem estorno.
  - A conciliação em lote ignora os manuais (`pagamentos.ts`, `eq(pedidos.metodo, 'asaas')`).
- **(c) Valor fixo no preço cheio do 1º concurso** (`:96`, `lerPrecos().precoCentavos`).
  - Leitura: ao reaproveitar um pedido pendente que tinha preço adicional (D21) ou cupom (D23), o `valorCentavos` é sobrescrito com o preço cheio.
  - O `cupomId` fica no pedido, então o pagamento conta como uso do cupom com um valor que não é o do cupom.
- **(d) Concurso = o ativo do aluno** (`:62`), não o `concursoId` do pedido aberto na tela. É leitura: o seed tem um só concurso, então não reproduzi o cenário com dois.
- **Correção proposta:**
  - recusar a aprovação manual para a equipe (`papel !== 'aluno'`) e para si mesmo;
  - com Pix pendente, não oferecer "não mexer": cancelar a cobrança ou marcá-la como recebida;
  - se um webhook `pagar` chegar para um pedido manual, gravar `resultado = 'pago_em_dobro'`, mostrar no `/super` e no relatório de conciliação e sugerir o reembolso;
  - o valor sai do pedido (preço base do aluno para aquele concurso, com o cupom do pedido, se ainda valer) ou é informado e conferido;
  - a aprovação parte do pedido (`/super/pagamentos/:id/...`), com o concurso dele.
- **Teste de aceite:**
  - aprovar para um admin ou para si mesmo dá 403;
  - um Pix pago depois de uma aprovação manual gera `pago_em_dobro`, visível em `superWebhooksListar`;
  - um pedido adicional aprovado manualmente fica com `valorCentavos = precoAdicional`.

### R1-10: o limite de usos do cupom estoura (BAIXA, CONFIRMADO)
- **Causa:** o "uso" só conta o pagamento confirmado (`precos.ts:93-95`), e o Pix pendente não entra. Quando o limite é atingido, os Pix pendentes com o cupom continuam pagáveis. `sincronizarPixPendentes` só roda quando alguém salva o cupom.
- **Reprodução executada:** com `limiteUsos = 1`, três alunos geram o Pix (R$ 5,00 cada), os três webhooks confirmam e ficam **3 pagos**. O painel mostra `usos = 3`.
- **Impacto:** o desconto vale além do limite. A D23 aceita isso ("Pix pendente não conta"), mas o dono pode entender o limite como rígido.
- **Correção proposta:** reservar o uso ao gerar o Pix (contar os pendentes no limite) ou, ao confirmar o pagamento que atinge o limite, cancelar os outros Pix pendentes do cupom. Documentar a escolha na D23.
- **Teste de aceite:** com limite 1 e três Pix gerados, no máximo um pago com o desconto.

### R1-11: a anonimização deixa dados pessoais na auditoria (BAIXA, CONFIRMADO)
- **Causa:**
  - `dadosAuditaveis` (`usuarios.ts:213-220`) grava nome, e-mail e celular em `antes` e `depois` de `usuario.editar`;
  - `forcar_senha` grava `detalhes.para` com o e-mail (:275);
  - `equipe.convidar` grava o e-mail;
  - `anonimizarUsuario` (`lgpd.ts:61-86`) não toca em `auditoria`, `pedidos.pix_payload`, `pedidos.manual_observacao` nem nos arquivos de comprovante.
- **Reprodução executada:** editar o celular, forçar a senha e anonimizar. Depois disso, a auditoria contém o e-mail, o nome e o celular antigos (true, true, true), e `superUsuarioObter` do usuário excluído **mostra** o e-mail antigo. O pedido continua com `pixPayload`.
- **Impacto:** a "exclusão" não remove os dados pessoais do painel, e o direito de eliminação (LGPD art. 18) fica incompleto. A retenção fiscal justifica o pedido (valor, data, CPF, se exigido), não o celular nem o e-mail na auditoria. **A base legal e a retenção precisam de avaliação jurídica.**
- **Correção proposta:**
  - auditar os campos pessoais como "alterado" (ou como hash), sem o valor;
  - na anonimização, redigir `antes`, `depois` e `detalhes` da auditoria do alvo;
  - apagar o `pix_payload` e a `pix_imagem`;
  - definir a retenção dos comprovantes (eles podem ter CPF e conta bancária).
- **Teste de aceite:** depois de anonimizar, nenhuma linha de `auditoria`, `pedidos` ou `webhook_eventos` do alvo contém o e-mail, o nome ou o celular antigos.

### R1-12: exportação com CPF completo sem motivo e reconstrução do CPF pela busca (BAIXA, CONFIRMADO)
- **Reprodução executada:**
  - `superUsuarioExportar` de um aluno responde 200 com `perfil.cpf` completo (11 dígitos), sem motivo nem reconfirmação. Fica auditado sem motivo;
  - a busca `superUsuariosListar?q=<6 dígitos do meio do CPF>` encontra o aluno, então a máscara `cpfOculto` pode ser revertida por tentativas (o mesmo vale para `superPagamentosListar`, `pagamentos.ts:52`).
- **Impacto:** é baixo, porque é o próprio dono. Mas a exportação em massa (120 por minuto) fica sem atrito, e o princípio da minimização fica fraco.
- **Correção proposta:**
  - motivo obrigatório (e reconfirmação) na exportação de terceiros;
  - buscar CPF só pelo número completo (11 dígitos, igualdade);
  - rate limit menor na exportação.
- **Teste de aceite:** exportar sem motivo dá 400. A busca com menos de 11 dígitos não procura no campo de CPF.

### R1-13: força bruta e rastreabilidade do 2FA (BAIXA, CONFIRMADO)
- **Reprodução executada:**
  - 30 códigos errados no PGlite, com o rate limit desligado no teste, dão 30 respostas 400. A auditoria do superadmin só tem `2fa.ativar`: nenhuma falha registrada;
  - com o rate limit ligado (`r1-limite.test.ts`): 10 respostas 400 e depois 429. Uma sessão nova do mesmo usuário, de outro IP, também leva 429, porque o limite é por usuário, o que está correto;
  - 22 logins errados variando o `X-Forwarded-For` levam 22 respostas 401, nenhuma 429. Dentro da app, o IP vem do cabeçalho (`trustProxy: true`). Em produção, o `infra/nginx/fuseaprova.conf:92-94` sobrescreve esse cabeçalho, o que não pude verificar (sem acesso à VPS).
- **Impacto:**
  - a 10 tentativas a cada 15 min e 3 passos aceitos por tentativa, são cerca de 2.900 chutes por dia: perto de 0,3% por dia de acertar o TOTP, sem bloqueio nem aviso ao dono;
  - o limite fica em memória e zera a cada deploy ou reinício;
  - o login do superadmin só limita por IP (R1-03).
- **Correção proposta:**
  - auditar `2fa.falha` e reconfirmações com falha;
  - bloqueio progressivo por conta (por exemplo, 10 falhas derrubam as sessões e exigem um código de recuperação ou a CLI);
  - e-mail de alerta;
  - limite por conta no login da equipe;
  - limite persistente (tabela) para as rotas de autenticação do superadmin.
- **Teste de aceite:** 10 códigos errados geram 10 linhas `2fa.falha`, e a 11ª tentativa é recusada mesmo depois de reiniciar o app.

### R1-14: comunicação em massa (BAIXA)
- **Pontos positivos, confirmados na leitura:**
  - só papel aluno, com opt-in (`marketing`), conferido de novo no envio;
  - uma comunicação por aluno a cada 24 h;
  - o link é um caminho do app;
  - o `sw-push.js` só abre a própria origem;
  - o texto do e-mail é escapado (`escHtml`, `paragrafosHtml`).
- **Problemas:**
  - `superComunicacaoCriar` (`comunicacao.ts:101-140`) não pede reconfirmação. Uma sessão sequestrada envia phishing a todos os alunos pelo domínio oficial;
  - o limite de 5 por dia é contado e inserido sem trava nem transação comum. Pedidos em paralelo podem passar do limite (HIPÓTESE, não executada; o rate limit de 10 por hora por usuário atenua).
- **Correção proposta:** reconfirmação no envio. Contar e inserir na mesma transação, com `pg_advisory_xact_lock` ou contagem condicional.
- **Teste de aceite:** criar sem `confirmacao` dá 400. Seis criações em paralelo resultam em 5.

### R1-15: cobertura da neutralização no CSV (BAIXA)
- **Executado** (`celulaCsv`):
  - `=`, `+`, `-`, `@`, `\t` são prefixados com `'`;
  - `\n=1` e `;=1` vão entre aspas;
  - `" =1+1"` e `"＝1+1"` passam sem prefixo.
- **Exploração:** HIPÓTESE. O Excel em pt-BR normalmente trata o espaço antes do `=` como texto. O LibreOffice pode avaliar, conforme as opções de importação. Os campos expostos são nome (validado), e-mail, referência e observação manual (texto livre do superadmin).
- **Correção proposta:** aplicar a regex depois de `trimStart()` e incluir `＝`, `＋`, `－` e `＠`.

## 3. Avaliação RQ1, RQ2, RQ3 e RQ4

### RQ1 (revisado): superadmin fora do app de estudo e com o conteúdo dentro do `/super`; admin só com o conteúdo
**Veredito R1: NÃO ATENDIDO** (R1-01, R1-02, R1-04, R1-06).

Mapa das rotas que precisam mudar:

| Grupo | Rotas | Hoje | Exigido |
|---|---|---|---|
| App de estudo (guarda `acesso`, 25 rotas) | `trilha`, `concurso`, `guia`, `liga`, `ligaResultadoVisto`, `licaoIniciar`, `licaoAbrirBau`, `sessaoResponder`, `sessaoDica`, `sessaoConcluir`, `revisao`, `revisaoIniciar`, `simulados*` (5), `offlinePacote`, `syncTentativas`, `perfilEstatisticas`, `meComprarProtetor`, `questaoReport`, `push*` (3) | aceita qualquer papel com `acesso` | só `papel = aluno` (equipe: 403) |
| Exceções por `ehAdmin` | `registrar.ts:122` (manutenção), `app.ts:177` (`/api/arquivos/uploads`) | liberam a equipe | manutenção: some a exceção; arquivos: aluno com acesso **ou** equipe (prévia na seção Conteúdo) |
| Origem do `acesso = true` da equipe | `superadminCli.ts:52, 80`; `superUsuarioPapel`; `superAprovarManual` para a equipe | liga ou mantém | a equipe nunca tem `acesso`; migração zera |
| Conteúdo (guarda `admin`): `adminAssuntos*`, `adminCargos*`, `adminConcursos*` (incl. clonar), `adminEdital*`, `adminImportacoes*`, `adminProvas*`, `adminQuestoes*` (incl. lote, prévia e retirar-origem), `adminUnidade*`, `adminSecao*`, `adminLicao*`, `adminTrilhas*`, `adminUploads`, `adminDisciplinas`, `adminReports*` | admin e superadmin com 2FA | **compartilhado**: admin e superadmin (pode continuar `admin`; recomendo renomear para `conteudo` e exigir 2FA também do admin) |
| Negócio na guarda `admin` | `adminPainel`, `adminPedidosListar`, `adminPedidoReembolso`, `adminUsuariosListar`, `adminUsuarioObter`, `adminUsuarioLiberarAcesso`, `adminUsuarioRevogarAcesso`, `adminUsuarioRevogarSessoes`, `adminAuditoria` | admin e superadmin | **só superadmin** (`/super/*`, com reconfirmação e motivo onde mexe em acesso ou dinheiro); `adminAuditoria` restrita às ações de conteúdo |
| Rotas `login` usadas pelo superadmin sem 2FA | `meSenha`, `meExportar`, `meExcluir`, `meAtualizar`, `meConcursos*`, `pagamentoPix`, `pagamentoCupom`, `pagamentoStatus` | aceitas | para o superadmin: exigir o 2FA da sessão; `meExcluir` e as rotas de pagamento do aluno ficam fora do alcance da equipe |
| Web | `Guarda.tsx` (nível `acesso` não olha o papel), `rotaInicial.ts:11` (app nativo), `super/Layout.tsx:160, 213` (link para `/admin`), `admin/rotas.tsx:70-73` (Pedidos, Usuários, Auditoria e o Painel no admin) | — | seção Conteúdo dentro do layout do `/super`; telas de negócio fora do admin; a equipe não abre `/aprender` |

Ações do `/super` que hoje dependem de rotas `/admin`:
- `UsuarioFicha.tsx:344` → `adminUsuarioLiberarAcesso`;
- `UsuarioFicha.tsx:358` → `adminUsuarioRevogarAcesso`;
- `Precos.tsx:178` → `adminConcursosListar`.

As duas primeiras precisam de rotas `/super` próprias, com reconfirmação. A liberação sem pedido deve ser substituída pelo fluxo do RQ4. A terceira pode ficar como rota de conteúdo, compartilhada.

### RQ2: logins separados
**Veredito R1: NÃO ATENDIDO** (R1-03).
- Hoje há um endpoint, uma tela, uma recuperação e uma redefinição para os três papéis.
- O convite de equipe também usa `/recuperar/:token` e manda para `/entrar` (`usuarios.ts:385-391`).
- Requisitos de segurança para a implementação:
  - resposta indistinguível entre "papel errado" e "senha errada";
  - rate limit por conta e por IP no login da equipe;
  - recuperação que não manda o link de um papel pelo endpoint do outro;
  - sessão marcada com o papel de origem;
  - o app nativo só aceita o aluno;
  - o `proximo` deixa de revelar o papel no login do aluno.

### RQ3: painel completo
**Veredito R1, pela ótica de segurança: NÃO ATENDIDO.**
- O que existe funciona e está auditado, conforme os testes do repositório (198 testes dos quatro arquivos ligados ao `/super`, verdes).
- Mas faltam reconfirmações em ações de risco que a D13 trata como sensíveis, ou deveria tratar: cupom (R1-08), troca de e-mail e bloqueio da equipe (R1-07), exportação (R1-12) e comunicação em massa (R1-14).
- As ações de liberar e revogar acesso usam rotas do admin sem reconfirmação (R1-04).

### RQ4: estornar e liberar acesso manualmente na tela do pagamento
**Veredito R1: NÃO ATENDIDO, com riscos de receita a tratar antes de implementar.**

O que existe hoje:
- **Liberar.** "Aprovar pagamento manual" (`superAprovarManual`) já é idempotente:
  - com um pedido pago do concurso ativo, ele só chama `liberarConcurso` e devolve `jaAprovado`;
  - executado: o aluno pago, com o acesso zerado à mão, volta a ter `acesso = true`;
  - fica auditado (`pedido.aprovar_manual`), com reconfirmação e observação de no mínimo 5 caracteres.
  - Porém:
    - é **por aluno**, não **por pedido**: usa o concurso ativo (R1-09d);
    - o botão some quando o aluno tem qualquer concurso (`PagamentoDetalhe.tsx:132`);
    - não existe "refazer a liberação do pedido pago";
    - vale para a equipe e para si mesmo (R1-09a).
- **Estornar.**
  - **Asaas:** `superPagamentoReembolso` exige `metodo = asaas`, `status = pago`, reconfirmação e motivo, e respeita os 7 dias com `foraDoPrazo`. Mas não impede pedir duas vezes (só a UI esconde quando há `reembolsoSolicitadoEm`), e o acesso só cai quando o webhook `PAYMENT_REFUNDED` chega.
  - **Manual:** "Desfazer aprovação manual" estorna e revoga o concurso do pedido, mantendo os outros.

Requisitos para não virar acesso gratuito:
1. **A liberação manual parte de um pedido** (`POST /super/pagamentos/:id/liberar`) e libera só `pedido.concursoId`.
2. **Situações permitidas:**
   - o pedido está `pago` e o concurso não foi liberado: só refaz `liberarConcurso`, sem mexer em dinheiro;
   - o pedido está `pendente` ou `vencido` com `asaasPaymentId`: **antes**, consultar o Asaas (`conciliarPedido`). Se o Asaas disser RECEIVED ou CONFIRMED, marcar como pago com o valor e o líquido do Asaas (o mesmo caminho do webhook). Se não disser, recusar e oferecer a aprovação manual com comprovante;
   - pagamento por fora: a aprovação manual, com o valor **do pedido** (preço base daquele concurso para aquele aluno, com cupom), comprovante obrigatório acima de um valor ou sempre, e a cobrança pendente cancelada ou marcada como recebida, nunca "não mexer" (R1-09b).
3. **Proibido:**
   - liberar sem pedido;
   - liberar para `papel !== 'aluno'`;
   - liberar para si mesmo;
   - liberar um pedido `estornado` ou com `reembolsoSolicitadoEm`.
4. **Idempotência:** update condicional (`where status in (...)`) dentro da transação com `FOR UPDATE` no pedido. Repetir não cria outro pedido nem outra linha de auditoria com efeito.
5. **Reconfirmação e motivo de pelo menos 10 caracteres**, com auditoria `pedido.liberar_manual` contendo `antes`/`depois` do pedido e do `usuarios_concursos`, o valor conferido e a fonte (Asaas ou manual).
6. **Estornar** é um botão único que escolhe o caminho pelo `metodo`:
   - para o Asaas, `estornar` (uma vez só, com `reembolsoSolicitadoEm` condicional) e revogação quando o webhook chegar, com opção de revogar já;
   - para o manual, `desfazer`.

   Os dois revogam só o concurso do pedido (D21) e são recusados para pedido não pago.
7. **Testes de aceite do RQ4:**
   - liberar um pedido pago sem concurso leva o concurso a liberado, sem novo pedido;
   - liberar um pedido pendente com o Asaas PENDING dá 409;
   - liberar para um admin ou para si dá 403;
   - dois cliques geram um efeito só;
   - estornar duas vezes chama o Asaas uma vez só;
   - estornar um pedido manual pelo caminho do Asaas dá 409.

## 4. Testado sem achado (NÃO REPRODUZIDO ou correto)

- **Rotas `/super`:** 401 sem login e 403 para aluno e admin (suíte do repositório). Superadmin sem 2FA: 403 `dois_fatores_necessario` em `/super` e em `/admin` (executado).
- **Comprovantes:**
  - `GET /api/super/comprovantes/` com `..%2F..%2Fpackage.json`, `..%5C..%5Cx.pdf` e `%2e%2e%2fx.pdf` dá 404, e o admin recebe 403;
  - um polyglot `%PDF<html><script>` é aceito como PDF (a assinatura confere só os 4 bytes), mas é servido com `Content-Type: application/pdf`, `X-Content-Type-Options: nosniff`, CSP `default-src 'none'` e `Cache-Control: private, no-store`. Não reproduzi a execução de script.
- **Convite:**
  - o link usado uma vez dá 400 na segunda;
  - o link expirado (73 h) dá 400;
  - o convidado entra com `proximo = dois_fatores` e `acesso = false` (`trilha` 402);
  - o papel só pode ser `admin` ou `superadmin` (Zod);
  - a recuperação de senha de uma conta convidada sem senha gera um link novo, o que é aceitável.
- **TOTP:** os mesmos passos não valem duas vezes (update condicional); o segredo é cifrado (AES-GCM, HKDF); os códigos de recuperação ficam guardados só como hash; a sessão dura 12 h, com 2 h de ociosidade (suíte do repositório).
- **Último superadmin:** o `/super` impede rebaixar, bloquear ou excluir o último superadmin (`garantirOutroSuperadmin`), **exceto** pelo `DELETE /me` (R1-02).
- **Webhook do Asaas:** o painel só cria ou atualiza o webhook com URL `${APP_URL}/api/webhooks/asaas` e o token do `.env`, com reconfirmação. Não dá para desviar os eventos.
- **Push e e-mail:** o link da comunicação é um caminho do app. O `sw-push.js` normaliza para a mesma origem (`//evil` não escapa).

## 5. Fechamento

### Inspecionado
- `docs/pie/super/ESCOPO_BANCA.md` (RQ1 revisado, RQ2, RQ3 e RQ4), as seções 1, 2 e 6 do protocolo PIE V2, e a D13, a D21 e a D23 de `docs/DECISOES.md`.
- API:
  - `apps/api/src/http/registrar.ts`, `app.ts` e `rotas/auth.ts`;
  - `rotas/me.ts` (meSenha, meExportar, meExcluir);
  - `rotas/pagamento.ts`;
  - `rotas/super/*.ts` (todos);
  - `rotas/admin/gestao.ts`.
- Serviços:
  - `servicos/sessoes.ts`, `senhas.ts`, `doisfatores.ts` e `totp.ts`;
  - `servicos/lgpd.ts` e `superadminCli.ts`;
  - `servicos/pagamentoManual.ts`, `precos.ts`, `webhook.ts` e `concursos.ts` (liberar e revogar).
- Shared e worker: `packages/shared/src/api/superadmin.ts` (contratos e `celulaCsv`), `precos.ts` (`aplicarCupom`), `email.ts` (`emailComunicacao`) e `apps/worker/src/jobs/comunicacoes.ts`.
- Web e infra:
  - `apps/web/public/sw-push.js`;
  - `apps/web/src/app/Guarda.tsx`, `rotaInicial.ts` e `App.tsx`;
  - `apps/web/src/super/` (chamadas de API, `Layout.tsx`, `PagamentoDetalhe.tsx` e `UsuarioFicha.tsx`);
  - `apps/web/src/admin/rotas.tsx`;
  - `infra/nginx/fuseaprova.conf` (`X-Forwarded-For`).
- A tabela completa das 152 rotas do registro, com guarda e limite, gerada a partir de `ROTAS`.

### Testado (comando e resultado)
Todos os comandos rodaram em `apps/api`, com `S=C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\445488ab-e48b-411b-a2b8-1b53b73ae451\scratchpad\r1`:

- `npx vitest run --dir $S`: `r1.test.ts` com 21 testes, todos verdes. As linhas `[R1]` acima são a saída literal, guardada em `$S\saida-pglite.txt`.
- `TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres npx vitest run --dir $S`: os mesmos 21 testes, verdes, com saídas idênticas, em `$S\saida-pg16.txt`.
- `npx vitest run --dir $S r1-me`, no PGlite e no PG16: `DELETE /me` responde 200 e sobram 0 superadmins (R1-02).
- `npx vitest run --dir $S r1-limite`, com rate limit ligado: o 2FA dá 429 na 11ª tentativa, inclusive em outra sessão. O login variando o `X-Forwarded-For` não chega a 429 (R1-13). Saída em `$S\saida-limite.txt`.
- `npx vitest run test/superadmin.test.ts test/superadmin-cli.test.ts test/guardas.test.ts test/precos.test.ts`: 4 arquivos e 198 testes, todos verdes. É a linha de base do repositório.

### Não testado, e por quê
- **Produção e VPS:** sem acesso nesta rodada. O nginx real (sobrescrita do `X-Forwarded-For`), o `.env` (`PRICE_CENTS`, token do webhook) e os backups ficaram BLOQUEADOS.
- **Asaas real ou sandbox:** sem credencial. A resposta do Asaas a `estornar` para uma cobrança recebida em dinheiro (R1-05) é HIPÓTESE.
- **Corrida do limite diário da comunicação (R1-14):** não executei requisições paralelas reais.
- **Aprovação manual com dois concursos (R1-09d):** o seed tem um concurso só. A análise é de leitura.
- **CSV no Excel ou no LibreOffice (R1-15):** não abri planilhas.
- **Web:** não rodei a PWA nem o Playwright. As conclusões sobre `Guarda.tsx`, `rotaInicial.ts` e os botões do `PagamentoDetalhe.tsx` são de leitura.
- **SCA de dependências:** fora do foco desta rodada, que era o painel superadmin.

### Limitações
- Os testes usam o Asaas falso e o mailer em memória do próprio projeto. Eles provam o comportamento da API, não o do provedor.
- O rate limit vem desligado no ambiente de teste. Só `r1-limite.test.ts` o liga.
- A estimativa de força bruta do TOTP (R1-13) é um cálculo, não uma medição.
- As avaliações de LGPD são técnicas e não substituem o parecer jurídico sobre a base legal e a retenção (auditoria, comprovantes, pedidos).
- O parecer foi produzido por uma passagem única do mesmo modelo. Não afirmo independência real em relação aos outros revisores.
