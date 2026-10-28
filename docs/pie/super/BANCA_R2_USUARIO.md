# Banca R2: usuário adversarial (produto e UX) do painel superadmin

**Data:** 28/10/2026 · **Commit:** `2f71392` (main) · **Revisor:** R2 · **Modo:** somente auditoria. Nenhum arquivo do projeto foi alterado além deste parecer.

> **Origem da evidência.** **Não cliquei numa interface real.** Não subi a API nem a web e não rodei o Playwright. As provas vêm de duas fontes:
> - **leitura do código**, com arquivo:linha citados;
> - **testes vitest meus**, no scratchpad (`r2/r2.test.tsx`), que renderizam as telas do `/super` com o `simularFetch` e o `renderizarSuper` do projeto.
>
> Os textos entre aspas foram copiados do código ou lidos pelo teste no DOM do jsdom, não numa tela.
>
> **Estados:**
> - **CONFIRMADO:** reproduzido por teste meu ou caminho determinístico lido de ponta a ponta;
> - **FORTE INDÍCIO:** depende de algo que não executei (navegador real, Asaas);
> - **HIPÓTESE:** precisa ser validada com o dono.

---

## 1. Resumo dos achados

| ID | Sev. | Estado | Arquivo:linha | Uma linha |
|---|---|---|---|---|
| R2-01 | ALTA | CONFIRMADO (teste) | `super/telas/Precos.tsx:178`; `super/telas/UsuarioFicha.tsx:344, 358`; `super/Layout.tsx:244-246, 297-300` | Três ações do `/super` dependem de rotas do `/admin`: a lista de concursos do cupom, liberar acesso e revogar acesso. O menu também leva ao `/admin`. Com o RQ1, elas quebram. O select do cupom quebra **em silêncio** |
| R2-02 | ALTA | CONFIRMADO (código) | `super/telas/PagamentoDetalhe.tsx:132-137`; `api/src/servicos/conciliacao.ts:63-65` | **RQ4.** Com um pedido pago sem o concurso liberado, não há nenhum botão que resolva. "Conciliar" responde "Tudo certo: o pedido bate com o Asaas." e não libera nada |
| R2-03 | ALTA | CONFIRMADO (teste + código) | `UsuarioFicha.tsx:141`; `PagamentoDetalhe.tsx:132`; `api/src/servicos/pagamentoManual.ts:61-63` | **D21.** "Aprovar pagamento manual" some se o aluno já tem algum pedido pago ou acesso a qualquer concurso. Assim, não dá para aprovar por fora o 2º concurso. Mesmo quando aparece, ela vale para o concurso **ativo**, e o painel não diz qual é |
| R2-04 | ALTA | CONFIRMADO (teste + código) | `PagamentoDetalhe.tsx:241`; `super/acoes.tsx:644-645`; `pagamentoManual.ts:55, 96` | Na aprovação manual, a tela diz "O valor é sempre R$ 177,30" (o valor do pedido). O servidor grava o preço cheio do 1º concurso. O financeiro registra um valor diferente do prometido (adicional, cupom) |
| R2-05 | ALTA | CONFIRMADO (código) | `apps/web/src/telas/Entrar.tsx:56-57, 94-96`; `api/src/rotas/auth.ts` | **RQ2.** O dono entra pela tela do aluno ("Entre para continuar sua preparação.", "Criar conta"). Não existem login de admin nem de superadmin |
| R2-06 | MÉDIA | CONFIRMADO (teste) | `admin/api.ts:86`; `admin/componentes/ui.tsx:277-278` | Sessão expirada (401) ou 2FA vencido (403 `dois_fatores_necessario`) no `/super` mostram só a mensagem e "Tentar de novo", que repete o erro. O painel não leva a `/entrar` nem a `/super/2fa` |
| R2-07 | MÉDIA | CONFIRMADO (teste) | `super/telas/Comunicacao.tsx:229, 249-255` | Depois de "Colocar na fila" e "Fechar", o botão "Enviar" continua ativo. Um segundo clique manda a **mesma** comunicação de novo (2 POSTs no teste) |
| R2-08 | MÉDIA | CONFIRMADO (código) | `packages/shared/src/api/superadmin.ts:210-227`; `super/telas/Pagamentos.tsx:356-388`; `VisaoGeral.tsx` | **D21/D23.** Pagamentos, detalhe, ficha e financeiro não mostram o concurso do pedido nem o cupom usado. Não há filtro por concurso nem por cupom. O dono não sabe quanto vendeu por concurso nem quanto cada cupom custou |
| R2-09 | MÉDIA | CONFIRMADO (teste) | `super/telas/Asaas.tsx:196, 234, 252`; `api/src/rotas/super/asaas.ts:209-210` | Textos em inglês na tela do dono: "RECEIVED", "PENDING", "OVERDUE", "REFUNDED", "CANCELADA" como rótulos de KPI, e o tipo cru do extrato ("PAYMENT_FEE") |
| R2-10 | MÉDIA | CONFIRMADO (teste) | `super/telas/DoisFatores.tsx:444-491`; `Layout.tsx:213` | No 1º acesso pelo celular (2FA ainda não configurado), a tela não tem "Sair" e o menu inferior fica oculto. O dono sem app autenticador fica preso |
| R2-11 | MÉDIA | CONFIRMADO (teste) | `super/telas/Equipe.tsx:20, 104-128` | Convite pendente aparece só como selo. Não há "reenviar convite" nem "cancelar convite". Passadas 72 h, o convidado fica sem caminho claro |
| R2-12 | MÉDIA | CONFIRMADO (código) | `telas/Recuperar.tsx:126-128`; `api/src/rotas/super/usuarios.ts:389-391` | O convidado da equipe cai em "Criar nova senha" / "Ao salvar, as outras sessões abertas da sua conta são encerradas.", uma tela de aluno que não fala de convite nem de equipe |
| R2-13 | BAIXA | CONFIRMADO (teste) | `Comunicacao.tsx:220` | Mudar o "Link do botão" depois da prévia não invalida a prévia: o envio sai com um link que o dono não viu na prévia |
| R2-14 | BAIXA | CONFIRMADO (teste) | `Equipe.tsx:113` | Com nome sem sobrenome, "Enviar convite" fica desabilitado e a tela não diz por quê |
| R2-15 | BAIXA | CONFIRMADO (teste) | `super/telas/Auditoria.tsx:317-322` | No celular, a auditoria não tem filtro de período. Em nenhuma faixa há exportação CSV nem filtro por "quem fez". O filtro "Alvo" exige `usuario:<uuid>` |
| R2-16 | BAIXA | CONFIRMADO (código) | `Asaas.tsx:205-221` × `Pagamentos.tsx:205-262` | A conciliação em lote existe em dois lugares, com regras diferentes: em Asaas corrige direto, sem "só conferir"; em Pagamentos dá para escolher |
| R2-17 | BAIXA | CONFIRMADO (código) | `PagamentoDetalhe.tsx:33-34` | "Acesso do aluno: Liberado/Sem acesso" é o acesso **geral** (qualquer concurso), não o do concurso deste pedido. Isso engana justamente nos casos do RQ4 |
| R2-18 | BAIXA | CONFIRMADO (código) | `UsuarioFicha.tsx:150-158` | Na ficha de um admin ou superadmin aparecem "Liberar acesso" e "Revogar acesso", ações de aluno. Com o RQ1, liberar acesso a um superadmin contraria o requisito |
| R2-19 | BAIXA | CONFIRMADO (código) | `super/telas/Sistema.tsx:74, 85` | Os jobs aparecem com o nome técnico ("enviar-comunicacoes"), e o erro cru vai dentro de um selo. Não dá para um dono não técnico entender |
| R2-20 | BAIXA | CONFIRMADO (código) | `PagamentoDetalhe.tsx:102, 199, 211` | A marcação "Fora dos 7 dias… reembolsar mesmo assim" não volta ao padrão quando a folha é fechada |
| R2-21 | MÉDIA | CONFIRMADO (teste) | `apps/web/src/admin/componentes/Layout.tsx:36-72` | O `/admin` não tem **nenhum** "Sair" nem mostra quem está logado, e oferece "Ver o app como aluno" (`/aprender`), contra o RQ1. O admin de conteúdo não consegue sair da conta pelo painel |
| R2-22 | ALTA | CONFIRMADO (teste + código) | `admin/componentes/Layout.tsx:13-34`; `admin/telas/Painel.tsx:30-48`; `admin/componentes/AcoesAcesso.tsx:27, 120-121` | **RQ1 revisado.** O menu do admin restrito mostra negócio: "Painel" com vendas, "Pedidos" com reembolso, "Usuários" com liberar e revogar, e "Auditoria". O reembolso no `/admin` (`adminPedidoReembolso`) exige só um motivo; no `/super` exige reconfirmação: duas regras para a mesma ação |
| R2-23 | MÉDIA | CONFIRMADO (código) | `admin/componentes/Layout.module.css:144-162`; `admin/componentes/ui.tsx:20-30`; `admin/telas/EditorQuestao.tsx` | O `/admin` não segue o padrão D13: abaixo de 900 px, a sidebar vira uma faixa com 11 links; as tabelas não viram cartões (nenhum `useFaixa`/`matchMedia` no módulo); não há breadcrumb (`Cabecalho` sem trilha); o editor de questão não protege alterações não salvas (nenhum `beforeunload`/`useBlocker`) |
| R2-24 | MÉDIA | CONFIRMADO (código) | `super/Layout.tsx:297` × `admin/componentes/Layout.tsx:66` | Há dois layouts e duas navegações, alternados por `<a href>`, que recarrega a SPA. "Usuários", "Auditoria" e "Visão geral/Painel" estão sobrepostos nos dois |

