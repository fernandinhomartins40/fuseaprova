# Banca R2: usuário adversarial (produto e UX)

**Data:** 27/10/2026 · **Revisor:** R2 · **Modo:** somente auditoria (nenhum arquivo do projeto alterado além deste)

> **Origem da evidência.** Não cliquei numa interface real. Os achados vêm da **leitura do código** (arquivo:linha citados) e de **testes vitest direcionados** do `apps/web`. Também rodei um script de simulação no scratchpad. Os textos entre aspas são copiados do código, não foram observados numa tela. Para "estado": **CONFIRMADO** significa que o caminho no código é determinístico e foi lido de ponta a ponta. **FORTE INDÍCIO** significa que depende de comportamento externo (navegador, Asaas) que não executei. **HIPÓTESE** precisa de verificação.

---

## 1. Resumo dos achados

| ID | Sev. | Estado | Arquivo:linha | Uma linha |
|---|---|---|---|---|
| R2-01 | ALTA | CONFIRMADO | `apps/web/vite.config.ts:73-107`; `apps/worker/src/jobs/lembretes.ts:29` | O service worker não tem handler de `push` nem de `notificationclick`, então o lembrete enviado pelo worker nunca aparece com o texto do app |
| R2-02 | ALTA | CONFIRMADO | `apps/web/src/telas/licao/Licao.tsx:141-159, 207`; `apps/api/src/servicos/estudo.ts:592-600` | Se o "concluir" da lição falhar, o botão TENTAR DE NOVO abre uma **sessão nova**: o aluno refaz a lição inteira e perde conclusão e ofensiva |
| R2-03 | MÉDIA | CONFIRMADO | `apps/web/src/telas/simulado/SimuladoProva.tsx:59-95` | Com o tempo esgotado e sem rede, aparece "O tempo acabou e a prova foi entregue." mesmo quando a entrega falhou, e os toasts se repetem a cada 1 s |
| R2-04 | MÉDIA | CONFIRMADO | `apps/web/src/telas/Pagamento.tsx:57-77, 182-186`; `apps/api/src/servicos/pagamento.ts:40` | Quem pagou no último segundo vê "Esse Pix expirou". GERAR NOVO PIX responde "Seu acesso já está liberado." e o botão TENTAR DE NOVO repete o mesmo erro |
| R2-05 | MÉDIA | FORTE INDÍCIO | `apps/api/src/servicos/pagamento.ts:47-52` | Ao vencer, o Pix antigo só é marcado `vencido` no banco local e a cobrança continua aberta no Asaas. Com o código antigo copiado, o aluno pode pagar duas vezes |
| R2-06 | MÉDIA | CONFIRMADO | `apps/web/src/app/sair.ts:7-18`; `apps/web/src/offline/fila.ts:103-106`; `Configuracoes.tsx:329-338` | SAIR apaga sem aviso a fila de respostas offline ainda não sincronizadas, sem confirmação |
| R2-07 | MÉDIA | CONFIRMADO | `apps/web/src/offline/motor.ts:79-97`; `Licao.tsx:134-136` | Se a rede cai no meio de uma lição online, a sessão não passa para a fila offline: cada VERIFICAR dá o toast de "Sem conexão" e o aluno fica parado |
| R2-08 | MÉDIA | CONFIRMADO | `apps/api/src/servicos/estudo.ts:230-278`; `Licao.tsx:95-99` | Atualizar a página ou voltar à lição recomeça do zero, com novo sorteio de questões. Não existe retomada da sessão aberta |
| R2-09 | MÉDIA | CONFIRMADO | `apps/web/src/telas/Onboarding.tsx:51-71` | No onboarding, o aviso de push negado é apagado pela navegação imediata. Se o push estiver indisponível (ex.: iOS sem instalar), a falha passa calada e o aluno acha que o lembrete está ativo |
| R2-10 | MÉDIA | CONFIRMADO | `apps/web/src/telas/simulado/Simulado.tsx:131-140` | COMEÇAR SIMULADO inicia uma prova de 4 h num único toque, sem confirmação |
| R2-11 | MÉDIA | CONFIRMADO | `apps/web/src/admin/telas/EditorQuestao.tsx:188, 328-330` | O editor de questão não protege alterações não salvas (sem `beforeunload`/bloqueio de rota). Um 401 no meio também redireciona e perde o formulário |
| R2-12 | BAIXA | CONFIRMADO | `SimuladoProva.tsx:352, 331` | No resultado do simulado, o enunciado aparece como texto puro (sem Markdown e sem texto de apoio), e "Os erros entraram na sua fila de revisão." aparece mesmo com 0 erros |
| R2-13 | BAIXA | CONFIRMADO (lógica) / FORTE INDÍCIO (navegador) | `apps/web/src/ui/Campo.tsx:63-67`; `packages/shared/src/celular.ts:16-20` | `maxLength=15` corta o celular colado com "+55". O campo mostra "(55) 42999-9999" e o número é recusado |
| R2-14 | BAIXA | CONFIRMADO | `apps/web/src/app/App.tsx:39-47`; `Guarda.tsx:29`; `Entrar.tsx:42` | Quando a sessão expira, o aluno volta a `/entrar` e perde o destino (deep link) |
| R2-15 | BAIXA | CONFIRMADO | `Pagamento.tsx:125-135` | "Código copiado" aparece mesmo quando a cópia falhou |
| R2-16 | BAIXA | CONFIRMADO | `Simulado.tsx:95-96` | No cartão "Simulado em andamento", o tempo restante fica parado (não atualiza) |
| R2-17 | BAIXA | CONFIRMADO | `Liga.tsx:89, 108` | As zonas de promoção e rebaixamento ficam `aria-hidden`, então o leitor de tela não sabe quem sobe ou desce |
| R2-18 | BAIXA | CONFIRMADO | `apps/web/src/super/telas/Comunicacao.tsx:170, 214`; `UsuarioFicha.tsx:86` | Cancelar comunicação e encerrar sessão funcionam num clique, sem confirmação (o resto do painel confirma) |
| R2-19 | BAIXA | CONFIRMADO | `Configuracoes.tsx:158-161, 279-285`; `packages/shared/src/api/me.ts:116` | Trocar de cargo pelo `select` e comprar protetor não pedem confirmação. A confirmação "EXCLUIR" exige maiúsculas exatas e não aceita espaço |
| R2-20 | BAIXA | HIPÓTESE | `apps/api/src/servicos/estudo.ts:426-430` | O XP é creditado por resposta, antes de concluir. Quem abandona e reabre a lição em sequência pode inflar o XP da liga |
| R2-21 | BAIXA | CONFIRMADO | `Configuracoes.tsx:441-443` | Excluir a conta não informa sobre o direito de arrependimento (7 dias) nem sobre reembolso. O aluno pagante perde R$ 397 sem orientação |

