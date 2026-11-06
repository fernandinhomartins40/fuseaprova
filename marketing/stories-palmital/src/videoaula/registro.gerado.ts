import { criarVideoaula, Roteiro } from './modelo';

import r0 from '../../roteiros/adjunto-adverbial.json';
import n0 from './narracao/adjunto-adverbial.json';
import r1 from '../../roteiros/adverbios-circunstancias.json';
import n1 from './narracao/adverbios-circunstancias.json';
import r2 from '../../roteiros/areas-figuras-planas.json';
import n2 from './narracao/areas-figuras-planas.json';
import r3 from '../../roteiros/aumentos-sucessivos.json';
import n3 from './narracao/aumentos-sucessivos.json';
import r4 from '../../roteiros/classes-de-palavras.json';
import n4 from './narracao/classes-de-palavras.json';
import r5 from '../../roteiros/concordancia.json';
import n5 from './narracao/concordancia.json';
import r6 from '../../roteiros/conectivos-relacoes-de-sentido.json';
import n6 from './narracao/conectivos-relacoes-de-sentido.json';
import r7 from '../../roteiros/contagem-principio-multiplicativo.json';
import n7 from './narracao/contagem-principio-multiplicativo.json';
import r8 from '../../roteiros/conversao-de-unidades.json';
import n8 from './narracao/conversao-de-unidades.json';
import r9 from '../../roteiros/crase.json';
import n9 from './narracao/crase.json';
import r10 from '../../roteiros/custo-fixo-variavel-lucro.json';
import n10 from './narracao/custo-fixo-variavel-lucro.json';
import r11 from '../../roteiros/datas-idades-calendario.json';
import n11 from './narracao/datas-idades-calendario.json';
import r12 from '../../roteiros/digrafo-encontro-consonantal.json';
import n12 from './narracao/digrafo-encontro-consonantal.json';
import r13 from '../../roteiros/divisao-silabica.json';
import n13 from './narracao/divisao-silabica.json';
import r14 from '../../roteiros/equacao-segundo-grau.json';
import n14 from './narracao/equacao-segundo-grau.json';
import r15 from '../../roteiros/formacao-de-palavras.json';
import n15 from './narracao/formacao-de-palavras.json';
import r16 from '../../roteiros/fracoes-de-uma-quantidade.json';
import n16 from './narracao/fracoes-de-uma-quantidade.json';
import r17 from '../../roteiros/funcao-primeiro-grau.json';
import n17 from './narracao/funcao-primeiro-grau.json';
import r18 from '../../roteiros/hiato-ditongo-tritongo.json';
import n18 from './narracao/hiato-ditongo-tritongo.json';
import r19 from '../../roteiros/horas-e-minutos.json';
import n19 from './narracao/horas-e-minutos.json';
import r20 from '../../roteiros/interpretacao-o-que-o-texto-nao-diz.json';
import n20 from './narracao/interpretacao-o-que-o-texto-nao-diz.json';
import r21 from '../../roteiros/letras-e-sons.json';
import n21 from './narracao/letras-e-sons.json';
import r22 from '../../roteiros/media-simples-ponderada.json';
import n22 from './narracao/media-simples-ponderada.json';
import r23 from '../../roteiros/mediana-moda.json';
import n23 from './narracao/mediana-moda.json';
import r24 from '../../roteiros/multiplicar-dividir-arredondar.json';
import n24 from './narracao/multiplicar-dividir-arredondar.json';
import r25 from '../../roteiros/numeros-decimais.json';
import n25 from './narracao/numeros-decimais.json';
import r26 from '../../roteiros/oracoes-substantivas.json';
import n26 from './narracao/oracoes-substantivas.json';
import r27 from '../../roteiros/oxitonas-monossilabos.json';
import n27 from './narracao/oxitonas-monossilabos.json';
import r28 from '../../roteiros/paroxitonas.json';
import n28 from './narracao/paroxitonas.json';
import r29 from '../../roteiros/porcentagem-parte-total.json';
import n29 from './narracao/porcentagem-parte-total.json';
import r30 from '../../roteiros/preco-troco-lucro.json';
import n30 from './narracao/preco-troco-lucro.json';
import r31 from '../../roteiros/preposicoes.json';
import n31 from './narracao/preposicoes.json';
import r32 from '../../roteiros/progressao-aritmetica-geometrica.json';
import n32 from './narracao/progressao-aritmetica-geometrica.json';
import r33 from '../../roteiros/raciocinio-logico.json';
import n33 from './narracao/raciocinio-logico.json';
import r34 from '../../roteiros/razao-divisao-proporcional.json';
import n34 from './narracao/razao-divisao-proporcional.json';
import r35 from '../../roteiros/referencia-pronominal.json';
import n35 from './narracao/referencia-pronominal.json';
import r36 from '../../roteiros/regra-de-tres.json';
import n36 from './narracao/regra-de-tres.json';
import r37 from '../../roteiros/s-final-plural.json';
import n37 from './narracao/s-final-plural.json';
import r38 from '../../roteiros/sequencias-repetitivas.json';
import n38 from './narracao/sequencias-repetitivas.json';
import r39 from '../../roteiros/sinonimos-antonimos-contexto.json';
import n39 from './narracao/sinonimos-antonimos-contexto.json';
import r40 from '../../roteiros/sistemas-de-equacoes.json';
import n40 from './narracao/sistemas-de-equacoes.json';
import r41 from '../../roteiros/tabela-de-frequencia.json';
import n41 from './narracao/tabela-de-frequencia.json';
import r42 from '../../roteiros/tema-central-do-texto.json';
import n42 from './narracao/tema-central-do-texto.json';
import r43 from '../../roteiros/tempos-e-modos-verbais.json';
import n43 from './narracao/tempos-e-modos-verbais.json';
import r44 from '../../roteiros/termos-da-oracao.json';
import n44 from './narracao/termos-da-oracao.json';
import r45 from '../../roteiros/tipos-e-generos-textuais.json';
import n45 from './narracao/tipos-e-generos-textuais.json';
import r46 from '../../roteiros/virgula.json';
import n46 from './narracao/virgula.json';
import r47 from '../../roteiros/volume-capacidade.json';
import n47 from './narracao/volume-capacidade.json';