**Contagem:** 6 ALTA, 10 MÉDIA, 8 BAIXA.

> **Nota sobre o RQ1 revisado** (o dono revisou o RQ1 durante esta rodada). O superadmin passa a administrar também o conteúdo, como uma seção do `/super`, e o admin fica restrito a essa seção. Com isso:
> - R2-01 muda de foco: `adminConcursosListar` vira uma rota de **conteúdo** compartilhada, legítima para o superadmin (mas o select ainda precisa avisar quando falha);
> - liberar e revogar acesso continuam como ações de negócio que precisam de rota `super*`;
> - o link "Conteúdo (/admin)" deve virar a seção Conteúdo dentro da mesma sidebar (seção 4-B).

---

## 2. Achados em detalhe

### R2-01: o `/super` depende do `/admin` (RQ1)

**Reprodução.**
1. Teste R2-01a: em `/super/precos`, clicar em "Novo cupom" com `GET /admin/concursos` respondendo 403.
2. Teste R2-01b: na ficha, clicar em "Liberar acesso", informar um motivo e confirmar.

**Observado.**
- Na 1ª reprodução:
  - o select "Concurso" fica só com `["Qualquer concurso"]`;
  - nenhum aviso aparece;
  - o dono cria um cupom "para todos" achando que não havia concurso.
