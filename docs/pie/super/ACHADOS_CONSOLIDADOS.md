# Achados consolidados: painel superadmin

- **Data:** 28/10/2026
- **Commit de partida:** `2f71392`
- **Pareceres de origem:** `BANCA_R1_SEGURANCA.md`, `BANCA_R2_USUARIO.md`, `BANCA_R3_ARQUITETURA.md`, `BANCA_R4_QUALIDADE.md` e `BANCA_R5_SRE.md`. Cada achado cita o ID de origem; a reprodução e a evidência estão lá.
- **Conflitos:** resolvidos em `CONTESTACOES_E_CONFLITOS.md`.
- **Estados:** CONFIRMADO, FORTE INDÍCIO, HIPÓTESE ou NÃO REPRODUZIDO (protocolo, seção 2.4).
- **Requisitos do dono:** RQ1 a RQ4 (`ESCOPO_BANCA.md`).

## Bloqueadores e altos

| ID | Origem | Título | Req. | Sev. | Estado | Situação |
|---|---|---|---|---|---|---|
| S-01 | R1-01, R1-02, R3-01, R3-02, R4-01, R4-02 | O superadmin entra no app de estudo (trilha, lição, revisão, liga, simulado, offline, arquivos) com a senha e **sem o 2FA**. A guarda `acesso` não olha o papel, a CLI liga `acesso=true`, e a manutenção e os arquivos liberam pelo `ehAdmin` | RQ1 | ALTA | CONFIRMADO | aberto |
| S-02 | R1-04, R2-22, R3-13 | O admin de conteúdo, **sem 2FA**, opera o negócio. Libera acesso **sem pedido** (acesso gratuito), revoga, reembolsa e vê receita, pedidos, usuários e a auditoria inteira | RQ1, receita | ALTA (bloqueador) | CONFIRMADO | aberto |
| S-03 | R1-03, R2-05, R2-12, R4-04 | Um só login (`POST /auth/login`, tela `/entrar` de aluno com "Criar conta"), uma só recuperação e o convite da equipe caindo na tela de aluno | RQ2 | ALTA | CONFIRMADO | aberto |
| S-04 | R2-01, R2-21, R2-23, R2-24, R3-09 | O Conteúdo é um painel à parte (`/admin`, outro layout, ligado por `<a href>`, sem Sair, com "Ver o app como aluno"). O `/super` depende de 3 rotas do `/admin`: lista de concursos, liberar e revogar (que revoga **todos** os concursos) | RQ1, RQ3 | ALTA | CONFIRMADO | aberto |
| S-05 | R1-06, R3-03, R4-03 | Superadmin ou admin rebaixado a aluno continua com `acesso=true` sem pedido: acesso gratuito | receita | ALTA | CONFIRMADO | aberto |
| S-06 | R1-09, R2-03, R2-04, R3-04, R3-06, R4-05, R4-06, R4-07 | A aprovação manual atua sobre o **concurso ativo**, não sobre o pedido. Com outro concurso liberado, responde "já aprovado" e não libera. Grava o **preço cheio** por cima do valor do pedido (R$ 197 → R$ 397, e o mesmo valor vai para o Asaas). Com Pix vencido, cria um pedido novo e deixa o antigo aberto (cobrança dupla). Vale para conta da equipe e para o próprio superadmin. Com "não mexer", um Pix pago depois vira `sem_mudanca` | RQ4, receita | ALTA | CONFIRMADO | aberto |
| S-07 | R2-02, R2-17, R3-05, R4-08 | Um pedido pago sem o concurso liberado não tem saída: nenhum botão aparece, a conciliação diz "tudo certo" e não confere `usuarios_concursos`, e "Acesso do aluno" mostra o acesso geral | RQ4 | ALTA | CONFIRMADO | aberto |
| S-08 | R5-01 | O financeiro e as estatísticas do Asaas fazem `select *` em `pedidos`, inclusive o QR em base64. Com 2 anos: de 2 a 3 s e de 278 a 661 MB de heap (o limite em produção é 384 MB) | RQ3 | ALTA | CONFIRMADO (medido); queda por falta de memória: FORTE INDÍCIO | aberto |
| S-09 | R5-02, R5-03, R5-04, R5-11 | `/super/sistema` mostra "OK" falso: backup de 10 dias como OK, worker parado como OK, banco fora vira um 500 genérico, e SMTP, push e Asaas aparecem como "configurado" sem teste. Não há alerta nenhum (job, backup, 5xx, disco), e o backup com falha no `tar` sai como sucesso | RQ3 | ALTA | CONFIRMADO | aberto |

## Médios