// Gerado por scripts/lote.py.
export const videoaulas = [
  { id: 'adjunto-adverbial', ...criarVideoaula(r0 as unknown as Roteiro, n0) },
  { id: 'adverbios-circunstancias', ...criarVideoaula(r1 as unknown as Roteiro, n1) },
  { id: 'areas-figuras-planas', ...criarVideoaula(r2 as unknown as Roteiro, n2) },
  { id: 'aumentos-sucessivos', ...criarVideoaula(r3 as unknown as Roteiro, n3) },
  { id: 'classes-de-palavras', ...criarVideoaula(r4 as unknown as Roteiro, n4) },
  { id: 'concordancia', ...criarVideoaula(r5 as unknown as Roteiro, n5) },
  { id: 'conectivos-relacoes-de-sentido', ...criarVideoaula(r6 as unknown as Roteiro, n6) },
  { id: 'contagem-principio-multiplicativo', ...criarVideoaula(r7 as unknown as Roteiro, n7) },
  { id: 'conversao-de-unidades', ...criarVideoaula(r8 as unknown as Roteiro, n8) },
  { id: 'crase', ...criarVideoaula(r9 as unknown as Roteiro, n9) },
  { id: 'custo-fixo-variavel-lucro', ...criarVideoaula(r10 as unknown as Roteiro, n10) },
  { id: 'datas-idades-calendario', ...criarVideoaula(r11 as unknown as Roteiro, n11) },
  { id: 'digrafo-encontro-consonantal', ...criarVideoaula(r12 as unknown as Roteiro, n12) },
  { id: 'divisao-silabica', ...criarVideoaula(r13 as unknown as Roteiro, n13) },
  { id: 'equacao-segundo-grau', ...criarVideoaula(r14 as unknown as Roteiro, n14) },
  { id: 'formacao-de-palavras', ...criarVideoaula(r15 as unknown as Roteiro, n15) },
  { id: 'fracoes-de-uma-quantidade', ...criarVideoaula(r16 as unknown as Roteiro, n16) },
  { id: 'funcao-primeiro-grau', ...criarVideoaula(r17 as unknown as Roteiro, n17) },
  { id: 'hiato-ditongo-tritongo', ...criarVideoaula(r18 as unknown as Roteiro, n18) },
  { id: 'horas-e-minutos', ...criarVideoaula(r19 as unknown as Roteiro, n19) },
  { id: 'interpretacao-o-que-o-texto-nao-diz', ...criarVideoaula(r20 as unknown as Roteiro, n20) },
  { id: 'letras-e-sons', ...criarVideoaula(r21 as unknown as Roteiro, n21) },
  { id: 'media-simples-ponderada', ...criarVideoaula(r22 as unknown as Roteiro, n22) },
  { id: 'mediana-moda', ...criarVideoaula(r23 as unknown as Roteiro, n23) },
  { id: 'multiplicar-dividir-arredondar', ...criarVideoaula(r24 as unknown as Roteiro, n24) },
  { id: 'numeros-decimais', ...criarVideoaula(r25 as unknown as Roteiro, n25) },
  { id: 'oracoes-substantivas', ...criarVideoaula(r26 as unknown as Roteiro, n26) },
  { id: 'oxitonas-monossilabos', ...criarVideoaula(r27 as unknown as Roteiro, n27) },
  { id: 'paroxitonas', ...criarVideoaula(r28 as unknown as Roteiro, n28) },
  { id: 'porcentagem-parte-total', ...criarVideoaula(r29 as unknown as Roteiro, n29) },
  { id: 'preco-troco-lucro', ...criarVideoaula(r30 as unknown as Roteiro, n30) },
  { id: 'preposicoes', ...criarVideoaula(r31 as unknown as Roteiro, n31) },
  { id: 'progressao-aritmetica-geometrica', ...criarVideoaula(r32 as unknown as Roteiro, n32) },
  { id: 'raciocinio-logico', ...criarVideoaula(r33 as unknown as Roteiro, n33) },
  { id: 'razao-divisao-proporcional', ...criarVideoaula(r34 as unknown as Roteiro, n34) },
  { id: 'referencia-pronominal', ...criarVideoaula(r35 as unknown as Roteiro, n35) },
  { id: 'regra-de-tres', ...criarVideoaula(r36 as unknown as Roteiro, n36) },
  { id: 's-final-plural', ...criarVideoaula(r37 as unknown as Roteiro, n37) },
  { id: 'sequencias-repetitivas', ...criarVideoaula(r38 as unknown as Roteiro, n38) },
  { id: 'sinonimos-antonimos-contexto', ...criarVideoaula(r39 as unknown as Roteiro, n39) },
  { id: 'sistemas-de-equacoes', ...criarVideoaula(r40 as unknown as Roteiro, n40) },
  { id: 'tabela-de-frequencia', ...criarVideoaula(r41 as unknown as Roteiro, n41) },
  { id: 'tema-central-do-texto', ...criarVideoaula(r42 as unknown as Roteiro, n42) },
  { id: 'tempos-e-modos-verbais', ...criarVideoaula(r43 as unknown as Roteiro, n43) },
  { id: 'termos-da-oracao', ...criarVideoaula(r44 as unknown as Roteiro, n44) },
  { id: 'tipos-e-generos-textuais', ...criarVideoaula(r45 as unknown as Roteiro, n45) },
  { id: 'virgula', ...criarVideoaula(r46 as unknown as Roteiro, n46) },
  { id: 'volume-capacidade', ...criarVideoaula(r47 as unknown as Roteiro, n47) },
];