- Na 2ª, a chamada é `POST /admin/usuarios/:id/liberar-acesso` (rota de guarda `admin`).
- Na API, `adminUsuarioLiberarAcesso` (`apps/api/src/rotas/admin/gestao.ts:310-321`) libera **o concurso ativo**, e o diálogo não tem escolha de concurso.
- A revogação (`:322-331`) chama `revogarTudo`.
- O menu (desktop e "Mais" no celular) tem "Conteúdo (/admin)" / "Painel de conteúdo (/admin)".

**Esperado (RQ1/RQ3).** Rotas próprias `super*` para:
- a lista de concursos (só id e nome);
- liberar e revogar por concurso.

Sem o link para o `/admin`.

**Impacto.** Ao aplicar o RQ1, três funções param, e uma delas sem aviso.

**Correção.**
- `GET /super/concursos` (resumo).
- `POST /super/usuarios/:id/concursos/:concursoId/liberar|revogar`, com motivo e auditoria `super`.
- Tirar o item `/admin` de `MENU`/`MAIS`.
- Mostrar `ErroCaixa` quando a lista de concursos falhar.

**Aceite.**
- `grep "api('admin" apps/web/src/super` = 0.
- Um teste com 403 em `/admin/*` mantém o cupom, a liberação e a revogação funcionando.

### R2-02: RQ4, pedido pago sem concurso liberado não tem saída

**Reprodução (código).** Pedido `pago`, Asaas `RECEIVED`, aluno sem o concurso do pedido em `usuarios_concursos`.

**Observado.**
- O menu de ações da tela (`PagamentoDetalhe.tsx:132-137`) mostra:
  - "Conciliar com o Asaas";
  - "Reenviar e-mail";
  - "Reembolsar" (Asaas, dentro do prazo).
- "Aprovar pagamento manual" não aparece, porque exige `status !== 'pago'`.
- "Conciliar" cai em `esperado === p.status` (`conciliacao.ts:63-65`) e responde "Tudo certo: o pedido bate com o Asaas.", sem chamar `liberarConcurso`.
- A única saída é a ficha → "Liberar acesso", com três problemas:
  - é uma rota do `/admin` (R2-01);
  - libera o concurso **ativo**, que pode não ser o do pedido;
  - registra a ação como "acesso.liberar" sem ligação com o pedido.

**Impacto.** O aluno pagou e não estuda. O dono não tem um botão que resolva e recebe uma mensagem de "tudo certo".

**Correção:** ver a seção 5 (Avaliação RQ4).

### R2-03: aprovação manual e o 2º concurso (D21)

**Observado.**
- Teste R2-03: aluno com 1 pedido pago e 1 pendente de R$ 197. A ficha **não** mostra "Aprovar pagamento manual".
- Em `PagamentoDetalhe.tsx:132`, a condição `!p.usuario.acesso` também esconde a ação se o aluno tem acesso a qualquer concurso.
- O servidor (`pagamentoManual.ts:61-63`) aprova o concurso **ativo**, e a interface não mostra qual é.
- A tabela de pedidos da ficha tem só Status, Método, Valor, Criado e Pago, sem o concurso.

**Esperado.** Escolher o concurso (ou herdar o do pedido) e ver isso escrito antes de confirmar.

**Correção.**
- `superAprovarManual` recebe `concursoId` (ou `pedidoId`).
- A interface mostra "Concurso: X · Valor: Y" e só esconde a ação se **aquele** concurso já estiver pago.

**Aceite:**
- aluno com A pago aprova B;
- o pedido B fica com `concurso_id = B`;
- A não muda.

### R2-04: valor prometido × valor gravado na aprovação manual

**Observado.**
- Teste R2-04: pedido pendente de R$ 177,30. A folha diz "Use só para pagamento recebido por fora (…). O valor é sempre R$ 177,30 e não existe acesso gratuito.".
- O servidor grava `valorCentavos: preco`, o preço do 1º concurso (`pagamentoManual.ts:55, 96`).
- O resultado é o mesmo com um pedido adicional de R$ 197 enquanto o cheio for R$ 397, e também num pedido com cupom.

**Impacto.**
- O financeiro (receita "Manual") diverge do que foi recebido.
- A tela mente para o dono.

**Correção.**
- Gravar o valor do pedido pendente (ou o `precoDoConcurso` + cupom) e mostrar exatamente esse valor.
- Melhor ainda: deixar o dono informar o "valor recebido" (com limites), já que o dinheiro veio por fora.

**Aceite:** o valor mostrado na folha é igual a `pedidos.valor_centavos` gravado.

### R2-05: login único (RQ2)

**Hoje:**
1. O dono abre `/entrar`, uma tela de aluno com "Que bom te ver de novo!", "Entre para continuar sua preparação." e "Ainda não tem conta? Criar conta".
2. O `POST /auth/login` devolve `proximo: 'dois_fatores'` → `/super/2fa` (`telas/formulario.ts:28-29`).
3. "Esqueci minha senha" é a mesma `/recuperar`.
4. "Sair" volta a `/entrar` (`super/rotas.tsx:48`).

O que um dono esperaria:
- `/super/entrar` com a marca "Superadmin", e-mail, senha e o código do app **na mesma jornada** (um passo de 2FA em seguida, sem passar pela casa do aluno);
- sem "Criar conta";
- "Esqueci a senha" própria;
- o "Sair" voltando para a página de login do papel;
- `/admin/entrar` equivalente para a equipe de conteúdo;
- uma conta de aluno digitada em `/super/entrar` deve receber uma mensagem neutra ("E-mail ou senha incorretos."), sem revelar o papel.

**Impacto:** UX e postura de segurança. O alvo de força bruta é o mesmo para todos.

### R2-06: sessão expirada no painel

