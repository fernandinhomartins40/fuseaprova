# @fuse/crawler

Coletor de provas da FAU-Unicentro (site da FAU e PCI Concursos) e importador de PDF do Fuse Aprova (PRD 7.4 e 7.5). Node, `undici` e `cheerio`. O texto dos PDFs sai do `pdftotext` (poppler-utils), chamado por `child_process`.

## Postura do coletor

- **User-Agent identificado:** `CRAWLER_USER_AGENT`. Sem ele, o coletor usa `FuseAprovaColetor/1.0 (+APP_URL; SUPORTE_EMAIL)`.
- **1 requisição a cada 2 s por host** (`LimitadorPorHost`). Vale também para o `robots.txt` e para cada redirecionamento. `CRAWLER_INTERVALO_MS` só aumenta esse intervalo, e um `Crawl-delay` maior no robots.txt é respeitado.
- **robots.txt respeitado** (RFC 9309), conferido em cada URL e em cada salto de redirecionamento:
  - robots.txt com 4xx: tudo liberado;
  - robots.txt com 5xx ou falha de rede: nada é buscado.
- **Não contorna captcha nem login.** Turnstile, reCAPTCHA, hCaptcha, desafio do Cloudflare, HTTP 401, redirecionamento para `/login` e formulário com senha geram `ErroBloqueio`: o comando para e avisa (saída 2).
- **Hash SHA-256** de cada arquivo em `arquivos_coletados`:
  - uma URL já baixada, com o arquivo no disco e o mesmo hash, não é pedida de novo;
  - o mesmo conteúdo vindo de outra URL não é gravado duas vezes.
- **Onde ficam os PDFs:** `${ARQUIVOS_DIR}/provas/{banca}/{slug}/`, fora do diretório público. A gravação é atômica.

> **Estado real dos sites (verificado em 23/10/2026):**
> - FAU: robots.txt vazio; listagens e PDFs (`/sistema/uploads/…`) são públicos.
> - PCI: o robots.txt proíbe `/*.pdf`, e a página de cada prova só libera os arquivos depois de um **Cloudflare Turnstile**. Por isso o `pci:baixar` registra a prova e os nomes dos arquivos e para com aviso. Baixe o PDF no navegador e use `crawler importar`.

## Comandos

Em desenvolvimento (código-fonte, sem build):

```bash
pnpm --filter @fuse/crawler crawler <comando> [opções]
```

Em produção (`pnpm build`), o bin `crawler` aponta para `dist/cli.js`.

| Comando | O que faz |
|---|---|
| `crawler fau:certames [--sem-andamento]` | Lê `/novo/encerrados/` e `/novo/concursos` (pré-inscrição, abertos e em andamento) e faz upsert em `provas_origem`. Certame existente: casa pela URL normalizada da página e, quando há 2 certames na mesma página, pelo nome mais parecido. Atualiza data, ano e relevância e preenche tipo, município e regime vazios, sem mudar nome nem slug do catálogo. Certame novo: entra com o **mesmo id que o seed daria** (`linhasProvasOrigem`). |
| `crawler fau:docs <slug> [--tipos edital,gabarito,recursos,caderno] [--todos] [--forcar]` | Baixa da página do certame o edital de abertura, as retificações e o conteúdo programático, o **gabarito definitivo**, as respostas a recursos e os cadernos (quando ainda aparecem). O gabarito preliminar e as notas ficam de fora, salvo `--todos`. Preenche `url_gabarito`, `url_recursos`, `url_caderno` e `hash_pdf` da prova. |
| `crawler pci:listar [--paginas 1-28] [--sem-banco]` | Lista as provas FAU do PCI, para no total de páginas e grava em `provas_origem` (`fonte='pci'`, mesmo id do seed). Aceita `--paginas 1,3,5-7`. |
| `crawler pci:baixar <id>` | Lê a página da prova, atualiza a prova de origem e baixa caderno e gabarito **só por link direto permitido pelo robots.txt**. Com captcha, para (saída 2). |
| `crawler importar <caderno.pdf> --gabarito <gabarito.pdf> [--prova <id\|slug FAU\|id PCI>] [--cargo <nome>] [--preliminar <pdf>] [--forcar] [--simular]` | Extrai as questões, confronta com o gabarito definitivo e grava como `rascunho` (anuladas como `anulada`), sem nunca publicar. Também aceita `.txt` já extraído. Sem `--prova`, procura o caderno pelo hash em `arquivos_coletados`. |
| `crawler figuras --ids <ids.json> --contexto <contexto.json> --cadernos <pasta> --saida <pasta> [--dpi 170]` | Recorta a figura de cada questão no caderno em PDF (precisa de Python + PyMuPDF; `python/figuras_pdf.py`, sem rede) e grava `<id>.png`, `manifesto.json` e `conferencia.html` na pasta de saída. Não toca no banco nem sobe arquivos. Variante `--pdf <caderno.pdf> --numeros 3,5 --saida <pasta>` para questões soltas. |

