import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { type BancoTeste, criarBancoTeste } from '@fuse/db/teste';
import { sha256 } from '../src/arquivos/armazenamento.js';
import {
  extrairCaderno,
  importarProva,
  SLUG_ASSUNTO_IMPORTACAO,
} from '../src/importacao/importar.js';
import { ErroPdf, extrairTextoPdf } from '../src/importacao/pdf.js';
import { resolverProva } from '../src/prova.js';
import { fixture, pdfComTexto, temPdftotext } from './ajuda.js';

const { questoes, importacoes, provasOrigem, assuntos, arquivosColetados } = schema;

let banco: BancoTeste;
let provaId: string;
let dir: string;

const caderno = { texto: fixture('caderno_fau.txt'), nome: 'caderno_fau.txt' };
const gabarito = { texto: fixture('gabarito_definitivo.txt'), nome: 'gabarito_definitivo.txt' };
const preliminar = { texto: fixture('gabarito_preliminar.txt'), nome: 'gabarito_preliminar.txt' };

beforeAll(async () => {
  banco = await criarBancoTeste({ seed: true });
  const [p] = await banco.db
    .select()
    .from(provasOrigem)
    .where(eq(provasOrigem.slugFau, 'pmsf2026'));
  provaId = p!.id;
  dir = await mkdtemp(join(tmpdir(), 'fuse-importar-'));
}, 120_000);
afterAll(async () => {
  await banco.fechar();
  await rm(dir, { recursive: true, force: true });
});

const daProva = (id = provaId) =>
  banco.db
    .select()
    .from(questoes)
    .where(eq(questoes.provaOrigemId, id))
    .orderBy(questoes.numeroOrigem);

