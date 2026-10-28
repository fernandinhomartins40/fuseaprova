# Contestações e conflitos: painel superadmin

- **Data:** 28/10/2026
- **Commit:** `2f71392`
- **Base:** pareceres R1 a R5 em `docs/pie/super/`.
- **Independência:** cada revisor rodou como subagente próprio, com o mesmo escopo (`ESCOPO_BANCA.md`) e sem acesso aos pareceres dos outros. Os revisores R2, R3 e R4 receberam no meio do trabalho duas mudanças de escopo vindas do dono: o RQ1 revisado e o RQ4. Os cinco foram avisados da revisão do RQ1; o aviso sobre o RQ4 só não chegou ao R5. Todos são o mesmo modelo, então a independência é de contexto, não de modelo.

## C1. Severidade do "superadmin no app de estudo" (R1-01, R3-01, R4-01)

- **Conflito:** o R4 classificou como **Crítica**; o R1 e o R3, como **ALTA**.
- **Decisão: ALTA.** Fere um requisito do dono (RQ1) e a regra "o servidor decide o acesso". Não expõe dados de terceiros e não gera prejuízo financeiro direto, porque a conta é do próprio dono.
- **O que torna o achado mais grave:** a combinação com o R3-02 e o R4-02. A senha sozinha, sem o 2FA, já abre o conteúdo. Esse agravante é registrado no consolidado (S-01).

## C2. Aprovação manual com o valor errado (R3-06 FORTE INDÍCIO × R4-05 CONFIRMADO)

- **Conflito:** o R3 não conseguiu exercitar o caminho, porque o R3-04 o bloqueava. O R4 exercitou o caminho com um único concurso e registrou R$ 197 virando R$ 397.
- **Decisão: CONFIRMADO**, pela prova do R4. O R2-04 mostra o mesmo efeito do lado da tela: a interface promete o valor do pedido.

## C3. Conciliação "Tudo certo" num pedido pago sem liberação (R2-02)

- **Situação:** o R2 concluiu pela leitura do código. O R4 avisou que o Asaas falso dos testes não muda o status da cobrança, e por isso a conciliação de pedido pago mostra uma divergência falsa.
- **Decisão: CONFIRMADO pelo código** (`conciliacao.ts:63-71`): a conciliação só confere o status do pedido e nunca olha `usuarios_concursos`. O efeito ("não libera") também foi provado pelo R3-05 no Postgres 16, que mostrou `siqueira.acesso=false` depois da conciliação.
- **Limite:** a mensagem exata na tela com o Asaas real não foi observada.

## C4. Queda por falta de memória no financeiro (R5-01)

- **Medido:** latência de 2 a 3 s e pico de heap de 278 a 661 MB, com volume sintético de 2 anos.
- **Queda por falta de memória:** reproduzida uma vez, de forma intermitente. Fica **FORTE INDÍCIO**.
- **Severidade mantida em ALTA:** a correção é barata (selecionar só as colunas, agregar no SQL), e a medida de memória já basta.
- **Limite:** o volume de produção hoje é muito menor. A produção ficou bloqueada nesta rodada e não foi medida.

## C5. O papel revelado no login (R1-03)

- **Contestação:** `proximo` só aparece depois de uma senha correta. Quem já sabe a senha conhece a conta, então revelar o papel nessa resposta tem impacto baixo.
- **Decisão:** o que fica como ALTA dentro do R1-03 é a **falta de separação** (RQ2), não a enumeração. A enumeração continua coberta pela regra "portal errado = erro genérico" na correção.

## C6. Corrida no limite diário de comunicação (R1-14, R3-14)

- **Situação:** os dois apontaram a corrida pela leitura do código, sem execução.
- **Decisão:** a corrida fica como **HIPÓTESE**. A falta de reconfirmação foi CONFIRMADA pela leitura. A correção é barata (trava transacional) e entra no plano.

## C7. Escopo da migração de dados (R3, proposta)

- **Proposta do R3:** uma migração que desliga `acesso` da equipe que não tem pedido pago.
- **Contestação:** com a guarda passando a olhar o **papel**, a migração não muda nada na segurança. E alteraria dados de produção pelo deploy, sem aprovação do dono.
- **Decisão:** **sem migração de dados.** A guarda passa a decidir pelo papel, e a troca de papel recalcula o acesso pelos pedidos (S-05). A CLI deixa de ligar `acesso`. Contas de equipe antigas com `acesso=true` ficam inertes: a guarda `acesso` recusa quem não é aluno.

## C8. Limite de usos do cupom: reserva × reação (R3-07)

- **Opções:** o R3 deixou a escolha para o dono.
- **Decisão do Auditor-Chefe:** opção (a), **reserva**. O Pix pendente e não expirado conta para o limite. É a única opção que não deixa o limite estourar, e "limite de usos" significa isso para quem configura. A decisão fica registrada na D24 e muda o texto da D23 ("Pix pendente não conta"). O pagamento já feito é sempre honrado.

## Sem conflito material

- **Os mesmos achados por caminhos diferentes:**
  - o superadmin no app de estudo (R1-01, R3-01, R4-01);
  - o 2FA ausente na guarda `acesso` (R1-02, R3-02, R4-02);
  - o rebaixado que fica com acesso gratuito (R1-06, R3-03, R4-03);
  - o login único (R1-03, R2-05, R4-04);
  - as ações de negócio no `/admin` (R1-04, R2-22, R3-13);
  - a aprovação manual por concurso ativo (R1-09, R2-03, R3-04, R4-06);
  - o pedido pago sem liberação (R2-02, R3-05, R4-08);
  - o reembolso repetido (R1-05, R3-12, R4-09);
  - o cupom acima do limite (R1-10, R3-07);
  - a D21 ausente do painel (R2-08, R3-10);
  - a dependência do `/admin` (R2-01, R3-09).
- **Prova independente:** foram provados de forma independente, com testes próprios no PGlite e no Postgres 16.
