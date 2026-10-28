# Validação final: painel superadmin

- **Data:** 28/10/2026
- **Partida:** `2f71392`, com o veredito REPROVADO.
- **Revalidação adversarial da API:** [REVALIDACAO_API.md](REVALIDACAO_API.md).
- **Correções:** Lotes 1 a 3 e os ajustes da revalidação, descritos na D24 e na D25 (`docs/DECISOES.md`).

## Requisitos do dono

| Req. | Situação | Evidência |
|---|---|---|
| **RQ1:** o superadmin fica fora do app de estudo, a gestão de conteúdo vira uma seção do `/super` e o admin fica restrito | **ATENDIDO** | <ul><li>A matriz de guardas cruzou 148 rotas com 6 personas e não teve violação (REVALIDACAO §1).</li><li>`d24.test.ts` › guardas por capacidade: o estudo dá 403 para admin e para superadmin.</li><li>Na web, a seção `/super/conteudo/*` usa o layout do `/super` e a sidebar muda conforme o papel (`super/testes/d24.test.tsx`).</li><li>E2E 05: o admin entra direto no Conteúdo, sem ver Pagamentos, e `/admin/*` redireciona.</li></ul> |
| **RQ2:** logins separados | **ATENDIDO** | <ul><li>Três endpoints e três páginas: `/entrar`, `/admin/entrar` e `/super/entrar`.</li><li>Entrar pelo portal errado dá o mesmo erro genérico de credenciais (`d24.test.ts`, `painel.test.tsx`).</li><li>E2E 10: o admin e o superadmin não entram pelo portal do outro nem pelo do aluno.</li><li>O convite tem página própria.</li></ul> |
| **RQ3:** o painel está completo e funcionando | **ATENDIDO, com ressalvas** | <ul><li>Todas as rotas `/super` têm contrato e teste.</li><li>Sistema mostra o estado de verdade, com alertas por e-mail.</li><li>A D21 e o cupom aparecem nas telas.</li><li>CSV sem corte silencioso.</li><li>Convite pode ser reenviado e cancelado.</li><li>As ressalvas estão na lista abaixo.</li></ul> |
| **RQ4:** Estornar e Liberar acesso no pagamento | **ATENDIDO** | <ul><li>Os botões Liberar acesso, Aprovar pagamento manual e Estornar ficam na tela do pagamento e agem sobre ele.</li><li>O estorno é feito uma vez só, mesmo com dois cliques em paralelo, e revoga só o concurso do pedido.</li><li>Testes: `d24.test.ts` (RQ4 com dois concursos), `super/testes/d24.test.tsx` (quando cada botão aparece) e o E2E 09 (aprovação manual no desktop e no celular).</li></ul> |

## Achados S-01 a S-28

| Faixa | Situação |
|---|---|
| S-01 a S-11, S-13 a S-18, S-20 a S-24 | **CORRIGIDOS.** A revalidação adversarial testou API e worker; o S-12 ficou corrigido depois do V-03. |
| S-12 | **CORRIGIDO** (V-03, trava do cupom) |
| S-04, S-19, S-25, S-27 (web) | **CORRIGIDOS**, com as ressalvas abaixo. Evidência: testes de UI e o build da PWA (cerca de 35 arquivos e 350 KB fora do precache do aluno). |
| S-28 (testes) | **CORRIGIDO.** <ul><li>A API foi de 299 para 428 testes, a web de 74 para 105 e o E2E de 21 para 23.</li><li>Os helpers entram pelo portal de cada papel.</li></ul> |

## Achados novos da revalidação

V-01, V-02, V-03, V-04 e V-07 foram corrigidos, cada um com teste. O V-05 ficou aceito como informativo. O V-06 ficou aberto, com severidade baixa. O detalhe está em REVALIDACAO_API §7.

## Ressalvas (sem bloqueio)

- **Telas de Conteúdo no celular:** Questões, Importação e Concursos ainda são tabelas com rolagem lateral, sem virar cartões. O editor de questão não avisa quando há alterações não salvas.
- **Conciliação em lote:** continua existindo em dois lugares, Pagamentos e Conta Asaas (R2-16). As duas mostram a mensagem parcial do S-20.
- **Auditoria:** não tem exportação em CSV.
- **Convite:** reenviar e cancelar pedem motivo, mas não pedem reconfirmação. Cancelar apaga a conta convidada, que nunca teve senha.
- **Equipe sem reconfirmação:** revogar as sessões e desbloquear uma conta da equipe não pedem reconfirmação.
- **LGPD:** a anonimização não toca nos textos livres do pagamento manual (motivo, observação e referência) nem nos comprovantes. Depende da P-10, que é decisão jurídica.
- **Cortesia:** liberar um concurso sem pedido continua possível para o superadmin. É uma decisão de negócio do dono (D24) e fica auditada.

## Suítes no commit final

| Suíte | Resultado |
|---|---|
| `pnpm typecheck` | 8/8 |
| `pnpm lint` | 8/8 |
| API (PGlite) | 428/428 |
| API (Postgres 16) | 428/428 |
| Web | 105/105 |
| Shared | 177/177, 100% das linhas |
| Worker | 21/21 |
| DB | 24/24 (PGlite) |
| `pnpm test` (raiz, como no CI) | 6/6 tarefas |
| E2E Playwright | 23/23 |

## O que não foi validado

- **Produção e VPS:** o acesso ficou bloqueado nesta sessão.
- **Asaas real:** não há credencial de sandbox, então só o cliente falso foi usado.
- **Desempenho:** foi medido com volume sintético no Postgres local (S-08), não na VPS.
- **Planilhas:** os CSVs não foram abertos no Excel nem no LibreOffice.
- **Workers:** não foi testado o cenário com dois workers rodando ao mesmo tempo.