**Contagem:** 2 ALTA, 9 MÉDIA, 10 BAIXA.

---

## 2. Achados em detalhe

### R2-01: Lembretes push nunca mostram a notificação do app
- **Categoria:** notificações / funcionalidade quebrada · **Severidade:** ALTA. É uma funcionalidade do PRD (8.5) inteira sem efeito visível, e o principal gatilho de retorno (ofensiva) depende dela.
- **Estado:** CONFIRMADO (estático).
- **Evidência:**
  - `apps/web/vite.config.ts:44-107` usa `VitePWA` no modo padrão `generateSW`, sem `importScripts` e sem `strategies: 'injectManifest'`.
  - `git grep "showNotification\|notificationclick"` não encontra nada no código versionado, e `apps/web/dist/sw.js` também não tem `showNotification`.
  - O worker envia o payload em `apps/worker/src/jobs/lembretes.ts:29` (`webpush.sendNotification(...)`).
- **Passos:**
  1. Ativar o lembrete em Configurações.
  2. Esperar o horário.
  3. O worker envia o push.
- **Esperado:** notificação com o `textoLembrete`, que abre `/aprender` ao tocar.
- **Observado (conforme o código):** o SW recebe o evento `push` e não chama nada. O Chrome mostra o aviso genérico "site atualizado em segundo plano". O Safari/iOS pode **cancelar a inscrição** depois de pushes silenciosos. Nenhum clique leva ao app.
- **Impacto:** a retenção diária (ofensiva, meta) fica sem lembrete. O aluno ativa e "não funciona".
- **Correção:** passar para `injectManifest`, com um `sw.ts` próprio que faça `self.addEventListener('push', e => e.waitUntil(self.registration.showNotification(titulo, {body, icon, data:{url}})))` e `notificationclick` → `clients.openWindow(url)`. Outra opção é `workbox.importScripts: ['push-sw.js']`.
- **Teste de aceite:** um teste unitário do SW (ou um E2E com `context.serviceWorkers()`) dispara um evento `push` sintético e confere que `showNotification` foi chamado com o texto do payload. O `notificationclick` deve abrir `/aprender`.