**Observado.**
- Teste R2-05: com 401, a lista mostra "Entre na sua conta para continuar." e "Tentar de novo", que repete o 401. Nenhum redirecionamento para `/entrar`.
- Teste R2-05b: 403 `dois_fatores_necessario` numa ação ("Bloquear") vira só o texto do erro dentro da folha, sem levar a `/super/2fa`.
- D13: a sessão cai depois de 2 h sem uso. Logo, o dono que deixou a aba aberta perde o que digitou (comunicação, preços) e não sabe o que fazer.

**Correção.** No `api()` do painel:
- 401 → `navigate('/super/entrar?voltar=…')`;
- 403 `dois_fatores_necessario` → `/super/2fa?voltar=…`.

Preservar o rascunho da comunicação.

### R2-07: comunicação enviada duas vezes

**Observado.**
- Teste R2-06: após enviar e fechar, `previa.data` continua preenchida, e "Enviar" segue habilitado.
- Duas confirmações geraram **2** `POST /super/comunicacoes`.
- O servidor limita a 5 por dia e 1 por aluno a cada 24 h. A segunda comunicação entra na fila, consome a cota e não chega a quem já recebeu.

**Correção.** Depois do sucesso, limpar o formulário e a prévia, ou desabilitar "Enviar" até a próxima prévia.

### R2-08: concurso e cupom invisíveis na gestão

- `PagamentoSuper` não tem `concursoId`/`concursoNome`, `cupom` nem `valorOriginalCentavos`.
- A tabela de cupons mostra o número de usos, mas não há como ver **quais** pedidos usaram o cupom.
- O financeiro não separa:
  - por concurso;
  - preço cheio × adicional;
  - desconto concedido.
- O dono pediu cupons (D23) e não consegue medir o efeito deles. (Fundamentada: a D23 cria `pedidos.cupom_id` e `valor_original_centavos`, mas nada disso chega à interface.)

### R2-09: textos em inglês

**Observado:**
- teste R2-10 com `porStatus` `RECEIVED`/`PENDING`: os KPIs aparecem com esses rótulos;
- o extrato mostra "PAYMENT_FEE" na coluna Tipo;
- a API mistura inglês e português no mesmo mapa (`asaas.ts:209-210`: `'CANCELADA'` ao lado de `'PENDING'`).

**Correção:**
- devolver o status local (`NOMES_STATUS_PEDIDO`);
- traduzir os tipos do extrato do Asaas (`PAYMENT_RECEIVED` → "Pagamento recebido", `PAYMENT_FEE` → "Taxa", `REFUND` → "Estorno", outros → "Outro lançamento").

### R2-10: 2FA no 1º acesso sem "Sair"

**Observado:**
- teste R2-12: em 390 px, com `configurado: false`, só há "Gerar QR code"; não há botão "Sair" nem "Mais";
- no desktop, a sidebar inteira aparece na tela do 2FA (teste R2-12b), e os links levam de volta ao 2FA pela guarda: é ruído.

**Correção.**
- Layout "fechado" no `/super/2fa` (sem menu), com "Sair" sempre visível.
- Texto de ajuda: "Não tem app autenticador? Instale o Google Authenticator…".

### R2-11 e R2-12: convite de equipe

**R2-11.** A tabela da equipe não tem nenhum botão. Para um convite pendente (`convitePendente`) vencido, só resta:
- "Forçar troca de senha" na ficha, que não é óbvio;
- ou excluir.

Faltam "Reenviar convite" (novo link de 72 h, auditado) e "Cancelar convite".

**R2-12.** O link do convite abre `/recuperar/:token` ("Criar nova senha"):
- não há "Bem-vindo à equipe do Fuse Aprova, defina sua senha";
- depois de salvar, o convidado de papel admin vai para `/admin` e o superadmin para o 2FA, sem ter sido avisado no passo anterior.

### R2-13 a R2-20 (curtos)

- **R2-13.** Link alterado após a prévia: o teste R2-07 mostrou a prévia com `/aprender` e o envio com `/liga`. O `setLink` não chama `previa.reset()`.
- **R2-14.** Com "Mariana", o botão fica desabilitado e não há texto de ajuda. Pôr `ajuda="Nome e sobrenome"` ou validar com uma mensagem.
- **R2-15.** Auditoria: período só no desktop, sem CSV e sem filtro "Quem". O dono que quer "o que a equipe fez ontem" não consegue no celular.
- **R2-16.** Duas conciliações em lote com regras diferentes: juntar numa só (com "só conferir" como padrão).
- **R2-17.** "Acesso do aluno" engana: trocar por "Concurso deste pedido: liberado / não liberado".
- **R2-18.** Esconder liberar e revogar quando `papel !== 'aluno'`.
- **R2-19.** Dar nomes humanos aos jobs ("Envio de comunicações", "Backup do banco"…) e mostrar o erro abaixo do selo, não dentro dele.
- **R2-20.** Zerar `foraDoPrazo` no `fechar()`.

---

## 3. Tela a tela (estado de cada função)

**Legenda:**
- **V** = VERIFICADA (teste do projeto ou meu, com fetch simulado);
- **P** = PARCIAL;
- **F** = FALHA REPRODUZIDA;
- **I** = IMPLEMENTADA NÃO VERIFICADA (código lido, endpoint `super*` existe em `ROTAS` e no servidor);
- **N** = NÃO LOCALIZADA.

Os 55 nomes `api('super…')` usados pelo painel existem em `packages/shared/src/api/rotas.ts`. Os únicos que não são `super*` são `meObter`, `adminConcursosListar`, `adminUsuarioLiberarAcesso` e `adminUsuarioRevogarAcesso`.

