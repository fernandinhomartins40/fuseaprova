/**
 * Recorte automático das figuras das questões (comando `crawler figuras`).
 *
 * Algumas questões oficiais dependem de uma figura (imagem, planta, tabela, gráfico, símbolo)
 * que o extrator de texto não captura. O helper opcional `python/figuras_pdf.py` (PyMuPDF, sem
 * rede) acha a questão no caderno em PDF e recorta SÓ a figura (ou a questão inteira, com
 * confiança menor) em PNG, sem cabeçalho, rodapé nem marca d'água do PCI.
 *
 * Formato final (D19): a questão publicada ganha, no início do enunciado (ou do textoApoio),
 * a linha `![texto alternativo](/api/arquivos/uploads/<id-da-questao>.png)`. É o mesmo caminho do
 * upload do painel: a API serve `${ARQUIVOS_DIR}/uploads/<uuid>.png` só a quem tem acesso
 * (`/api/arquivos/uploads/:nome`) e o `Markdown.tsx` do app já renderiza a imagem.
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { acharPython } from '../importacao/estilos.js';
import { slugificar } from '../util/texto.js';

const executar = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('../../python/figuras_pdf.py', import.meta.url));

/** Prefixo servido pela API (o mesmo do upload do admin). */
export const URL_BASE_FIGURAS = '/api/arquivos/uploads';

export type ConfiancaFigura = 'alta' | 'media' | 'baixa';
export type EstrategiaFigura =
  | 'figura'
  | 'figuras'
  | 'simbolos'
  | 'destaque'
  | 'questao'
  | 'nenhuma'
  | 'erro';

/** Dados mínimos da questão (o `revisao-contexto.json` tem mais campos). */
export interface QuestaoFigura {
  id: string;
  orgao: string;
  ano: number;
  cargo: string;
  numero: number;
  enunciado?: string;
  texto_apoio?: string | null;
  alternativas?: { letra: string; texto: string }[];
}

/** Resultado cru do helper Python, por questão. */
export interface ResultadoPython {
  chave: string;
  numero: number;
  ok: boolean;
  arquivo?: string;
  pagina?: number;
  /** [página, x0, y0, x1, y1] em pontos do PDF (um item por pedaço empilhado). */
  caixas?: number[][];
  largura?: number;
  altura?: number;
  confianca: ConfiancaFigura;
  estrategia: EstrategiaFigura;
  motivo?: string;
}

export interface ItemManifesto {
  id: string;
  ok: boolean;
  caderno: string | null;
  numero: number;
  arquivo: string | null;
  /** URL que vai no Markdown da questão (servida pela API). */
  url: string | null;
  /** Linha pronta para o início do enunciado (ou do textoApoio). */
  markdown: string | null;
  alt: string | null;
  /** Onde colocar a linha: `enunciado` (padrão) ou `texto_apoio`. */
  campo: 'enunciado' | 'texto_apoio';
  pagina: number | null;
  caixas: number[][];
  largura: number | null;
  altura: number | null;
  bytes: number | null;
  confianca: ConfiancaFigura;
  estrategia: EstrategiaFigura;
  motivo?: string;
}

export interface Manifesto {
  geradoEm: string;
  urlBase: string;
  resumo: {
    total: number;
    ok: number;
    falhas: number;
    alta: number;
    media: number;
    baixa: number;
  };
  itens: Record<string, ItemManifesto>;
}

/* ------------------------------------------------------------------ puro */

/** Slug do órgão no nome do caderno: "Pref. Ampére" vira "prefeitura-ampere". */
export function slugOrgao(orgao: string): string {
  return slugificar(orgao.replace(/\bPref\.?\s*/gi, 'Prefeitura '));
}

/**
 * Acha o caderno em PDF da questão entre os nomes de arquivo (`cargo-orgao-pr-fau-unicentro-ANO.pdf`,
 * tolerante a sufixos repetidos como "-fau-unicentro-fau-unicentro-"). Devolve null se não houver
 * exatamente um candidato.
 */