Opções gerais: `--json` e `--ajuda`.

Códigos de saída:

| Código | Significado |
|---|---|
| 0 | ok |
| 1 | erro |
| 2 | captcha ou login detectado |
| 3 | proibido pelo robots.txt |

Exemplos:

```bash
pnpm --filter @fuse/crawler crawler fau:certames
pnpm --filter @fuse/crawler crawler fau:docs pmsf2026 --tipos gabarito,recursos
pnpm --filter @fuse/crawler crawler pci:listar --paginas 1-28
pnpm --filter @fuse/crawler crawler importar ./caderno.pdf \
  --gabarito /srv/fuse/arquivos/provas/fau-unicentro/pmsf2026/gabarito-definitivo-salgado-filho.pdf \
  --prova pmsf2026 --cargo "Técnico Administrativo" --simular
```

## Importação (o que é gravado)

- **Caderno**:
  - o PDF é lido com `pdftotext -raw`; se nem todas as questões saírem completas, o coletor compara com `-layout` e com o modo normal e fica com a melhor extração;
  - **estilo (opcional, D18):** com Python + PyMuPDF (`pip install pymupdf`; `python/estilos_pdf.py`) o sublinhado e o itálico viram `**termo**` e `*termo*` no texto (o negrito só na questão que fala em destaque); sem eles o import funciona igual e avisa. Sem rede;
  - questões numeradas "01." (também "01)" e "QUESTÃO 01"), em sequência e no formato aprendido na 1ª questão (com isso, listas como "1. Confira seu nome" e itens "1., 2." do enunciado não viram questão);
  - alternativas "A)" a "E)", inclusive várias na mesma linha;
  - textos de apoio "Leia o texto … questões 01 a 03";
  - cabeçalhos e rodapés repetidos e números de página são removidos;
  - a disciplina sai do título da seção ou do quadro da capa; sem nenhum dos dois, de uma prova de 40 questões, sai da distribuição FAU 5/5/5/25.
- **Gabarito definitivo**:
  - lido com `pdftotext -layout`, na grade por cargo da FAU (números em cima, letras embaixo) ou em pares "01-A";
  - `*X` = anulada e `**C` = alterada para C, conforme a legenda do PDF;
  - gabarito preliminar é recusado;
  - com vários cargos, exige `--cargo` (ou usa o `cargo` da prova de origem).
- **Questões** (`questoes`):
  - `origem='fau_real'`, `prova_origem_id`, `numero_origem`;
  - `status='rascunho'` ou `'anulada'` (com `anulada_motivo`);
  - questão alterada leva na `explicacao` a nota "Gabarito alterado pela banca após os recursos…" (com a letra antiga quando há `--preliminar`);
  - assunto provisório `a-classificar` da disciplina, criado se faltar.
- **Reimportação**:
  - não duplica (unique prova + número);
  - não toca em questões já revisadas;
  - com `--forcar`, atualiza só as que continuam `rascunho`/`anulada`.
- **Registro da importação** (`importacoes`):
  - status `baixado` → `extraido` → `confrontado` (ou `erro`, com o log);
  - guarda `questoes_extraidas`, `divergencias`, o `confronto` número a número (`questaoId`, `gabaritoDefinitivo`, `observacao`) e o `log` para o painel admin.

## Como biblioteca

