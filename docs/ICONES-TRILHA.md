# Ícones das trilhas

Cada trilha tem uma cor e uma coleção de ícones 3D própria, para os nós não ficarem repetidos e
cada assunto ter identidade visual. As cores e o código estão em `apps/web/src/telas/temaTrilha.ts`.

## Como a trilha usa os ícones

- **Tema da unidade:** pela disciplina (Português, Matemática, Conhecimentos Gerais). Em
  Conhecimentos Específicos, pela área do cargo (7 áreas). São **10 temas**.
- **Cada tema tem 10 imagens:** 6 ícones de lição, baú, baú aberto, troféu e emblema.
- **Lição:** o nó mostra um dos 6 ícones, em ordem, voltando ao primeiro depois do sexto, então duas
  lições seguidas nunca repetem o ícone.
- **Estado do nó** (feito pelo código, sem imagem extra):
  - concluída: cor cheia com selo verde de check;
  - atual: brilho, anel de progresso e balão "COMEÇAR";
  - bloqueada: o mesmo ícone, lavado e em cinza, com selo de cadeado.
- **Baú e troféu:** têm os seus ícones, no tom do tema. O baú aberto aparece depois de aberto.
- **Emblema:** aparece no banner da unidade, ao lado do botão Guia.
- **Sem a coleção, nada quebra:** o nó usa os ícones simples de hoje. Dá para entregar um tema
  por vez.

## Arquivos

PNG 512×512, fundo **transparente**, sRGB, em
`Fuse_Aprova_Assets_4K/trilha/<tema>/<nome>.png`, com os nomes:

`licao-1` `licao-2` `licao-3` `licao-4` `licao-5` `licao-6` `bau` `bau-aberto` `trofeu` `emblema`

Temas (nome da pasta e cor): `portugues` turquesa #0E9A98 · `matematica` laranja #FF7A2E ·
`gerais` azul #3B82F6 · `administrativo` roxo #8B5CF6 · `saude_medio` verde #22A06B ·
`saude_superior` rosa #EC4899 · `educacao` amarelo #F2B100 · `operacional` lima #7CB518 ·
`servicos_gerais` magenta #C026D3 · `social_juridico` vinho #B0173F.

Depois de gerar, converta e confira (avisa o que faltar e recusa tamanho ou fundo errado):

```bash
pnpm --filter @fuse/web assets:trilha
```

Os WebP saem em `apps/web/src/assets/trilha/` (192 px; emblema 256 px) e entram no app sozinhos.
Para o app nativo, rode `pnpm --filter @fuse/mobile sync` em seguida.

## Prompt para o Codex

Veja o bloco "Prompt para o Codex" na resposta que acompanha este commit, ou use o texto abaixo.

```text
Crie a coleção de ícones das trilhas do app "Fuse Aprova", no repositório C:\FuseDev\fuseaprova.
Só crie imagens nas pastas indicadas; não altere código.

ESTILO (igual em todos, para parecerem da mesma família)
- Ícones 3D "de brinquedo", acabamento macio e fosco, iluminação suave de estúdio vinda de cima à
  esquerda, bordas arredondadas, sombra de contato leve embaixo. Mesma linguagem da mascote Capi
  (referências: Fuse_Aprova_Assets_4K/mascote, Fuse_Aprova_Assets_4K/icones, Catalogo_visual.jpg).
- Cada ícone é UM objeto, simples e legível a 54 px, silhueta clara, centralizado. Sem texto, sem
  letras (exceto onde a lista pede), sem moldura, sem fundo, sem personagens.
- O botão da trilha JÁ tem a cor do tema, então o ícone NÃO pode ser dessa cor. Cada objeto usa as
  suas cores naturais e cores variadas e vivas (amarelo, vermelho, laranja, azul, verde, rosa,
  roxo, creme, dourado), 2 ou 3 por ícone. A cor do tema aparece em no máximo 25% do ícone, só como
  detalhe. Os 6 ícones de lição têm cor principal diferente entre si. Nada de preto puro.
- Os 6 ícones de lição de um mesmo tema devem ser objetos DIFERENTES entre si (nada de variações
  da mesma coisa).
- PROIBIDO: coruja, qualquer personagem, cor ou elemento que lembre o Duolingo; logotipos; texto
  em outro idioma; símbolos de governo, prefeitura ou banca.

FORMATO
- PNG 512×512, fundo TRANSPARENTE de verdade (canal alfa), sRGB.
- O objeto ocupa cerca de 75% da altura e fica inteiro dentro do círculo central de 440 px, com
  respiro nas bordas. O emblema pode ocupar 85%.
- Salve em Fuse_Aprova_Assets_4K/trilha/<tema>/<nome>.png.

ARQUIVOS DE CADA TEMA (10 por tema)
licao-1, licao-2, licao-3, licao-4, licao-5, licao-6: os 6 objetos do tema (lista abaixo)
bau: baú do tesouro fechado, nas cores do tema
bau-aberto: o mesmo baú aberto, com brilho dourado saindo de dentro
trofeu: taça de troféu nas cores do tema, com detalhe dourado
emblema: medalhão redondo com o objeto mais característico do tema em relevo, 85% do quadro

TEMAS (pasta, cor principal, os 6 objetos das lições em ordem)
1. portugues, turquesa #0E9A98: lápis; livro aberto; balão de fala com aspas; lupa sobre uma folha
   de texto; pena com tinteiro; a letra "à" (a com crase) em relevo, a única com letra.
2. matematica, laranja #FF7A2E: calculadora; régua e esquadro; símbolo de porcentagem em relevo;
   compasso; gráfico de barras; balança de dois pratos com moedas.
3. gerais, azul #3B82F6: globo terrestre; jornal dobrado; mapa com pino de localização; pergaminho
   com selo; lâmpada acesa; megafone.
4. administrativo, roxo #8B5CF6: pasta de arquivo; monitor de computador; prancheta com checklist;
   carimbo; envelope com carta; grampeador.
5. saude_medio, verde #22A06B: estetoscópio; seringa; curativo adesivo; termômetro; frasco com
   gotas; coração com linha de pulso.
6. saude_superior, rosa #EC4899: caduceu; microscópio; DNA em dupla hélice; cápsula de remédio;
   tubo de ensaio; cruz médica com coração.
7. educacao, amarelo #F2B100: lousa com giz; maçã; mochila escolar; lápis de cor; sino da escola;
   blocos de montar de criança.
8. operacional, lima #7CB518: chave inglesa; engrenagem; caminhão de frente; capacete de obra;
   volante; pneu.
9. servicos_gerais, magenta #C026D3: vassoura; balde com espuma; panela com tampa; luvas de
   borracha; borrifador de limpeza; planta em vaso com regador.
10. social_juridico, vinho #B0173F: balança da justiça; martelo de juiz; livro de leis; contrato
    com caneta; escudo; calculadora contábil.

Para o baú, o troféu e o emblema, use a cor principal do tema e o dourado #FFC233 de acento.

ENTREGA EM LOTES: faça um tema por vez (10 imagens), na ordem acima. Ao terminar cada tema, rode
  pnpm --filter @fuse/web assets:trilha
e mostre uma folha de contato dos 10 ícones do tema (5 por linha, 128 px, fundo creme #FAF8F2)
junto de uma versão a 54 px. Se o comando avisar tamanho ou fundo errado, corrija antes de seguir.

NO FIM
1. Confirme que as 100 imagens existem e que o comando acima converteu 100 de 100.
2. Mostre uma folha com os 10 baús e os 10 troféus lado a lado, para conferir a família.
3. Commit "feat(web): coleção de ícones das trilhas", sem push.
```
