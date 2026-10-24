import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, count, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { idFixo, semear } from '@fuse/db/seed';
import { type BancoTeste, criarBancoTeste } from '@fuse/db/teste';
import {
  baixarERegistrar,
  ehPdf,
  nomeArquivoDaUrl,
  pastaDaProva,
  sha256,
} from '../src/arquivos/armazenamento.js';
import { atualizarCertames } from '../src/fau/certames.js';
import { baixarDocsCertame } from '../src/fau/docs.js';
import { baixarPci, listarPci } from '../src/pci/comandos.js';
import { ErroBloqueio } from '../src/rede/bloqueio.js';
import { ClienteHttp } from '../src/rede/cliente.js';
import { fixture, mockAgent, relogioFalso, UA } from './ajuda.js';

const FAU = 'https://www.concursosfau.com.br';
const PCI = 'https://www.pciconcursos.com.br';
const html = { headers: { 'content-type': 'text/html; charset=utf-8' } };
const pdf = (s: string) => Buffer.from(`%PDF-1.4\n% ${s}\n%%EOF\n`);
const exato = (s: string) => (p: string) => p === s;
const pdfHeaders = { headers: { 'content-type': 'application/pdf' } };

let banco: BancoTeste;
let dir: string;
let agent = mockAgent();

beforeAll(async () => {
  banco = await criarBancoTeste({ seed: true });
  dir = await mkdtemp(join(tmpdir(), 'fuse-coletor-'));
}, 120_000);
afterAll(async () => {
  await banco.fechar();
  await rm(dir, { recursive: true, force: true });
});
afterEach(async () => {
  await agent.close();
  agent = mockAgent();
});

const novoCliente = () =>
  new ClienteHttp({ userAgent: UA, dispatcher: agent, relogio: relogioFalso() });
const { provasOrigem, arquivosColetados } = schema;

async function contarFau() {
  const [r] = await banco.db
    .select({ n: count() })
    .from(provasOrigem)
    .where(eq(provasOrigem.fonte, 'fau'));
  return r!.n;
}

function servirListasFau(vezes = 1) {
  const fau = agent.get(FAU);
  fau.intercept({ path: '/robots.txt' }).reply(200, '');
  fau
    .intercept({ path: '/novo/encerrados/' })
    .reply(200, fixture('fau_encerrados.html'), html)
    .times(vezes);
  fau
    .intercept({ path: '/novo/concursos' })
    .reply(200, fixture('fau_concursos.html'), html)
    .times(vezes);
}

