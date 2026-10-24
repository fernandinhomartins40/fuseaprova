import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  anoDoCertame,
  type CertameCatalogo,
  municipioDoCertame,
  paraCertameCatalogo,
  regimeDoCertame,
  tipoDoCertame,
} from '../src/fau/classificacao.js';
import {
  classificarDocumento,
  normalizarUrlCertame,
  parseListaCertames,
  parsePaginaCertame,
} from '../src/fau/parser.js';
import {
  ehDaFau,
  idDaUrlPci,
  parseIntervaloPaginas,
  parseListaPci,
  parsePaginaProvaPci,
  separarUf,
  tipoDoArquivoPci,
  urlDaPaginaPci,
  urlDaProvaPci,
} from '../src/pci/parser.js';
import {
  chaveComparacao,
  dataBrParaIso,
  similaridade,
  slugificar,
  tituloProprio,
} from '../src/util/texto.js';

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

describe('FAU: listagem de certames', () => {
  const r = parseListaCertames(fixture('fau_encerrados.html'));

  it('lê nome, data, URL e slug de cada cartão', () => {
    expect(r.certames[0]).toEqual({
      nome: 'PREFEITURA MUNICIPAL DE SALGADO FILHO - 2026',
      dataProva: '26/07/2026',
      url: 'https://www.concursosfau.com.br/novo/concurso/pmsf2026',
      slug: 'pmsf2026',
      situacao: 'encerrado',
    });
  });

  it('normaliza URLs como o catálogo (espaço final, acentos e espaços codificados)', () => {
    const urls = r.certames.map((c) => c.url);
    expect(urls).toContain('https://www.concursosfau.com.br/novo/concurso/PMM');
    expect(urls).toContain(
      'https://www.concursosfau.com.br/novo/concurso/C%C3%82MARA%20MUNICIPAL%20DE%20PATO%20BRANCO',
    );
    expect(normalizarUrlCertame(' pmx ')).toBe('https://www.concursosfau.com.br/novo/concurso/pmx');
  });

  it('mantém 2 certames na mesma página e trata data "-" como null', () => {
    expect(r.certames.filter((c) => c.slug === 'pmimbituva')).toHaveLength(2);
    expect(r.certames.find((c) => c.slug === 'pmfarol2015')?.dataProva).toBeNull();
  });

  it('descarta testes, avisos e cartões sem nome', () => {
    expect(r.certames).toHaveLength(7);
    expect(r.descartados.map((d) => d.motivo)).toEqual([
      'teste ou aviso do site',
      'teste ou aviso do site',
      'cartão sem nome ou sem link',
    ]);
  });

  it('lê as seções da página de concursos (pré-inscrição, abertos, andamento)', () => {
    const a = parseListaCertames(fixture('fau_concursos.html'), { situacaoPadrao: 'outro' });
    expect(a.certames.map((c) => [c.slug, c.situacao])).toEqual([
      ['pmcnsE2026', 'pre_inscricao'],
      ['cmcns', 'aberto'],
      ['rmp2027', 'em_andamento'],
      ['pmsf2026', 'em_andamento'],
    ]);
  });
});