### R2-02: Falha ao concluir a lição joga fora a lição
- **Categoria:** perda de rede / recuperação · **Severidade:** ALTA. Acontece no fim do fluxo principal, em rede móvel instável, e pode quebrar a ofensiva perto da meia-noite.
- **Estado:** CONFIRMADO.
- **Evidência:**
  - `Licao.tsx:141-159`: `concluir()` captura o erro, faz `setErro` e `setFase('erro')`.
  - `Licao.tsx:207`: `<ErroTela ... onTentar={() => void comecar()} />`. O `comecar()` chama `iniciarSessao`, que cria uma **sessão nova** (`estudo.ts:248-257`).
  - Do lado do servidor, `concluir` não é idempotente: `sessaoAberta` dispara `falha('sessao_encerrada')` se a sessão já tiver `concluidaEm` (`estudo.ts:359-360`). Se o commit aconteceu e a resposta se perdeu, repetir também não devolve o resumo.
- **Passos:** responder as 5 questões → no ENTENDI/CONTINUAR final, a rede cai → aparece "Sem conexão com a internet. Verifique sua rede e tente de novo." → TENTAR DE NOVO.
- **Esperado:** repetir apenas o `concluir` da mesma sessão (ou guardá-lo na fila) e mostrar o Fim e a Ofensiva.
- **Observado:** abre a mesma lição do zero, com questões sorteadas de novo. As respostas anteriores ficam numa sessão órfã (o XP por acerto já foi creditado). A lição não conta como concluída, nem a meta, nem a ofensiva.
- **Correção:**
  1. Na tela de erro da fase "fim", o `onTentar` deve chamar `concluir()` de novo.
  2. Tornar `concluir` idempotente: se a sessão estiver concluída, devolver o mesmo `ConcluirSessaoResposta`, recalculado ou guardado.
  3. Se `semConexao`, enfileirar com o mecanismo offline.
- **Teste de aceite:** um vitest com mock em que `sessaoConcluir` falha uma vez com status 0. Ao clicar TENTAR DE NOVO, a tela mostra o FimLicao **sem** nova chamada a `licaoIniciar`. Na API, chamar `concluir` duas vezes devolve 200 com o mesmo resumo.

### R2-03: Toast de "prova entregue" quando a entrega falhou, em laço
- **Categoria:** simulado / mensagem enganosa · **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO.
- **Evidência:**
  - `SimuladoProva.tsx:86-95`: um `setInterval` de 1 s chama `entregar(true)` sempre que `ms <= 0`.
  - Em `entregar`, quando a falha não é `simulado_encerrado`, o código faz `entregue.current = false` e chama `toast(mensagemDeErro(e), 'erro')` (linhas 70-72).
  - O `finally` da linha 80 sempre executa `if (automatica) toast('O tempo acabou e a prova foi entregue.', 'info')`.
- **Passos:** simulado em andamento → ficar sem rede → o relógio chega a 00:00.
- **Observado:** a cada segundo aparecem dois toasts: "Sem conexão…" e "O tempo acabou e a prova foi entregue.". O segundo é falso e os dois se repetem sem parar.
- **Impacto:** o aluno não sabe se a prova foi entregue. Na prática não perde nota, porque o servidor entrega automaticamente em `obterSimulado` (`simulado.ts:330-332`), mas a tela fica confusa e barulhenta.
- **Correção:** mover o toast de sucesso para o `try`, depois do `setQueryData`. Na falha, mostrar uma faixa fixa do tipo "O tempo acabou. Vamos entregar quando a conexão voltar" e tentar com backoff, não a cada 1 s.
- **Teste de aceite:** um vitest com timers falsos, `terminaEm` no passado e `simuladoEntregar` falhando 3 vezes deve produzir no máximo 1 toast de erro e nenhum toast "foi entregue". Quando a chamada passar, aparece 1 toast de entregue.

### R2-04: Pix "expirado" depois do pagamento deixa o aluno travado
- **Categoria:** pagamento · **Severidade:** MÉDIA. Afeta a primeira impressão de quem acabou de pagar R$ 397.
- **Estado:** CONFIRMADO.
- **Evidência:**
  - O polling só fica ativo com `estado === 'aguardando'` (`Pagamento.tsx:90`). O cronômetro local muda para `'expirado'` (linha 118) e o polling para.
  - GERAR NOVO PIX → `gerarPix` responde `falha('conflito', 'Seu acesso já está liberado.')` se `u.acesso` (`pagamento.ts:40`).
  - O cliente mostra `e.message` no estado `'erro'` (linhas 69-75), com o botão "TENTAR DE NOVO" (linha 185) chamando `gerar()` de novo: o mesmo conflito.
  - O redirecionamento da linha 52 depende de `me` ser buscado de novo, o que só acontece quando a janela volta a ter foco (`staleTime` de 10 s).