describe('fau:certames', () => {
  it('casa os certames do seed pela página (URL normalizada) e insere os novos com o id do seed', async () => {
    const antes = await contarFau();
    expect(antes).toBe(246);
    servirListasFau();
    const r = await atualizarCertames({ db: banco.db, cliente: novoCliente() });

    // 7 do encerrados + 4 da página de concursos, menos o pmsf2026 repetido = 10.
    expect(r.lidos).toBe(10);
    expect(r.novos.map((n) => n.url.split('/').pop()).sort()).toEqual([
      'cmcns',
      'pmcns2026',
      'pmcnsE2026',
      'rmp2027',
    ]);
    expect(r.inseridos).toBe(4);
    expect(r.porSituacao).toMatchObject({
      encerrado: 7,
      pre_inscricao: 1,
      aberto: 1,
      em_andamento: 1,
    });
    expect(r.descartados).toHaveLength(3);
    expect(await contarFau()).toBe(250);

    const nome = 'PREFEITURA MUNICIPAL DE CAMPO NOVO DO SUL - CELETISTA';
    const url = `${FAU}/novo/concurso/pmcns2026`;
    const [novo] = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.id, idFixo(`prova_origem:fau:${url}:${nome}`)));
    expect(novo).toMatchObject({
      nome,
      tipo: 'Prefeitura',
      municipio: 'Campo Novo do Sul',
      regime: 'Celetista / emprego público',
      ano: 2026,
      dataProva: '2026-05-10',
      relevanciaPalmital: true,
      uf: 'PR',
      slugFau: 'pmcns2026',
      fonte: 'fau',
    });
  });

  it('é idempotente e convive com o seed (rodar de novo não duplica)', async () => {
    servirListasFau();
    const r = await atualizarCertames({ db: banco.db, cliente: novoCliente() });
    expect(r.inseridos).toBe(0);
    expect(r.atualizados).toBe(0);
    await semear(banco.db);
    expect(await contarFau()).toBe(250);
  });

  it('atualiza a data quando o site passa a mostrar (sem mexer no nome do catálogo)', async () => {
    const [farol] = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.slugFau, 'pmfarol2015'));
    expect(farol!.dataProva).toBeNull();
    const fau = agent.get(FAU);
    fau.intercept({ path: '/robots.txt' }).reply(200, '');
    fau
      .intercept({ path: '/novo/encerrados/' })
      .reply(
        200,
        fixture('fau_encerrados.html').replace(
          /(PREFEITURA MUNICIPAL DE FAROL[\s\S]*?<strong>)-(<\/strong>)/,
          '$101/03/2015$2',
        ),
        html,
      );
    const r = await atualizarCertames({
      db: banco.db,
      cliente: novoCliente(),
      incluirAndamento: false,
    });
    // Farol + os 2 de Imbituva (o seed rodado no teste anterior voltou a data deles para null).
    expect(r.atualizados).toBe(3);
    const [depois] = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.id, farol!.id));
    expect(depois).toMatchObject({ dataProva: '2015-03-01', ano: 2015, nome: farol!.nome });
  });

  it('falha com mensagem clara se o layout mudar', async () => {
    const fau = agent.get(FAU);
    fau.intercept({ path: '/robots.txt' }).reply(200, '');
    fau
      .intercept({ path: '/novo/encerrados/' })
      .reply(200, '<html><body>novo layout</body></html>', html);
    await expect(
      atualizarCertames({ db: banco.db, cliente: novoCliente(), incluirAndamento: false }),
    ).rejects.toThrow(/layout/);
  });
});

