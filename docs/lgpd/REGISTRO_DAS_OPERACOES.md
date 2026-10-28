# Registro das operações de tratamento de dados pessoais

**Base legal da obrigação:** LGPD, art. 37. **Versão:** 28/10/2026, D26 em `docs/DECISOES.md`.

Documento interno da empresa. Tem que bater com a [Política de privacidade](../../apps/web/src/telas/Legal.tsx) publicada em `/privacidade`. Se mudar a coleta, o compartilhamento ou um prazo, atualize os dois e a `VERSAO_TERMOS_ATUAL`.

## 1. Agentes de tratamento

| Papel | Quem |
|---|---|
| Controlador | **FUSE AGENCIA LTDA**, CNPJ 42.761.086/0001-15, Rua Antonio Gregorio Ferreira, 298, Conradinho, Guarapuava/PR, CEP 85055-270. Microempresa. |
| Encarregado | Luiz Fernando Martins Oliveira, sócio administrador. Atende pelo e-mail de privacidade publicado na política (`VITE_PRIVACIDADE_EMAIL` ou o e-mail do suporte). |
| Operadores | Asaas (pagamento Pix); provedor de hospedagem da VPS; provedor de e-mail transacional (SMTP); serviços de push dos navegadores e aparelhos (Google, Apple, Mozilla); GitHub (código e build, sem dados de alunos). |

**Porte:** a empresa é agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022). Mesmo assim, mantemos este registro, o canal do encarregado e o plano de incidentes.

## 2. Operações

| # | Operação | Titulares | Dados | Finalidade | Base legal (LGPD) | Onde fica | Compartilhado com | Prazo de guarda |
|---|---|---|---|---|---|---|---|---|
| 1 | Cadastro e conta | alunos e equipe | nome, e-mail, celular, CPF, hash da senha, aceite e versão dos termos | prestar o serviço contratado | art. 7º, V (contrato) | `usuarios` | — | enquanto a conta existir; na exclusão, anonimização imediata (`servicos/lgpd.ts`) |
| 2 | Pagamento Pix | alunos | nome, CPF, e-mail, celular, valor, cupom, status | cobrar e liberar o acesso | art. 7º, V e II (contrato; obrigação fiscal) | `pedidos`, Asaas | Asaas | mínimo de 5 anos (CTN, arts. 173 e 174; CDC, art. 27). Os dados pessoais saem na exclusão da conta |
| 3 | Avisos do Asaas (webhook) | alunos | corpo do evento de pagamento | conciliar pagamento e prevenir fraude | art. 7º, V e IX | `webhook_eventos` | — | 5 anos (`limpezaLegal`) |
| 4 | Estudo e gamificação | alunos | respostas, XP, ofensiva, vidas, gemas, revisões, simulados, liga | o produto em si | art. 7º, V | tabelas de estudo | — | enquanto a conta existir; depois, sem identificação, só estatística |
| 5 | Registros de acesso | alunos e equipe | data, hora, IP, porta de origem, navegador | obrigação do Marco Civil | art. 7º, II (Lei 12.965/2014, art. 15) | `registros_acesso` | autoridades, só com ordem judicial | 6 meses (`limpezaLegal`). Ficam mesmo depois da exclusão da conta |
| 6 | Sessões | alunos e equipe | token (hash), IP, navegador | manter o login | art. 7º, V | `sessoes` | — | até expirar (12 h para o superadmin) |
| 7 | Segurança e auditoria | equipe; alvos das ações | quem fez, ação, alvo, IP, motivo, antes e depois | prevenir fraude e responsabilizar a equipe | art. 7º, IX (legítimo interesse) e art. 10 | `auditoria` | — | 5 anos (`limpezaLegal`). Na exclusão, os dados pessoais do titular saem dos registros |
| 8 | Limite de tentativas | quem tenta entrar | e-mail e IP dentro da chave do balde | evitar força bruta | art. 7º, IX | `limites_contagem` | — | até a janela vencer (15 min) |
| 9 | E-mails transacionais | alunos e equipe | nome, e-mail | recibo, recuperação de senha, convite, alertas | art. 7º, V | provedor SMTP | provedor SMTP | não guardamos cópia do corpo |
| 10 | Lembretes e comunicações | alunos que aceitaram | nome, e-mail, inscrição de push | engajamento | art. 7º, I (consentimento, revogável) | `push_inscricoes`, `comunicacoes_envios` | serviços de push e provedor SMTP | até revogar ou a inscrição expirar |
| 11 | Pagamento manual | alunos | forma, referência, observação, comprovante (arquivo) | registro contábil de pagamento recebido por fora | art. 7º, II e V | `pedidos`, `ARQUIVOS_DIR/comprovantes` | — | mínimo de 5 anos (fiscal). Não entra na anonimização por ser prova contábil |
| 12 | Erros da API | — | rota, método e código, sem dado pessoal | operação | — | `erros_api` | — | 30 dias |
| 13 | Backups | todos | cópia do banco e dos arquivos | continuidade | art. 7º, IX e art. 46 | VPS (e cópia externa, quando a P-02 for feita) | provedor de hospedagem | até 8 semanas |

## 3. Medidas de segurança (art. 46)

- **Transporte e senhas:** HTTPS em tudo e senhas com hash forte.
- **Sessão:** cookie `httpOnly` e `secure`.
- **Administração:** 2FA obrigatório para o superadmin e reconfirmação nas ações sensíveis.
- **Login:** papéis separados por portal e limite persistente de tentativas.
- **Auditoria:** registro de toda ação da equipe.
- **Dados expostos:** CPF mascarado nas telas e nada de dado pessoal em log de erro.
- **Backups:** diários e semanais.
- **Infraestrutura:** banco e API sem porta exposta na internet, só o nginx.

## 4. Direitos dos titulares (art. 18)

| Direito | Como atender | Prazo |
|---|---|---|
| Acesso e portabilidade | autoatendimento em Perfil › Configurações › Baixar meus dados (JSON com perfil, pedidos, estudo e registros de acesso). Pelo superadmin: Usuários › ficha › Exportar | imediato (pela lei, até 15 dias, art. 19, II) |
| Correção | o próprio aluno, em Perfil; ou o superadmin, na ficha | até 15 dias |
| Eliminação | autoatendimento em Excluir conta; ou o superadmin, na ficha (anonimiza) | imediato |
| Revogação do consentimento | Configurações (lembretes) e permissões do aparelho | imediato |
| Informação sobre compartilhamento | a política, seção 5 | — |

**Pedidos pelo e-mail do encarregado:** antes de atender, confirme que a mensagem veio do e-mail cadastrado na conta. Registre o pedido e a resposta.

## 5. Pendências

- **P-02:** cópia externa dos backups. Quando for contratada, inclua o provedor como operador nesta tabela e na política.
- **E-mail de privacidade:** o endereço publicado precisa existir e ser lido pelo encarregado.
- **Revisão anual:** revise este registro e a política uma vez por ano, ou a cada mudança relevante.