- **Passos:** pagar no banco nos últimos segundos → o webhook chega depois que o relógio local zerou → a tela mostra "Esse Pix expirou." → GERAR NOVO PIX.
- **Correção:**
  - No `catch` de `gerar`, quando `codigo === 'conflito'` (ou um código próprio como `acesso_liberado`), chamar `qc.invalidateQueries(CHAVES.me)` e ir para a celebração.
  - No estado `expirado`, manter um polling lento e mostrar "Se você já pagou, aguarde: o acesso libera sozinho".
- **Teste de aceite:** um vitest com `pagamentoPix` respondendo 409 "Seu acesso já está liberado." deve levar a "Pagamento confirmado!" ou a `/onboarding`.

### R2-05: Risco de cobrança dupla (cobrança antiga não cancelada no Asaas)
- **Categoria:** pagamento · **Severidade:** MÉDIA. Envolve dinheiro, mas exige uma sequência específica.
- **Estado:** FORTE INDÍCIO. Depende de o Asaas aceitar o QR antigo depois do `expirationDate` informado e dentro do `dueDate` D+1. Não testei no sandbox.
- **Evidência:**
  - `pagamento.ts:50-52`: o pendente expirado só recebe `status: 'vencido'` local. Não há `asaas.removerCobranca`, que existe e é usado só em `pagamentoManual.ts:131`.
  - `confirmarPagamento` aceita pedido `vencido` (só ignora `pago`/`estornado`, linha 179), então um segundo pagamento também vira `pago`, sem alerta de duplicidade.
- **Passos:** copiar o código Pix → deixar vencer na tela → gerar um novo → pagar os dois (dois aparelhos ou banco agendado).
- **Correção:** ao vencer ou substituir, chamar `DELETE /payments/{id}` no Asaas (com tolerância a erro). No webhook, se o usuário já tem acesso e chega um pagamento de outro pedido, registrar na auditoria e abrir um alerta de "pagamento em duplicidade" no painel super para o estorno.
- **Teste de aceite:** um teste da API com Asaas falso confere que `gerarPix` com pendente expirado chama `removerCobranca(idAntigo)`. Um webhook `PAYMENT_RECEIVED` de um segundo pedido para usuário com acesso gera o alerta.

### R2-06: SAIR apaga as respostas offline pendentes
- **Categoria:** offline / perda de dados · **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO.
- **Evidência:**
  - `sair()` → `limparLocal()` → `limparTudo()` executa `db.clear('sessoes')` e `db.clear('tentativas')` (`fila.ts:103-106`), sem chamar `sincronizar` antes.
  - O botão SAIR (`Configuracoes.tsx:329-338`) e "Sair da conta" (`Pagamento.tsx:261-268`) não pedem confirmação.
- **Passos:** fazer lições offline → antes de reconectar, tocar em SAIR.
- **Observado:** as respostas, o XP e a ofensiva daquelas lições somem sem aviso.
- **Correção:**
  1. Antes de sair, chamar `sincronizar()` se houver conexão.
  2. Se ainda houver pendências, pedir confirmação: "Você tem N respostas não enviadas. Se sair agora, elas serão perdidas."
- **Teste de aceite:** um vitest com 2 tentativas na fila mostra a confirmação. Ao cancelar, a fila continua com 2 itens.

### R2-07: Lição online não passa para offline quando a rede cai
- **Categoria:** offline · **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO.
- **Evidência:**
  - `sessaoOnline.responder` só chama `chamar('sessaoResponder')` (`motor.ts:79-97`) e não tem fallback. O fallback offline existe apenas em `iniciarSessao` (linhas 228-258).
  - A tela mostra `toast(mensagemDeErro(e), 'erro')` (`Licao.tsx:134-136`).