**Layout (desktop / tablet / celular)**

| Função | Estado |
|---|---|
| Sidebar, recolher, ícones no tablet, menu inferior e "Mais" | V (`super.test.tsx`) |
| Link `/admin` | F para o RQ1 (R2-01) |
| Rodapé com 2FA | V |
| Usuário e 2FA no celular | N (só "Sair" no "Mais") |

**`/super/2fa`**

| Função | Estado |
|---|---|
| Gerar QR, ativar, códigos e "Guardei" | I |
| Verificar e "Perdi o celular" | I |
| Sair no 1º acesso | F (R2-10) |

**Visão geral**

| Função | Estado |
|---|---|
| KPIs e gráficos | I |
| Filtros de período, agrupamento e método | I |
| CSV | I |
| Período invertido | I. A API devolve "A data inicial é depois da final." (`comum.ts:41`) e o `Consulta` troca o painel pelo erro. Tentei provar com teste; a digitação em `input[type=date]` no jsdom não funcionou, então não está verificado |
| Por concurso e por cupom | N (R2-08) |

**Pagamentos**

| Função | Estado |
|---|---|
| Lista, filtros, cartões e folha no celular | V |
| Busca | I. Sem debounce: uma consulta por tecla |
| CSV | I |
| Conciliar lote ("só conferir" ou corrigir) | I |
| Coluna e filtro de concurso e de cupom | N |

**Detalhe do pagamento**

| Função | Estado |
|---|---|
| Dados, linha do tempo e webhooks | I |
| Conciliar | I |
| Reenviar e-mail | I |
| Cancelar Pix | I |
| Reembolsar | I |
| Desfazer manual | I |
| Aprovar manual | V (fluxo) / F (valor, R2-04) / P (D21, R2-03) |
| Liberar o concurso de um pedido pago | N (R2-02) |
| Concurso e cupom do pedido | N |

**Preços e cupons**

| Função | Estado |
|---|---|
| Salvar preços (motivo + reconfirmação) | I |
| Listar cupons | I |
| Criar e editar cupom | I |
| Concurso do cupom | F para o RQ1 (R2-01) |
| Excluir cupom | N (só desativar, aceitável) |
| Pedidos que usaram o cupom | N |

**Webhooks**

| Função | Estado |
|---|---|
| Lista e filtro | I |
| Detalhe | I |
| Reprocessar um | I (sem confirmação; aceitável, é idempotente) |
| Reprocessar lote | I |

**Conta Asaas**

| Função | Estado |
|---|---|
| Status, saldo e teste de conexão | I |
| Webhook (cadastrar, atualizar e reativar) | I |
| Extrato com paginação | I. Texto em inglês: F (R2-09) |
| Estatísticas | F (R2-09) |
| Conciliar período | P (R2-16) |

**Usuários**

| Função | Estado |
|---|---|
| Lista e filtros | V (celular) / I |
| CSV | I |
| Filtro por concurso | N |

**Ficha do usuário**

| Função | Estado |
|---|---|
| Editar | I |
| Forçar senha | I |
| Bloquear e desbloquear | I |
| Papel | I |
| Exportar JSON | I |
| Excluir (LGPD) | V |
| Encerrar sessão (uma) | I |
| Liberar e revogar | F para o RQ1 (R2-01) |
| Aprovar manual (2º concurso) | F (R2-03) |
| Concursos do aluno | N |
| Push cadastrados | N (a API devolve `push`, a tela não mostra) |
| Encerrar todas as sessões | P (só pelo "Forçar troca de senha") |

**Equipe**

| Função | Estado |
|---|---|
| Lista | V / I |
| Convidar | I. Validação silenciosa: F (R2-14) |
| Reenviar ou cancelar convite | N (R2-11) |
| Remover da equipe | P (pela ficha → papel aluno) |

**Comunicação**

| Função | Estado |
|---|---|
| Prévia | V |
| Enviar | F (envio duplo, R2-07; link fora da prévia, R2-13) |
| Histórico e cancelar | I |
| Reenviar e-mail | I |
| Webhooks perdidos | I |
| Segmento por concurso | N (hipótese de valor) |

**Sistema**

| Função | Estado |
|---|---|
| Saúde e jobs | I. Nomes técnicos: P (R2-19) |
| Configurações (manutenção, aviso, edital, suporte) | I |
| Novos códigos de recuperação | I |
| Disparar backup ou ver o histórico | N (fora da D13) |

**Auditoria**

| Função | Estado |
|---|---|
| Lista, filtros e detalhe | I |
| Período no celular | F (R2-15) |
| CSV e filtro "quem" | N |

### 3-B. Telas do `/admin` (que viram a seção Conteúdo)

Os testes do projeto rodaram: `pnpm --filter @fuse/web exec vitest run src/admin`, **17/17 aprovados**. As telas usam o mesmo `api()`, `Consulta`, `Modal` e `Tabela` do `/super`; o que muda é o layout e o padrão de celular (R2-23).

**Painel**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Vendas hoje e no mês, ativos, métricas PRD (conversão, retenção D7, reembolsos) | I | **Negócio:** juntar à Visão geral do `/super` e tirar do admin (R2-22) |

**Concursos e provas**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Criar, editar e clonar concurso | I | Conteúdo |
| Provas (criar, editar) | I | Conteúdo |
| Retirar questões de uma origem (com confirmação) | I | Conteúdo |

**Questões**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Filtros | V (`questoes.test.tsx`) | Conteúdo |
| Prévia | V | Conteúdo |
| Publicar em lote | V | Conteúdo |
| Retirar em lote com motivo | V | Conteúdo |

