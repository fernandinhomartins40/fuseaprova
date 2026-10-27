# Contestações e conflitos: Auditor-Chefe

- **Data:** 27/10/2026
- **Pareceres confrontados:** `BANCA_R1_SEGURANCA.md`, `BANCA_R2_USUARIO.md`, `BANCA_R3_ARQUITETURA.md`, `BANCA_R4_QUALIDADE.md`, `BANCA_R5_SRE.md`.
- **Como os pareceres foram produzidos:** cada revisor foi um subagente separado e recebeu o mesmo inventário inicial, sem acesso às conclusões dos outros. Todos usaram o mesmo modelo, então a independência é de contexto, não de modelo.
- **Como os conflitos foram resolvidos:** com uma nova verificação direcionada, feita por teste executado, e não por votação.

## C1. Fraude no sync offline: severidade divergente (R1-01/R1-02 × R3-01/R3-02)

- **Conflito:**
  - R1 classificou a forja de datas (R1-02) como MÉDIA.
  - R3 classificou o mesmo problema (R3-02) como ALTA.
  - Os dois reproduziram a falha com testes próprios, chegando a números diferentes:

| Revisor | XP | Gemas | Ofensiva |
|---|---|---|---|
| R1 | +1000 | +200 | 11 dias |
| R3 | +5750 | +250 | 30 dias |

- **Verificação:**
  - As duas provas de conceito (scratchpad `r1/test/poc.test.ts` e `r3/sync.test.ts`) leem o mesmo código, `apps/api/src/servicos/offline.ts`.
  - A causa raiz é uma só: o sync confiava no aparelho para dizer qual lição, quais questões e quais datas valiam.
- **Decisão:** um achado consolidado, **A-01, de severidade ALTA**.
  - A ofensiva, as gemas e a liga são parte da regra comercial do produto (PRD 6).
  - Qualquer pagante consegue forjá-las com uma única requisição.
- **Estado:** corrigido (`5c264ef`).
  - As provas de conceito do R1, executadas de novo contra o código corrigido, deram 0 XP, 0 gemas e ofensiva 0.

## C2. "Superadmin VERIFICADO" (R4) × "financeiro falha em 100% em produção" (R5)

- **Conflito:**
  - R4 marcou as jornadas do superadmin como VERIFICADAS, porque os testes passam.
  - R5 encontrou nos logs de produção 10 de 10 chamadas a `/api/super/financeiro` com erro 500.
- **Verificação direcionada:**
  - Subi um Postgres 16 real e descartável no scratchpad e rodei as rotas pelo driver de produção (postgres.js).
  - Antes da correção, **5 rotas** respondiam 500, e não só a que o R5 tinha visto: `superFinanceiro`, `superUsuariosListar` com filtro de atividade, `superUsuarioObter`, `superComunicacaoPrevia` e `adminPainel`.
- **Decisão:**
  - Os dois revisores estavam certos dentro do método de cada um. O verde do R4 só valia para o PGlite; não comprovava produção.
  - Achado **A-02, ALTA, CONFIRMADO**.
  - O estado do R4 para essas jornadas foi rebaixado para FALHA REPRODUZIDA até a correção.
- **Estado:**
  - Corrigido (`fa6b6a3`).
  - Prova depois da correção: as mesmas rotas respondem 200, e a suíte da API passou com 266 de 266 testes no Postgres real.
  - O CI passou a rodar a API e o worker num Postgres 16 real.

## C3. Backup: "não é cifrado" (R1-14) × "não roda" (R5-01)

- **Conflito:** o R1 avaliou a qualidade do backup (sem cifra e sem cópia fora da VPS). O R5 provou que o job diário **nunca funcionou**: 3 de 3 execuções falharam com `Illegal option -o pipefail`.
- **Decisão:**
  - A falha do R5 é anterior e mais grave: **A-03, CRÍTICA**.
  - O R1-14 continua como pendência separada (cifra e cópia externa), porque depende de um destino externo e de custo, ou seja, de decisão do dono.
- **Estado:**
  - Corrigido no código (`bash` no lugar de `sh`, e uploads incluídos no backup).
  - **Não comprovado em produção.** A correção só vale depois do deploy e da primeira execução às 03:30.

## C4. Liberação manual pelo admin: falha de segurança (R1-05) × requisito do PRD

- **Conflito:** o R1 apontou a liberação de acesso sem pedido, feita só com senha, como via de acesso grátis. Só que o PRD prevê essa liberação manual pelo admin.
- **Decisão:**
  - A regra comercial foi mantida, porque mudá-la exige decisão do dono.
  - A parte objetivamente indevida foi corrigida: o admin não pode mais agir sobre contas de admin ou superadmin. Antes, derrubava as sessões do superadmin.
  - Revogar o acesso agora também derruba as sessões abertas. O R4-05 suspeitava que não derrubava.
- **Pendente para o dono:** exigir 2FA também para o papel admin.

## C5. "XP a cada resposta infla a liga" (R2-20, HIPÓTESE)

- **Verificação:** o XP online é creditado por resposta correta numa sessão aberta pelo servidor, que sorteia as questões. Recomeçar uma lição significa responder questões novas de verdade, o que é estudo legítimo.
- **Decisão:** **NÃO REPRODUZIDO** como fraude. A fraude real de XP estava no offline (C1) e foi corrigida.

## C6. Pagamento "VERIFICADO" (R4) × sandbox nunca exercitado (R4-06) × Pix vencido não cancelado (R2-05)

- **Decisão:**
  - O fluxo foi verificado contra o Asaas falso, mas o comportamento real do Asaas está **NÃO COMPROVADO**. Faltam credenciais de sandbox nesta sessão, e cobrança real exige autorização.
  - O R2-05 (Pix vencido que continua pagável no Asaas) fica como HIPÓTESE.
  - O risco financeiro dele foi reduzido por duas correções:
    - **Pix duplicado:** a trava impede dois Pix simultâneos.
    - **Estorno:** o acesso não é mais revogado quando o aluno tem outro pedido pago (A-04).

## C7. Teste instável (R4-01) × ruído de carga (R2)

- **Decisão:** o mesmo fato, a 1ª consulta `findBy` estourando 4 s sob carga, conta como achado de qualidade (**A-10, MÉDIA**). Ele derrubava o `pnpm test` e fazia o turbo abortar a API.
- **Estado:** corrigido (limite de 15 s). Precisa de uma nova rodada completa para comprovar, registrada no RELATORIO_VALIDACAO_FINAL.

## C8. Comparação visual (R4-02) × ACEITE #21 marcado ✅

- **Decisão:** procede.
  - O teste compara o app com capturas do próprio app, e não com `design/png`.
  - No Linux do CI não há linha de base, então o teste passa sem nenhum `expect`.
  - O critério #21 fica **NÃO COMPROVADO**.
- **Por que não foi corrigido agora:** gerar e versionar a linha de base Linux a partir de `design/png` exige rodar no runner Linux e uma decisão sobre a tolerância aceitável. Ficou como pendência registrada (P-06).

## C9. Concorrência que o PGlite não reproduz (R3-04, R3-06, R3-08)

- **Conflito de método:** o PGlite serializa as consultas. Por isso o teste novo de "dois simulados simultâneos" **passa também no código antigo** e não serve como prova.
- **Decisão:**
  - Os itens continuam como FORTE INDÍCIO.
  - As correções foram aplicadas por raciocínio: trava da linha do aluno e update otimista.
  - O teste ficou como guarda de comportamento, não como prova.
  - Com o novo passo de Postgres real no CI, a suíte pode receber testes de corrida de verdade.