- **Observado:** o aluno no ônibus perde o sinal na questão 3 e cada VERIFICAR mostra "Sem conexão com a internet. Verifique sua rede e tente de novo.". Não dá para continuar, apesar de o pacote offline ter a lição.
- **Correção:** com `semConexao` em `responder`, enfileirar a tentativa (`registrarTentativa` com o `sessaoIdCliente` mapeado para a sessão do servidor, ou um endpoint de sync que aceite o `sessaoId` do servidor), corrigir localmente pelo pacote e seguir. Outra opção, mais simples: oferecer "Continuar offline" e reiniciar a lição pelo pacote.
- **Teste de aceite:** um vitest com mock em que `sessaoResponder` falha com status 0 e o pacote contém a lição: a folha de feedback aparece e a fila passa a ter 1 tentativa.

### R2-08: Sem retomada da lição depois de atualizar ou voltar
- **Categoria:** fluxo / refresh · **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO.
- **Evidência:** `iniciarLicao` sempre insere uma nova `sessoesEstudo` (`estudo.ts:248-257`), sem procurar uma sessão aberta da mesma lição. O botão Voltar do navegador e o gesto de voltar também não passam pela confirmação "Quer mesmo sair? Você perde o progresso desta lição." (`copy.ts:45`), que só cobre o ✕ e o Esc (`Licao.tsx:101-115`).
- **Impacto:** quem atualizou por engano na questão 9 de 10 recomeça do zero.
- **Correção:** ao iniciar, reaproveitar uma sessão `licao` não concluída da mesma lição aberta há menos de X horas, devolvendo as respostas já dadas e o índice. Na lição, usar `useBlocker` e `beforeunload` para mostrar a mesma confirmação.
- **Teste de aceite:** um teste da API em que `licaoIniciar` duas vezes seguidas devolve o mesmo `sessaoId` e as respostas anteriores. No vitest, o `history.back()` na lição abre a confirmação.

### R2-09: O onboarding esconde a falha do lembrete
- **Categoria:** onboarding / push · **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO.
- **Evidência:**
  - `Onboarding.tsx:53-57` monta o aviso "As notificações foram bloqueadas no navegador…" e a linha 71 navega na hora para `/aprender`, então o aviso nunca é lido.
  - Com `'indisponivel'` ou `'erro'` não há aviso nenhum. Mesmo assim, `lembreteHora` é salvo com `notificacoes:false` (linhas 60-66).
- **Impacto:** o aluno tocou em "Ativar lembrete", acha que o lembrete está ligado e não recebe nada. No iPhone, o push só funciona com o PWA instalado na tela inicial, e ninguém o orienta.
- **Correção:** com qualquer resultado diferente de `'ativado'`, ficar no passo 3 e mostrar uma mensagem específica: bloqueado, "Instale o app na tela inicial para receber lembretes (iPhone)" ou falha. O aluno decide entre continuar e tentar de novo.
- **Teste de aceite:** um vitest com `ativarPush` mockado para `'indisponivel'` deve mostrar a mensagem e não navegar.

### R2-10: Simulado de 4 h começa num toque
- **Categoria:** simulado / ação irreversível · **Severidade:** MÉDIA.
- **Estado:** CONFIRMADO.
- **Evidência:** `Simulado.tsx:131-140` usa `onClick={() => escolhido && criar.mutate(escolhido)}`, e o `onSuccess` navega para a prova. O relógio de 4 h é do servidor (`terminaEm`). Abandonar gera entrega automática, que entra no histórico como "ABAIXO".
- **Correção:** abrir uma confirmação com "4 horas · N questões · o tempo não pausa se você sair · cargo X".
- **Teste de aceite:** um vitest em que tocar em COMEÇAR SIMULADO abre o diálogo e `simuladoCriar` só é chamado depois de confirmar.

### R2-11: Editor de questão perde alterações
- **Categoria:** admin / formulário · **Severidade:** MÉDIA. O operador redige questões longas.
- **Estado:** CONFIRMADO.
- **Evidência:** o estado do formulário vive só em `useState` (`EditorQuestao.tsx:188`). Não há `beforeunload`, `useBlocker` nem rascunho local (grep sem resultado). "Voltar à lista" é um `<Link>` (linha 328). Um 401 em qualquer chamada leva a `/entrar` (`App.tsx:46`).
- **Correção:** marcar o formulário como alterado e bloquear a navegação com confirmação. Guardar um rascunho em `localStorage` por id da questão. Num 401 no admin, abrir um modal de relogin em vez de navegar.
- **Teste de aceite:** um vitest em que editar o enunciado e clicar em "Voltar à lista" abre a confirmação.

