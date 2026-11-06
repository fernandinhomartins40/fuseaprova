# Videoaulas: plano de produção e implantação

**Escopo:** 133 videoaulas curtas, que explicam o tema da questão para quem já pagou. Elas abrem dentro da questão, pelo botão "Assista à videoaula do tema" (D41). Não vendem nada.

| Fase | O que entra | Vídeos | Questões ligadas |
|---|---|---:|---:|
| 1 | Português e Matemática (valem para os 29 cargos) | 50 | 1.223 |
| 2 | Específicos com 15 questões ou mais, e Conhecimentos Gerais | 83 | 1.615 |
| **Total** | | **133** | **2.838** |

Duas já estão no ar: **VA-007** Proparoxítonas e **VA-029** Aumento e desconto. As outras 131 têm o roteiro completo nestes arquivos:

- [roteiros-01-portugues.md](roteiros-01-portugues.md): 25 roteiros
- [roteiros-02-matematica.md](roteiros-02-matematica.md): 25 roteiros
- [roteiros-03-especificos-gestao-publica.md](roteiros-03-especificos-gestao-publica.md): 26 roteiros
- [roteiros-04-especificos-saude.md](roteiros-04-especificos-saude.md): 18 roteiros
- [roteiros-05-especificos-social-educacao-operacional.md](roteiros-05-especificos-social-educacao-operacional.md): 21 roteiros
- [roteiros-06-conhecimentos-gerais.md](roteiros-06-conhecimentos-gerais.md): 18 roteiros

A origem dos temas está em [docs/conteudo/videos-temas.md](../conteudo/videos-temas.md). Os IDs das questões de cada tema estão em [videos-temas.csv](../conteudo/videos-temas.csv).

---

## 1. Decisões que já valem para todos os vídeos

- **Sem venda:** sem gancho, sem chamada e sem "link na bio". A aula começa explicando e termina com o resumo e "Volte para a questão".
- **Sem a Capi:** só a logo pequena e translúcida no canto (`ModoVideoaula`).
- **Até 60 s:** de 3 a 5 cenas, mais o resumo.
- **Não resolve questão real:** os exemplos são próprios e a aula não entrega a resposta de nenhuma questão do banco.
- **D27:** sem o nome da banca, da prefeitura ou do cargo na tela.
- **Voz:** Matheus (ElevenLabs), semente 29, `speed` 1,06, `stability` 0,4 e `style` 0,6, iguais às duas que estão no ar.

## 2. Formato do roteiro

Cada vídeo nos arquivos `roteiros-*.md` segue este molde:

```
## VA-NNN · Título
`slug` · Assunto · N questões · lote L
1. **nome-da-cena**
   - "fala 1"            ← cada linha vira um clipe de voz
   - "fala 2"
   - _tela:_ o que aparece   ← guia para escolher o tipo de cena
…
**Resumo:** "linha 1" · "linha 2"   ← cartões da cena de fecho
> ⚖️ norma a conferir antes de gravar
```

- **Slug:** é o nome do arquivo (`ARQUIVOS_DIR/videoaulas/<slug>.mp4`) e o valor de `questoes.videoaula`. Não muda depois de publicado; um vídeo regravado ganha `-v2` (ver §5).
- **Fecho padrão,** acrescentado pelo modelo: "Resumindo: …" com as linhas do resumo, e depois "Agora volta pra questão!".

## 3. Como produzir em escala: modelo de cenas por dados

As duas primeiras aulas tiveram cenas escritas à mão (`src/aula1`, `src/aula2`). Fazer isso 131 vezes não cabe no prazo. O primeiro passo da implantação é um **modelo único de videoaula**, `src/videoaula/`, em que cada vídeo é só um JSON. Ele reaproveita as peças que já existem em `src/aulas.tsx` e `src/componentes.tsx`.

**Tipos de cena** (cobrem todas as telas dos roteiros):

