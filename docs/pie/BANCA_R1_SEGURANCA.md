# Banca R1: segurança, LGPD e proteção de receita

- **Revisor:** R1 (Red Team), auditoria adversarial do Fuse Aprova
- **Data:** 27/10/2026
- **Base:** `main` em `6a2cb43`
- **Modo:** somente auditoria. Nenhum arquivo do projeto foi alterado além deste parecer.
- **Provas executadas:** um teste Vitest temporário fora do repositório (`scratchpad/r1/test/poc.test.ts`), que monta a API real com PGlite e `app.inject`, com o Asaas falso e sem rede. Nada rodou contra a produção nem contra o Asaas real.

## 1. Resumo

O núcleo de proteção de receita está correto:
- toda rota de conteúdo responde 402 sem pagamento, inclusive `/sync`, `/offline/pacote` e `/api/arquivos`;
- o webhook exige o token com comparação em tempo constante;
- a idempotência funciona;
- as sessões, os simulados e o perfil filtram pelo dono.

O problema mais grave não é acesso gratuito. É a **integridade do jogo**: o endpoint de sync offline aceita, sem validação, sessões e tentativas montadas pelo cliente. Com isso o aluno fabrica XP, gemas, ofensiva e conclusão de lição. Isso quebra a regra "o servidor é a fonte da verdade de XP, gemas, ofensiva e liga".

Do lado da receita e do acesso, há três pontos de atenção:
1. o estorno de um pedido revoga o acesso mesmo quando existe outro pedido pago;
2. o webhook não confere o valor pago;
3. o papel `admin`, sem 2FA, consegue liberar acesso sem pedido e derrubar a sessão do superadmin.

| ID | Sev. | Estado | Arquivo:linha | Descrição |
|---|---|---|---|---|
| R1-01 | ALTA | CONFIRMADO | apps/api/src/servicos/offline.ts:93-194 | O sync offline aceita sessões e tentativas forjadas: XP e gemas ilimitados, e lição bloqueada marcada como concluída |
| R1-02 | MÉDIA | CONFIRMADO | apps/api/src/servicos/offline.ts:88-90, 182-185; progresso.ts:240-266 | Datas retroativas no sync forjam a ofensiva, o recorde e as gemas de marco |
| R1-03 | MÉDIA | CONFIRMADO | apps/api/src/servicos/pagamento.ts:189-211 | O estorno/chargeback de um pedido revoga o acesso mesmo com outro pedido pago |
| R1-04 | BAIXA | CONFIRMADO | apps/api/src/servicos/webhook.ts:20-31; pagamento.ts:162-185 | O valor pago (`payment.value`) não é conferido contra `PRICE_CENTS` no webhook nem na consulta |
| R1-05 | MÉDIA | CONFIRMADO | apps/api/src/rotas/admin/gestao.ts:299-316; packages/shared/src/api/rotas.ts (guarda 'admin') | O admin sem 2FA libera acesso sem pedido e revoga as sessões e o acesso de qualquer conta, inclusive do superadmin |
| R1-06 | BAIXA | CONFIRMADO | apps/api/src/rotas/social.ts:169-178; packages/shared/src/api/social.ts:127; apps/worker/src/jobs/lembretes.ts:29 | O endpoint de push aceita qualquer URL https: SSRF cego (POST) a partir do worker |
| R1-07 | MÉDIA | CONFIRMADO (presença) / HIPÓTESE (exploração) | apps/api/package.json, apps/web/package.json | Dependências de produção com 35 avisos (13 high): fastify 4.29.1, nodemailer 7.0.13, drizzle-orm 0.44.7, react-router 6.30.1 e zod 3.25.76 |
| R1-08 | BAIXA | CONFIRMADO | apps/api/src/rotas/auth.ts:64-74 | O cadastro revela se um CPF (ou e-mail) já está cadastrado |
| R1-09 | BAIXA | CONFIRMADO (leitura) | apps/api/src/servicos/lgpd.ts:61-86; rotas/super/usuarios.ts:213-264, 275; pagamentos.ts:379 | A anonimização LGPD não apaga os dados pessoais copiados para `auditoria` (nome, e-mail, celular, IP), e não há retenção para `auditoria` nem para `webhook_eventos` |
| R1-10 | BAIXA | CONFIRMADO (leitura) | packages/shared/src/api/rotas.ts:78, 838-845; apps/api/src/app.ts:118-122 | Força bruta: o login limita só por IP (sem limite por conta), o 2FA aceita 10 tentativas a cada 15 min sem bloqueio e o rate limit fica em memória |
| R1-11 | BAIXA | FORTE INDÍCIO | apps/api/src/rotas/admin/gestao.ts:236-245 | O admin reconstrói o CPF completo, apesar da máscara, buscando com `like %dígitos%` |
| R1-12 | BAIXA | CONFIRMADO (leitura) | apps/api/src/rotas/admin/conteudo.ts:433-445 | O upload do admin confia no `mimetype` declarado e não confere a assinatura do arquivo (o comprovante do super confere) |
| R1-13 | BAIXA | CONFIRMADO (leitura) | apps/api/src/rotas/super/usuarios.ts:249-266 | Um superadmin muda o e-mail de outro superadmin sem reconfirmação e, depois, força a troca de senha para o novo e-mail |
| R1-14 | BAIXA | CONFIRMADO (leitura) | infra/backup/backup.sh | Os backups (com CPF e celular) não são cifrados e ficam só no mesmo disco da VPS; os dados anonimizados continuam neles por até 8 semanas |