describe('fau:docs', () => {
  const U = '//sistema/uploads';
  function servirCertame() {
    const fau = agent.get(FAU);
    fau.intercept({ path: '/robots.txt' }).reply(200, '');
    fau
      .intercept({ path: '/novo/concurso/pmsf2026' })
      .reply(200, fixture('fau_certame.html'), html);
    return fau;
  }

  it('baixa edital, gabarito definitivo, recursos e caderno; grava hash e liga à prova', async () => {
    const fau = servirCertame();
    fau
      .intercept({ path: exato(`${U}/EDITAL_RESPOSTAS_RECURSOS_PMSF.pdf`) })
      .reply(200, pdf('recursos'), pdfHeaders);
    fau
      .intercept({ path: exato(`${U}/GABARITO_DEFINITIVO_-_SALGADO_FILHO.pdf`) })
      .reply(200, pdf('gabarito'), pdfHeaders);
    fau
      .intercept({ path: exato(`${U}/RETIFICACAO_-_ANEXO_II.pdf`) })
      .reply(200, pdf('anexo'), pdfHeaders);
    fau
      .intercept({ path: exato(`${U}/EDITAL_ABERTURA_PSS_-_SALGADO_FILHO.pdf`) })
      .reply(200, pdf('abertura'), pdfHeaders);
    fau.intercept({ path: exato(`${U}/CADERNO_MEDIO.pdf`) }).reply(200, pdf('caderno'), pdfHeaders);

    const r = await baixarDocsCertame({
      db: banco.db,
      cliente: novoCliente(),
      slug: 'pmsf2026',
      arquivosDir: dir,
    });
    agent.assertNoPendingInterceptors();
    expect(r.falhas).toEqual([]);
    expect(r.baixados.map((b) => [b.tipo, b.situacao])).toEqual([
      ['recursos', 'novo'],
      ['gabarito', 'novo'],
      ['edital', 'novo'],
      ['edital', 'novo'],
      ['caderno', 'novo'],
    ]);
    const gab = r.baixados.find((b) => b.tipo === 'gabarito')!;
    expect(gab.caminho).toBe(
      join(dir, 'provas', 'fau-unicentro', 'pmsf2026', 'gabarito-definitivo-salgado-filho.pdf'),
    );
    expect(await readFile(gab.caminho, 'utf8')).toContain('gabarito');
    expect(gab.hash).toBe(sha256(pdf('gabarito')));

    const [linha] = await banco.db
      .select()
      .from(arquivosColetados)
      .where(eq(arquivosColetados.url, gab.url));
    expect(linha).toMatchObject({
      fonte: 'fau',
      tipo: 'gabarito',
      hashSha256: gab.hash,
      provaOrigemId: r.provaOrigemId,
    });
    const [prova] = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.id, r.provaOrigemId!));
    expect(prova).toMatchObject({ urlGabarito: gab.url, hashPdf: sha256(pdf('caderno')) });
  });

  it('não baixa de novo o que já tem (hash confere no disco)', async () => {
    servirCertame(); // só a página: se pedir algum PDF, o MockAgent falha
    const r = await baixarDocsCertame({
      db: banco.db,
      cliente: novoCliente(),
      slug: 'pmsf2026',
      arquivosDir: dir,
      tipos: ['gabarito', 'recursos'],
    });
    expect(r.baixados.map((b) => b.situacao)).toEqual(['ja_baixado', 'ja_baixado']);
  });

  it('com --todos baixa também os não classificados; falha de um arquivo não para os outros', async () => {
    const fau = servirCertame();
    fau
      .intercept({ path: exato(`${U}/EDITAL_HOMOLOGACAO_FINAL_50.pdf`) })
      .reply(200, '<html>não é pdf</html>', html);
    fau.intercept({ path: exato(`${U}/EDITAL_NOTA_PROVA_OBJETIVA.pdf`) }).reply(404, '');
    fau
      .intercept({ path: exato(`${U}/GABARITO_PRELIMINAR_-_SALGADO_FILHO.pdf`) })
      .reply(200, pdf('gabarito'), pdfHeaders);
    fau.intercept({ path: exato(`${U}/ANEXO_I.pdf`) }).reply(200, pdf('anexo I'), pdfHeaders);
    const r = await baixarDocsCertame({
      db: banco.db,
      cliente: novoCliente(),
      slug: 'pmsf2026',
      arquivosDir: dir,
      todos: true,
    });
    expect(r.falhas.map((f) => f.titulo)).toEqual([
      'EDITAL DE HOMOLOGAÇÃO FINAL',
      'EDITAL NOTA DA PROVA OBJETIVA',
    ]);
    expect(r.falhas[0]!.erro).toMatch(/não é um PDF/);
    // O preliminar tem o mesmo conteúdo do definitivo: reaproveita o arquivo.
    expect(r.baixados.find((b) => b.titulo === 'GABARITO PRELIMINAR')).toMatchObject({
      tipo: 'outro',
      situacao: 'conteudo_repetido',
    });
  });

  it('página com 2 certames liga ao de nome parecido; slug desconhecido avisa', async () => {
    const fau = agent.get(FAU);
    fau.intercept({ path: '/robots.txt' }).reply(200, '');
    fau
      .intercept({ path: '/novo/concurso/pmimbituva' })
      .reply(
        200,
        fixture('fau_certame.html').replace(
          'PREFEITURA MUNICIPAL DE SALGADO FILHO - 2026',
          'PREFEITURA MUNICIPAL DE IMBITUVA - ESTATUTÁRIO',
        ),
        html,
      );
    fau.intercept({ path: '/novo/concurso/naoexiste' }).reply(200, '<html><h1>X</h1></html>', html);
    const c = novoCliente();
    const r = await baixarDocsCertame({
      db: banco.db,
      cliente: c,
      slug: 'pmimbituva',
      arquivosDir: dir,
      tipos: ['recursos'],
    });
    const [p] = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.id, r.provaOrigemId!));
    expect(p!.nome).toBe('PREFEITURA MUNICIPAL DE IMBITUVA - ESTATUTÁRIO');
    expect(r.falhas).toEqual([]);
    expect(r.avisos.join()).toMatch(/2 certames/);
    expect(r.baixados[0]!.situacao).toBe('ja_baixado');
    const n = await baixarDocsCertame({
      db: banco.db,
      cliente: c,
      slug: 'naoexiste',
      arquivosDir: dir,
    });
    expect(n.provaOrigemId).toBeNull();
    expect(n.avisos.join()).toMatch(/não está em provas_origem/);
    expect(n.avisos.join()).toMatch(/GABARITO DEFINITIVO/);
  });
});