| Tipo | Uso | Peças que já existem |
|---|---|---|
| `titulo-texto` | rótulo + frase com destaque | `Rotulo`, `Palavras` |
| `cartoes` | lista de 2 a 6 cartões (tipos, famílias, componentes) | `Entra`, `Chip` |
| `comparacao` | duas colunas, ✓ × ✗ ou A × B | `Grafia`, `Marca` |
| `conta` | linhas de conta que aparecem com a fala | `Conta`, `useConta` |
| `barra` | barra de porcentagem ou de partes | `BarraPercentual` |
| `silabas` | palavras em sílabas, com tônica e contagem | `Silabas` |
| `tabela` | 2 ou 3 colunas (natureza × pontos × multa) | nova, simples |
| `linha-tempo` | datas e etapas em sequência | nova, simples |
| `resumo` | o fecho padrão | `CenaFechoAula` |

**Roteiro em JSON** (`roteiros/<slug>.json`): as falas no formato que `narracao.py` já lê, mais um bloco `cenas` com o tipo e os dados de cada cena:

```json
{
  "voz": "NQmLEqxcRTkWYIYZSYod", "nomeVoz": "Matheus", "semente": 29,
  "ajustes": { "stability": 0.4, "similarity_boost": 0.78, "style": 0.6, "use_speaker_boost": true, "speed": 1.06 },
  "materia": "portugues",
  "falas": { "regra": ["…", "…"], "troca": ["…"], "fecho": ["Resumindo: …", "Agora volta pra questão!"] },
  "cenas": {
    "regra": { "tipo": "titulo-texto", "rotulo": "A regra", "texto": "Só vale o *texto*" },
    "troca": { "tipo": "comparacao", "certo": "Alguns moradores", "errado": "Todos os moradores" },
    "fecho": { "tipo": "resumo", "linhas": [{ "de": "Pergunta 'incorreta'", "para": "só vale o texto" }, { "de": "Cada alternativa", "para": "compare palavra por palavra" }] }
  }
}
```

**Ferramentas a criar** (no projeto Remotion, `marketing/stories-palmital`):

1. `scripts/roteiro-md.py VA-NNN`: lê a seção do `.md` e gera o `roteiros/<slug>.json` com as falas e o fecho. O bloco `cenas` é preenchido na produção, seguindo as notas `_tela:_`.
2. `src/videoaula/`: componente que monta o vídeo a partir do JSON, e uma composição registrada por slug em `Raiz.tsx`, a partir da lista de JSONs.
3. **Uma trilha por matéria,** gerada uma vez só (`trilha.py portugues|matematica|especificos|gerais`), e não uma por vídeo.
4. `scripts/lote.py L`: roda narração, render e versão do app de todos os vídeos do lote e grava as fotos de conferência.

## 4. Vídeo leve: o que consome menos VPS e menos banda

Medido no vídeo de proparoxítonas, com 44 s:

| Versão | Resolução | Quadros | Tamanho |
|---|---|---|---:|
| Primeira versão (CRF 26) | 720×1280 | 30 fps | 3,4 MB |
| CRF 28, `-tune animation` | 720×1280 | 30 fps | 2,0 MB |
| **CRF 30, `-tune animation`** ✅ | **720×1280** | **24 fps** | **1,5 MB** |
| CRF 28 | 540×960 | 24 fps | 1,3 MB |

**Escolha: 720×1280, 24 fps, CRF 30.** O texto continua nítido no celular, e o arquivo cai 55% em relação à primeira versão. A 540×960 economiza só mais 0,2 MB e deixa a letra miúda mais mole.

**Comando de saída para o app** (substitui o de `scripts/render.py`):

```
ffmpeg -i <final>.mp4 -s 720x1280 -sws_flags lanczos -r 24 \
  -c:v libx264 -preset veryslow -tune animation -crf 30 -maxrate 900k -bufsize 1800k \
  -pix_fmt yuv420p -c:a aac -b:a 64k -ac 1 -movflags +faststart <slug>.mp4
```

- **`-tune animation`:** é o ajuste do x264 para cores chapadas e animação, o estilo destes vídeos.
- **`-maxrate`:** limita os picos, para o vídeo não engasgar no 4G.
- **Áudio:** voz em mono a 64 kbps basta.
- **`+faststart`:** começa a tocar antes de baixar tudo.
- **Fundo calmo:** as manchas que se movem e os pontos que rolam no fundo obrigam o codificador a gastar bits em todo quadro. Na videoaula, usar o gradiente parado e medir o ganho no primeiro lote. A expectativa é cair mais um pouco, mas é medição, não promessa.

