# Veredito do Auditor-Chefe: painel superadmin

- **Escopo:**
  - o painel `/super` (55 rotas, 13 telas);
  - a gestão de conteúdo (`/admin`, 52 rotas, 11 telas);
  - os papéis e as guardas, o login, a recuperação e o convite;
  - o pagamento manual, o estorno e a liberação;
  - a operação (`/super/sistema`, jobs, CSVs).
- **Requisitos do dono:** RQ1 a RQ4 (`ESCOPO_BANCA.md`).
- **Modo:** AUDITORIA + CORREÇÃO.
- **Data:** 28/10/2026.
- **Ressalva:** aprovação não é garantia de segurança absoluta. Nenhum veredito aqui declara "100% seguro", "LGPD resolvida" ou "VPS otimizada".

## Veredito inicial (commit `2f71392`): **REPROVADO**

### Bloqueadores confirmados

1. **S-02, acesso gratuito pela equipe.** O admin de conteúdo, sem 2FA, libera o acesso de qualquer aluno sem pedido (200 com 0 pedidos). Também vê e opera o negócio: receita, pedidos, reembolso, usuários e auditoria.
2. **S-01, superadmin no app de estudo.** O superadmin entra com a senha, sem o 2FA, e abre o conteúdo do aluno (RQ1).
3. **S-05, acesso gratuito por rebaixamento.** Uma conta da equipe rebaixada a aluno abre a trilha com 0 pedidos.
4. **S-06 e S-07, liberação manual quebrada (RQ4).**
   - A aprovação manual libera o concurso errado ou não libera nada.
   - Ela grava um valor diferente do pedido e no Asaas.
   - Ela pode gerar cobrança dupla.
   - Um pedido pago sem liberação não tem saída.
5. **S-03 e S-04, requisitos do dono não existem.**
   - Não há logins separados (RQ2).
   - O Conteúdo é um painel à parte, e o `/super` depende do `/admin` (RQ1 revisado).

### Altos que impedem a liberação como "painel completo" (RQ3)

- **S-08:** o financeiro lê o QR de todos os pedidos, com risco de memória medido.
- **S-09:** `/super/sistema` mostra "OK" falso e não há nenhum alerta.

### O que funciona

- **Sem erro em nenhuma rota.** As 55 rotas `/super` respondem dentro do contrato no PGlite e no Postgres 16.
- **Suítes verdes:** API 299/299 nos dois bancos, web 74/74, typecheck e lint.
- **Testes negativos sem achado:**
  - comprovante (traversal e polyglot);
  - convite (reuso e expiração);
  - URL do webhook;
  - link do push.

## Veredito pós-correção: **APROVADO COM RESSALVAS**

- **Base:** a branch da correção, com os Lotes 1 a 3 e as correções da revalidação (V-01 a V-07). Detalhe em [RELATORIO_VALIDACAO_FINAL.md](RELATORIO_VALIDACAO_FINAL.md) e [REVALIDACAO_API.md](REVALIDACAO_API.md).
- **Bloqueadores (S-01 a S-07):** todos corrigidos e revalidados por um agente adversarial independente. A matriz de guardas cruzou 148 rotas com 6 personas e não teve violação. Não houve regressão no aluno, no pagamento nem na D21.
- **Altos (S-08, S-09):**
  - S-08: o financeiro passou a ser agregado no SQL. Com 2 anos de dados, caiu de 6,2 s e +428 MB para 0,2 a 0,3 s e +2 a +9 MB.
  - S-09: `/super/sistema` mostra o estado de verdade, e os alertas vão por e-mail.
- **RQ1 a RQ4:** atendidos (evidências no relatório final).
- **Suítes:**
  - typecheck e lint: 8/8;
  - API: 428/428 no PGlite e no Postgres 16;
  - web: 105/105;
  - shared: 177;
  - worker: 21;
  - E2E: 23/23.

### Ressalvas que não impedem o deploy

- Pequenas pendências de UX e de LGPD, listadas no relatório final.
- O V-06 está aberto, com severidade baixa.
- As pendências do dono: P-02 (backup externo), P-09 (2FA do admin) e P-10 (retenção).

### O que muda para quem usa

- **Entrada do superadmin:** passa a ser por `/super/entrar`, não mais por `/entrar`.
- **Entrada da equipe de conteúdo:** passa a ser por `/admin/entrar`.
- **Conteúdo:** a gestão de conteúdo fica em Superadmin › Conteúdo.

### Limite deste veredito

- Produção, VPS e Asaas real não foram verificados nesta sessão.
- A migração `0007` é só aditiva e cria a extensão `pg_trgm`, que é confiável no Postgres 16 e não exige superusuário.
