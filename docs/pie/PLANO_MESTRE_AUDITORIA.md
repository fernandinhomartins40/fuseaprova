# Plano mestre da auditoria

Prioridades usadas nesta tabela:
1. vulnerabilidade, bypass de receita e perda de dados;
2. jornada essencial quebrada;
3. regressão e confiabilidade;
4. produto e infraestrutura.

O detalhe de cada achado está em [ACHADOS_CONSOLIDADOS.md](ACHADOS_CONSOLIDADOS.md).

## Executado

| ID | Categoria | Problema comprovado | Evidência | Impacto | Prob. | Prior. | Correção | Teste de aceite | Estado |
|---|---|---|---|---|---|---|---|---|---|
| A-03 | Dados | Backup diário nunca rodou | `jobs_execucoes` 3/3 falhas | Perda de dados sem recuperação | Certa | P0 | `bash` no spawn | `jobs.test.ts` (script com `pipefail`/`mapfile`) + 1ª execução 03:30 em produção | Feito; produção pendente |
| A-05 | Dados | Uploads fora do backup | `backup.sh` | Restore incompleto | Certa | P0 | tar.gz + retenção | execução local (scratchpad `bkp/`) | Feito |
| A-01 | Receita/regra | Fraude de XP, gemas, ofensiva e lição no sync | PoC R1 e R3 | Liga, gemas e ofensiva sem valor | Alta (1 requisição) | P0 | Pacote registrado, ordem, assunto, unicidade, janela de datas | 3 testes novos + PoC R1 com 0 de ganho | Feito |
| A-02 | Jornada (super/admin) | 5 rotas 500 com o driver de produção | Logs de produção + Postgres 16 local | Painéis de receita e gestão fora do ar | Certa | P0 | `dataSql` | API 266/266 no Postgres real + passo novo no CI | Feito |
| A-04 | Receita | Estorno revogava o acesso com outro pago; Pix duplo | Teste reprova o código antigo | Aluno pagante bloqueado; cobrança dupla | Média | P1 | Trava + checagem de outro pedido pago | `pagamento.test.ts` | Feito |
| A-28 | Receita | Valor do webhook não conferido | PoC R1-04 | Acesso por valor menor | Baixa (precisa do token) | P2 | `valor_divergente` | `pagamento.test.ts` | Feito |
| A-12 | Autorização | Admin agia sobre superadmin | PoC R1-05 | Negação de serviço ao dono | Média | P1 | `exigirAlvoAluno` | `admin.test.ts` | Feito |
| A-27 | SSRF | Push para a rede interna | PoC R1-06 | POST cego interno | Baixa | P1 | Lista de hosts de push | `social.test.ts`, `contratos.test.ts` | Feito |
| A-08 | Jornada | Push não exibido | Leitura do SW gerado | Lembretes inúteis | Certa | P1 | `sw-push.js` | Build contém `importScripts` | Feito; falta navegador real |
| A-09 | Jornada | Concluir lição repetível perdia a conclusão | `Licao.tsx` | Progresso perdido | Média | P1 | TENTAR DE NOVO conclui a mesma sessão | typecheck + E2E da lição | Feito |
| A-10 | Regressão | Teste instável derrubava o CI | Log da linha de base | Deploy bloqueado à toa | Média | P1 | `asyncUtilTimeout` de 15 s | `pnpm test` completo | Feito |
| A-14/15/16 | Integridade | Corridas no worker e no simulado | Leitura (FORTE INDÍCIO) | Ofensiva, liga, simulado | Baixa | P2 | Update otimista, `semanaAFechar`, trava | `jobs.test.ts`, `revisao-simulado.test.ts` | Feito |
| A-17/18/19/29 | UX | Mensagens falsas e laços | Leitura | Confusão e perda de respostas | Média | P2 | Ver commits | typecheck, lint e testes web | Feito |

## Pendente

| ID | Prior. | O que falta | Motivo de não executar agora |
|---|---|---|---|
| P-01 (A-03) | P0 | Deploy e conferência da execução das 03:30 (`jobs_execucoes`) | O push na `main` dispara o deploy (autorizado pela memória do dono); a conferência só pode ser feita no dia seguinte |
| P-02 (A-06) | P0 | Cópia do backup fora da VPS + teste de restore em produção | Exige destino externo, credencial e custo, ou seja, decisão do dono |
| P-03 (A-07, O-08, O-09) | P1 | Alerta de falha de job e de 5xx por e-mail; idade do backup no `/super/sistema` | Precisa do destinatário e do canal |
| P-04 (A-13) | P1 | Atualizar dependências com CVE (majors) | Regressão ampla; precisa de janela própria |
| P-05 (A-23) | P2 | Testes funcionais das 15 rotas restantes e da UI de LGPD, push e recuperação | Volume; não bloqueia |
| P-06 (A-11) | P1 | Linha de base visual Linux a partir de `design/png` com tolerância definida | Precisa do runner Linux e de decisão de tolerância |
| P-07 (A-21/22) | P2 | Retomar sessão, offline automático, confirmações de UX | Mudança de fluxo maior |
| P-08 (A-24/25/26) | P2 | Limites de CPU, PIDs e memória, swap, env do postgres, root e SSH | Infraestrutura compartilhada; pede aprovação |
| P-09 (A-12) | P2 | 2FA também no papel admin | Regra comercial e operacional do dono |
| P-10 (A-31) | P2 | Retenção e anonimização de `auditoria` e `webhook_eventos` | Prazo é decisão jurídica |