**O que fica de fora, e por quê:**

- **HLS ou DASH (vídeo em pedaços):** para clipes de menos de 1 a 2 minutos, a recomendação da própria indústria é o MP4 progressivo. Em pedaços, só aumentaria arquivos e processamento.
- **AV1 ou HEVC:** comprimem mais, mas o iPhone só toca AV1 nos modelos com decodificador próprio, então seria preciso guardar dois arquivos (AV1 e H.264), e codificar em AV1 é lento. Reavaliar só se a banda virar problema.
- **Codificar na VPS:** proibido. Todo render e toda compressão acontecem no computador de produção. A VPS só guarda e entrega.

**Entrega pelo nginx, não pelo Node** (passo de infraestrutura, lote 0):

Hoje a API em Node lê o arquivo e o envia (`/api/videoaulas/:slug`). Funciona, mas cada vídeo assistido ocupa o processo da API. O padrão da comunidade é o **X-Accel-Redirect**: a API só confere o acesso e responde com um cabeçalho, e o nginx entrega o arquivo direto do disco (`sendfile`), já com suporte a Range.

1. `deploy/docker-compose.yml`: montar só a pasta dos vídeos no nginx, em modo leitura (`/root/fuseaprova/arquivos/videoaulas:/srv/fuse/videoaulas:ro`). O nginx continua sem enxergar uploads, provas e apostilas.
2. `infra/nginx/fuseaprova.conf`: criar `location /_videoaulas/ { internal; alias /srv/fuse/videoaulas/; types { video/mp4 mp4; } add_header Cache-Control "private, max-age=2592000"; }`. Com `internal`, ninguém acessa essa rota direto, só por meio da API.
3. **Rota da API:** depois de conferir o acesso, responder `reply.header('X-Accel-Redirect', '/_videoaulas/<slug>.mp4').send()`. Manter o envio pelo Node para os testes e para quando não houver nginx (variável `VIDEOAULAS_X_ACCEL=1` em produção).
4. **Permissões:** a pasta com 755 e os arquivos com 644, porque o usuário do nginx não é o dono dos arquivos.
5. **Teste:** depois do deploy, pedir `Range: bytes=0-99` com uma sessão paga e conferir o `206`. As fontes avisam que é preciso testar o Range através do X-Accel.

**Cache no aparelho:**

- **Site:** `Cache-Control: private, max-age=2592000` (30 dias). Quem rever o vídeo não baixa de novo.
- **Arquivo regravado:** o slug muda (`proparoxitonas-v2`), e não se sobrescreve o MP4. Assim nenhum cache fica com a versão velha.
- **App nativo:** hoje baixa o vídeo inteiro pelo HTTP nativo a cada abertura. No próximo AAB, guardar o MP4 em cache no aparelho (pasta de cache do Capacitor Filesystem), com limite de, por exemplo, 30 vídeos e o descarte do mais antigo.

**Conta de recursos, com a versão escolhida:**

- **Disco:** 133 vídeos × cerca de 1,6 MB ≈ **210 MB** na VPS. Os originais em 1080×1920 ficam só no computador de produção.
- **Banda:** 1.000 visualizações por dia × 1,6 MB ≈ 1,6 GB por dia, ou cerca de 50 GB por mês. Confira a franquia mensal da VPS no painel da Hostinger.
- **CPU:** com X-Accel, quase zero: o nginx entrega o arquivo direto do disco, sem passar pelo Node.
- **Limite de velocidade (opcional):** `limit_rate_after 1m; limit_rate 400k;` no `location` interno. O vídeo tem cerca de 250 kbps, então toca normal, e poucos alunos baixando ao mesmo tempo não seguram a saída da VPS.

## 5. Como publicar um lote

Em cada lote, a ordem importa: **primeiro o arquivo, depois o banco.** Se o banco apontar para um vídeo que ainda não está na VPS, o aluno vê "Não deu para carregar a videoaula".