describe('pci:listar e pci:baixar', () => {
  it('lista as páginas, para no total e grava com o mesmo id do seed', async () => {
    const p = agent.get(PCI);
    p.intercept({ path: '/robots.txt' }).reply(200, fixture('pci_robots.txt'));
    p.intercept({ path: '/provas/fau-unicentro' }).reply(200, fixture('pci_lista.html'), html);
    p.intercept({ path: '/provas/fau-unicentro/2' }).reply(200, fixture('pci_lista.html'), html);
    p.intercept({ path: '/provas/fau-unicentro/3' }).reply(200, fixture('pci_lista.html'), html);
    const r = await listarPci({ cliente: novoCliente(), paginas: [1, 2, 3, 4, 5], db: banco.db });
    expect(r.paginasLidas).toEqual([1, 2, 3]);
    expect(r.provas).toHaveLength(3);
    expect(r.gravadas).toBe(3);
    const url = `${PCI}/provas/download/administrador-camara-de-sao-joao-do-triunfo-pr-fau-unicentro-2024`;
    const linhas = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.urlPagina, url));
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      id: idFixo(`prova_origem:pci:${url}`),
      fonte: 'pci',
      cargo: 'Administrador',
      uf: 'PR',
      ano: 2024,
    });
  });

  it('sem banco só lista; página vazia encerra', async () => {
    const p = agent.get(PCI);
    p.intercept({ path: '/robots.txt' }).reply(200, '');
    p.intercept({ path: '/provas/fau-unicentro/7' }).reply(
      200,
      '<table id="lista_provas"><tbody></tbody></table>',
      html,
    );
    const r = await listarPci({ cliente: novoCliente(), paginas: [7, 8] });
    expect(r).toMatchObject({ provas: [], paginasLidas: [7], gravadas: 0 });
  });

  it('pci:baixar para no captcha (sem contornar), mas registra a prova', async () => {
    const id = 'administrador-camara-de-sao-joao-do-triunfo-pr-fau-unicentro-2024';
    const p = agent.get(PCI);
    p.intercept({ path: '/robots.txt' }).reply(200, fixture('pci_robots.txt'));
    p.intercept({ path: `/provas/download/${id}` }).reply(
      200,
      fixture('pci_prova_captcha.html'),
      html,
    );
    const erro = await baixarPci({
      db: banco.db,
      cliente: novoCliente(),
      id,
      arquivosDir: dir,
    }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroBloqueio);
    const resumo = (erro as { resumo: { avisos: string[]; arquivos: unknown[] } }).resumo;
    expect(resumo.arquivos).toHaveLength(2);
    expect(resumo.avisos.join()).toMatch(/PRELIMINAR/);
    const [n] = await banco.db
      .select({ n: count() })
      .from(provasOrigem)
      .where(
        and(
          eq(provasOrigem.fonte, 'pci'),
          eq(provasOrigem.urlPagina, `${PCI}/provas/download/${id}`),
        ),
      );
    expect(n!.n).toBe(1);
  });

  it('pci:baixar baixa links diretos permitidos e respeita o robots dos proibidos', async () => {
    const id = 'prova-direta-fau-unicentro-2024';
    const p = agent.get(PCI);
    p.intercept({ path: '/robots.txt' }).reply(200, fixture('pci_robots.txt'));
    p.intercept({ path: `/provas/download/${id}` }).reply(
      200,
      fixture('pci_prova_direta.html').replace(
        '</div></div></body>',
        `<a href="${PCI}/arquivos/extra.pdf">extra.pdf</a></div></div></body>`,
      ),
      html,
    );
    const arq = agent.get('https://arquivos.exemplo.test');
    arq.intercept({ path: '/robots.txt' }).reply(404, '');
    arq.intercept({ path: '/provas/administrador.pdf' }).reply(200, pdf('caderno pci'), pdfHeaders);
    arq
      .intercept({ path: '/provas/gabarito_definitivo.pdf' })
      .reply(200, pdf('gabarito pci'), pdfHeaders);
    const r = await baixarPci({ db: banco.db, cliente: novoCliente(), id, arquivosDir: dir });
    expect(r.baixados.map((b) => [b.nome, b.situacao])).toEqual([
      ['administrador.pdf', 'novo'],
      ['gabarito_definitivo.pdf', 'novo'],
    ]);
    expect(r.baixados[0]!.caminho).toBe(
      join(dir, 'provas', 'fau-unicentro', id, 'administrador.pdf'),
    );
    expect(r.avisos.join()).toMatch(/robots\.txt do PCI não permite/);
  });

  it('pci:baixar recusa página que não é de prova', async () => {
    const p = agent.get(PCI);
    p.intercept({ path: '/robots.txt' }).reply(200, '');
    p.intercept({ path: '/provas/download/x' }).reply(200, '<html><body>nada</body></html>', html);
    await expect(
      baixarPci({ db: banco.db, cliente: novoCliente(), id: 'x', arquivosDir: dir }),
    ).rejects.toThrow(/não parece/);
  });
});

