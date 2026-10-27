# Veredito do Auditor-Chefe

- **Escopo:** monorepo Fuse Aprova (api, worker, web/PWA, shared, db, crawler, infra e CI) e produção observada só em leitura.
- **Modo:** AUDITORIA + CORREÇÃO.
- **Data:** 27/10/2026.
- **Ressalva:** aprovação não é garantia de segurança absoluta. Nenhum veredito aqui declara "100% seguro", "LGPD resolvida" ou "VPS otimizada".

## Veredito inicial (commit `6a2cb43`, produção em `ac6aa67`): **REPROVADO**

Havia três bloqueadores confirmados:

1. **A-01: fraude de receita e de regras de jogo.** Uma única requisição de sync offline dava XP, gemas, ofensiva e lições concluídas sem estudo. Foi provada por R1 e R3, de forma independente.
2. **A-02: jornadas essenciais quebradas em produção.** O financeiro do superadmin dava 500 em 10 de 10 chamadas (logs). No Postgres real, mais 4 rotas do super e do admin também davam 500.
3. **A-03: perda de dados possível.** O backup diário nunca rodou (3 de 3 falhas), os uploads ficavam fora do backup, e não havia cópia externa.

O `pnpm test` também falhava (teste instável). Isso bloqueava o deploy sem motivo real.

## Veredito pós-correção (commit `5ca050f` + documentação): **NÃO COMPROVADO**

### O que foi comprovado

Comprovado por execução, ver RELATORIO_VALIDACAO_FINAL:

- **Bloqueadores corrigidos:** os três (A-01, A-02, A-03), mais 25 achados.
- **Cada correção tem prova:** teste que reprova o código antigo, prova de conceito ou comparação antes e depois no Postgres real.
- **Suítes:** typecheck, lint e 659 testes passam; API e worker passam no Postgres 16 real; E2E passa com 21 de 21; a cobertura de linhas do shared é de 100%.
- **Revisão adversarial depois da correção (V1 e V2):** encontrou 5 falhas nas próprias correções. Todas foram corrigidas e provadas de novo.

### Por que não é APROVADO

Faltam evidências obrigatórias (protocolo, seção 2.4):

- **Backup em produção:** a correção só é comprovada pela 1ª execução das 03:30 depois do deploy. A cópia fora da VPS e o restore em produção também não existem (A-06).
- **Pagamento real:** o fluxo nunca foi exercitado contra o sandbox do Asaas (sem credencial nesta sessão).
- **Critério #21 do PRD:** a comparação visual com `design/png` não é comprovada pelo teste existente (A-11).
- **Navegador real:** as notificações push e as telas alteradas não foram testadas em navegador real.

Não há bloqueador conhecido **sem correção** no código. Os pendentes dependem de ambiente, credencial ou decisão do dono.

### Recomendação de liberação

O código corrigido é estritamente melhor que o que está em produção, que tem os bloqueadores A-01, A-02 e A-03 ativos.

- **Recomendação:** publicar, porque o push na `main` já é autorizado pelo dono para o deploy.
- **Migração:** a `0004` só adiciona uma tabela, sem risco para os dados existentes.
- **Backup prévio:** o `deploy.sh` roda um backup antes de migrar.

Depois do deploy, conferir:

1. `/api/super/financeiro` responde 200 e some do log de erros;
2. a execução `backup` das 03:30 fica com `ok` em `jobs_execucoes`, e aparecem `backups/arquivos/fuse_arquivos_*.tar.gz`.

## Decisões pendentes do dono

- **P-02:** destino externo para os backups (com custo) e teste de restore em produção.
- **P-03:** destinatário dos alertas de falha de job e de erro 500.
- **P-09:** exigir 2FA também do papel admin (a liberação manual prevista no PRD continua só com senha).
- **P-08:** limites de CPU, PIDs e memória e swap na VPS compartilhada.
- **P-10:** prazos de retenção da `auditoria` e dos `webhook_eventos` (jurídico ou encarregado).
- **Anular questões:** decisão já registrada na memória do projeto, fora do escopo desta auditoria.