| ID | Origem | Título | Req. | Estado |
|---|---|---|---|---|
| S-10 | R1-05, R3-12, R4-09 | O reembolso não é idempotente (o 2º clique manda um 2º estorno ao Asaas). Há uma 2ª implementação no `/admin`, sem reconfirmação, que aceita pedido manual | RQ4, receita | CONFIRMADO |
| S-11 | R1-07 | O superadmin troca o e-mail de uma conta da equipe e força a senha sem reconfirmação (tomada de conta), sem avisar o e-mail antigo. Também bloqueia outro superadmin | segurança | CONFIRMADO |
| S-12 | R1-08, R1-10, R3-07 | Criar ou editar cupom não pede reconfirmação, e um cupom fixo leva o Pix a R$ 5. O limite de usos estoura: limite 1 resultou em 2 e 3 pagamentos | receita | CONFIRMADO |
| S-13 | R3-08, R1-02 | O último superadmin se exclui por `DELETE /me` só com a senha. As rotas `/me` de aluno (exclusão, exportação, Pix, concursos) valem para a equipe | segurança | CONFIRMADO |
| S-14 | R2-08, R3-10 | A D21 está ausente do painel: pagamento, ficha, CSV e financeiro não mostram o concurso nem o cupom, e não há liberar ou revogar por concurso | RQ3 | CONFIRMADO |
| S-15 | R5-05 | O polling de 60 s da tela Sistema anula a ociosidade de 2 h da sessão do super | segurança | CONFIRMADO |
| S-16 | R5-06, R1-13 | O rate limit do login, do 2FA e do `/super` fica em memória e é contado por rota (zera no deploy). Erros de 2FA não são auditados nem bloqueiam | segurança | CONFIRMADO |
| S-17 | R2-07, R2-13, R1-14, R3-14, R5-07 | Comunicação em massa: <ul><li>"Enviar" duas vezes manda duas vezes;</li><li>a prévia não acompanha a mudança do link;</li><li>não pede reconfirmação;</li><li>não tem retentativa (SMTP fora = 95 falhas e "concluída");</li><li>o limite diário corre fora da transação (HIPÓTESE)</li></ul> | RQ3 | CONFIRMADO, salvo a corrida |
| S-18 | R5-08, R1-15, R4-10 | Os CSVs são cortados sem aviso (pagamentos em 10 mil e usuários em 20 mil linhas), não usam streaming e o de usuários lê `senha_hash` e `totp_segredo`. A neutralização de fórmulas transforma número negativo em texto e não pega `" ="` nem `＝` | RQ3 | CONFIRMADO; exploração HIPÓTESE |
| S-19 | R2-06, R2-09, R2-10, R2-11, R2-19 | UX do dono: <ul><li>401 ou 2FA vencido sem caminho de volta;</li><li>2FA no celular sem "Sair";</li><li>convite sem reenviar nem cancelar;</li><li>textos em inglês (RECEIVED, PAYMENT_FEE);</li><li>jobs com nome técnico</li></ul> | RQ3 | CONFIRMADO |
| S-20 | R5-09 | A conciliação em lote (200 chamadas) e o extrato (20 páginas) correm contra o tempo limite de 60 s do nginx | RQ3 | HIPÓTESE |

## Baixos

| ID | Origem | Título | Estado |
|---|---|---|---|
| S-21 | R1-11, R1-12 | Depois da anonimização, a auditoria e a ficha mantêm nome, e-mail e celular. A exportação LGPD sai sem motivo nem reconfirmação, e a busca por dígitos reconstrói o CPF mascarado | CONFIRMADO |
| S-22 | R4-11, R5-10, R3-15 | A busca não escapa `%` e `_` (traz tudo). Buscas `ilike` e DAU/WAU/MAU sem índice adequado: de 250 a 550 ms | CONFIRMADO (medido) |
| S-23 | R3-11 | `gerarPix` marca como `vencido` o pendente antigo sem `status='pendente'`, o que pode rebaixar um pedido já pago | FORTE INDÍCIO |
| S-24 | R3-16 | `garantirOutroSuperadmin` conta e depois atualiza, sem trava (TOCTOU) | CONFIRMADO (estático) |
| S-25 | R2-14, R2-15, R2-16, R2-18, R2-20 | Pequenas fricções: <ul><li>convite desabilitado sem motivo;</li><li>auditoria sem período no celular, sem CSV e sem filtro "quem fez";</li><li>conciliação em lote duplicada com regras diferentes;</li><li>liberar e revogar acesso aparecendo na ficha de conta da equipe;</li><li>a marcação "fora do prazo" que não volta ao padrão</li></ul> | CONFIRMADO |
| S-26 | R5-12 | `enviar-comunicacoes` grava uma execução por minuto com a fila vazia (76% de `jobs_execucoes`). `/super/sistema` faz 29 consultas em sequência | CONFIRMADO (medido) |
| S-27 | R5-13 | A PWA põe no precache de todo aluno cerca de 253 KB de código do `/admin` e do `/super` | CONFIRMADO (build) |
| S-28 | R4-12, R4-13 | 4 rotas `/super` e 14 rotas de conteúdo sem teste funcional, e 8 telas do `/super` sem teste de UI. Os helpers de teste (`admin()`, `superadmin()`) criam a equipe com acesso e entram pelo login único | CONFIRMADO |

## Sem achado (testes negativos que passaram)

- Path traversal e arquivo polyglot no comprovante.
- Reuso e expiração do convite.
- URL do webhook do Asaas.
- Link do push.
- Nenhuma das 55 rotas `/super` respondeu 500 nem saiu do contrato Zod, no PGlite e no Postgres 16 (R4).