```ts
import { conectar } from '@fuse/db';
import { ClienteHttp, atualizarCertames, baixarDocsCertame, importarProva, lerConfig } from '@fuse/crawler';

const { db } = conectar(process.env.DATABASE_URL);
const config = lerConfig();
const cliente = new ClienteHttp({ userAgent: config.userAgent, intervaloMs: config.intervaloMs });

await atualizarCertames({ db, cliente });
await baixarDocsCertame({ db, cliente, slug: 'pmsf2026', arquivosDir: config.arquivosDir });
const resumo = await importarProva({
  db,
  caderno: '/srv/fuse/arquivos/provas/fau-unicentro/pmsf2026/caderno.pdf', // ou { texto }
  gabarito: '/srv/fuse/arquivos/provas/fau-unicentro/pmsf2026/gabarito-definitivo-salgado-filho.pdf',
  provaId,
  cargo: 'Técnico Administrativo',
});
// resumo.importacaoId, resumo.confronto.itens, resumo.divergencias…
```

Os parsers são puros e também são exportados:
- `parseListaCertames`, `parsePaginaCertame`, `parseListaPci` e `parsePaginaProvaPci`;
- `parseCaderno`, `parseGabarito` e `confrontar`;
- `parseRobots` e `permitido`;
- `detectarBloqueioHtml` e `LimitadorPorHost`.

## Testes

```bash
pnpm --filter @fuse/crawler test
```

- As fixtures em `test/fixtures/` foram **escritas à mão**, imitando a estrutura das páginas reais. As questões do caderno de teste são fictícias.
- Os testes não acessam a rede: o HTTP usa o `MockAgent` do undici.
- A gravação usa PGlite com migrações e seed (`criarBancoTeste`).
- O teste com PDF real gera um PDF mínimo e chama o `pdftotext`; ele é pulado se o binário não existir.
- `classificacao` reproduz tipo, município, regime, ano e relevância dos 246 certames de `dados/catalogo_fau.json`.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Postgres ou `pglite://…` |
| `ARQUIVOS_DIR` | Raiz dos PDFs (padrão `/srv/fuse/arquivos`) |
| `CRAWLER_USER_AGENT` | User-Agent com contato |
| `CRAWLER_INTERVALO_MS` | Intervalo por host (mínimo 2000) |
| `PYTHON_BIN` | Python com PyMuPDF para o estilo do caderno (opcional; padrão `python3`, depois `python`) |
| `PDFTOTEXT_BIN` | Caminho do `pdftotext` (padrão no PATH; na VPS: `apt install poppler-utils`) |
| `APP_URL`, `SUPORTE_EMAIL` | Contato no User-Agent padrão |

## Figuras das questões (`crawler figuras`)
Questões que dependem de imagem, planta, tabela, gráfico ou símbolo ficam sem a figura quando só o texto do PDF é extraído. O comando acha a questão no caderno (marcador `NN)` ou `NN.`, 1 ou 2 colunas, continuação na coluna ou página seguinte) e recorta **só a figura** em PNG nítido (170 dpi por padrão, até 1,9 MB para caber no limite de upload do painel), sem cabeçalho, rodapé, número de página nem a marca d'água do PCI.

- **Entrada:** `--ids` (array JSON de ids), `--contexto` (array com `id, orgao, ano, cargo, numero, enunciado`...) e `--cadernos` (nomes `cargo-orgao-pr-fau-unicentro-ANO.pdf`; "Pref." vira "prefeitura").
- **Saída:** `<saida>/<id>.png`, `manifesto.json` (id -> arquivo, `url`, `markdown`, `alt`, `campo`, página, caixas em pontos, confiança, estratégia) e `conferencia.html` (miniaturas ao lado do enunciado, com filtro por confiança).
- **Confiança:** `alta` = figura isolada (imagem ou desenho vetorial, com rótulos curtos); `media` = várias figuras, símbolos pequenos dentro do texto, ou questão que pede um destaque/sublinhado (recorte da questão inteira, que mostra o sublinhado); `baixa` = nada isolável, recorte da questão inteira para conferir à mão.
- **Formato publicado:** a questão ganha, na primeira linha do enunciado (ou do `textoApoio`, conforme `campo`), `![texto alternativo](/api/arquivos/uploads/<id-da-questao>.png)`. O arquivo vai para `${ARQUIVOS_DIR}/uploads/<id>.png`, servido por `GET /api/arquivos/uploads/:nome` (exige acesso pago ou admin; o nome precisa ser `uuid.png`, por isso o arquivo leva o id da questão). O `Markdown.tsx` já renderiza a imagem.
- Sem Python/PyMuPDF o comando para com erro claro (`PYTHON_BIN` escolhe o interpretador). O PDF é tratado como dado não confiável: só é lido e desenhado.