Não houve achado CRÍTICO. Nenhum caminho de conteúdo sem pagamento foi encontrado.

## 2. Achados detalhados

### R1-01: o sync offline aceita sessões e tentativas forjadas (ALTA, CONFIRMADO)
- **Categoria:** integridade de regras de jogo e lógica de negócio, com o servidor deixando de ser a fonte da verdade.
- **Arquivo:** `apps/api/src/servicos/offline.ts:93-194` (`sincronizar`).
- **Rota:** `POST /api/sync/tentativas` (guarda `acesso`).
- **Causa:** o servidor só recalcula o acerto contra o gabarito. Ele não confere:
  - se a sessão veio de um pacote emitido (`pacoteId` é ignorado);
  - se a questão pertence à lição ou ao pacote;
  - se a mesma questão já foi respondida;
  - se a lição (`licaoId`) pode ser aberta pelo aluno (`licaoAbrivel`, que a rota online usa);
  - quantas sessões ou tentativas há por dia.

  Cada tentativa certa credita XP (linha 162). Cada sessão "concluída" com pelo menos uma tentativa roda `finalizarSessao`, que dá XP bônus, gemas, `progresso_licoes` da lição informada e ofensiva.
- **Reprodução (executada):**
  1. Um aluno pago envia 40 sessões `{tipo:'licao', licaoId:<última lição bloqueada>, concluidaEm}`.
  2. Cada sessão leva uma tentativa com a **mesma** questão publicada e a resposta certa.

  Para obter o gabarito, basta o pacote offline, que entrega a chave, ou usar o próprio `xpGanho` da resposta do sync como oráculo.
- **Esperado:** rejeitar sessões e lições fora do pacote ou da trilha, e não pagar XP de novo pela mesma questão.
- **Observado:** `aceitas 40`, `xpGanho 1000`, XP de 0 para 1000 e gemas de 0 para 200. A lição bloqueada foi gravada como concluída, com `vezes=40`. Cada chamada aceita até 50 sessões e 500 tentativas, e as chamadas não têm limite.
- **Impacto:**
  - manipulação da liga semanal, que é ranking entre alunos pagantes;
  - gemas infinitas (protetores de ofensiva, dicas);
  - conquistas;
  - progresso falso na trilha.

  Não libera conteúdo sem pagamento.
- **Correção proposta:**
  - guardar no servidor os pacotes emitidos (id, usuário, lições e questões, validade) e exigir `pacoteId` válido;
  - só aceitar tentativas de questões daquele pacote e só uma vez por questão e sessão;
  - validar `licaoId` com `licaoAbrivel` no momento da emissão;
  - limitar sessões e tentativas por dia;
  - não creditar XP de acerto repetido da mesma questão fora da revisão;
  - não expor `xpGanho` por tentativa.
- **Teste de aceite:** o PoC R1-01 deve terminar com `aceitas ≤ nº de questões do pacote`, XP ≤ uma lição e a lição bloqueada sem progresso. Uma sessão com `licaoId` bloqueado ou `pacoteId` inexistente deve ser rejeitada.