### R2-12: Resultado do simulado mostra o enunciado cru
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** `SimuladoProva.tsx:352` usa `<p className={s.qEnunciado}>{q.questao.enunciado}</p>`, enquanto a prova usa `<Markdown>` (linha 199). O `textoApoio` não aparece no resultado. Na linha 331, a nota "Os erros entraram na sua fila de revisão." é mostrada sem checar se houve erro. O filtro "Erradas (0)" não tem estado vazio.
- **Correção:** usar `<Markdown>` com o texto de apoio. Mostrar a nota só se houver erradas. Criar um estado vazio para o filtro.
- **Teste de aceite:** um vitest com enunciado `**negrito**` renderiza `<strong>`, e com 0 erros a nota não aparece.

### R2-13: Celular colado com +55 é cortado pelo maxLength
- **Severidade:** BAIXA · **Estado:** a lógica está CONFIRMADA por script. O corte do texto colado é comportamento do HTML (maxlength), não executado num navegador.
- **Evidência:** `Campo.tsx:66` (`maxLength: 15`) combinado com `limparCelular`, que só remove o "55" com 13 dígitos (`celular.ts:16-20`). Saída do script `scratchpad/r2/celular.mts`:
  ```
  "+55 42 99999-9999" -> truncado "+55 42 99999-99" -> limpo 55429999999 valido false mascara (55) 42999-9999
  "+55 (42) 99999-9999" -> truncado "+55 (42) 99999-" -> limpo 554299999 valido false mascara (55) 42999-99
  ```
- **Impacto:** quem cola da agenda vê um DDD errado e a mensagem de celular inválido.
- **Correção:** tirar o `maxLength` dos campos com máscara, porque a máscara já limita a 11 dígitos.
- **Teste de aceite:** um teste com `userEvent.paste('+55 42 99999-9999')` mostra "(42) 99999-9999". Num E2E Playwright, colar no campo dá o mesmo resultado.

### R2-14: Deep link perdido quando a sessão expira
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** `App.tsx:46` faz `navegar(destino, { replace: true })` sem `state`. `Guarda.tsx:29` também não guarda a origem. `Entrar.tsx:42` sempre usa `rotaDoProximo`.
- **Correção:** guardar `?voltar=` ou `state.de` e usar depois do login, quando o `proximo` for `aprender`.
- **Teste de aceite:** abrir `/revisar` sem sessão → entrar → cair em `/revisar`.

### R2-15: "Código copiado" falso
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** `Pagamento.tsx:125-135`. O fallback com `execCommand` não confere o retorno e o toast aparece sempre.
- **Correção:** usar o retorno do `execCommand`. Se falhar, mostrar "Selecione e copie o código acima".

### R2-16: Tempo restante parado no cartão "Simulado em andamento"
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** `Simulado.tsx:95-96` calcula `Date.now()` só no render, sem intervalo. Também usa o relógio do aparelho, enquanto a prova corrige o desvio pelo `sim.agora` (`SimuladoProva.tsx:54`).
- **Correção:** um tic de 1 s e o desvio do servidor.

### R2-17: Zonas da liga invisíveis ao leitor de tela
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** `Liga.tsx:89,108` usam `aria-hidden="true"` nos separadores de zona.
- **Correção:** incluir "zona de promoção" ou "zona de rebaixamento" no rótulo acessível de cada `<li>`.

### R2-18: Ações do painel super sem confirmação
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** `Comunicacao.tsx:170,214` (`cancelar.mutate(c.id)` direto) e `UsuarioFicha.tsx:86` (`revogar.mutate(x.id)`). Destoam do padrão `AcaoConfirmada` usado no resto do painel.
- **Correção:** usar uma confirmação simples, sem motivo obrigatório.

### R2-19: Configurações sem confirmação e campo "EXCLUIR" rígido
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:**
  - A troca de cargo é aplicada no `onChange` do `select` (`Configuracoes.tsx:161`), muda a trilha e não tem desfazer.
  - Comprar protetor gasta gemas sem confirmar (linhas 279-285).
  - `ExcluirContaEntrada.confirmacao` é `z.literal('EXCLUIR')` (`me.ts:116`), então "excluir" ou " EXCLUIR" falham.
  - O horário do lembrete só salva no `onBlur` (linha 208). No celular, sair da tela sem desfocar pode perder a alteração (HIPÓTESE).
- **Correção:**
  - Confirmar a troca de cargo.
  - Aplicar `trim().toUpperCase()` antes do literal.
  - Salvar o horário no `onChange` com debounce.