1. **Conferir o conteúdo:** checar os itens ⚖️ na norma vigente e corrigir o `.md` se a lei mudou.
2. **Gerar:** `python scripts/lote.py L`. Ele faz o JSON, a narração, o render e a versão do app, e grava as fotos de conferência em `out/quadros/`.
3. **Revisar o vídeo:** o dono assiste e ouve cada um. Uma fala com problema é refeita sozinha, com `narracao.py <slug> --so cena:N`.
4. **Subir:** copiar os `.mp4` para `/root/fuseaprova/arquivos/videoaulas/` (`scp`, com permissão 644) e conferir o `sha256sum` dos dois lados.
5. **Ligar às questões:** criar a migração `00NN_videoaulas_lote_L.sql`, gerada a partir de `videos-temas.csv`, com um `UPDATE questoes SET videoaula = '<slug>' WHERE id IN (…)` por tema, como a 0016. Fazer commit, push e deploy.
6. **Conferir em produção:** abrir uma questão de cada vídeo no site e rodar o script de conferência, que lista os slugs do banco sem arquivo e os arquivos sem questão.
7. **Marcar** no índice abaixo: `roteiro` → `no ar`.

**Mais tarde:** um campo "Videoaula" no editor de questões do painel, para o dono ligar ou trocar o vídeo sem migração. Por ora, a migração deixa o histórico registrado no git (D41).

## 6. App nativo

O botão e o player já estão no código (D41), mas só aparecem no app depois de um **AAB novo**. Para gerar: GitHub → Actions → **App Android** → Run workflow; o `versionCode` sobe sozinho.

- **Vídeos novos:** depois desse AAB, eles **não precisam** de outro AAB. O app lê `videoaula` da API.
- **Cache do vídeo:** o cache no aparelho (§4) entra no mesmo AAB, se der tempo; senão, no seguinte.

## 7. Ordem dos lotes

Os lotes seguem o alcance: primeiro o que serve a todos os cargos, depois os temas com mais questões. Em média, cada lote tem de 5 a 14 vídeos.

| Lote | O que entra | Vídeos | Questões |
|---:|---|---:|---:|
| 0 | Já no ar (VA-007, VA-029) e a infraestrutura do §4 | 2 | 77 |
| 1 | Português e Matemática com mais questões | 12 | 555 |
| 2 | Português e Matemática | 13 | 315 |
| 3 | Português e Matemática | 14 | 207 |
| 4 | Português e Matemática (menores) | 9 | 69 |
| 5–8 | Gestão pública: arquivo, contabilidade, tributário, LRF, licitações, Excel | 23 | 496 |
| 9 | Redação oficial, farmácia hospitalar e Atenção Básica | 6 | 134 |
| 10–12 | Saúde e SUS, e o começo de educação e ECA | 18 | 356 |
| 13–15 | Gestão escolar, Código Florestal, trânsito, Serviço Social, máquinas e SUAS | 15 | 356 |
| 16 | Segurança do trabalho, ética do Serviço Social e o começo de Conhecimentos Gerais | 5 | 104 |
| 17–19 | Conhecimentos Gerais (Paraná) | 16 | 169 |

O lote exato de cada vídeo está no índice (§9).

**Custo de voz:** cada roteiro tem cerca de 700 a 900 caracteres de fala, ou seja, cerca de **110 mil caracteres** para os 131 vídeos restantes, mais as regravações. Conferir se o plano da ElevenLabs cobre esse volume no mês da produção.

## 8. Pendências que dependem do dono

- **Conhecimentos Gerais:** as questões são de outros municípios, então os roteiros ensinam o conceito e a estratégia, sem decorar fatos locais (ver o aviso em [roteiros-06](roteiros-06-conhecimentos-gerais.md)). Se quiser vídeos sobre um município específico, eles entram num lote à parte, com fontes oficiais.
- **VA-048 (aumentos sucessivos):** as 7 questões apontam hoje para `aumento-e-desconto-v2`. Quando o VA-048 sair, a migração do lote troca o slug delas.
- **Itens ⚖️:** multas e pontos do CTB, percentuais do PNAE, números do Censo e da PNAB mudam. Conferir no lote, antes de gravar.
- **VA-099 (grampos):** a numeração dos grampos varia entre fabricantes. Confirmar a referência usada.
- **Versões no ar:** recomprimidas no padrão do §4 (migração 0017): 1,5 e 1,8 MB. Os arquivos antigos seguem na VPS até nenhuma sessão aberta apontar para eles.