### R1-02: datas retroativas no sync forjam a ofensiva (MÉDIA, CONFIRMADO)
- **Arquivos:** `offline.ts:88-90` (`limitar` só corta o futuro), `offline.ts:182-185` e `progresso.ts:241` (aceita qualquer dia ≥ `ultimoDiaEstudo`).
- **Reprodução (executada):** onze chamadas de sync seguidas, cada uma com uma sessão concluída em D-10, D-9, …, D-0.
- **Observado:** ofensiva 11, recorde 11 e 105 gemas, para um aluno criado no mesmo instante.
- **Esperado:** aceitar `concluidaEm` só dentro da janela do pacote (≤ 7 dias e ≥ `geradoEm` do pacote) e não antes da criação da conta ou do pagamento.
- **Impacto:** a ofensiva, as conquistas de ofensiva e as gemas de marco ficam falsificáveis.
- **Correção:** limitar `respondidaEm` e `concluidaEm` a `[max(pacote.geradoEm, criadoEm), agora]` e rejeitar o que estiver fora.
- **Teste de aceite:** o PoC R1-02 resulta em ofensiva ≤ 1.

### R1-03: o estorno revoga o acesso mesmo com outro pedido pago (MÉDIA, CONFIRMADO)
- **Categoria:** proteção de receita e direito do cliente.
- **Arquivo:** `apps/api/src/servicos/pagamento.ts:189-211` (`estornarPagamento`) faz `acesso=false` sem olhar os outros pedidos. O `desfazerManual` (`pagamentoManual.ts:155-161`) faz essa conferência.
- **Cenário real:**
  1. O aluno tem um Pix pendente.
  2. O superadmin aprova um pagamento manual e escolhe "não mexer" no Pix.
  3. O aluno paga o Pix também: `confirmarPagamento` não bloqueia o segundo pagamento.
  4. O dono reembolsa o pagamento duplicado.
- **Reprodução (executada):** o aluno tem um pedido Asaas pago e um pedido manual pago. Um `PAYMENT_REFUNDED` no Asaas deixa os pedidos em `manual:pago` e `asaas:estornado`, com **acesso=false** e as sessões derrubadas.
- **Correção:** depois de estornar, só revogar se não restar outro pedido `pago` (a mesma regra do `desfazerManual`). Também vale avisar ou bloquear a aprovação manual quando houver um Pix pendente e a opção for "não mexer".
- **Teste de aceite:** o PoC R1-03 deve manter `acesso=true`.

### R1-04: o valor pago não é conferido (BAIXA, CONFIRMADO)
- **Arquivos:** `webhook.ts:20-31` usa só `payment.id` e `event`, e `confirmarPagamento` ignora `payment.value`. A consulta direta (`pagamento.ts:116-122`) também ignora o `value`.
- **Reprodução (executada):** um webhook `PAYMENT_RECEIVED` com `value: 1.00` libera o acesso.
- **Mitigação existente:**
  - a cobrança é criada pela API com o valor fixo;
  - o webhook exige o token;
  - o pedido precisa existir.

  O risco depende de alguém com acesso à conta Asaas **compartilhada** (D14) alterar a cobrança, ou de o token vazar.
- **Correção:** confirmar só se `round(payment.value*100) >= pedido.valorCentavos`. Se não, gravar a divergência e alertar o superadmin. Aplicar a mesma regra na consulta direta e na conciliação.
- **Teste de aceite:** o webhook com valor menor não libera e marca o evento como divergente.

### R1-05: o admin sem 2FA libera acesso e derruba o superadmin (MÉDIA, CONFIRMADO)
- **Rotas:**
  - `POST /api/admin/usuarios/:id/liberar-acesso`;
  - `POST /api/admin/usuarios/:id/revogar-acesso`;
  - `POST /api/admin/usuarios/:id/revogar-sessoes`;
  - `POST /api/admin/pedidos/:id/reembolso`.

  Todas usam a guarda `admin`, que não exige 2FA do papel `admin` (`registrar.ts:96-100`).
- **Reprodução (executada):**
  - O admin chamou `revogar-sessoes` no id do superadmin e recebeu `{"revogadas":1}`. A sessão do superadmin passou a responder 401.
  - O admin liberou o acesso de um aluno sem pagamento: `acesso=true`, com **0 pedidos**.
