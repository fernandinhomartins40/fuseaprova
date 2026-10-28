# Plano de resposta a incidentes de segurança com dados pessoais

**Base legal da obrigação:**
- LGPD, art. 48;
- Resolução CD/ANPD nº 15/2024 (Regulamento de Comunicação de Incidente de Segurança).

**Responsável:** o encarregado, Luiz Fernando Martins Oliveira, sócio administrador da FUSE AGENCIA LTDA.

**Versão:** 28/10/2026.

## 1. O que é incidente

Qualquer evento que comprometa a confidencialidade, a integridade ou a disponibilidade de dados pessoais. Exemplos:
- acesso indevido ao banco, à VPS, ao painel ou a uma conta da equipe;
- vazamento do `.env`, como o token do webhook do Asaas, a chave do Asaas ou o `SESSION_SECRET`;
- envio de dados a pessoa errada;
- perda de dados sem backup que permita recuperá-los;
- ransomware ou exclusão em massa.

## 2. Primeiras 24 horas: conter

1. **Registrar.** Anote data e hora, quem percebeu e o que foi visto. Guarde prints e logs.
2. **Conter.** Conforme o caso:
   - **Conta da equipe comprometida:** bloqueie a conta no painel (Usuários › ficha › Bloquear). Isso também derruba as sessões.
   - **Senha do superadmin ou 2FA vazados:** troque a senha e rode `cli superadmin:resetar-2fa` na VPS.
   - **Segredo do `.env` vazado:**
     1. Gere um novo segredo.
     2. Atualize o `.env` na VPS.
     3. No caso do `ASAAS_WEBHOOK_TOKEN`, atualize também o webhook no painel do Asaas. No caso da chave do Asaas, gere outra no Asaas.
     4. Reinicie a stack.
     
     **Troca de `SESSION_SECRET`:** derruba todas as sessões e invalida o 2FA cifrado. Planeje antes de trocar.
   - **Invasão da VPS:** isole o servidor. Restaure a partir de um backup anterior ao incidente numa máquina limpa e troque todos os segredos.
3. **Preservar evidências.** Antes de apagar algo, copie:
   - a tabela `auditoria`;
   - a tabela `registros_acesso`;
   - a tabela `webhook_eventos`;
   - os logs dos containers (`docker compose logs`).

## 3. Até 3 dias úteis: avaliar e comunicar

**Avaliar o risco.** Responda:
- que dados foram afetados (CPF? senha? apenas e-mail?);
- quantos titulares foram atingidos;
- se os dados estavam protegidos (hash, mascarados);
- se há risco ou dano relevante: fraude, golpe por Pix, uso do CPF.

**Comunicar, se houver risco ou dano relevante.** O prazo é de **3 dias úteis** a partir do conhecimento do incidente (Resolução CD/ANPD nº 15/2024, art. 6º).

**À ANPD,** pelo formulário em gov.br/anpd, informando:
- a natureza dos dados;
- os titulares afetados;
- as medidas técnicas de segurança adotadas;
- os riscos;
- as medidas para reverter ou mitigar o incidente;
- o contato do encarregado.

**Aos titulares afetados,** por e-mail, em linguagem simples, dizendo:
- o que houve;
- quais dados foram afetados;
- os riscos;
- o que fizemos;
- o que o titular pode fazer (por exemplo, trocar a senha, desconfiar de Pix ou de mensagem em nome do Fuse Aprova);
- o contato do encarregado.

**Disparo do e-mail:** use o painel, em Comunicação, com o segmento adequado. Se o incidente envolver o painel, mande por fora do painel.

## 4. Depois: corrigir e registrar

- **Causa raiz:** corrija e registre a correção em `docs/DECISOES.md`, com o commit correspondente.
- **Registro interno do incidente:** mantenha-o **mesmo quando não houver comunicação**, por pelo menos 5 anos (Resolução nº 15/2024, art. 10). Guarde num lugar privado, **fora do repositório**, com:
  - data;
  - descrição;
  - dados afetados;
  - avaliação de risco;
  - comunicações feitas;
  - medidas tomadas.
- **Revisão:** revise este plano.

## 5. Contatos úteis

| Quem | Para quê |
|---|---|
| ANPD | gov.br/anpd, para a comunicação de incidente |
| Asaas | suporte pelo painel, para suspender a chave ou o webhook e contestar cobranças |
| Provedor da VPS | painel do provedor, para isolar o servidor, ver snapshots e mudar o acesso de rede |
