# Plano mestre: painel superadmin

**Prioridade de execução:**
1. acesso gratuito e bypass de receita;
2. os requisitos do dono (RQ1, RQ2, RQ4);
3. a integridade de pagamento;
4. a operação;
5. a UX.

O detalhe de cada achado está em [ACHADOS_CONSOLIDADOS.md](ACHADOS_CONSOLIDADOS.md).

## Desenho adotado (D24)

### Papéis por capacidade

Um ponto único no `@fuse/shared` substitui o `ehAdmin`:
- `aluno` estuda;
- `admin` cuida do conteúdo;
- `superadmin` cuida do conteúdo e do negócio.

### Guardas da API

| Guarda | Quem passa | Rotas |
|---|---|---|
| `acesso` | só o papel `aluno`, com pagamento (402) | conteúdo do aluno. A equipe recebe 403. |
| `aluno` (nova) | só o papel `aluno` | pagamento, cupom, `/me/concursos`, exportar e excluir conta |
| `login` | qualquer papel | `/me`, senha, sair |
| `conteudo` (antiga `admin`) | `admin`, ou `superadmin` com 2FA | gestão de conteúdo |
| `superadmin` | sem mudança | negócio |

A manutenção e os arquivos deixam de usar o `ehAdmin`.

### Rotas de negócio que saem do `/admin`

Painel com receita, pedidos, reembolso, usuários, liberar e revogar, sessões e auditoria. O superadmin já tem equivalentes no `/super`. Liberar e revogar ganham rotas próprias no `/super`, **por concurso**.

### Logins

| Endpoint | Página | Quem entra |
|---|---|---|
| `POST /auth/login` | `/entrar` | aluno |
| `POST /auth/login/conteudo` | `/admin/entrar` | admin |
| `POST /auth/login/super` | `/super/entrar` | superadmin |

- **Portal errado:** a mesma mensagem genérica de credenciais.
- **Limite de tentativas:** um só, por IP e por e-mail, compartilhado entre os três.
- **Recuperação:** é única, mas a redefinição devolve a área da conta, e a tela leva à página de login certa.
- **Convite:** tem página própria.
- **Sair:** volta à página de login do papel.
- **App nativo:** só tem o login de aluno.

### Painel único

- **Conteúdo dentro do `/super`:** a gestão de conteúdo vira a seção `/super/conteudo/*`, no layout do `/super`, com a sidebar filtrada pelo papel.
- **Admin restrito:** entra direto em `/super/conteudo`, e `/admin/*` redireciona para lá.
- **Telas duplicadas:** as telas de negócio do `/admin` saem.

### RQ4 por pedido

| Ação | Quando aparece | O que faz |
|---|---|---|
| **Liberar acesso** | pedido pago sem o concurso liberado | libera o concurso do pedido |
| **Aprovar pagamento manual** | pedido pendente ou vencido | primeiro consulta o Asaas. Se não estiver pago lá, marca **este** pedido como pago (manual), com o valor e o concurso dele, e recebe em dinheiro ou cancela no Asaas. A opção "não mexer" sai. |
| **Estornar** | pedido pago | no Asaas, faz o estorno com trava, sem repetir. No manual, desfaz. Revoga só o concurso do pedido. |

As três ações valem só para aluno e nunca para a própria conta. Todas pedem reconfirmação e motivo e entram na auditoria.

### Dados

- **Sem migração de dados de produção.** As guardas olham o papel; ver C7.
- **Migrações:** só aditivas, quando forem necessárias (alertas e tentativas de login).
- **Cupom:** o limite de usos passa a contar o Pix pendente que ainda não expirou, como reserva (C8).
- **Alertas:** vão por e-mail para os superadmins ativos, usando o SMTP que já existe.

## Execução por lotes

| Lote | Achados | Escopo | Estado |
|---|---|---|---|
| 1 | S-01, S-02, S-03 (API), S-04 (API), S-05, S-06, S-07, S-10, S-13, S-14 (API), S-23, S-24, S-28 (helpers) | papéis e guardas, logins, rotas de negócio, RQ4, D21 nos contratos do super | a fazer |
| 2 | S-08, S-09, S-11, S-12, S-15, S-16, S-17 (API/worker), S-18, S-20, S-21, S-22, S-26 | operação, alertas, segurança restante, desempenho | a fazer |
| 3 | S-03, S-04, S-06, S-07, S-14, S-17, S-19, S-25, S-27 (web) | painel único com Conteúdo, 3 páginas de login, convite, botões do RQ4, telas | a fazer |
| 4 | S-28 | E2E, documentação (D24, DEPLOY) e revalidação adversarial | a fazer |

## Pendências que dependem do dono

Herdadas da auditoria anterior e não resolvidas aqui:

| ID | Pendência | Por que depende do dono |
|---|---|---|
| P-02 | Cópia externa dos backups e teste de restore em produção | tem custo e precisa de credencial |
| P-09 | 2FA também para o admin | ainda não decidido. Com o S-02 corrigido, o admin perde todo poder sobre o negócio, o que reduz o risco. |
| P-10 | Prazo de retenção da auditoria | é decisão jurídica |
