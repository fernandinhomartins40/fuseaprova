# Videoaulas ligadas à questão errada (auditoria de 23/11/2026)

## Origem do problema

Uma aluna relatou que o conteúdo e os vídeos de algumas questões não correspondem a elas.

- A ligação questão → vídeo (`questoes.videoaula`) foi gerada a partir de `docs/conteudo/videos-temas.csv` e gravada pela migração `packages/db/drizzle/0018_videoaulas_lotes_1_a_4.sql`.
- Hoje 1.223 questões têm vídeo.
- A auditoria comparou o tema do vídeo com o enunciado da questão e com o assunto dela. Encontrou **29 ligações claramente erradas**, todas listadas abaixo.

A outra parte do relato, o "Entenda o tema" mostrando a dica genérica do assunto, já foi corrigida. Em 23/11/2026, todas as 14.049 questões publicadas passaram a ter mini-aula própria (`questoes.aula`).

## As 29 ligações erradas

Formato: `id da questão | vídeo ligado hoje | assunto da questão`

```
05998a3d-6f8d-522a-bcc2-1988b5bb8186|adjunto-adverbial|sintaxe
b5392f49-64d2-5cb0-a1bc-72afe649d074|adverbios-circunstancias|classes-de-palavras
f7ce5eae-651a-5789-ba60-00943d1c2fc7|adverbios-circunstancias|classes-de-palavras
c73166e0-9855-56ed-a55c-0f80505a744e|classes-de-palavras|concordancia-verbal
0497c3d4-4ee3-556b-9659-d7367600582c|conectivos-relacoes-de-sentido|semantica
eedd289c-0625-570b-ab5c-ec1b8ed33718|datas-idades-calendario|raciocinio-logico
82564465-fe75-59e9-95b7-4d6f481f2aeb|datas-idades-calendario|raciocinio-logico
b44f3eb1-1317-5acf-b4fc-d954397325e5|datas-idades-calendario|sequencias
d6970bb2-dd27-5065-afc5-2af761b34c6d|divisao-silabica|pontuacao
1b8a1a3f-ffb4-5d4b-8331-b621d72e6310|divisao-silabica|pontuacao
9e491ed3-0bb8-57ef-9027-48db8fb1b571|divisao-silabica|pontuacao
eb810f37-8b7e-53bb-80d4-4bd1ff6b9b7c|divisao-silabica|acentuacao-grafica
c2dc94f8-107c-5ebe-9d16-fe31ab2cb4e0|divisao-silabica|crase
59f69467-d8a2-595c-b03b-ff3a9dfad51f|divisao-silabica|classes-de-palavras
fc7026f3-8255-52bd-8fd0-2f6c79f35ef6|divisao-silabica|classes-de-palavras
a38a1a97-2a7d-5b21-b9d2-4795fb1d854a|divisao-silabica|sintaxe
3d8da47e-3cef-5ab3-a90a-a0fc80bacc9a|letras-e-sons|coesao-e-coerencia
a347a8f0-6553-5c52-a6ff-7424e61ab8c1|letras-e-sons|coesao-e-coerencia
3aca14cd-0e6a-54fc-9a31-7c9b6acc7db9|letras-e-sons|coesao-e-coerencia
ead69a37-3ca1-5a9e-a28e-bc92e3bb9903|letras-e-sons|coesao-e-coerencia
65a8aced-a40d-59b2-b4ca-e1a4bc1855c5|letras-e-sons|coesao-e-coerencia
1e953ebd-f3ae-5009-82c6-17dcbd018d38|letras-e-sons|sintaxe
e27334b5-c536-5ddd-ac83-b688053ed5b2|letras-e-sons|sintaxe
763206fc-6fd4-557f-baa3-f85f01bc602f|letras-e-sons|formacao-de-palavras
9cac3945-4102-50a0-9e39-16108db583ea|letras-e-sons|classes-de-palavras
d020f10b-92eb-57e9-be29-350382f0614e|oxitonas-monossilabos|generos-textuais
bf2f7366-3d9e-50f1-a120-d85d1567e1cd|oxitonas-monossilabos|crase
4660eff8-2adb-5c5b-a1ed-7d658b577914|oxitonas-monossilabos|semantica
653b8297-9404-5dbc-8737-a91a33926cc6|preposicoes|classes-de-palavras
```

Exemplos do que está errado:

- o vídeo de divisão silábica aparece em questões de vírgula e de crase;
- o vídeo "letras e sons" aparece em questões de referente de pronome e de sintaxe;
- o vídeo de oxítonas aparece em questões de tipo textual, crase e antônimo;
- o vídeo de datas e calendário aparece em questões de sequência lógica;
- o vídeo de conectivos aparece numa questão de sinônimo;
- o vídeo de preposições aparece numa questão sobre o substantivo "mãe".