export function acharCaderno(
  nomes: string[],
  q: Pick<QuestaoFigura, 'orgao' | 'cargo' | 'ano'>,
): string | null {
  const prefixo = `${slugificar(q.cargo)}-${slugOrgao(q.orgao)}-`;
  const sufixo = `-${q.ano}.pdf`;
  const achados = nomes.filter((n) => {
    const m = n.toLowerCase();
    return m.startsWith(prefixo) && m.endsWith(sufixo);
  });
  return achados.length === 1 ? achados[0]! : null;
}

const RE_DESCRICAO: [RegExp, string][] = [
  [/\btabela\b/i, 'Tabela'],
  [/\bquadro\b/i, 'Quadro'],
  [/gr[aá]fico/i, 'Gráfico'],
  [/\bplanta\b|\bcroqui\b|\bmapa\b/i, 'Planta'],
  [/circuito|diagrama|esquema/i, 'Esquema'],
  [/s[ií]mbolo|placa|sinal/i, 'Símbolo'],
  [/fotografia|foto\b/i, 'Fotografia'],
  [/figura|imagem|ilustra[cç][aã]o|desenho/i, 'Figura'],
];

/** Texto alternativo curto (sem colchetes nem quebras de linha, que o Markdown do app não aceita). */
export function textoAlternativo(
  q: Pick<QuestaoFigura, 'numero' | 'enunciado'>,
  est: EstrategiaFigura,
): string {
  const enun = q.enunciado ?? '';
  const tipo = RE_DESCRICAO.find(([re]) => re.test(enun))?.[1] ?? 'Figura';
  const limpo = (s: string): string =>
    s
      .replace(/[[\]()*_`\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  if (est === 'questao' || est === 'destaque' || est === 'simbolos') {
    return `Imagem do enunciado da questão ${q.numero}, com o destaque e os símbolos como no caderno`;
  }
  const trecho = limpo(enun)
    .slice(0, 70)
    .replace(/\s+\S*$/, '');
  return `${tipo} da questão ${q.numero}${trecho ? `: ${trecho}…` : ''}`;
}

export function linhaMarkdown(alt: string, id: string, urlBase = URL_BASE_FIGURAS): string {
  return `![${alt.replace(/[[\]]/g, ' ')}](${urlBase}/${id}.png)`;
}

const RE_MENCIONA_FIGURA =
  /figura|imagem|tabela|quadro|gr[aá]fico|ilustra|planta|croqui|abaixo|seguir|circuito|diagrama/i;

/** `texto_apoio` só quando a questão tem apoio e o próprio enunciado não fala da figura. */
export function campoDaFigura(
  q: Pick<QuestaoFigura, 'enunciado' | 'texto_apoio'>,
): 'enunciado' | 'texto_apoio' {
  return q.texto_apoio?.trim() && !RE_MENCIONA_FIGURA.test(q.enunciado ?? '')
    ? 'texto_apoio'
    : 'enunciado';
}

export function resumir(itens: ItemManifesto[]): Manifesto['resumo'] {
  return {
    total: itens.length,
    ok: itens.filter((i) => i.ok).length,
    falhas: itens.filter((i) => !i.ok).length,
    alta: itens.filter((i) => i.ok && i.confianca === 'alta').length,
    media: itens.filter((i) => i.ok && i.confianca === 'media').length,
    baixa: itens.filter((i) => i.ok && i.confianca === 'baixa').length,
  };
}

/* -------------------------------------------------------------- Python */

export interface PedidoPython {
  saida: string;
  dpi: number;
  questoes: { chave: string; numero: number; enunciado?: string }[];
}

/** Roda o helper num caderno. Lança erro se não houver Python/PyMuPDF ou o PDF não abrir. */
export async function recortarCaderno(
  pdf: string,
  pedido: PedidoPython,
): Promise<ResultadoPython[]> {
  const python = await acharPython();
  if (!python)
    throw new Error(
      'Python com PyMuPDF não encontrado (pip install pymupdf; ou defina PYTHON_BIN).',
    );
  await mkdir(pedido.saida, { recursive: true });
  const arquivoPedido = join(pedido.saida, `.pedido-${process.pid}-${Date.now()}.json`);
  const arquivoResultado = `${arquivoPedido}.resultado`;
  await writeFile(
    arquivoPedido,
    JSON.stringify({ ...pedido, resultado: arquivoResultado }),
    'utf8',
  );
  try {
    await executar(python, ['-I', SCRIPT, pdf, arquivoPedido], {
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
      timeout: 300_000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    const r = JSON.parse(await readFile(arquivoResultado, 'utf8')) as {
      resultados: ResultadoPython[];
    };
    return r.resultados;
  } catch (e) {
    throw new Error(`Falha ao recortar ${basename(pdf)}: ${(e as Error).message.split('\n')[0]}`);
  } finally {
    await rm(arquivoPedido, { force: true });
    await rm(arquivoResultado, { force: true });
  }
}

/* ------------------------------------------------------------ orquestração */

export interface OpcoesFiguras {
  questoes: QuestaoFigura[];
  /** Pasta dos cadernos (`cargo-orgao-pr-fau-unicentro-ANO.pdf`). */
  cadernos: string;
  saida: string;
  dpi?: number;
  urlBase?: string;
  log?: (m: string) => void;
}

function itemFalho(q: QuestaoFigura, caderno: string | null, motivo: string): ItemManifesto {
  return {
    id: q.id,
    ok: false,
    caderno,
    numero: q.numero,
    arquivo: null,
    url: null,
    markdown: null,
    alt: null,
    campo: campoDaFigura(q),
    pagina: null,
    caixas: [],
    largura: null,
    altura: null,
    bytes: null,
    confianca: 'baixa',
    estrategia: 'nenhuma',
    motivo,
  };
}

/** Recorta as figuras de várias questões e devolve o manifesto (sem gravá-lo). */
export async function recortarFiguras(op: OpcoesFiguras): Promise<Manifesto> {
  const nomes = (await readdir(op.cadernos)).filter((n) => n.toLowerCase().endsWith('.pdf'));
  const urlBase = op.urlBase ?? URL_BASE_FIGURAS;
  const porCaderno = new Map<string, QuestaoFigura[]>();
  const itens: Record<string, ItemManifesto> = {};
  for (const q of op.questoes) {
    const nome = acharCaderno(nomes, q);
    if (!nome) {
      itens[q.id] = itemFalho(q, null, 'caderno não encontrado (ou ambíguo)');
      continue;
    }
    porCaderno.set(nome, [...(porCaderno.get(nome) ?? []), q]);
  }
  let feitos = 0;
  for (const [nome, qs] of porCaderno) {
    op.log?.(`[${++feitos}/${porCaderno.size}] ${nome} (${qs.length} questão(ões))`);
    let rs: ResultadoPython[];
    try {
      rs = await recortarCaderno(join(op.cadernos, nome), {
        saida: op.saida,
        dpi: op.dpi ?? 170,
        questoes: qs.map((q) => ({ chave: q.id, numero: q.numero, enunciado: q.enunciado })),
      });
    } catch (e) {
      for (const q of qs) itens[q.id] = itemFalho(q, nome, (e as Error).message);
      continue;
    }
    for (const q of qs) {
      const r = rs.find((x) => x.chave === q.id);
      if (!r?.ok || !r.arquivo) {
        itens[q.id] = itemFalho(q, nome, r?.motivo ?? 'sem resultado');
        continue;
      }
      const alt = textoAlternativo(q, r.estrategia);
      const bytes = (await stat(join(op.saida, r.arquivo))).size;
      itens[q.id] = {
        id: q.id,
        ok: true,
        caderno: nome,
        numero: q.numero,
        arquivo: r.arquivo,
        url: `${urlBase}/${r.arquivo}`,
        markdown: linhaMarkdown(alt, q.id, urlBase),
        alt,
        campo: campoDaFigura(q),
        pagina: r.pagina ?? null,
        caixas: r.caixas ?? [],
        largura: r.largura ?? null,
        altura: r.altura ?? null,
        bytes,
        confianca: r.confianca,
        estrategia: r.estrategia,
      };
    }
  }
  const lista = op.questoes.map((q) => itens[q.id]!);
  return { geradoEm: new Date().toISOString(), urlBase, resumo: resumir(lista), itens };
}

/* ------------------------------------------------------------- conferência */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML local (miniaturas ao lado do enunciado) para inspecionar os recortes. */
export function gerarConferenciaHtml(manifesto: Manifesto, questoes: QuestaoFigura[]): string {
  const ordem = { baixa: 0, media: 1, alta: 2 } as const;
  const lista = questoes
    .map((q) => ({ q, m: manifesto.itens[q.id] }))
    .filter((x): x is { q: QuestaoFigura; m: ItemManifesto } => !!x.m)
    .sort((a, b) => Number(a.m.ok) - Number(b.m.ok) || ordem[a.m.confianca] - ordem[b.m.confianca]);
  const r = manifesto.resumo;
  const cartoes = lista
    .map(({ q, m }) => {
      const cls = m.ok ? m.confianca : 'falha';
      const img =
        m.ok && m.arquivo
          ? `<a href="${esc(m.arquivo)}" target="_blank"><img src="${esc(m.arquivo)}" alt="${esc(m.alt ?? '')}" loading="lazy"></a>`
          : '<div class="semimg">sem imagem</div>';
      const alts = (q.alternativas ?? [])
        .map((a) => `<li><b>${esc(a.letra)})</b> ${esc(a.texto)}</li>`)
        .join('');
      return `<article class="c ${cls}" data-conf="${cls}">
<div class="im">${img}</div>
<div class="tx"><div class="cab"><span class="b ${cls}">${m.ok ? m.confianca : 'falha'}</span> <span class="est">${esc(m.estrategia)}</span>
<strong>${esc(q.orgao)} ${q.ano} · ${esc(q.cargo)} · questão ${q.numero}</strong></div>
<p class="en">${esc(q.enunciado ?? '')}</p><ul>${alts}</ul>
<code>${esc(m.markdown ?? m.motivo ?? '')}</code>
<div class="mt">${esc(m.caderno ?? '')} · pág. ${m.pagina ?? '-'} · ${m.largura ?? '-'}×${m.altura ?? '-'} px · ${m.bytes ? Math.round(m.bytes / 1024) : '-'} KB · ${esc(q.id)}</div></div>
</article>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conferência das figuras</title>
<style>
body{font:15px/1.45 system-ui,sans-serif;margin:0;background:#f3f4f6;color:#1f2937}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #d1d5db;padding:10px 16px;z-index:2}
h1{font-size:18px;margin:0 0 6px}
button{margin:2px 4px 2px 0;padding:4px 10px;border:1px solid #9ca3af;border-radius:14px;background:#fff;cursor:pointer}
button.on{background:#1f2937;color:#fff}
main{padding:12px 16px;display:grid;gap:12px}
.c{display:grid;grid-template-columns:minmax(180px,38%) 1fr;gap:14px;background:#fff;border:1px solid #d1d5db;border-left:6px solid #9ca3af;border-radius:8px;padding:10px}
.c.alta{border-left-color:#16a34a}.c.media{border-left-color:#d97706}.c.baixa{border-left-color:#dc2626}.c.falha{border-left-color:#000}
.im img{max-width:100%;max-height:520px;border:1px solid #e5e7eb;display:block;background:#fff}
.semimg{padding:30px;text-align:center;color:#6b7280;border:1px dashed #9ca3af}
.b{padding:1px 8px;border-radius:10px;color:#fff;font-size:12px;text-transform:uppercase}
.b.alta{background:#16a34a}.b.media{background:#d97706}.b.baixa{background:#dc2626}.b.falha{background:#000}
.est{color:#6b7280;font-size:12px;margin:0 6px}
.en{margin:6px 0}ul{margin:4px 0;padding-left:18px}li{list-style:none;margin-left:-18px}
code{display:block;font-size:12px;background:#f3f4f6;padding:4px 6px;border-radius:4px;word-break:break-all}
.mt{font-size:11px;color:#6b7280;margin-top:4px}
@media(max-width:700px){.c{grid-template-columns:1fr}}
</style></head><body>
<header><h1>Conferência das figuras: ${r.total} questões · alta ${r.alta} · média ${r.media} · baixa ${r.baixa} · falhas ${r.falhas}</h1>
<div id="f"><button data-f="todas" class="on">todas</button><button data-f="falha">falhas</button><button data-f="baixa">baixa</button><button data-f="media">média</button><button data-f="alta">alta</button></div></header>
<main>
${cartoes}
</main>
<script>
document.getElementById('f').addEventListener('click',function(e){var f=e.target.dataset&&e.target.dataset.f;if(!f)return;
document.querySelectorAll('#f button').forEach(function(b){b.classList.toggle('on',b===e.target)});
document.querySelectorAll('.c').forEach(function(c){c.style.display=(f==='todas'||c.dataset.conf===f)?'':'none'})});
</script></body></html>
`;
}

/** Lê uma lista de ids (array JSON) e o contexto, e devolve só as questões pedidas, na ordem dos ids. */
export async function lerQuestoes(
  arquivoIds: string,
  arquivoContexto: string,
): Promise<QuestaoFigura[]> {
  const ids = JSON.parse(await readFile(arquivoIds, 'utf8')) as string[];
  const ctx = JSON.parse(await readFile(arquivoContexto, 'utf8')) as QuestaoFigura[];
  const porId = new Map(ctx.map((q) => [q.id, q]));
  const faltando = ids.filter((i) => !porId.has(i));
  if (faltando.length)
    throw new Error(`${faltando.length} id(s) sem contexto, ex.: ${faltando[0]}`);
  return ids.map((i) => porId.get(i)!);
}

export async function gravarManifestoEConferencia(
  saida: string,
  manifesto: Manifesto,
  questoes: QuestaoFigura[],
): Promise<{ manifesto: string; conferencia: string }> {
  await mkdir(saida, { recursive: true });
  const m = join(saida, 'manifesto.json');
  const c = join(saida, 'conferencia.html');
  await writeFile(m, JSON.stringify(manifesto, null, 2), 'utf8');
  await writeFile(c, gerarConferenciaHtml(manifesto, questoes), 'utf8');
  return { manifesto: m, conferencia: c };
}

/** Texto de uma linha com o resumo do manifesto. */
export function resumoFiguras(m: Manifesto): string {
  const r = m.resumo;
  return `${r.total} questão(ões): confiança alta ${r.alta} · média ${r.media} · baixa ${r.baixa} · falhas ${r.falhas}.`;
}

/** Recorta questões soltas de um caderno (chaves `q03`, `q05`...), sem contexto de banco. */
export async function recortarPdfAvulso(
  pdf: string,
  numeros: number[],
  saida: string,
  dpi = 170,
): Promise<Manifesto> {
  const questoes = numeros.map((n) => ({ chave: `q${String(n).padStart(2, '0')}`, numero: n }));
  const rs = await recortarCaderno(pdf, { saida, dpi, questoes });
  const itens: Record<string, ItemManifesto> = {};
  for (const q of questoes) {
    const base: QuestaoFigura = { id: q.chave, orgao: '', ano: 0, cargo: '', numero: q.numero };
    const r = rs.find((x) => x.chave === q.chave);
    if (!r?.ok || !r.arquivo) {
      itens[q.chave] = itemFalho(base, basename(pdf), r?.motivo ?? 'sem resultado');
      continue;
    }
    const alt = textoAlternativo(base, r.estrategia);
    itens[q.chave] = {
      ...itemFalho(base, basename(pdf), ''),
      ok: true,
      arquivo: r.arquivo,
      url: `${URL_BASE_FIGURAS}/${r.arquivo}`,
      markdown: linhaMarkdown(alt, q.chave),
      alt,
      pagina: r.pagina ?? null,
      caixas: r.caixas ?? [],
      largura: r.largura ?? null,
      altura: r.altura ?? null,
      bytes: (await stat(join(saida, r.arquivo))).size,
      confianca: r.confianca,
      estrategia: r.estrategia,
      motivo: undefined,
    };
  }
  const lista = Object.values(itens);
  const m: Manifesto = {
    geradoEm: new Date().toISOString(),
    urlBase: URL_BASE_FIGURAS,
    resumo: resumir(lista),
    itens,
  };
  await writeFile(join(saida, 'manifesto.json'), JSON.stringify(m, null, 2), 'utf8');
  return m;
}