describe('armazenamento', () => {
  it('nomes e pastas seguros', () => {
    expect(pastaDaProva('/srv/a', 'FAU-Unicentro', '../../etc')).toBe(
      join('/srv/a', 'provas', 'fau-unicentro', 'etc'),
    );
    expect(nomeArquivoDaUrl('https://x.test/a/EDITAL%20N%C2%BA%201.PDF')).toBe('edital-n-1.pdf');
    expect(nomeArquivoDaUrl('https://x.test/')).toBe('arquivo.pdf');
    expect(ehPdf(pdf('x'))).toBe(true);
    expect(ehPdf(Buffer.from('<html>'))).toBe(false);
  });

  it('baixa de novo quando o arquivo some do disco e com forcar', async () => {
    const a = agent.get('https://a.test');
    a.intercept({ path: '/robots.txt' }).reply(200, '');
    a.intercept({ path: '/x.pdf' }).reply(200, pdf('v1'), pdfHeaders).times(2);
    a.intercept({ path: '/x.pdf' }).reply(200, pdf('v2'), pdfHeaders);
    const c = novoCliente();
    const base = {
      db: banco.db,
      cliente: c,
      url: 'https://a.test/x.pdf',
      fonte: 'manual' as const,
      tipo: 'outro' as const,
      provaOrigemId: null,
      arquivosDir: dir,
      banca: 'Teste',
      slug: 's',
    };
    const r1 = await baixarERegistrar(base);
    await rm(r1.caminho);
    const r2 = await baixarERegistrar(base);
    expect(r2.situacao).toBe('atualizado');
    const r3 = await baixarERegistrar({ ...base, forcar: true });
    expect(r3.situacao).toBe('atualizado');
    // Mesmo nome com conteúdo diferente não sobrescreve outro arquivo: ganha sufixo do hash.
    expect(r3.caminho).not.toBe(r2.caminho);
    expect(await readFile(r3.caminho, 'utf8')).toContain('v2');
  });
});