- **Contexto:** o PRD (5.17 e 8.2) permite a "liberação manual de acesso com motivo". Mesmo assim, isso é uma via de acesso gratuito protegida só por senha, sem 2FA nem reconfirmação, e contradiz o espírito do D13 ("aprovação manual não é acesso gratuito").
- **Impacto:** se a senha de um admin for comprometida, o atacante concede acesso a terceiros, faz reembolsos e tira o superadmin do ar.
- **Correção:**
  - exigir 2FA também para `admin`, ou mover liberar acesso e reembolso para o `/super` com reconfirmação;
  - impedir que um admin aja sobre contas `admin`/`superadmin`;
  - fazer a liberação manual criar um pedido rastreável.
- **Teste de aceite:** o admin recebe 403 ao agir sobre um superadmin, e liberar acesso exige 2FA e reconfirmação.

### R1-06: o push aceita endpoint arbitrário (BAIXA, CONFIRMADO)
- **Arquivos:** `PushInscreverEntrada.endpoint = z.string().url()`. O worker chama `webpush.sendNotification` com essa URL (`https.request`, qualquer host e porta).
- **Reprodução (executada):** `pushInscrever` com `https://127.0.0.1:5432/x` responde 200.
- **Impacto:** POST HTTPS cego a partir do container do worker, que fica na rede interna (`postgres`, `api`) e no gateway do host, numa VPS compartilhada. O alvo precisa falar TLS e a resposta não volta ao atacante.
- **Correção:**
  - lista de hosts permitidos dos serviços de push (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `web.push.apple.com`);
  - só https na porta 443;
  - bloquear IP literal e IP privado.
- **Teste de aceite:** um endpoint fora da lista recebe 400.

### R1-07: dependências vulneráveis (MÉDIA, presença CONFIRMADA)
- **Comando:** `pnpm audit --prod` → 35 avisos (2 low, 20 moderate, 13 high).
- **Pacotes principais:**

| Pacote | Versão | Avisos relevantes |
|---|---|---|
| fastify | 4.29.1 | "authentication bypass via malformed URLs reaching encapsulated…"; vários bypass de validação por schema; spoof de `request.host/protocol` |
| nodemailer | 7.0.13 | ReDoS no addressparser; CRLF |
| drizzle-orm | 0.44.7 | SQL injection por identificadores |
| react-router | 6.30.1 | open redirect |
| zod | 3.25.76 | memória |

- **Avaliação de exploração (HIPÓTESE):**
  - grande parte não se aplica, porque a API valida com Zod no handler e não com schema do Fastify;
  - não há HTTP/2 nem identificadores dinâmicos no Drizzle;
  - `req.host`/`req.protocol` não são usados.

  O aviso de *authentication bypass* em rotas encapsuladas e o ReDoS do nodemailer não foram testados.
- **Correção:** atualizar para fastify 5.12.5+ com os plugins compatíveis, nodemailer 10.1.4+, drizzle-orm 0.45.2+ e react-router 6.30.4+/7.x, e incluir `pnpm audit --prod --audit-level high` no CI.

### R1-08: o cadastro revela o CPF cadastrado (BAIXA, CONFIRMADO)
- **Reprodução:** um cadastro com o CPF de outra pessoa retorna 409 `conta_existente`. O limite é de 10 por hora por IP.
- **Impacto:** oráculo de "esta pessoa (CPF) é cliente", um dado pessoal pela LGPD, e enumeração de e-mails.
- **Correção:** resposta neutra ("se os dados forem válidos, enviamos um e-mail"), ou exigir confirmação por e-mail antes de acusar a duplicidade, com limite por CPF.

### R1-09: LGPD, dados pessoais que sobrevivem à anonimização (BAIXA)
- **O que fica:**
  - `auditoria` guarda `antes/depois` com nome, e-mail e celular (`usuario.editar`) e `detalhes.para` com o e-mail (`forcar_senha`, `reenviar_email`); o admin vê esse `detalhes` em `/admin/auditoria`;
  - `anonimizarUsuario` não toca na `auditoria`, em `reports.texto` nem em `webhook_eventos.corpo`;
  - o worker não tem retenção para `auditoria` nem para `webhook_eventos`.
- **Correção:**
  - na anonimização, redigir os campos pessoais da `auditoria` do alvo (`alvo = usuario:<id>`);
  - definir e documentar a retenção (por exemplo, `webhook_eventos` em 5 anos só com os campos fiscais, IP de sessão em 6 meses, conforme o Marco Civil).