**Editor de questão**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Publicar exige dica, explicação e revisão | V (`editor.test.tsx`) | Conteúdo |
| Pré-visualização | V | Conteúdo |
| Proteção de alterações não salvas | N (R2-23) | Conteúdo |

**Importação**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Lista e detalhe | I | Conteúdo |
| Revisar | I | Conteúdo |
| Lote | I | Conteúdo |

**Trilhas**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Reordenar pelo teclado | V (`trilhas.test.tsx`) | Conteúdo |
| Desfazer em caso de erro | V | Conteúdo |
| Unidades, seções e lições (criar, editar, excluir com modal) | I | Conteúdo |

**Edital**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Obter, salvar e publicar | I | Conteúdo |

**Reports (erros de questão relatados pelos alunos)**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Lista e atualizar status | I | Conteúdo. Renomear para "Erros relatados" (PT-BR) |

**Pedidos**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| CPF mascarado | V (`pedidos.test.tsx`) | **Negócio:** já coberto em `/super/pagamentos`. Remover do admin |
| Reembolso | V | **Negócio**, idem. É uma segunda rota de reembolso sem reconfirmação (R2-22) |
| Liberação manual (motivo ≥ 10) | V | **Negócio**, idem |

**Usuários**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Lista e ficha | I | **Negócio:** o `/super/usuarios` cobre |
| Revogar sessões | I | **Negócio**, idem |
| Liberar e revogar acesso | I | **Negócio**, idem |

**Auditoria**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| Lista por ação | I | **Negócio:** o `/super/auditoria` cobre. Para o admin, no máximo "minhas alterações de conteúdo" |

**Rodapé do menu**

| Item | Estado | Destino no RQ1 revisado |
|---|---|---|
| "Voltar ao painel superadmin" | I | Some com a integração |
| "Ver o app como aluno" | F (R2-21) | Remover |
| Sair | N (R2-21) | Criar |

---

## 4-B. Integração do Conteúdo no layout do `/super` e a jornada do admin restrito

**Hoje:**
- o dono sai do `/super` por `<a href="/admin">`, que recarrega a SPA e troca de layout (outra sidebar e a marca "Painel admin", sem rodapé de usuário e sem Sair);
- para voltar, usa "Voltar ao painel superadmin";
- no celular, o `/admin` não tem menu inferior: a sidebar vira uma faixa de 11 links acima do conteúdo (R2-23).

**Proposta (fundamentada no padrão D13 já existente no `/super`):**

1. **Uma sidebar só.** Acrescentar ao `MENU` de `super/Layout.tsx` o grupo **"Conteúdo"**, com Concursos e provas, Questões, Importação, Trilhas, Edital e "Erros relatados". As rotas passam a ser `/super/conteudo/...` (ou `/painel/conteudo/...`), dentro do mesmo `RotasSuper` e do mesmo QueryClient, sem reload.
2. **O menu é filtrado pelo papel.**
   - O superadmin vê todos os grupos.
   - O admin vê só "Conteúdo", com um selo "Conteúdo" no lugar de "Superadmin" e um rodapé com nome, papel e **Sair**.
   - O mesmo filtro precisa existir na guarda da web e na API: esconder no menu não basta.
3. **Celular.**
   - Superadmin: o menu inferior continua (Visão geral, Pagamentos, Usuários, Asaas, Mais), e o "Mais" ganha a seção Conteúdo.
   - Admin: menu inferior com Questões, Importação, Trilhas, Erros relatados e Mais (Concursos, Edital, Sair).
   - As tabelas de Questões, Importação e Concursos usam `Cartoes`/`CartaoLinha`.
   - O editor de questão vira tela empilhada com "voltar", como `PagamentoDetalhe`.
4. **Breadcrumb e título:** trocar `Cabecalho` por `Pagina` (trilha "Conteúdo › Questões › Editar"). `Pagina` já alimenta a barra do celular e o `document.title`.
5. **Consistência visual:** o `/super` já usa os componentes de `admin/componentes/ui`, então só o layout muda. Basta aposentar `admin/componentes/Layout.tsx` e manter `data-painel-admin` para os tokens.
6. **Eliminar duplicatas:**
   - Painel, Pedidos, Usuários e Auditoria do `/admin` saem: o `/super` tem versões mais completas, com reconfirmação;
   - o reembolso e a liberação manual ficam só no `/super` (RQ4).

**Jornada do admin restrito:**

| Passo | Hoje | Esperado |
|---|---|---|
| Recebe o convite | E-mail com o link → "Criar nova senha", tela de aluno (R2-12) | "Bem-vinda à equipe de conteúdo", com o link para definir a senha |
| Entra | `/entrar` de aluno (R2-05) | Página de login própria da equipe, com a marca do painel |
| Vê | 11 itens, incluindo vendas, pedidos com reembolso, usuários e auditoria (R2-22) | Só Conteúdo |
| Trabalha no celular | Faixa de links, tabelas largas, editor sem proteção | Menu inferior, cartões, aviso de alterações não salvas |
| Sai | **Não há Sair** (R2-21). "Ver o app como aluno" leva ao app de estudo | Sair no rodapé ou no "Mais", voltando à página de login dele |
| Tenta abrir uma URL de negócio | Hoje `/admin/pedidos` abre, porque a rota é `admin` | A guarda e a API recusam com 403. A mensagem é "Esta área é do responsável pela conta." |

**Aceite proposto:**
- teste do layout com `papel: 'admin'`: o menu tem só os itens de Conteúdo, existe um botão Sair e não há links para `/aprender`, `/super/pagamentos` nem `/admin/pedidos`;
- com `papel: 'superadmin'`: o grupo Conteúdo está dentro da `nav` "Menu do superadmin", e a navegação até Questões não usa `<a href>`.