describe('importarProva', () => {
  beforeEach(async () => {
    await banco.db.delete(questoes).where(eq(questoes.provaOrigemId, provaId));
    await banco.db.delete(importacoes);
  });

  it('grava rascunho (anulada como anulada), fau_real, ligada à prova, e registra a importação', async () => {
    const r = await importarProva({
      db: banco.db,
      caderno,
      gabarito,
      preliminar,
      provaId,
      cargo: 'Agente Administrativo',
    });
    expect(r).toMatchObject({
      extraidas: 8,
      gravadas: 8,
      jaExistiam: 0,
      anuladas: 1,
      alteradas: 1,
      divergencias: 1,
      cargo: 'AGENTE ADMINISTRATIVO',
    });

    const qs = await daProva();
    expect(qs.map((q) => q.numeroOrigem)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(qs.every((q) => q.origem === 'fau_real' && q.provaOrigemId === provaId)).toBe(true);
    expect(qs.some((q) => q.status === 'publicada')).toBe(false);
    expect(qs.map((q) => q.status)).toEqual([
      'rascunho',
      'rascunho',
      'rascunho',
      'rascunho',
      'anulada',
      'rascunho',
      'rascunho',
      'rascunho',
    ]);
    // D9: a 05 anulada sem letra fica com gabarito null
    expect(qs.map((q) => q.gabarito ?? '-').join('')).toBe('ABCB-DBA');

    const q1 = qs[0]!;
    expect(q1.textoApoio).toContain('A praça da cidade');
    expect(q1.alternativas).toHaveLength(5);
    expect(q1.alternativas[0]).toEqual({ letra: 'A', texto: 'perto da fonte.' });
    expect(qs[4]!.anuladaMotivo).toMatch(/anulada pela banca/);
    expect(qs[6]!.explicacao).toBe(
      'Gabarito alterado pela banca após os recursos: a resposta preliminar era C e o gabarito definitivo é B.',
    );

    // Disciplina pela seção do caderno; assunto provisório "a-classificar".
    const discs = await banco.db.select().from(schema.disciplinas);
    const slugDe = (id: string) => discs.find((d) => d.id === id)!.slug;
    expect(qs.map((q) => slugDe(q.disciplinaId))).toEqual([
      'portugues',
      'portugues',
      'matematica',
      'matematica',
      'gerais',
      'gerais',
      'especificos',
      'especificos',
    ]);
    const [assunto] = await banco.db.select().from(assuntos).where(eq(assuntos.id, q1.assuntoId));
    expect(assunto!.slug).toBe(SLUG_ASSUNTO_IMPORTACAO);

    const [imp] = await banco.db
      .select()
      .from(importacoes)
      .where(eq(importacoes.id, r.importacaoId!));
    expect(imp).toMatchObject({
      provaOrigemId: provaId,
      status: 'confrontado',
      questoesExtraidas: 8,
      divergencias: 1,
      arquivoCaderno: 'caderno_fau.txt',
      arquivoGabarito: 'gabarito_definitivo.txt',
      hashCaderno: sha256(caderno.texto),
    });
    expect(imp!.confronto).toHaveLength(8);
    expect(imp!.confronto[4]).toEqual({
      numero: 5,
      questaoId: qs[4]!.id,
      gabaritoDefinitivo: 'ANULADA',
      gabaritoExtraido: null,
      letraPreliminar: expect.anything(),
      statusGravado: 'anulada',
      observacao: 'anulada no gabarito definitivo',
    });
    expect(imp!.confronto[5]!.observacao).toMatch(/4 alternativas/);
    expect(imp!.log).toMatch(/Questões extraídas: 8; gravadas: 8/);
  });

  it('reimportar não duplica nem mexe no que já foi revisado; --forcar atualiza só rascunho/anulada', async () => {
    await importarProva({
      db: banco.db,
      caderno,
      gabarito,
      provaId,
      cargo: 'AGENTE ADMINISTRATIVO',
    });
    const denovo = await importarProva({
      db: banco.db,
      caderno,
      gabarito,
      provaId,
      cargo: 'AGENTE ADMINISTRATIVO',
    });
    expect(denovo).toMatchObject({ gravadas: 0, atualizadas: 0, jaExistiam: 8 });
    expect(await daProva()).toHaveLength(8);

    const [q2] = (await daProva()).filter((q) => q.numeroOrigem === 2);
    await banco.db
      .update(questoes)
      .set({ status: 'revisao', enunciado: 'editado no painel' })
      .where(eq(questoes.id, q2!.id));
    const f = await importarProva({
      db: banco.db,
      caderno,
      gabarito,
      provaId,
      cargo: 'AGENTE ADMINISTRATIVO',
      forcar: true,
    });
    expect(f).toMatchObject({ gravadas: 0, atualizadas: 7, jaExistiam: 1 });
    const [q2depois] = await banco.db.select().from(questoes).where(eq(questoes.id, q2!.id));
    expect(q2depois).toMatchObject({ status: 'revisao', enunciado: 'editado no painel' });
    const [q1] = (await daProva()).filter((q) => q.numeroOrigem === 1);
    expect(q1!.versao).toBe(2);
  });

  it('--simular não grava nada', async () => {
    const r = await importarProva({
      db: banco.db,
      caderno,
      gabarito,
      provaId,
      cargo: 'AGENTE ADMINISTRATIVO',
      simular: true,
    });
    expect(r.importacaoId).toBeNull();
    expect(r.confronto.gravaveis).toBe(8);
    expect(await daProva()).toHaveLength(0);
    expect(await banco.db.select().from(importacoes)).toHaveLength(0);
  });

  it('recusa gabarito preliminar e registra a importação com erro', async () => {
    await expect(
      importarProva({ db: banco.db, caderno, gabarito: preliminar, provaId }),
    ).rejects.toThrow(/PRELIMINAR/);
    const [imp] = await banco.db.select().from(importacoes);
    expect(imp).toMatchObject({ status: 'erro' });
    expect(imp!.log).toMatch(/PRELIMINAR/);
    expect(await daProva()).toHaveLength(0);
  });

  it('pede o cargo quando o gabarito tem vários, e usa o cargo da prova se houver', async () => {
    await expect(importarProva({ db: banco.db, caderno, gabarito, provaId })).rejects.toThrow(
      /Informe --cargo/,
    );
    const [pci] = await banco.db
      .insert(provasOrigem)
      .values({
        orgao: 'Pref. Exemplo',
        cargo: 'Auxiliar de Serviços Gerais',
        fonte: 'pci',
        urlPagina: 'https://x.test/p',
      })
      .returning();
    const r = await importarProva({ db: banco.db, caderno, gabarito, provaId: pci!.id });
    expect(r.cargo).toBe('AUXILIAR DE SERVIÇOS GERAIS');
    expect((await daProva(pci!.id)).map((q) => q.gabarito ?? '-').join('')).toBe('ABCB-ACE');
  });

  it('erros claros: prova inexistente e caderno sem questões', async () => {
    await expect(
      importarProva({
        db: banco.db,
        caderno,
        gabarito,
        provaId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(/não encontrada/);
    await expect(
      importarProva({ db: banco.db, caderno: { texto: 'nada aqui' }, gabarito, provaId }),
    ).rejects.toThrow(/Nenhuma questão/);
    const [imp] = await banco.db.select().from(importacoes);
    expect(imp).toMatchObject({ status: 'erro', questoesExtraidas: 0 });
  });
});

describe('resolverProva', () => {
  it('aceita id, slug FAU, id do PCI ou o hash do caderno já coletado', async () => {
    expect(await resolverProva(banco.db, provaId)).toBe(provaId);
    expect(await resolverProva(banco.db, 'pmsf2026')).toBe(provaId);
    const pci = 'administrador-camara-de-sao-joao-do-triunfo-pr-fau-unicentro-2024';
    const [p] = await banco.db
      .select()
      .from(provasOrigem)
      .where(eq(provasOrigem.urlPagina, `https://www.pciconcursos.com.br/provas/download/${pci}`));
    expect(await resolverProva(banco.db, pci)).toBe(p!.id);
    await expect(resolverProva(banco.db, 'pmimbituva')).rejects.toThrow(/2 provas/);
    await expect(resolverProva(banco.db, 'nao-existe')).rejects.toThrow(/Nenhuma prova/);
    await expect(resolverProva(banco.db, '00000000-0000-4000-8000-000000000000')).rejects.toThrow(
      /não encontrada/,
    );
    await banco.db.insert(arquivosColetados).values({
      url: 'https://x.test/c.pdf',
      fonte: 'fau',
      tipo: 'caderno',
      provaOrigemId: provaId,
      hashSha256: 'abc',
    });
    expect(await resolverProva(banco.db, null, 'abc')).toBe(provaId);
    await expect(resolverProva(banco.db, null, 'zzz')).rejects.toThrow(/Informe --prova/);
  });
});

describe.skipIf(!temPdftotext)('pdftotext (PDF real)', () => {
  it('extrai o caderno e o gabarito de PDFs e importa', async () => {
    const linhasCaderno = fixture('caderno_fau.txt')
      .split('\f')
      .flatMap((p, i) => [...(i ? ['\f'] : []), ...p.split('\n')]);
    const cadernoPdf = join(dir, 'caderno.pdf');
    const gabaritoPdf = join(dir, 'gabarito.pdf');
    await writeFile(cadernoPdf, pdfComTexto(linhasCaderno));
    await writeFile(gabaritoPdf, pdfComTexto(fixture('gabarito_definitivo.txt').split('\n')));

    const c = await extrairCaderno(cadernoPdf);
    expect(c.questoes.map((q) => q.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(c.questoes[0]!.alternativas).toHaveLength(5);

    await banco.db.delete(questoes).where(eq(questoes.provaOrigemId, provaId));
    const r = await importarProva({
      db: banco.db,
      caderno: cadernoPdf,
      gabarito: gabaritoPdf,
      provaId,
      cargo: 'AGENTE ADMINISTRATIVO',
    });
    expect(r).toMatchObject({ extraidas: 8, gravadas: 8, anuladas: 1, alteradas: 1 });
    const [q7] = await banco.db
      .select()
      .from(questoes)
      .where(and(eq(questoes.provaOrigemId, provaId), eq(questoes.numeroOrigem, 7)));
    expect(q7!.gabarito).toBe('B');
  });

  it('recusa PDF sem texto e explica quando falta o pdftotext', async () => {
    const vazio = join(dir, 'vazio.pdf');
    await writeFile(vazio, pdfComTexto(['']));
    await expect(extrairTextoPdf(vazio)).rejects.toThrow(/não tem texto/);
    await expect(extrairTextoPdf(vazio, { binario: 'pdftotext-que-nao-existe' })).rejects.toThrow(
      /poppler-utils/,
    );
    await expect(extrairTextoPdf(join(dir, 'nao-existe.pdf'))).rejects.toBeInstanceOf(ErroPdf);
  });
});
