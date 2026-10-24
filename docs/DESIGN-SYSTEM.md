# Fuse Aprova: Design System

Este documento define o visual do app. As 13 telas em `design/png` e `design/html` são a referência visual. Os tokens estão em `design/tokens.css`. Quando uma tela não foi desenhada (veja a seção "Telas sem desenho" no PRD), ela deve ser montada com os componentes descritos aqui.

O estilo segue a linha do Duolingo: botões gordos e arredondados com sombra sólida embaixo, uma trilha em zigue-zague, cores vivas e um mascote. **A identidade é própria.** Não use a coruja, a marca, os sons nem as ilustrações do Duolingo.

## 1. Princípios

1. **Uma ação por tela.** O botão principal fica sempre embaixo, com a largura toda, e é verde.
2. **Feedback imediato.** Acerto e erro aparecem numa folha colorida que sobe de baixo, com a explicação. O aluno nunca fica sem saber o porquê.
3. **Texto grande e direto.** O corpo do texto tem no mínimo 15 px, e enunciados e alternativas têm 15 a 16 px. A linguagem é simples, sem jargão de concurseiro.
4. **Origem sempre visível.** Toda questão real mostra o chip "FAU-Unicentro · Órgão · Ano".
5. **Mobile primeiro.** A tela de referência tem 390×844. No desktop, o app fica centralizado numa coluna de no máximo 480 px.

## 2. Cores

| Papel | Token | Hex | Uso |
|---|---|---|---|
| Ação principal | `--fa-green` / `--fa-green-shade` | #15803D / #0F5F2D | VERIFICAR, CONTINUAR, COMEÇAR |
| Marca | `--fa-orange` / `--fa-orange-shade` | #D9480F / #A8380B | banner da unidade, wordmark, ofensiva |
| Nó atual | `--fa-orange-bright` | #FF6A1F | nó "COMEÇAR" da trilha |
| Seleção | `--fa-blue` + `--fa-blue-soft` + `--fa-blue-line` | #1D6FE0 | alternativa marcada, gemas, Revisar |
| Erro | `--fa-red` + `--fa-red-soft` | #DC2626 | alternativa errada, folha de erro, vidas |
| XP e concluído | `--fa-gold` / `--fa-gold-shade` | #FFC233 / #D99A00 | nós concluídos, XP, liga |
| Simulado | `--fa-purple` / `--fa-purple-shade` | #8B5CF6 / #6D3FE0 | aba e telas de simulado |
| Bloqueado | `--fa-locked` / `--fa-locked-shade` | #E5E7EB / #C4C8CF | nós bloqueados |
| Texto | `--fa-ink`, `--fa-muted`, `--fa-faint` | #2D2F36, #6B7079, #9AA0AA | |