---

## 4. Avaliação RQ1, RQ2, RQ3

**RQ1 (revisado): não atendido.**
- O conteúdo é um painel separado, com outro layout, alcançado por um link que recarrega a página (R2-24).
- O admin restrito vê o negócio: vendas, pedidos com reembolso, usuários com liberar e revogar, e auditoria (R2-22).
- O admin restrito tem "Ver o app como aluno" e não tem "Sair" (R2-21).
- No `/super`, liberar e revogar acesso usam rotas `admin*` (R2-01), e a ficha oferece "Liberar acesso" para a equipe (R2-18).
- A lista de concursos do cupom pode continuar numa rota de conteúdo compartilhada, desde que avise quando falhar.

**RQ2: não atendido.**
- Há uma única tela de login, com cara de aluno, e uma única recuperação de senha (R2-05).
- O convite de equipe passa pela tela de aluno (R2-12).
- A sessão expirada não leva a lugar nenhum (R2-06).
- O 1º acesso no celular não tem "Sair" (R2-10).

**RQ3: parcialmente atendido.**
- O que está bem feito:
  - 52 endpoints `super*` ligados à interface, com motivo e reconfirmação onde a D13 pede;
  - cartões e folhas no celular;
  - a exclusão LGPD com o e-mail digitado.
- O que falta:
  - **D21/D23 só pela metade:** sem concurso nem cupom em pedidos, financeiro e ficha (R2-08); aprovação manual sem concurso e com valor errado (R2-03, R2-04);
  - falhas reproduzidas: R2-07, R2-09, R2-13, R2-14, R2-15;
  - funções não localizadas: convite (reenviar e cancelar), concursos do aluno e push na ficha;
- telas do `/admin`: os 17 testes do projeto passam e as funções de conteúdo estão implementadas. Faltam o padrão de celular, o breadcrumb e a proteção do editor (R2-23), e o Sair (R2-21).

---

## 5. Avaliação RQ4: estorno e liberação manual na tela do pagamento

**O que o dono vê hoje em cada caso** (`PagamentoDetalhe.tsx:132-137`):

| Caso | Botões visíveis hoje | Onde fica preso |
|---|---|---|
| A. Pedido **pago** e o concurso não foi liberado | Conciliar, Reenviar e-mail, Reembolsar (só Asaas dentro do prazo; fora dele, só com a marcação) | Conciliar responde "Tudo certo: o pedido bate com o Asaas." e não libera (`conciliacao.ts:63-65`). Não há "liberar". O "Acesso do aluno: Liberado" pode até aparecer, se ele tem outro concurso (R2-17) |
| B. Pix pago no Asaas e o **webhook não chegou** (pedido `pendente`/`vencido` aqui) | Aprovar manual (só se o aluno não tem acesso a nada), Conciliar, Cancelar Pix | **Conciliar resolve** (corrige e chama `confirmarPagamento`), mas o nome não diz isso ao dono. Se o valor pago no Asaas for menor, a mensagem é "Confira antes de liberar o acesso.", sem botão para liberar depois de conferir. "Aprovar manual" seria errado aqui (cria um pagamento "manual" para um Pix do Asaas e grava o preço cheio, R2-04) |
| C. Aluno **já tem outro concurso** liberado | Conciliar, Cancelar Pix (pendente) | "Aprovar pagamento manual" some (`!p.usuario.acesso`). Na ficha também (`pagoAprovado`). O dono não consegue registrar o 2º concurso pago por fora |
| Estornar Pix do Asaas | "Reembolsar" (quando pago e sem pedido anterior) | Funciona (I). Depois do pedido, some, e "O acesso cai quando o webhook de estorno chegar." Se o webhook não chegar, só a conciliação resolve |
| Estornar pagamento manual | "Desfazer aprovação manual" | Revoga o acesso, mas não registra a devolução do dinheiro. O nome não diz "estornar" |

**Proposta de UX** (três passos no máximo, sem acesso gratuito):

1. **Cabeçalho do pagamento:**
   - "Concurso: *Nome*";
   - "Liberação deste concurso: ✔ liberado / ✖ não liberado";
   - "Valor: R$ X (cupom CODIGO, de R$ Y)".

   Esse cabeçalho substitui o "Acesso do aluno".
2. **Botão "Liberar acesso deste concurso"** (primário), visível quando `status = 'pago'` e o concurso do pedido não está liberado (caso A):
   - chama `liberarConcurso(aluno, pedido.concursoId)`;
   - é idempotente;
   - pede motivo;
   - fica na auditoria `pedido.liberar_concurso` com o pedido;
   - não cria pedido nem receita;
   - **não** existe para pedido não pago (o que mantém a regra de não haver acesso gratuito).
3. **Botão "Confirmar pagamento no Asaas"** (rótulo humano da conciliação) para o caso B:
   - consulta o Asaas e, se pago, confirma e libera **o concurso do pedido**;
   - na divergência de valor, mostra os dois valores e oferece "Liberar mesmo assim", com reconfirmação e motivo.
4. **"Registrar pagamento recebido por fora"** (a aprovação manual) para o caso C e para pagamentos fora do Asaas:
   - vale para o **concurso do pedido**;
   - usa o valor do pedido;
   - é escondida só se aquele concurso já tem pedido pago.
5. **"Estornar"** com um nome só para os dois métodos:
   - no Asaas, pede o estorno;
   - no manual, desfaz e pede "como devolveu o dinheiro" (forma e data), para o financeiro registrar o reembolso;
   - o texto de sucesso diz o que acontece com o acesso **deste concurso**: os outros concursos ficam.

