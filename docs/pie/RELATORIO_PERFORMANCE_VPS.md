# Relatório de performance e VPS

- **Base:** `BANCA_R5_SRE.md`, que tem as medições brutas, os comandos e o horário de cada uma.
- **Escopo da medição:** só leitura na VPS, em 27/10/2026, por volta de 12:55–13:10 UTC. Produção estava no commit `ac6aa67`.
- **Fora do escopo:** testes de carga e deploy. As otimizações sem medição ficam marcadas como **HIPÓTESE**.

## 1. Medições (antes)

| Item | Valor medido |
|---|---|
| Host | 2 vCPU, carga 2,05; RAM 7.936 MB (3.494 disponíveis), **sem swap**; disco 66% (64/97 GB); 45 containers de 12 projetos |
| Containers Fuse (uso / limite de memória) | nginx 7/64 MiB · api 90/512 MiB · worker 49/384 MiB · postgres 84/512 MiB. Sem OOM, sem restart |
| Rede | Só o nginx publica porta, em `127.0.0.1:3600`. O postgres não publica |
| Postgres | 61 MB de banco, 9/40 conexões. Maior tabela: `questoes` (21.872 linhas) |
| API, 24 h | p50 1,2 ms · p95 4,7 ms · p99 19,8 ms. 2.907 das 2.945 requisições são healthcheck. **10 erros, todos em `/api/super/financeiro`** |
| HTTP público | TTFB 0,14 s em `/` e 0,20 s em `/api/saude`. CSP e HSTS presentes, gzip ativo. Assets imutáveis por 1 ano; `sw.js` e `index.html` sem cache |
| Imagens | api 513 MB, worker 551 MB, web 56 MB |
| Backups | 13 dumps, todos do deploy. **O job das 03:30 falhou 3 de 3 vezes** |

## 2. Conclusão de capacidade

- O Fuse Aprova consome pouco da VPS hoje: cerca de 230 MiB somando os 4 containers.
- Não há gargalo de CPU, memória, banco ou rede atribuível a esta app nas medições.
- Os riscos reais são de **confiabilidade**, não de desempenho:
  - backup (A-03, A-05, A-06);
  - alertas (A-07);
  - o erro 500 no financeiro (A-02).

## 3. Correções aplicadas nesta auditoria

| ID | Correção | Antes / depois |
|---|---|---|
| A-02 | `dataSql` nas consultas cruas | 5 rotas com 500 → 200 (Postgres 16 local). Em produção, comprovar depois do deploy: `/api/super/financeiro` deve parar de aparecer nos erros |
| A-03 | Backup roda com `bash` | Não medido em produção (precisa do deploy e da execução das 03:30 seguinte) |
| A-05 | Uploads entram no backup (`arquivos/*.tar.gz`, retenção diária) | Testado localmente com pg_dump falso. Em produção: cerca de 14 MB por dia, 14 cópias, por volta de 200 MB (estimativa) |
| A-15 | `fechar-liga` de hora em hora | +24 execuções por dia, cada uma com uma consulta simples que não encontra grupos abertos (custo desprezível; HIPÓTESE, não medido) |

## 4. Recomendações não aplicadas

Todas são HIPÓTESES ou dependem de aprovação.

- **Limites de CPU e PIDs (A-25):** afetam as outras apps da VPS. Sugestão: `cpus: 1.0` na api, `0.5` no worker e `pids_limit` em todos. Precisa de aprovação do dono.
- **Swap ou revisão dos limites de memória (A-25):** os limites somam cerca de 12,9 GB para 7,75 GB de RAM. Envolve o host inteiro.
- **Postgres recriado em todo deploy (R5-06):** separar o `env_file` do postgres do `.env` que recebe os digests das imagens. Muda o deploy, então pede uma janela própria.
- **Rollback sem pull (R5-09):** o prune global de imagens é do host e afeta todas as apps.
- **Índices (R5-13):** há 24 FKs sem índice, e `tentativas.respondida_em` também não tem. O impacto não foi medido: a maior tabela tem 21 mil linhas e produção tem 1 usuário. Só vale com `pg_stat_statements` (R5-12) ativo.
- **Imagens de 0,5 GB (R5-14):** remover as dependências de desenvolvimento do runtime. Reduz pull e disco, mas não muda o uso de RAM.
- **Pool de conexões (R5-17):** adicionar `idle_timeout`, `connect_timeout` e `statement_timeout`.
- **nginx do host (R5-16):** habilitar HTTP/2 e esconder a versão. É configuração compartilhada do host.
