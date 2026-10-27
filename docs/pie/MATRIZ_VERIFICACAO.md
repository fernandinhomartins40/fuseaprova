# Matriz de verificação

- **Base:** `BANCA_R4_QUALIDADE.md` (estado inicial) e as execuções desta auditoria.
- **Ambiente:** Windows 11, Node 24, PGlite e Postgres 16 local descartável, Asaas falso. Commit final: ver RELATORIO_VALIDACAO_FINAL.
- **Métodos:**
  - **T** = teste automatizado executado;
  - **E2E** = Playwright contra a API real e o build de produção;
  - **PG** = suíte da API rodando no Postgres 16 real;
  - **L** = leitura de código;
  - **P** = medição em produção, só leitura (R5).

| ID | Jornada | Estado inicial (R4) | Estado final | Método e evidência |
|---|---|---|---|---|
| J01 | Cadastro | VERIFICADA | VERIFICADA | T (`auth.test.ts`, `telas.test.tsx`), E2E 01 |
| J02 | Login e sessão | VERIFICADA (API) | VERIFICADA (API); UI indireta | T, E2E (login em todos os fluxos) |
| J03 | Recuperação de senha | PARCIAL | PARCIAL | T só na API; UI sem teste (P-05) |
| J04 | Pix, webhook e status | VERIFICADA (Asaas falso) | VERIFICADA com Asaas falso; **sandbox real BLOQUEADO** | T (`pagamento.test.ts`, inclusive 4 casos negativos novos), E2E 01. Sem credencial de sandbox nesta sessão |
| J05 | Onboarding | PARCIAL | PARCIAL | T (`telas.test.tsx`); aviso de push pendente (O-04) |
| J06 | Trilha e guia | VERIFICADA | VERIFICADA | T, E2E |
| J07 | Lição | VERIFICADA | VERIFICADA; retentativa do concluir corrigida sem teste de UI dedicado | T (`licao.test.ts`), E2E 02 |
| J08 | Revisão | VERIFICADA | VERIFICADA | T, E2E |
| J09 | Simulado | VERIFICADA | VERIFICADA | T (+ guarda de concorrência), E2E |
| J10 | Liga | VERIFICADA (regra/API), UI PARCIAL | igual + fechamento recuperável testado | T (`jobs.test.ts` › `semanaAFechar`) |
| J11 | Perfil, conquistas, protetor | PARCIAL | PARCIAL | T (API) |
| J12 | Offline e sync | PARCIAL | **VERIFICADA (API)**; UI PARCIAL | T: 10 testes no início, 12 agora (casos negativos + revisão + lição incompleta); PoCs de R1, R3 e V1 sem ganho; caminho legítimo em 2 lotes aprovado pelo V1 |
| J13 | Push e lembretes | PARCIAL (o SW não exibia) | IMPLEMENTADA, NÃO VERIFICADA em navegador | build contém `importScripts("/sw-push.js")`; simulação Node do SW; T do endpoint |
| J14 | LGPD (exportar e excluir) | PARCIAL | PARCIAL | T só na API; UI sem teste (P-05) |
| J15 | Admin: questões e importação | VERIFICADA; uploads e reports NÃO VERIFICADOS | igual | T (`admin.test.ts`) |
| J16 | Admin: trilhas, concursos, edital | PARCIAL | PARCIAL | T |
| J17 | Admin: usuários e painel | VERIFICADA no PGlite | **FALHA REPRODUZIDA no Postgres real (painel 500) → corrigida → VERIFICADA (PG)** | PG antes 500, depois 200; T: 403 para alvo não aluno |
| J18 | Superadmin | VERIFICADA no PGlite | **FALHA REPRODUZIDA em produção (financeiro 500, P) e no PG (4 rotas) → corrigida → VERIFICADA (PG)** | Logs de produção (R5); PG 266/266 |
| J19 | Arquivos | VERIFICADA (402, traversal) | VERIFICADA | PoC R1 |
| J20 | Worker: jobs | VERIFICADA (teste) | **backup FALHA REPRODUZIDA em produção (P) → corrigido no código → NÃO COMPROVADO em produção** | `jobs_execucoes` 3/3 falhas; T com script bash; precisa da execução das 03:30 depois do deploy |
| J21 | Coletor e importador | VERIFICADA (fixtures) | VERIFICADA (fixtures) | T (147) |
| J22 | Deploy, rollback e HTTPS | n/a | PARCIAL | P (R5); rollback rápido sem pull não existe (A-24) |
| — | Comparação visual com `design/png` | — | **NÃO COMPROVADA** | O teste não compara com `design/png` (A-11) |