describe('FAU: página do certame', () => {
  const p = parsePaginaCertame(fixture('fau_certame.html'));

  it('lê título, status e data', () => {
    expect(p.nome).toBe('PREFEITURA MUNICIPAL DE SALGADO FILHO - 2026');
    expect(p.status).toBe('Inscrições encerradas');
    expect(p.dataProva).toBe('26/07/2026');
  });

  it('classifica os documentos e ignora o preliminar, notas e anexos sem interesse', () => {
    const tipos = Object.fromEntries(p.documentos.map((d) => [d.titulo, d.tipo]));
    expect(tipos).toMatchObject({
      'EDITAL DE HOMOLOGAÇÃO FINAL': null,
      'EDITAL RESPOSTAS RECURSOS': 'recursos',
      'GABARITO DEFINITIVO': 'gabarito',
      'EDITAL NOTA DA PROVA OBJETIVA': null,
      'GABARITO PRELIMINAR': null,
      'RETIFICAÇÃO ANEXO II - CONTEÚDO PROGRAMÁTICO': 'edital',
      'ANEXO I - REQUISITOS E ATRIBUIÇÕES DO CARGO': null,
      'EDITAL DE ABERTURA': 'edital',
      'CADERNO DE PROVAS - NÍVEL MÉDIO': 'caderno',
    });
    expect(p.documentos.find((d) => d.tipo === 'caderno')?.secao).toBe('Provas');
    expect(p.documentos.find((d) => d.tipo === 'gabarito')?.url).toBe(
      'https://www.concursosfau.com.br//sistema/uploads/GABARITO_DEFINITIVO_-_SALGADO_FILHO.pdf',
    );
    expect(p.documentos.some((d) => d.url === 'https://www.concursosfau.com.br/novo')).toBe(false);
  });

  it('classificarDocumento cobre os títulos comuns da FAU', () => {
    expect(classificarDocumento('EDITAL RESPOSTAS DOS RECURSOS')).toBe('recursos');
    expect(classificarDocumento('EDITAL DE JULGAMENTO DOS RECURSOS')).toBe('recursos');
    expect(classificarDocumento('RECURSOS')).toBeNull();
    expect(classificarDocumento('GABARITO OFICIAL APÓS RECURSOS')).toBe('gabarito');
    expect(classificarDocumento('GABARITO', 'https://x/GABARITO_DEFINITIVO.pdf')).toBe('gabarito');
    expect(classificarDocumento('GABARITO', 'https://x/GAB.pdf')).toBeNull();
    expect(classificarDocumento('PROVA OBJETIVA - NÍVEL SUPERIOR')).toBe('caderno');
    expect(classificarDocumento('PROVA DE TÍTULOS')).toBeNull();
    expect(classificarDocumento('RETIFICAÇÃO EDITAL DE ABERTURA - PROVA PRÁTICA')).toBe('edital');
    expect(classificarDocumento('RETIFICAÇÃO EDITAL DE HOMOLOGAÇÃO')).toBeNull();
    expect(classificarDocumento('ANEXO II - CONTEÚDO PROGRMÁTICO')).toBe('edital');
  });
});

describe('FAU: classificação dos certames (mesmas regras do catálogo)', () => {
  const catalogo = JSON.parse(
    readFileSync(new URL('../../../dados/catalogo_fau.json', import.meta.url), 'utf8'),
  ) as { certames: CertameCatalogo[] };

  it('reproduz tipo, município, regime, ano e relevância dos 246 certames de dados/catalogo_fau.json', () => {
    const diferentes = catalogo.certames.filter((c) => {
      const d = paraCertameCatalogo({ nome: c.nome, dataProva: c.data_prova, url: c.pagina_fau });
      return (
        d.tipo !== c.tipo ||
        d.municipio !== c.municipio ||
        d.regime !== c.regime ||
        d.ano !== c.ano ||
        d.relevancia_palmital !== c.relevancia_palmital
      );
    });
    expect(catalogo.certames).toHaveLength(246);
    expect(diferentes.map((c) => c.nome)).toEqual([]);
  });

  it('casos avulsos', () => {
    expect(tipoDoCertame('CÂMARA MUNICIPAL DE IRATI')).toBe('Câmara');
    expect(tipoDoCertame('CISGAP - CONSÓRCIO INTERMUNICIPAL DE SAÚDE')).toBe('Consórcio de saúde');
    expect(tipoDoCertame('FUNPREV - TURVO')).toBe('Previdência municipal');
    expect(tipoDoCertame('UNIVERSIDADE ESTADUAL DO OESTE DO PARANÁ')).toBe('Ensino superior');
    expect(tipoDoCertame('SAMAE - LOBATO')).toBe('Autarquia / empresa pública');
    expect(tipoDoCertame('PARANÁ FAZ CIÊNCIA')).toBe('Processo seletivo / outro');
    expect(municipioDoCertame('PREFEITURA MUNICIPAL DE BOM JESUS DO SUL- CELETISTA')).toBe(
      'Bom Jesus do Sul',
    );
    expect(
      municipioDoCertame('TESTE SELETIVO Nº 154/2017 - PREFEITURA MUNICIPAL DE IVAIPORÃ'),
    ).toBe('Ivaiporã');
    expect(municipioDoCertame('CISOP - CONSÓRCIO')).toBe('');
    expect(regimeDoCertame('PREFEITURA X - PSS')).toBe('Processo seletivo');
    expect(regimeDoCertame('PREFEITURA X')).toBe('');
    expect(anoDoCertame('PREFEITURA X', null, 'https://x/concurso/pmx2015')).toBe(2015);
    expect(anoDoCertame('PREFEITURA X', null, 'https://x/concurso/%E0%A4')).toBeNull();
    expect(anoDoCertame('PREFEITURA X - 2019', '03/05/2021')).toBe(2021);
  });
});

