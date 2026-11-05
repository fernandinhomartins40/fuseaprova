import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type Aluno, type AmbienteTeste } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

let t: AmbienteTeste;
let concursoId: string;
let unidadeSaude: string;

beforeAll(async () => {
  t = await criarAmbienteTeste();
  const [c] = await t.db.select().from(schema.concursos).where(eq(schema.concursos.ativo, true));
  concursoId = c!.id;
  // Uma unidade específica de saúde, para o aluno do administrativo somar à trilha.
  const [esp] = await t.db.select().from(schema.disciplinas).where(eq(schema.disciplinas.slug, 'especificos'));
  const [assunto] = await t.db.select().from(schema.assuntos).limit(1);
  const [u] = await t.db
    .insert(schema.unidades)
    .values({ concursoId, area: 'saude_medio', ordem: 90, titulo: 'SUS e saúde pública', disciplinaId: esp!.id })
    .returning();
  unidadeSaude = u!.id;
  const [s] = await t.db
    .insert(schema.secoes)
    .values({ unidadeId: unidadeSaude, ordem: 1, titulo: 'Princípios do SUS', assuntoId: assunto!.id })
    .returning();
  await t.db.insert(schema.licoes).values({ secaoId: s!.id, ordem: 1 });
}, 60_000);
afterAll(() => t.fechar());

const trilha = async (a: Aluno) => (await t.chamar('trilha', { cookie: a.cookie })).json() as { unidades: { id: string; area: string | null }[] };
const atualizar = (a: Aluno, corpo: object) => t.chamar('meAtualizar', { cookie: a.cookie, corpo });

describe('estudar para mais de um cargo até o edital (D36)', () => {
  it('a trilha soma as unidades da área extra, sem tirar as do cargo', async () => {
    const a = await t.alunoPago();
    const antes = await trilha(a);
    expect(antes.unidades.some((u) => u.id === unidadeSaude)).toBe(false);

    const r = await atualizar(a, { areasExtras: ['saude_medio'] });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ area: 'administrativo', areasExtras: ['saude_medio'] });

    const depois = await trilha(a);
    expect(depois.unidades.some((u) => u.id === unidadeSaude)).toBe(true);
    for (const u of antes.unidades) expect(depois.unidades.some((x) => x.id === u.id)).toBe(true);

    expect((await atualizar(a, { areasExtras: [] })).json().areasExtras).toEqual([]);
    expect((await trilha(a)).unidades.some((u) => u.id === unidadeSaude)).toBe(false);
  });

  it('a área do próprio cargo não conta como extra, e área sem cargo no concurso é recusada', async () => {
    const a = await t.alunoPago();
    expect((await atualizar(a, { areasExtras: ['administrativo', 'saude_medio'] })).json().areasExtras).toEqual(['saude_medio']);
    const r = await atualizar(a, { areasExtras: ['inexistente'] });
    expect(r.statusCode).toBe(400);
  });

  it('com o edital publicado, vale só o cargo e não dá para escolher extras', async () => {
    const a = await t.alunoPago();
    await atualizar(a, { areasExtras: ['saude_medio'] });
    await t.db.update(schema.concursos).set({ status: 'edital_publicado', editalPublicadoEm: t.relogio.agora() }).where(eq(schema.concursos.id, concursoId));
    try {
      expect((await t.chamar('meObter', { cookie: a.cookie })).json().areasExtras).toEqual([]);
      expect((await trilha(a)).unidades.some((u) => u.id === unidadeSaude)).toBe(false);
      const r = await atualizar(a, { areasExtras: ['saude_medio'] });
      expect(r.statusCode).toBe(400);
      expect(r.json().erro).toMatch(/edital saiu/);
    } finally {
      await t.db.update(schema.concursos).set({ status: 'aguardando_edital', editalPublicadoEm: null }).where(eq(schema.concursos.id, concursoId));
    }
  });

  it('trocar de concurso limpa as áreas extras', async () => {
    const a = await t.alunoPago();
    await atualizar(a, { areasExtras: ['saude_medio'] });
    await t.db.update(schema.usuarios).set({ concursoId: null }).where(eq(schema.usuarios.id, a.id));
    await t.chamar('meuConcursoAtivar', { cookie: a.cookie, params: { id: concursoId } });
    expect((await usuario(t, a.id)).areasExtras).toEqual([]);
  });

  it('a equipe não escolhe áreas', async () => {
    const adm = await t.admin();
    expect((await atualizar(adm, { areasExtras: ['saude_medio'] })).statusCode).toBe(403);
  });
});