**Aceite (teste de interface + API):**
- pedido pago sem concurso: botão visível → concurso liberado → auditoria com `pedido:<id>`;
- pedido pendente: o botão de liberar não existe;
- aluno com A liberado registra B por fora: B fica pago com o valor do pedido e A não muda.

---

## 6. Oportunidades (ELIMINAR → JUNTAR → AUTOMATIZAR → ANTECIPAR → CRIAR)

- **ELIMINAR (fundamentada):**
  - o link `/admin` do menu;
  - "Liberar acesso" para a equipe;
  - a segunda conciliação em lote (R2-16);
  - a exigência de `usuario:<uuid>` no filtro de auditoria (trocar por uma busca por nome ou e-mail).
- **JUNTAR (fundamentada):**
  - "Webhooks perdidos" e "Reenviar e-mail" estão em Comunicação, mas são problemas de pagamento: levá-los para Pagamentos e Webhooks;
  - um painel "Pendências de pagamento" reuniria webhooks com erro, pedidos pagos sem liberação (caso A), Pix pagos sem webhook (B) e divergências de valor.
- **AUTOMATIZAR (fundamentada):** um job diário que concilia os pendentes das últimas 48 h e reliberta os pagos sem concurso, deixando o relatório na Visão geral. Hoje depende de o dono lembrar.
- **ANTECIPAR:**
  - (fundamentada) cartão "Precisa da sua atenção" no topo da Visão geral, com webhooks com erro, jobs falhando, backup velho e convites vencidos;
  - (hipótese) aviso quando a conversão do Pix cair abaixo da média.
- **CRIAR, para o dono decidir:**
  - (fundamentada, D21/D23) vendas por concurso;
  - receita cheia × adicional × com cupom;
  - desconto total por cupom;
  - funil cadastro → escolheu concurso → gerou Pix → pagou;
  - (hipótese) segmento de comunicação por concurso e "alunos com Pix pendente há N horas".
- **Heurística de três passos:**
  - aprovar ou estornar já cabe em três passos;
  - "descobrir por que o aluno não tem acesso" hoje leva mais de cinco (ficha → pedidos → detalhe → conciliar → ficha → liberar) e não resolve o caso A.

---

## 7. Fechamento

**Inspecionado:**
- `apps/web/src/super/`: `rotas.tsx`, `Layout.tsx`, `componentes.tsx`, `acoes.tsx`, `util.ts`, `midia.ts` e as 13 telas;
- `admin/api.ts` e `admin/componentes/ui.tsx` (Consulta e erros);
- `app/Guarda.tsx`, `app/App.tsx`, `app/rotaInicial.ts`;
- no `apps/web/src/admin/`:
  - `rotas.tsx`, `componentes/Layout.tsx` e `.module.css`, `componentes/ui.tsx`, `componentes/AcoesAcesso.tsx` e `telas/Painel.tsx` (lidos por inteiro);
  - as outras 10 telas varridas por grep (chamadas de API, botões, confirmações, responsividade) e pelos testes do projeto;
- `telas/Entrar.tsx`, `telas/Recuperar.tsx`, `telas/formulario.ts`;
- no `packages/shared`: `api/superadmin.ts` (contratos) e `api/rotas.ts` (existência dos 55 endpoints);
- na API: `rotas/super/{comum,asaas,usuarios,pagamentos}.ts`, `rotas/admin/gestao.ts:255-360`, `servicos/pagamentoManual.ts` e `servicos/conciliacao.ts`;
- a D13, D21, D22 e D23 de `docs/DECISOES.md`, e as seções 1, 2 e 5 do protocolo.

**Testado:**
- `pnpm --filter @fuse/web exec vitest run src/super`: **9/9 aprovados**.
- `pnpm --filter @fuse/web exec vitest run src/admin`: **17/17 aprovados**.
- `r2/admin.r2.test.tsx` (R2-21): **1 aprovado**.
  - Com `papel: 'admin'`, o menu tem "Painel, Concursos e provas, Questões, Importação, Trilhas, Edital, Reports, Pedidos, Usuários, Auditoria" e "Ver o app como aluno" → `/aprender`.
  - Nenhum botão ou link "Sair".
- `npx vitest run --config <scratchpad>/r2/vitest.r2.config.ts` (arquivo `r2/r2.test.tsx`): **15 aprovados.** Cada um prova o comportamento descrito em R2-01a/b, R2-03, R2-03b, R2-04, R2-05, R2-05b, R2-06, R2-07, R2-08, R2-09, R2-10, R2-11 e R2-12/12b.
- **1 teste meu falhou por limitação do teste, não do app:** a digitação em `input[type=date]` no jsdom (período invertido). Fica como I.

**Não testado:**
- **cliques reais.** Não subi a API nem a web contra o Postgres de 127.0.0.1:55432 nem rodei o Playwright de `e2e/`. Optei por priorizar a varredura completa das 13 telas e das provas com o fetch simulado. Por isso, as respostas da API nos meus testes são fixtures, não o servidor real;
- o leitor de tela e o contraste reais;
- a folha arrastável no toque;
- o e-mail do convite renderizado;
- o comportamento do Asaas;
- produção (sem acesso por regra).

**Limitações:**
- os fixtures dos meus testes seguem os contratos Zod lidos, mas não foram validados contra o servidor;
- a severidade de R2-04 depende da regra comercial: se o dono quiser mesmo cobrar o preço cheio por fora, o problema passa a ser só a mensagem da tela;
- as oportunidades marcadas como hipótese precisam de validação com o dono.