### R2-20: Inflar XP abandonando lições (hipótese)
- **Severidade:** BAIXA · **Estado:** HIPÓTESE.
- **Evidência:** o XP é creditado em `responder` (`estudo.ts:426-430`), independente de `concluir`. Uma lição recomeçada sorteia de novo (`sortearQuestoesDaLicao`). Não verifiquei se o sorteio exclui questões já respondidas hoje.
- **Verificação sugerida:** um teste da API com 10 ciclos de iniciar → responder certo → abandonar, medindo o `xpSemana`.

### R2-21: Exclusão de conta sem orientação sobre reembolso
- **Severidade:** BAIXA · **Estado:** CONFIRMADO.
- **Evidência:** o texto do modal (`Configuracoes.tsx:442`) é: "Seu perfil será anonimizado e você perde o acesso. O registro do pedido fica guardado por obrigação fiscal. Isso não pode ser desfeito." O admin tem um fluxo de arrependimento (`AcoesAcesso.tsx`, `dentroDoArrependimento`), mas o aluno não tem caminho nem informação.
- **Correção:** se o pedido está dentro do prazo de 7 dias, mostrar "Você ainda pode pedir reembolso" com link para o suporte antes de excluir.

---

## 3. Oportunidades (ELIMINAR → JUNTAR → AUTOMATIZAR → ANTECIPAR → CRIAR)

| Etapa | Oportunidade | Base |
|---|---|---|
| ELIMINAR | Tirar o `maxLength` dos campos mascarados (R2-13). Tirar o toast falso de entrega (R2-03) e o de cópia (R2-15). | Fundamentada |
| ELIMINAR | Tirar do estado de Pix "expirado" o beco sem saída do "Seu acesso já está liberado" (R2-04). | Fundamentada |
| JUNTAR | Um único mecanismo de "operação pendente" (fila offline) para responder **e** concluir. Hoje só a sessão offline tem fila (R2-02, R2-07). | Fundamentada |
| JUNTAR | Padronizar a confirmação de ações irreversíveis no app do aluno (simulado, cargo, sair com pendências) com o mesmo `Confirmacao` (R2-06, R2-10, R2-19). | Fundamentada |
| AUTOMATIZAR | Cancelar no Asaas a cobrança substituída e alertar duplicidade (R2-05). | Forte indício |
| AUTOMATIZAR | Sincronizar a fila antes do logout (R2-06). | Fundamentada |
| ANTECIPAR | Retomar a lição aberta depois de atualizar (R2-08). Orientar "instale na tela inicial" para push no iPhone (R2-09). Mostrar o prazo de arrependimento antes de excluir a conta (R2-21). | Fundamentada |
| ANTECIPAR | No Pix expirado, polling lento e o texto "se já pagou, aguarde" (R2-04). | Fundamentada |
| CRIAR | Service worker com push e clique (R2-01). Rascunho automático no editor admin (R2-11). | Fundamentada |
| CRIAR | Painel de "pagamentos em duplicidade" no super (R2-05). | Hipótese de necessidade |

---

## 4. Controles de UX bem feitos (verificados no código)

- **Formato de erro e pt-BR:** `cliente.ts:96-118` converte qualquer falha em `ErroApi` com mensagem pronta e fallback em `MENSAGENS_ERRO`. Sem rede, a mensagem é "Sem conexão com a internet. Verifique sua rede e tente de novo.".
- **Mesmo schema Zod no front e na API:** cadastro, login, redefinição e exclusão (`Cadastro.tsx:33`, `cliente.ts:142-147`), com erro por campo (`errosPorCampo`).
- **Conta existente:** o cadastro mostra "Já existe uma conta com este e-mail ou CPF. Entre com sua senha." com link Entrar, e a mensagem não diz se o dado é o e-mail ou o CPF.
- **Duplo clique em VERIFICAR:** fica bloqueado pelo estado `verificando` e pelo `disabled` do Botao3D. O servidor é idempotente por questão da sessão (`estudo.ts:394-401`).
- **Simulado:** entrega idempotente no servidor (`simulado.ts:240`, `if (s.entregueEm) return s`) e `ref` contra envio duplo no cliente. O relógio usa o horário do servidor (`desvio`). Atualizar a página recarrega as respostas do servidor. O servidor entrega automaticamente ao expirar.
- **Pix:** reaproveita o pendente válido (`pagamento.ts:47-49`), então atualizar ou voltar não gera cobrança nova. O webhook é idempotente. A liberação acontece sozinha, e o aluno pode fechar a aba que o acesso chega por webhook e e-mail.
- **D16 respeitada:** não há bloqueio com 0 vidas (`estudo.ts:242-245`), e o teste "com 0 vidas a lição inicia normalmente" passa.
- **Acessibilidade:**
  - `Modal` com `role="dialog"`, `aria-modal`, foco preso, Esc e devolução de foco.
  - `Campo` com label, `aria-invalid`, `aria-describedby` e erro em `role="alert"`.
  - Alternativas como `radiogroup` navegável por setas e teclas A–E.
  - Folha de feedback com `aria-live` e foco no botão.
  - Foco no `<main>` ao trocar de rota.
