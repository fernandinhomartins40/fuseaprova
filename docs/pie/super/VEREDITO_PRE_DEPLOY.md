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

## Veredito pós-correção

Pendente: será emitido depois das correções e da revalidação (`RELATORIO_VALIDACAO_FINAL.md`).