Texto branco só deve ir sobre verde, laranja (#D9480F), azul, vermelho ou roxo. Sobre o dourado, use `--fa-gold-ink`. Nunca use a cor como único sinal: acerto e erro também levam ícone (✓ ou ✕) e texto.

## 3. Tipografia

| Estilo | Fonte | Peso | Tamanho |
|---|---|---|---|
| Display (título de tela de celebração) | Baloo 2 | 800 | 34–40 |
| Título de tela | Baloo 2 | 700 | 23–26 |
| Título de seção | Baloo 2 | 700 | 18–20 |
| Número grande (XP, ofensiva) | Baloo 2 | 800 | 20–64 |
| Enunciado | Nunito | 800 | 16 |
| Alternativa e corpo | Nunito | 700 | 15 |
| Botão | Nunito | 900, MAIÚSCULAS, letter-spacing .06em | 15–16 |
| Rótulo de campo | Nunito | 900 | 14 |
| Legenda e meta | Nunito | 700–800 | 12–13 |

As fontes ficam auto-hospedadas (`design/fonts`), sem Google Fonts em produção.

## 4. Componentes

### Botão 3D
- Altura de 54 px (o botão secundário compacto tem 44 px). Raio de 16 px.
- Fundo na cor do papel. `box-shadow: 0 5px 0 <shade>`.
- **Pressionado:** `transform: translateY(4px)` e `box-shadow: 0 1px 0 <shade>`, com transição de 80 ms.
- **Desabilitado:** fundo `--fa-locked`, texto `--fa-faint`, sombra `--fa-locked-shade`. O VERIFICAR fica assim até o aluno marcar uma alternativa.
- **Variantes:**
  - primário verde;
  - secundário (fundo branco, borda 2 px `--fa-line`, sombra `--fa-line`, texto azul);
  - perigo vermelho (ENTENDI após um erro);
  - roxo (simulado);
  - azul (copiar Pix).

### Alternativa (cartão de resposta)
- Altura mínima de 54–56 px, borda de 2 px, raio de 16, sombra `0 4px 0`.
- Uma "tecla" quadrada de 30 px traz a letra A–E.
- Estados (veja as telas 05, 06 e 07):

| Estado | Visual |
|---|---|
| Neutro | borda `--fa-line` |
| Selecionada | azul suave, borda e sombra `--fa-blue-line`, texto `--fa-blue-shade` |
| Correta | verde suave, borda `--fa-green-line`, tecla verde com ✓ |
| Errada marcada | vermelho suave, tecla vermelha com ✕ |
| Correta revelada após erro | borda tracejada verde |
| Demais após responder | texto `--fa-faint` |

- Toda a alternativa é clicável. Use `role="radio"` dentro de um `radiogroup`. As teclas 1–5 e A–E do teclado selecionam, e Enter verifica.

### Folha de feedback
- Fica fixa embaixo e cobre o rodapé. Sobe com uma animação de 200 ms.
- **Acerto:** fundo `--fa-green-soft`, título "Mandou bem!" (há variações; veja o PRD), selo +XP e explicação curta.
- **Erro:** fundo `--fa-red-soft`, título "Resposta correta: X", explicação, cartão branco com "Dica de bolso" e a linha "Essa questão volta na sua revisão amanhã".
- Use `role="status"` para que leitores de tela anunciem.

### Barra de progresso da lição
- 16 px de altura, raio de 8, trilho `--fa-line` e preenchimento verde com um brilho interno (uma faixa branca de 35% com 4 px).

### Cabeçalho da Trilha
- Chip do concurso ("PAL · FAU"), ofensiva (chama), gemas (diamante) e vidas (coração), nessa ordem.

### Banner da unidade
- Fundo laranja com sombra laranja-escura e raio de 16.
- À esquerda, "UNIDADE n · SEÇÃO n" e o título. À direita, um botão "Guia" (livro) separado por uma divisória.

### Nós da trilha
- Círculo de 76×70 com sombra de 7 px.
- **Tipos:** concluído (dourado com estrela), atual (laranja com play, anel de progresso e balão "COMEÇAR"), bloqueado (cinza com cadeado), baú (quadrado arredondado) e troféu (fim da unidade).
- O zigue-zague alterna os deslocamentos horizontais (0, −56, −112, −56, 0, +56…) a partir do centro.
- Entre unidades fica um divisor com o nome da próxima unidade.

### Barra de navegação inferior
- 74 px de altura e 5 itens: Aprender, Revisar, Simulado, Liga, Perfil.
- Os ícones são coloridos e preenchidos, de 30 px.
- O item ativo ganha uma caixa de 54×50 com borda de 2 px e fundo suave na cor da aba (azul em Aprender e Revisar, roxo em Simulado, dourado em Liga, verde em Perfil).
- O selo vermelho em Revisar mostra quantas revisões estão pendentes.

### Chips
- Raio de 8, texto de 12 px peso 900. São usados para a origem da questão, COMBO, ACESSO COMPLETO e assim por diante.

### Campo de formulário
- 50 px de altura, borda de 2 px `--fa-line`, fundo `--fa-surface-soft`, raio de 14.
- O rótulo fica sempre visível acima do campo. A mensagem de erro vai abaixo, em vermelho, com ícone.

### Cartões de estatística
- Borda de 2 px, raio de 14, ícone de 26 px, valor em Baloo 2 com 20 px e legenda de 12 px.

## 5. Mascote: Capi

Capi é uma capivara com bandana laranja. Os arquivos estão em `design/mascote/`:

| Arquivo | Quando usar |
|---|---|
| `capi-neutra.svg` | trilha, cadastro, telas neutras |
| `capi-feliz.svg` | boas-vindas, acerto |
| `capi-pensando.svg` | ao lado do enunciado |
| `capi-oculos.svg` | revisão e estudo |
| `capi-comemorando.svg` | fim de lição, subir na liga, aprovação no simulado |

Faltam duas poses, que o implementador deve criar no mesmo traço: **triste** (erro ou ofensiva perdida) e **dormindo** (lembrete de ofensiva). Capi fala por balões de borda cinza com um rabicho. O tom é amigo, curto e em português coloquial.

## 6. Ícones

Os ícones são SVG inline. Não use emoji. Há dois estilos:
- **Preenchidos coloridos:** barra de navegação, contadores, nós.
- **Traço de 2,2–3 px com pontas arredondadas:** ações como voltar, fechar, copiar e configurações.

Os desenhos estão nas telas HTML e podem ser copiados para componentes. Lucide também é aceitável para os ícones de traço, porque é instalado via npm e não depende de CDN.

## 7. Movimento
- Botões: 80 ms.
- Folhas: 200 ms ease-out.
- Barra de progresso: 300 ms.
- Celebração no fim da lição: confete em canvas por 1,2 s e Capi pulando uma vez.
- Respeite `prefers-reduced-motion`: sem confete e sem pulo.

## 8. Sons e vibração (opcional, desligável em Configurações)
- Acerto: um som curto e vibração de 20 ms.
- Erro: um som grave e vibração de 2×40 ms.
- Os sons devem ser originais, ou CC0 hospedados no próprio servidor.

## 9. Acessibilidade
- Contraste AA em todo texto. Alvo de toque de no mínimo 48 px.
- Foco visível com anel azul de 3 px.
- Tudo funciona por teclado, inclusive a lição: 1–5 para escolher, Enter para verificar e continuar, Esc para sair.
- Os ícones decorativos levam `aria-hidden`. Os botões só com ícone levam `aria-label`.
- A barra de progresso usa `role="progressbar"` com `aria-valuenow`.