## 9. Índice das 133 videoaulas

| VA | Título | Slug | Questões | Lote | Situação | Roteiro |
|---|---|---|---:|---:|---|---|
| VA-001 | Interpretação: o que o texto NÃO diz | `interpretacao-o-que-o-texto-nao-diz` | 59 | 1 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-002 | Conectivos: o sentido de cada um | `conectivos-relacoes-de-sentido` | 57 | 1 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-003 | Advérbios e as circunstâncias | `adverbios-circunstancias` | 56 | 1 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-004 | Divisão silábica e contagem de sílabas | `divisao-silabica` | 53 | 1 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-005 | Dígrafo × encontro consonantal | `digrafo-encontro-consonantal` | 51 | 1 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-006 | Termos da oração: sujeito, objeto e predicativo | `termos-da-oracao` | 40 | 1 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-007 | Proparoxítonas: todas levam acento | `proparoxitonas-v2` | 39 | 0 | no ar | [01-portugues](roteiros-01-portugues.md) |
| VA-008 | Classes de palavras: como descobrir a classe | `classes-de-palavras` | 34 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-009 | Letras e sons: S com som de Z, C, G e H | `letras-e-sons` | 32 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-010 | Sinônimos e antônimos pelo contexto | `sinonimos-antonimos-contexto` | 27 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-011 | Crase: quando usar | `crase` | 24 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-012 | Tempos e modos verbais | `tempos-e-modos-verbais` | 23 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-013 | S final: plural ou parte da palavra? | `s-final-plural` | 21 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-014 | Adjunto adverbial e orações adverbiais | `adjunto-adverbial` | 20 | 2 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-015 | Vírgula: os usos que mais caem | `virgula` | 19 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-016 | Paroxítonas: as terminações que levam acento | `paroxitonas` | 18 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-017 | Orações substantivas: a função do "que" | `oracoes-substantivas` | 17 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-018 | Formação de palavras: prefixo, sufixo e derivação | `formacao-de-palavras` | 16 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-019 | Oxítonas, monossílabos e acento diferencial | `oxitonas-monossilabos` | 15 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-020 | Tema central e ideia principal | `tema-central-do-texto` | 12 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-021 | Referência: a quem o pronome se refere | `referencia-pronominal` | 12 | 3 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-022 | Hiato, ditongo e tritongo | `hiato-ditongo-tritongo` | 9 | 4 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-023 | Preposições e seus sentidos | `preposicoes` | 8 | 4 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-024 | Concordância verbal e nominal | `concordancia` | 8 | 4 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-025 | Tipos e gêneros textuais | `tipos-e-generos-textuais` | 7 | 4 | roteiro | [01-portugues](roteiros-01-portugues.md) |
| VA-026 | Problemas de multiplicar e dividir (e quando arredondar) | `multiplicar-dividir-arredondar` | 64 | 1 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-027 | Preço, troco, lucro e parcelas | `preco-troco-lucro` | 44 | 1 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-028 | Porcentagem: a parte, o total e o que falta | `porcentagem-parte-total` | 40 | 1 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-029 | Aumento e desconto percentual | `aumento-e-desconto-v2` | 38 | 0 | no ar | [02-matematica](roteiros-02-matematica.md) |
| VA-030 | Conversão de unidades: quilo, litro e metro | `conversao-de-unidades` | 33 | 1 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-031 | Regra de três: simples, inversa e composta | `regra-de-tres` | 29 | 1 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-032 | Frações de uma quantidade | `fracoes-de-uma-quantidade` | 29 | 1 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-033 | Média simples e ponderada | `media-simples-ponderada` | 27 | 2 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-034 | Progressão aritmética e geométrica | `progressao-aritmetica-geometrica` | 25 | 2 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-035 | Horas, minutos e salário por hora | `horas-e-minutos` | 24 | 2 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-036 | Datas, idades e calendário | `datas-idades-calendario` | 22 | 2 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-037 | Áreas de figuras planas | `areas-figuras-planas` | 20 | 2 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-038 | Razão e divisão proporcional | `razao-divisao-proporcional` | 16 | 2 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-039 | Função do 1º grau: substituir e isolar o x | `funcao-primeiro-grau` | 16 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-040 | Tabela de frequência e quartis | `tabela-de-frequencia` | 16 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-041 | Custo fixo, custo variável e lucro | `custo-fixo-variavel-lucro` | 14 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-042 | Mediana e moda | `mediana-moda` | 14 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-043 | Volume e capacidade | `volume-capacidade` | 14 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-044 | Contagem: princípio multiplicativo e combinações | `contagem-principio-multiplicativo` | 13 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-045 | Números decimais no dia a dia | `numeros-decimais` | 11 | 3 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-046 | Raciocínio lógico: códigos, pior caso e paridade | `raciocinio-logico` | 10 | 4 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-047 | Equação do 2º grau e parábola | `equacao-segundo-grau` | 8 | 4 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-048 | Aumentos e reduções sucessivos | `aumentos-sucessivos` | 7 | 4 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-049 | Sequências que se repetem | `sequencias-repetitivas` | 7 | 4 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-050 | Sistemas de equações | `sistemas-de-equacoes` | 5 | 4 | roteiro | [02-matematica](roteiros-02-matematica.md) |
| VA-051 | Teoria das três idades dos arquivos | `arquivo-tres-idades` | 23 | 5 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-052 | Métodos de arquivamento | `metodos-de-arquivamento` | 15 | 5 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-053 | Sistemas de distribuição de medicamentos no hospital | `distribuicao-de-medicamentos` | 19 | 9 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-054 | Política Nacional de Atenção Básica: princípios e diretrizes | `pnab-principios-diretrizes` | 28 | 9 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-055 | Saúde da Família, apoio matricial e equipes multiprofissionais | `saude-da-familia-matricial` | 24 | 9 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-056 | BNCC na Educação Infantil: eixos, direitos e campos de experiência | `bncc-educacao-infantil` | 15 | 12 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-057 | Em que grupo fica cada conta | `contas-grupos-natureza` | 22 | 5 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-058 | Restos a pagar processados e não processados | `restos-a-pagar` | 36 | 5 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-059 | Receita orçamentária e dívida ativa | `receita-orcamentaria-divida-ativa` | 31 | 5 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-060 | Etapas da despesa: empenho, liquidação e pagamento | `etapas-da-despesa` | 24 | 5 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-061 | Depreciação e valor contábil líquido | `depreciacao-valor-contabil` | 22 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-062 | Créditos adicionais | `creditos-adicionais` | 21 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-063 | Despesas correntes e de capital | `despesas-correntes-capital` | 20 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-064 | Folha de pagamento e retenções no passivo | `folha-retencoes-passivo` | 18 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-065 | Quando a despesa é extraorçamentária | `despesa-extraorcamentaria` | 16 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-066 | Curto e longo prazo no balanço | `circulante-nao-circulante` | 15 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-067 | Lei do orçamento: o que pode e o que não pode | `lei-do-orcamento` | 15 | 6 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-068 | Contas do prefeito: parecer prévio e julgamento | `parecer-previo-contas-prefeito` | 16 | 7 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-069 | Cálculo de medicação: volume, porcentagem e gotejamento | `calculo-de-medicacao` | 17 | 10 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-070 | Lançamento tributário e decadência | `lancamento-decadencia` | 33 | 7 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-071 | Suspensão, extinção e exclusão do crédito | `suspensao-extincao-exclusao` | 27 | 7 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-072 | Imunidades e regras do IPTU | `imunidades-iptu` | 22 | 7 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-073 | Taxa: quando pode ser cobrada | `taxa-requisitos` | 20 | 7 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-074 | Obrigação tributária e sujeito passivo | `obrigacao-tributaria` | 19 | 7 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-075 | ECA: quem é criança e quem garante os direitos | `eca-artigos-iniciais` | 32 | 12 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-076 | ECA: os cinco capítulos dos direitos fundamentais | `eca-direitos-fundamentais` | 17 | 12 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-077 | Vias de administração de medicamentos | `vias-de-administracao` | 15 | 10 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-078 | Gestão escolar democrática | `gestao-escolar-democratica` | 21 | 13 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-079 | Código Florestal: APP e Reserva Legal | `codigo-florestal-app` | 16 | 13 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-080 | Infrações de trânsito: natureza, pontos e penalidades | `ctb-natureza-infracoes` | 63 | 13 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-081 | Vias e velocidade máxima sem placa | `ctb-vias-velocidade` | 32 | 13 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-082 | Definições de veículos no CTB | `ctb-definicoes-veiculos` | 29 | 13 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-083 | Sistema Nacional de Trânsito: quem faz o quê | `ctb-sistema-nacional` | 27 | 14 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-084 | Partes da via e termos do CTB | `ctb-partes-da-via` | 26 | 14 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-085 | Categorias de habilitação e pesos do veículo | `ctb-categorias-cnh` | 21 | 14 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-086 | Requisitos para habilitação e transporte escolar | `ctb-requisitos-habilitacao` | 20 | 14 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-087 | Placas de trânsito pela mensagem | `ctb-placas` | 19 | 14 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-088 | Gestos e apitos do agente de trânsito | `ctb-gestos-agente` | 15 | 15 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-089 | Lei 8.662: competência e atribuição privativa | `lei-8662-atribuicoes` | 16 | 15 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-090 | Limite de despesa com pessoal na LRF | `lrf-limite-pessoal` | 28 | 8 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-091 | Relatórios fiscais: RREO e RGF | `lrf-rreo-rgf` | 16 | 8 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-092 | Contrato administrativo na Lei 14.133 | `contrato-administrativo` | 18 | 8 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-093 | Excel: datas, contagem e posição | `excel-funcoes` | 19 | 8 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-094 | Alimentação escolar: regras do PNAE | `pnae-regras` | 15 | 10 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-095 | Cárie: uma doença de vários fatores | `carie-fatores` | 29 | 10 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-096 | Gengivite e periodontite | `gengivite-periodontite` | 25 | 10 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-097 | Ionômero de vidro e o tratamento restaurador atraumático | `ionomero-art` | 23 | 10 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-098 | Flúor e fluorose | `fluor-fluorose` | 19 | 11 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-099 | Isolamento absoluto e grampos | `isolamento-absoluto-grampos` | 15 | 11 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-100 | Proteção do complexo dentina-polpa: forro, base e MTA | `protecao-dentina-polpa` | 15 | 11 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-101 | Técnicas de escovação e radiografia periapical | `tecnicas-de-escovacao` | 15 | 11 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-102 | Luzes e símbolos do painel de máquinas | `painel-de-maquinas` | 15 | 15 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-103 | LOAS e NOB-SUAS: objetivos, princípios e diretrizes | `loas-nob-suas` | 18 | 15 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-104 | Funções da assistência social, CRAS e CREAS | `suas-funcoes-cras-creas` | 18 | 15 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-105 | Pronomes de tratamento e vocativo | `pronomes-de-tratamento` | 27 | 9 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-106 | Atos oficiais: reconheça pela função | `atos-oficiais` | 21 | 9 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-107 | Documentos do cidadão e da administração | `requerimento-e-edital` | 15 | 9 | roteiro | [03-especificos-gestao-publica](roteiros-03-especificos-gestao-publica.md) |
| VA-108 | Lei 8.080 e Lei 8.142: o que cada uma trata | `lei-8080-8142` | 29 | 11 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-109 | Lei 8.080: os princípios do artigo 7º | `lei-8080-art7` | 18 | 12 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-110 | Princípios doutrinários e organizativos do SUS | `sus-principios` | 24 | 12 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-111 | Terapia ocupacional na saúde mental | `to-saude-mental` | 16 | 12 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-112 | RAPS: componentes e pontos de atenção | `raps-componentes` | 17 | 12 | roteiro | [04-especificos-saude](roteiros-04-especificos-saude.md) |
| VA-113 | EPI e EPC | `epi-epc` | 28 | 16 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-114 | EPI para cada parte do corpo | `epi-por-parte-do-corpo` | 15 | 16 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-115 | Código de Ética do Assistente Social | `codigo-de-etica-servico-social` | 22 | 16 | roteiro | [05-especificos-social-educacao-operacional](roteiros-05-especificos-social-educacao-operacional.md) |
| VA-116 | Relevo, regiões e polos do Paraná | `parana-relevo-regioes` | 21 | 16 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-117 | Fronteiras e divisas do Paraná | `parana-fronteiras` | 18 | 16 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-118 | Povos indígenas do Paraná | `parana-povos-indigenas` | 5 | 17 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-119 | Rios do Paraná e como raciocinar sobre a hidrografia | `parana-rios` | 24 | 17 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-120 | Município, distrito e emancipação | `municipio-distrito-emancipacao` | 18 | 17 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-121 | Feriados, ponto facultativo e datas comemorativas | `feriados-ponto-facultativo` | 16 | 17 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-122 | Colonização do Sudoeste e do Oeste do Paraná | `colonizacao-sudoeste-oeste` | 14 | 17 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-123 | Atrativos turísticos do Paraná | `parana-atrativos-turisticos` | 11 | 18 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-124 | Toponímia: de onde vêm os nomes dos lugares | `toponimia` | 11 | 18 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-125 | Eleições municipais e Câmara de Vereadores | `eleicoes-municipais` | 10 | 18 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-126 | Lavouras temporárias e permanentes | `lavouras-temporarias-permanentes` | 10 | 18 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-127 | Porte dos municípios e dados do IBGE | `ibge-porte-municipios` | 10 | 18 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-128 | Norte Pioneiro, Norte Novo e Campos Gerais | `ocupacao-norte-campos-gerais` | 8 | 19 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-129 | Títulos e apelidos de cidades | `titulos-apelidos-cidades` | 8 | 19 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-130 | Imigração europeia no Paraná | `imigracao-europeia-parana` | 7 | 19 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-131 | Rodovias federais e estaduais | `rodovias-br-pr` | 7 | 19 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-132 | Calendário dos santos e festas populares | `santos-e-festas-populares` | 5 | 19 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |
| VA-133 | Tradições de imigrantes e folclore | `tradicoes-e-folclore` | 5 | 19 | roteiro | [06-conhecimentos-gerais](roteiros-06-conhecimentos-gerais.md) |

