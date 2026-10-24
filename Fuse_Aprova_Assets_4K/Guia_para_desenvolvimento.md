# Fuse Aprova — assets para desenvolvimento

## Entrega

37 assets PNG independentes, com canal alfa real e maior dimensão de 4096 px. Personagens: 2730 × 4096; logos: 4096 × 2048; ícones, símbolo e elementos: 4096 × 4096. As imagens foram geradas em resolução menor e ampliadas por reamostragem Lanczos com tratamento de alfa pré-multiplicado. Não são renders nativos 4K, vetores nem modelos 3D editáveis.

O mascote foi redesenhado com focinho largo e alongado, orelhas pequenas, corpo arredondado, patas curtas e lenço turquesa. Usar esta versão em lugar do mascote das propostas anteriores. O nome oficial é Fuse Aprova, com S.

## Organização

- `mascote/`: seis poses de corpo inteiro.
- `marca/`: logo completa, só tipografia e símbolo da capivara.
- `icones/`: 26 ícones ilustrados com volume 3D.
- `elementos/`: faísca e confetes.
- `manifest.json`: inventário com dimensões, resolução de origem de cada PNG.
- `Catalogo_visual.jpg`: índice visual; seu fundo quadriculado é apenas uma demonstração da transparência.

## Aplicação nas 12 telas

| Tela | Assets sugeridos |
| --- | --- |
| Boas-vindas | logo_completa, mascote_boas_vindas, icone_localizacao, elemento_faisca |
| Cadastro | logo_tipografia, mascote_incentivando, icone_visibilidade, icone_cadeado |
| Pagamento Pix | icone_coroa_acesso, icone_pagamento_pix, icone_copiar, icone_relogio, icone_acerto |
| Início | mascote_estudando, icone_calendario, icone_xp, icone_play, icone_alvo, quatro ícones de disciplinas |
| Questão | icone_livro_portugues, icone_dica, icone_simulados |
| Resposta correta | mascote_celebrando, icone_acerto, icone_xp |
| Resposta incorreta | mascote_incentivando, icone_erro, icone_revisao, icone_dica |
| Treino concluído | mascote_celebrando, elemento_confetes, icone_xp, icone_alvo, icone_relogio, icone_progresso |
| Constância | mascote_constancia, icone_calendario, icone_alvo, icone_acerto |
| Revisão | mascote_explicando, icone_revisao, quatro ícones de disciplinas, icone_relogio |
| Liga | icone_liga, icone_medalha, icone_xp, icone_relogio, icone_progresso |
| Perfil | simbolo_capivara, icone_perfil, icone_configuracoes, icone_coroa_acesso, icone_progresso, quatro ícones de disciplinas |

Navegação compartilhada: icone_inicio, icone_revisao, icone_simulados, icone_liga, icone_perfil.

## Implementação

1. Exibir com proporção preservada: `object-fit: contain`. As margens transparentes integram o canvas; não esticar.
2. Usar os arquivos 4K como matrizes. Gerar versões menores e WebP/AVIF para carregamento na aplicação; não baixar todos os PNGs 4K na navegação inicial.
3. Referências de tamanho visual: ícones de navegação 24–32 CSS px; ícones de card 40–64 px; ilustrações 120–240 px; mascote de boas-vindas 240–360 px. Conferir legibilidade dos detalhes pequenos no dispositivo.
4. Estados ativo/inativo, barras de progresso, fundos, botões, campos, setas simples, textos e gráficos reais devem ser componentes de interface. Não estão incorporados às ilustrações.
5. O QR Code Pix deve ser gerado com o payload real do provedor. O ícone ilustrativo de pagamento não é QR Code nem marca oficial certificada do Pix.
6. Para acessibilidade, manter rótulos nas ações e não depender apenas de cor. Ilustrações decorativas: `alt=""`; imagem significativa: texto alternativo curto.
7. Lettering da logo é ilustrado; o PNG de tipografia não é arquivo de fonte. Os renders não incluem malha, rig ou animação.

## Cores de referência

Petróleo #00545D; turquesa #008A92; laranja #FF6A16; marfim #FAF8F2; texto #123F42. Luzes e sombras dos renders produzem variações naturais dessas cores.

## Escopo

Este pacote fornece os assets da nova linguagem 3D. As imagens das telas entregues anteriormente continuam sendo referências de composição; elas não foram renderizadas novamente com este mascote.
