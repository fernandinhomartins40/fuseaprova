# Relatório de segurança, LGPD e proteção de receita

- **Base:** `BANCA_R1_SEGURANCA.md`, `VALIDACAO_V1_SEGURANCA.md` e as verificações do Auditor-Chefe.
- **Data:** 27/10/2026.
- **Escopo:** local (API real sobre PGlite e sobre Postgres 16 descartável, Asaas falso).
- **Fora do escopo:** testes contra produção e contra o Asaas real.
- **Ressalva:** este relatório não declara a aplicação "100% segura" nem "conforme à LGPD". Ele registra os controles verificados e os riscos que restam.

## 1. Fluxo de receita: identidade → pagamento → acesso → operação

| Etapa | Controle | Prova |
|---|---|---|
| Identidade | Cookie de sessão, senha com argon2id, 2FA TOTP do superadmin (código não reaproveitável, segredo cifrado) | R1 (controles verificados), `auth.test.ts`, `totp.test.ts` |
| Pagamento | Pix criado no servidor com `PRICE_CENTS` (o preço nunca vem do cliente). Desde `1510c17`: linha do aluno travada (sem 2 cobranças) e valor do webhook conferido contra o pedido (`valor_divergente`) | `pagamento.test.ts` (3 testes novos que reprovam o código antigo) |
| Webhook | Token comparado em tempo constante (401). Idempotente pelo id do evento. Pedido estornado não volta a pago. Eventos de outras apps da conta compartilhada são ignorados | `pagamento.test.ts` |
| Liberação | `usuarios.acesso` só muda por: webhook ou consulta ao Asaas, aprovação manual do superadmin (com 2FA), liberação do admin (PRD) e estorno ou revogação | inventário J04, J17, J18 |
| Operação | Guarda `acesso` (402) em todas as 25 rotas de conteúdo, inclusive `/sync`, `/offline/pacote` e `/api/arquivos`. Prova R1: 402 em todas; `..%2f` barrado | PoC R1 "controle" (passou depois das correções) |
| Contabilização | XP, gemas e ofensiva recalculados no servidor. **Falha A-01** no sync offline: corrigida em `5c264ef` | 3 testes novos + PoC R1/R3 |
| Revogação | Estorno ou chargeback derruba as sessões, salvo se houver outro pedido pago (A-04). Revogação pelo admin agora também derruba as sessões (A-12) | `pagamento.test.ts`, `admin.test.ts` |

## 2. Cenários negativos executados

Todos foram executados localmente e passaram. Os 5 primeiros são testes do projeto; o último é uma prova de conceito no scratchpad.

| Cenário | Esperado | Observado |
|---|---|---|
| Sync com a mesma questão em 4 sessões, lição bloqueada e desafio | 1 aceita, demais recusadas, +5 gemas, 1 lição concluída | `conteudo-offline.test.ts` › "sync recusa a mesma questão repetida…" |
| Sync com datas 30 dias antes do pacote | ofensiva 1, datas ≥ agora | "datas anteriores ao pacote não forjam ofensiva…" |
| Questão de outro assunto; revisão não vencida | recusadas, 0 XP | "sync recusa questão de outro assunto…" |
| Admin agindo sobre admin ou superadmin | 403 nas 3 rotas | `admin.test.ts` › "admin só age sobre alunos…" |
| Push para `127.0.0.1:5432`, `http://`, `postgres`, `fcm.googleapis.com.mal.com` | 400 | `social.test.ts` + `contratos.test.ts` |
| Rotas de conteúdo sem pagamento | 402 | PoC R1 (scratchpad) |

## 3. Riscos que restam (ver ACHADOS_CONSOLIDADOS)

- **A-13: dependências com vulnerabilidades conhecidas.** Exigem atualizações major de fastify 4→5, drizzle, nodemailer e react-router. Fica como pendência P-04, com regressão completa.
- **A-12 (resíduo): a liberação manual do admin continua protegida só por senha.** Recomendação: exigir 2FA no papel admin. É decisão do dono, porque a regra comercial está no PRD.
- **A-32: o limite de tentativas de login é só por IP e fica em memória.**
- **A-30: o cadastro revela que um CPF ou e-mail já existe** (409).
- **A-33:**
  - o CPF pode ser reconstruído pela busca do admin;
  - o upload não confere a assinatura do arquivo;
  - um superadmin troca o e-mail de outro sem reautenticação.
- **A-20: Pix vencido que talvez continue pagável no Asaas.** Não comprovado.

## 4. LGPD

Avaliação técnica apenas. Não equivale a parecer jurídico.

- **Dados tratados:** nome, e-mail, CPF, celular, IP e user agent da sessão, histórico de estudo, pedidos e dados do Asaas.
- **Direitos do titular:**
  - a exportação (`GET /me/exportar`) e a exclusão por anonimização (`DELETE /me`) estão implementadas e testadas na API;
  - a UI de LGPD não tem teste (R4-07).
- **Lacunas técnicas:**
  - **A-31:** a tabela `auditoria` guarda nome, e-mail e celular depois da exclusão, e não há prazo de retenção para `auditoria` nem para `webhook_eventos`.
  - **R1-14 / A-06:** os backups têm CPF e celular sem cifra e ficam só na VPS.
  - **R3-09:** um pagamento confirmado depois da exclusão religa o acesso e manda e-mail para o endereço anonimizado.
- **Precisam do encarregado ou do jurídico:**
  - prazos de retenção da auditoria, dos eventos do Asaas e dos backups;
  - base legal do marketing (opt-in já existe);
  - política de incidentes.
- **IA:** não há recurso de IA no produto. A seção 5.5 do protocolo não se aplica.