## Fontes da parte técnica

- X-Accel-Redirect com local `internal`, Range e sendfile: [technetexperts.com](https://www.technetexperts.com/django-vs-nginx-video-streaming/), [lista do nginx sobre mp4 e X-Accel-Redirect](https://mailman.nginx.org/pipermail/nginx/2012-April/033401.html), [besthub.dev (faststart e URLs assinadas)](https://www.besthub.dev/tags/mp4-faststart).
- H.264 × AV1 e suporte no iPhone e no Android: [ittybit: comparar codecs](https://ittybit.com/guides/compare-video-codecs), [dev.to: AV1 × H.264](https://dev.to/red5/av1-vs-h264-codec-comparison-guide-2025-updated-3kg), [ScientiaMobile: adoção de AV1 em hardware](https://www.scientiamobile.com/?p=29961), [Streaming Learning Center](https://streaminglearningcenter.com/?p=11700).
- x264 `-tune animation`, CRF e faststart: [Academy Software Foundation: encoding H.264](https://academysoftwarefoundation.github.io/EncodingGuidelines/Encodeh264.html), [manual do x264](https://manpages.org/x264).
- MP4 progressivo × HLS para vídeos curtos: [Mux: MP4 para HLS](https://mux.com/articles/how-to-convert-mp4-to-hls-format-with-ffmpeg-a-step-by-step-guide), [freeCodeCamp: quando usar HLS](https://freecodecamp.org/news/what-is-hls-and-when-to-use-it), [Exoscale: vídeos auto-hospedados](https://exoscale.com/syslog/self-hosted-videos/).