### R1-10: força bruta (BAIXA)
- **Situação atual:**
  - login com 20 tentativas a cada 15 min por IP, sem contador por conta, o que não segura um ataque distribuído;
  - 2FA com 10 tentativas a cada 15 min por usuário, sem bloqueio: cerca de 0,3% de chance por dia de acertar um TOTP com a senha já vazada;
  - store do rate limit em memória, que zera a cada deploy ou reinício.
- **Correção:**
  - limite por conta com atraso progressivo;
  - bloquear o 2FA depois de N falhas e avisar por e-mail;
  - store persistente (Postgres) se houver mais de uma réplica.

### R1-11: reconstrução do CPF pelo admin (BAIXA, FORTE INDÍCIO)
- **Arquivo:** `adminUsuariosListar` aceita `q` com 3 ou mais dígitos e faz `cpf like %dig%`. Buscas sucessivas revelam o CPF completo de um usuário, apesar do `cpfOculto`.
- **Correção:** só aceitar o CPF completo (11 dígitos, com igualdade), ou só o prefixo, com auditoria.

### R1-12: o upload do admin não confere a assinatura (BAIXA)
- **Situação:** só o `mimetype` declarado é conferido. A mitigação é que o arquivo é servido com o `Content-Type` da extensão, com `nosniff` e com CSP `script-src 'self'`.
- **Correção:** conferir os magic bytes como o `superComprovanteEnviar` já faz e, de preferência, reencodar a imagem.

### R1-13: troca do e-mail de outro superadmin sem reconfirmação (BAIXA)
- **Situação:** `superUsuarioEditar` muda o e-mail de qualquer conta, inclusive de outro superadmin, sem `reconfirmar`. Em seguida, `superUsuarioForcarSenha` manda o link para o novo e-mail. O 2FA da vítima ainda protege o acesso, mas a conta fica tomada para recuperação.
- **Correção:** exigir reconfirmação para editar o e-mail e bloquear a edição de superadmin por outro superadmin sem um fluxo próprio.

### R1-14: backups (BAIXA)
- **Situação:**
  - `pg_dump` sem cifra, com `umask 077`;
  - mesmo disco da VPS compartilhada;
  - 14 diários e 8 semanais;
  - sem cópia fora do servidor.
- **Correção:** cifrar (age/gpg com chave pública), manter uma cópia externa e documentar no DEPLOY que os dados anonimizados saem dos backups em até 8 semanas.

## 3. Controles verificados (corretos)

**Guardas e acesso**
- Guardas centralizadas em `registrar.ts:79-110`. O registro `ROTAS` obriga a declarar a guarda, e `conferirRegistro` falha se faltar alguma rota.
- O PoC confirmou 402 sem pagamento em `trilha`, `concurso`, `offlinePacote`, `revisao`, `simuladosListar`, `liga`, `perfilEstatisticas`, `syncTentativas` e `/api/arquivos/uploads`.
- `/api/arquivos/uploads/:nome` e `/api/super/comprovantes/:nome` têm regex de UUID e extensão. A travessia `..%2f` respondeu 402/404.

**Sessões e autenticação**
- Sessão com token de 32 bytes e HMAC-SHA256 no banco.
- Cookie `httpOnly; Secure; SameSite=Lax`.
- `SESSION_SECRET` com 32 ou mais caracteres é obrigatório em produção.
- A sessão do superadmin dura 12 h, com 2 h de ociosidade.
- Bloqueio e exclusão derrubam a sessão no `carregarSessao`.
- Senha com argon2id, tempo constante para usuário inexistente e mínimo de 8 caracteres.
- A recuperação não revela o e-mail, o token vale 1 h, é de uso único (SHA-256 no banco) e encerra as outras sessões. A troca de senha encerra as outras sessões.

**2FA do superadmin**
- TOTP com anti-replay (`totp_ultimo_passo`, update condicional).
- Segredo cifrado.
- Códigos de recuperação guardados como hash e de uso único.
- Reconfirmação nas ações sensíveis.
- Proteção do último superadmin.

**Autorização por dono (IDOR/BOLA)**
- `sessaoAberta`, `obterSimulado`, `salvarResposta`, `entregar`, `iniciarRevisao`, `liga` e `pushRemover` filtram por `usuarioId`.
- O PoC confirmou que a sessão de outro aluno responde 404.
- O gabarito do simulado não sai antes da entrega.
- A resposta é validada contra o contrato Zod, o que remove campos extras.