describe('PCI: lista de provas', () => {
  const r = parseListaPci(fixture('pci_lista.html'));

  it('lê as linhas da tabela, sem repetir', () => {
    expect(r.provas).toHaveLength(4);
    expect(r.provas[0]).toEqual({
      id: 'administrador-camara-de-sao-joao-do-triunfo-pr-fau-unicentro-2024',
      cargo: 'Administrador',
      ano: 2024,
      orgao: 'Câmara de São João do Triunfo/PR',
      organizadora: 'FAU - UNICENTRO',
      url: 'https://www.pciconcursos.com.br/provas/download/administrador-camara-de-sao-joao-do-triunfo-pr-fau-unicentro-2024',
    });
  });

  it('lê a paginação e filtra a organizadora', () => {
    expect(r.paginaAtual).toBe(2);
    expect(r.totalPaginas).toBe(3);
    expect(r.provas.filter(ehDaFau)).toHaveLength(3);
  });

  it('monta URLs, ids e intervalos de páginas', () => {
    expect(urlDaPaginaPci(1)).toBe('https://www.pciconcursos.com.br/provas/fau-unicentro');
    expect(urlDaPaginaPci(28)).toBe('https://www.pciconcursos.com.br/provas/fau-unicentro/28');
    expect(() => urlDaPaginaPci(0)).toThrow();
    expect(urlDaProvaPci('abc')).toBe('https://www.pciconcursos.com.br/provas/download/abc');
    expect(urlDaProvaPci('https://x.test/y')).toBe('https://x.test/y');
    expect(idDaUrlPci('https://www.pciconcursos.com.br/provas/download/abc?x=1')).toBe('abc');
    expect(idDaUrlPci('https://x.test/')).toBe('');
    expect(parseIntervaloPaginas('1-28')).toHaveLength(28);
    expect(parseIntervaloPaginas('5, 1,3-4')).toEqual([1, 3, 4, 5]);
    expect(() => parseIntervaloPaginas('a')).toThrow(/inválido/);
    expect(() => parseIntervaloPaginas('5-2')).toThrow();
    expect(() => parseIntervaloPaginas('1-1000')).toThrow(/grande/);
    expect(() => parseIntervaloPaginas(' , ')).toThrow();
    expect(separarUf('Pref. Imbituva/PR')).toEqual({ orgao: 'Pref. Imbituva', uf: 'PR' });
    expect(separarUf('UNIOESTE')).toEqual({ orgao: 'UNIOESTE', uf: null });
  });
});

describe('PCI: página da prova', () => {
  it('lê os dados e os arquivos e acusa o captcha', () => {
    const p = parsePaginaProvaPci(fixture('pci_prova_captcha.html'));
    expect(p).toMatchObject({
      titulo: 'Prova Administrador - Câmara de São João do Triunfo/PR',
      cargo: 'Administrador',
      ano: 2024,
      orgao: 'Câmara de São João do Triunfo/PR',
      organizadora: 'FAU - UNICENTRO',
      bloqueio: { tipo: 'captcha' },
    });
    expect(p.arquivos).toEqual([
      { nome: 'administrador.pdf', tipo: 'caderno', preliminar: false, url: null },
      { nome: 'gabarito_preliminar.pdf', tipo: 'gabarito', preliminar: true, url: null },
    ]);
  });

  it('aceita links diretos de PDF, se existirem', () => {
    const p = parsePaginaProvaPci(fixture('pci_prova_direta.html'));
    expect(p.bloqueio).toBeNull();
    expect(p.arquivos.map((a) => [a.nome, a.tipo, a.url])).toEqual([
      ['administrador.pdf', 'caderno', 'https://arquivos.exemplo.test/provas/administrador.pdf'],
      [
        'gabarito_definitivo.pdf',
        'gabarito',
        'https://arquivos.exemplo.test/provas/gabarito_definitivo.pdf',
      ],
    ]);
    expect(tipoDoArquivoPci('gabarito-provisorio.pdf')).toEqual({
      tipo: 'gabarito',
      preliminar: true,
    });
  });
});

describe('utilitários de texto', () => {
  it('normaliza e compara', () => {
    expect(chaveComparacao('Câmara  de Irati!')).toBe('CAMARA DE IRATI');
    expect(similaridade('a b c', 'a b d')).toBeCloseTo(0.5);
    expect(similaridade('', '')).toBe(1);
    expect(slugificar('São João / PR')).toBe('sao-joao-pr');
    expect(slugificar('***')).toBe('sem-nome');
    expect(tituloProprio('BOM JESUS DO SUL')).toBe('Bom Jesus do Sul');
    expect(dataBrParaIso('26/07/2026')).toBe('2026-07-26');
    expect(dataBrParaIso(null)).toBeNull();
  });
});