- **Estados vazios e de erro:** revisão vazia, liga sem participação, simulados sem histórico e trilha sem unidades têm Capi e CTA. Todas as consultas têm `ErroTela` com TENTAR DE NOVO.
- **LGPD:** exportação em JSON sem hash e sem segredo. A exclusão anonimiza, remove push e sessões e exige senha mais "EXCLUIR". O logout limpa o IndexedDB e os caches da API.
- **Painel super e admin:** `AcaoConfirmada` com motivo, reembolso com motivo e prazo, retirar prova com motivo, excluir unidade ou seção com modal.

---

## 5. O que foi inspecionado

- **Web:** `src/app/{App,Guarda,rotaInicial,Sincronizador,sair,push}.ts(x)`, `src/api/{cliente,consultas}.ts`, `src/offline/{motor,fila}.ts`, `src/telas/{Cadastro,Entrar,Recuperar,Pagamento,Onboarding,Aprender,Revisar,Liga,Configuracoes,formulario}.tsx`, `src/telas/licao/Licao.tsx`, `src/telas/simulado/{Simulado,SimuladoProva}.tsx`, `src/ui/{Campo,Modal,Botao3D,Alternativa,FolhaFeedback,Toast,NavInferior,NoTrilha,Layout(ErroTela)}.tsx`, `vite.config.ts` (PWA/workbox).
- **Admin/super:** `EditorQuestao`, `Concursos` (retirar), `Trilhas` (excluir), `Usuarios`, `AcoesAcesso`, `super/acoes`, `Comunicacao`, `UsuarioFicha`.
- **API:** `rotas/{auth,estudo}.ts`, `servicos/{estudo,pagamento,simulado,lgpd}.ts`. **Worker:** `jobs/lembretes.ts`. **Shared:** `api/auth.ts`, `api/me.ts`, `celular.ts`, `formatacao.ts`, `copy.ts`. **Docs:** `DECISOES.md` (D16 e D17).

## 6. O que foi testado (comandos e resultados reais)

1. `pnpm --filter @fuse/web exec vitest run src/telas/telas.test.tsx src/offline/offline.test.ts src/ui/ui.test.tsx src/api/cliente.test.ts` → **4 arquivos e 38 testes passaram** (48 s). Isso inclui cadastro com erros por campo, conta existente, Pix → onboarding, lição completa por teclado, confirmação de saída, 0 vidas e axe em revisar, liga, perfil e simulado.
   - Observação do coordenador sobre a linha de base: `telas.test.tsx` falhou 1 vez sob carga, com o cadastro preso em "Carregando…", e passou 8/8 isolado. Na minha execução isolada passou. A falha parece ligada a timeout ou carga (lazy import e Suspense) e não a uma regressão. Fica registrada como instabilidade de teste, não como achado de UX.
2. `npx tsx scratchpad/r2/celular.mts` → saída reproduzida em R2-13. Ela simula o corte pelo `maxLength=15` usando `packages/shared/src/celular.ts`.

## 7. O que não foi testado e limitações

- Sem UI real, sem E2E e sem navegador: o comportamento do `maxlength` ao colar, a notificação genérica do Chrome e a revogação no Safari (R2-01, R2-13) foram inferidos da especificação e do código.
- Sem sandbox do Asaas: a possibilidade de pagar o QR antigo (R2-05) não foi verificada.
- Não li em detalhe: `BoasVindas`, `Perfil`, `Guia`, `SobreConcurso`, `FimLicao`, `Ofensiva`, `Reportar`, `admin/{Questoes,Importacoes,Edital,Pedidos,Reports}` e as telas super além das citadas.
- Não medi contraste nem responsividade (exigiria renderização e capturas). O visual depende de `design/tokens.css`, que não auditei.
- Não escrevi testes que provem R2-02, R2-03, R2-04 e R2-07 em execução, porque o modo é só auditoria e os scripts ficam só no scratchpad, onde o vitest do `apps/web` não resolve os aliases. Os testes de aceite propostos acima servem para isso.