**Webhook Asaas**
- Token em tempo constante; token errado responde 401 (confirmado).
- Idempotência por `id` do evento.
- Eventos fora de ordem: pedido `estornado` não volta a `pago`, e vencer só altera pedido `pendente`.
- Chargeback e refund revogam o acesso e as sessões.
- Filtro de eventos de outras aplicações (D14).

**Pagamento manual**
- Valor fixo em `PRICE_CENTS`, idempotente, com comprovante conferido pela assinatura e servido só ao superadmin com `no-store`.

**CSRF, CORS e cabeçalhos**
- Sem CORS registrado.
- `SameSite=Lax` e corpo JSON validado por Zod.
- Links absolutos usam `APP_URL`, nunca o `Host`.

**XSS**
- Sem `dangerouslySetInnerHTML`, exceto o QR SVG gerado pelo servidor.
- O Markdown gera elementos React, e a imagem só aceita `/` ou `http(s)`.
- CSP `script-src 'self'` sem `unsafe-inline`.

**nginx**
- HSTS, CSP, `nosniff`, `X-Frame-Options DENY`, COOP/CORP e Permissions-Policy.
- `X-Forwarded-For` sobrescrito no host e no container, o que impede forjar o IP do rate limit.
- Sem log de acesso, para o token de `/recuperar` não ir para log.
- Postgres sem porta publicada; o nginx publica só em `127.0.0.1:3600`.

**SQL**
- Só dois `sql.raw`: `util.ts:24`, com UUID validado por regex, e `simulado.ts:119`, com ids vindos do banco. O resto é parametrizado.

**Segredos**
- `git ls-files` só traz o `.env.example`, sem valores.
- O histórico só tem o `.env.example`.
- A busca por padrões de chaves (Asaas `$aact_`, `ghp_`, `AKIA`, chave privada) não encontrou nada.
- O logger redige cookie, senha, token, CPF e payload Pix.

**LGPD**
- Exportação sem hash de senha nem segredo do 2FA.
- A exclusão anonimiza e mantém os pedidos.
- O logout limpa o IndexedDB e os caches de API do service worker.

**Crawler**
- Não é acionado pela API.
- Nomes de arquivo passam por `slugificar` e `basename`.
- robots.txt e captcha param o coletor.

## 4. O que foi testado (comandos e resultados reais)

```
cd apps/api && npx vitest run --globals --dir <scratchpad>/r1
→ 1 arquivo, 8 testes aprovados (9 s)
```

Saídas relevantes:

| Prova | Resultado |
|---|---|
| R1-01 | `aceitas 40`, `xpGanho 1000`, XP 0→1000, gemas 0→200, lição bloqueada concluída com `vezes=40` |
| R1-02 | ofensiva forjada 11, recorde 11, 105 gemas |
| R1-03 | pedidos `['manual:pago','asaas:estornado']`, acesso `false` |
| R1-04 | acesso `true` com `value=1.00` |
| R1-05 | o admin revoga as sessões do superadmin com 200 `{"revogadas":1}`; a sessão do superadmin passa a dar 401; liberar acesso dá 200, com acesso `true` e 0 pedidos |
| R1-06 | `pushInscrever` com `https://127.0.0.1:5432/x` responde 200 |
| R1-08 | 409 `conta_existente` para CPF já cadastrado |
| Controles | 402 em todas as rotas de conteúdo, em `/sync` e em `/arquivos`; IDOR de sessão responde 404; webhook com token errado responde 401 |

`pnpm audit --prod` → 35 vulnerabilidades (13 high).

## 5. O que NÃO foi testado e limitações
- Nada contra a produção (www.fuseaprova.com.br) nem contra o Asaas real. Os cabeçalhos do nginx foram verificados só por leitura dos arquivos; não foi confirmado que a VPS roda exatamente essa versão nem que o certbot manteve HSTS no bloco 443.
- Não houve Docker local, então o compose, o nginx e o backup não foram executados.
- A exploração real das CVEs (R1-07) não foi testada.
- O rate limit em produção (store em memória, número de réplicas) foi conferido só por leitura. Já existe teste de 429 em `test/auth.test.ts`.
- O front foi revisado só por busca de padrões (XSS, cache e logout), sem teste em navegador.
- O worker (`comunicacoes`, `liga`) e o crawler foram lidos por amostragem.
- O importador de PDF e o script Python de figuras não foram auditados a fundo.
- A suíte completa não foi rodada, por regra da banca. A linha de base informada pelo coordenador é typecheck e lint com exit 0 e API com 257/257.
