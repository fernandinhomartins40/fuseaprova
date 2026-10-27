# Oportunidades de produto

- **Base:** `BANCA_R2_USUARIO.md`, a leitura do PRD e o inventário.
- **Público:** candidato ao concurso de Palmital (banca FAU), que estuda pelo celular, tem pouco tempo e pagou R$ 397 à vista.
- **Ordem do protocolo:** ELIMINAR → JUNTAR → AUTOMATIZAR → ANTECIPAR → CRIAR.
- **Classificação:** "Fundamentada" quer dizer que há evidência no código ou num teste; "Hipótese" ainda precisa ser validada com usuários.

| # | Tipo | Oportunidade | Evidência | Impacto | Esforço | Status |
|---|---|---|---|---|---|---|
| O-01 | ELIMINAR | Refresh ou botão voltar no meio da lição sorteia tudo de novo e perde o que foi respondido. Retomar a sessão aberta do servidor elimina o retrabalho | R2-08 (`estudo.ts:230-278`, `Licao.tsx:95-99`) | Alto (o aluno perde o progresso da lição) | Médio | Fundamentada; pendente P-07 |
| O-02 | AUTOMATIZAR | Rede caindo no meio da lição online: trocar automaticamente para o pacote offline, em vez de parar | R2-07 (`motor.ts:79-97`) | Alto em celular com sinal fraco | Médio | Fundamentada; pendente P-07 |
| O-03 | ANTECIPAR | Confirmar antes de iniciar o simulado de 4 h, mostrando a duração e que o relógio corre no servidor | R2-10 (`Simulado.tsx:131-140`) | Médio | Baixo | Fundamentada; pendente |
| O-04 | ANTECIPAR | Aviso de push negado ou indisponível (iPhone sem o app instalado), com o passo a passo para instalar a PWA | R2-09 (`Onboarding.tsx:51-71`) | Médio (lembretes sustentam a ofensiva) | Baixo | Fundamentada; pendente |
| O-05 | ELIMINAR | Proteger o editor de questão do admin contra navegação ou 401 com alterações não salvas (rascunho local) | R2-11 (`EditorQuestao.tsx:188,328`) | Médio (retrabalho de curadoria) | Baixo | Fundamentada; pendente |
| O-06 | JUNTAR | Depois do login, voltar à página onde a sessão expirou | R2-14 | Baixo | Baixo | Fundamentada; pendente |
| O-07 | ANTECIPAR | Explicar o arrependimento de 7 dias e o reembolso na tela de excluir conta | R2-21 | Médio (confiança e Procon) | Baixo | Fundamentada; texto depende do jurídico |
| O-08 | AUTOMATIZAR | Alerta automático ao dono quando um job falha ou a API devolve 500, por e-mail via SMTP já configurado. Teria evitado dias de backup quebrado e de financeiro fora do ar | R5-01, R5-04, R5-05 | Alto (operação) | Baixo/médio | Fundamentada; pendente P-03 |
| O-09 | CRIAR | Mostrar no `/super/sistema` a idade do último backup bem-sucedido, em vermelho acima de 26 h | R5-01 (`ULTIMO_BACKUP` já é lido pelo `/super/sistema`) | Alto (operação) | Baixo | Fundamentada; pendente |
| O-10 | ANTECIPAR | Acessibilidade: deixar as zonas de promoção e rebaixamento da liga visíveis ao leitor de tela | R2-17 | Baixo | Baixo | Fundamentada; pendente |
| O-11 | JUNTAR | Confirmação também para cancelar comunicação e encerrar sessão no super, como as outras ações (`AcaoConfirmada`) | R2-18 | Baixo | Baixo | Fundamentada; pendente |

**Já implementadas nesta auditoria**, por serem falhas e não apenas oportunidades:
- **Pix e pagamento:** Pix pago no limite (R2-04) e cópia do código Pix (R2-15).
- **Saída e lição:** sair com a fila offline pendente (R2-06) e concluir a lição sem perder o progresso (R2-02).
- **Simulado:** entrega automática do simulado (R2-03) e nota de revisão (R2-12).
- **Cadastro e notificações:** celular colado com +55 (R2-13) e notificações push visíveis (R2-01).
