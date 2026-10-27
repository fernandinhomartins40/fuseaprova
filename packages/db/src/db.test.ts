import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { conectar, migrar } from './cliente.js';
import * as s from './schema/index.js';
import { criarBancoTeste, type BancoTeste } from './teste.js';
import { idFixo, planoDeLicoes, semear, UNIDADES_SEED } from './seed/index.js';
import { dataBrParaIso, lerCatalogo, linhasProvasOrigem, nomeLegivel } from './seed/catalogo.js';

let banco: BancoTeste;

beforeAll(async () => {
  banco = await criarBancoTeste({ seed: true });
});

afterAll(async () => {
  await banco?.fechar();
});

async function contar(tabela: PgTable) {
  const [r] = await banco.db.select({ n: count() }).from(tabela);
  return r!.n;
}

describe('migrações em PGlite', () => {
  it('cria as tabelas da seção 9 do PRD', async () => {
    const r = await banco.db.execute<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public' order by 1`,
    );
    const nomes = (r as unknown as { rows: { tablename: string }[] }).rows.map((x) => x.tablename);
    for (const t of [
      'concursos',
      'cargos',
      'provas_origem',
      'disciplinas',
      'assuntos',
      'questoes',
      'unidades',
      'secoes',
      'licoes',
      'usuarios',
      'sessoes',
      'redefinicoes_senha',
      'pedidos',
      'usuarios_concursos',
      'webhook_eventos',
      'progresso_licoes',
      'sessoes_estudo',
      'tentativas',
      'revisoes',
      'simulados',
      'xp_eventos',
      'ligas_grupos',
      'ligas_membros',
      'conquistas_usuario',
      'reports',
      'push_inscricoes',
      'auditoria',
    ]) {
      expect(nomes, t).toContain(t);
    }
  });

  it('migração 0005 (D21): aluno antigo segue o concurso que usava, com o acesso que tinha', async () => {
    const [pal] = await banco.db.select().from(s.concursos).orderBy(s.concursos.criadoEm).limit(1);
    const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
    await banco.db.insert(s.usuarios).values([
      {
        id: id(1),
        nome: 'Pago com concurso',
        email: 'mig1@x.com',
        acesso: true,
        concursoId: pal!.id,
      },
      { id: id(2), nome: 'Pago sem concurso', email: 'mig2@x.com', acesso: true },
      {
        id: id(3),
        nome: 'Cadastro sem pagar',
        email: 'mig3@x.com',
        acesso: false,
        concursoId: pal!.id,
      },
      { id: id(4), nome: 'Nada ainda', email: 'mig4@x.com', acesso: false },
    ]);
    await banco.db.insert(s.pedidos).values([
      { usuarioId: id(1), valorCentavos: 39700, status: 'pago' },
      { usuarioId: id(2), valorCentavos: 39700, status: 'pago' },
      { usuarioId: id(4), valorCentavos: 39700, status: 'pendente' },
    ]);
    // o preenchimento é a parte da migração depois das mudanças de estrutura
    const arquivo = join(
      dirname(fileURLToPath(import.meta.url)),
      '../drizzle/0005_acesso_por_concurso.sql',
    );
    const sqlArquivo = readFileSync(arquivo, 'utf8');
    const preenchimento = sqlArquivo
      .slice(sqlArquivo.indexOf('UPDATE "usuarios" SET'))
      .split('--> statement-breakpoint')
      .map((x) => x.trim())
      .filter(Boolean);
    expect(preenchimento).toHaveLength(3);
    for (const comando of preenchimento) await banco.db.execute(sql.raw(comando));

    const linhas = await banco.db
      .select()
      .from(s.usuariosConcursos)
      .where(inArray(s.usuariosConcursos.usuarioId, [id(1), id(2), id(3), id(4)]));
    const por = new Map(linhas.map((l) => [l.usuarioId, l]));
    expect(por.get(id(1))).toMatchObject({ concursoId: pal!.id, acesso: true });
    expect(por.get(id(1))!.acessoEm).not.toBeNull();
    expect(por.get(id(2))).toMatchObject({ concursoId: pal!.id, acesso: true }); // sem concurso: o mais antigo
    expect(por.get(id(3))).toMatchObject({ concursoId: pal!.id, acesso: false });
    expect(por.has(id(4))).toBe(false);
    const [u2] = await banco.db
      .select()
      .from(s.usuarios)
      .where(eq(s.usuarios.id, id(2)));
    expect(u2!.concursoId).toBe(pal!.id);
    const pedidos = await banco.db
      .select()
      .from(s.pedidos)
      .where(inArray(s.pedidos.usuarioId, [id(1), id(2), id(4)]));
    expect(pedidos.map((p) => p.concursoId)).toEqual([pal!.id, pal!.id, pal!.id]);
  });

  it('cria os índices pedidos (GIN em areas e parcial em revisoes)', async () => {
    const r = await banco.db.execute<{ indexname: string; indexdef: string }>(
      sql`select indexname, indexdef from pg_indexes where schemaname = 'public'`,
    );
    const idx = Object.fromEntries(
      (r as unknown as { rows: { indexname: string; indexdef: string }[] }).rows.map((x) => [
        x.indexname,
        x.indexdef,
      ]),
    );
    expect(idx.questoes_areas_gin_idx).toMatch(/USING gin \(areas\)/);
    expect(idx.questoes_status_assunto_idx).toMatch(/\(status, assunto_id\)/);
    expect(idx.revisoes_usuario_vence_ativa_idx).toMatch(/WHERE \(status = 'ativa'/);
    expect(idx.tentativas_usuario_questao_respondida_idx).toMatch(/respondida_em DESC/);
    expect(idx.ligas_membros_ranking_idx).toMatch(/xp_semana DESC/);
  });

  it('impede questão fau_real sem prova de origem', async () => {
    const [q] = await banco.db.select().from(s.questoes).limit(1);
    await expect(
      banco.db
        .insert(s.questoes)
        .values({ ...q!, id: idFixo('teste:fau-sem-prova'), origem: 'fau_real' }),
    ).rejects.toThrow();
  });

  it('conectar("pglite://memoria") também funciona e migra', async () => {
    const c = conectar('pglite://memoria');
    await migrar(c);
    const [r] = await c.db.select({ n: count() }).from(s.questoes);
    expect(r!.n).toBe(0);
    await c.fechar();
    expect(() => conectar('')).toThrow('DATABASE_URL');
  });
});

describe('seed', () => {
  it('cria o concurso de Palmital aguardando edital', async () => {
    const [c] = await banco.db.select().from(s.concursos);
    expect(c).toMatchObject({
      slug: 'palmital-pr-2026',
      banca: 'FAU-Unicentro',
      municipio: 'Palmital',
      uf: 'PR',
      status: 'aguardando_edital',
    });
  });

  it('cria cargos genéricos de todas as áreas com 5/5/5/25', async () => {
    const lista = await banco.db.select().from(s.cargos);
    expect(new Set(lista.map((c) => c.area)).size).toBe(7);
    for (const c of lista) {
      expect(c.generico).toBe(true);
      expect(c.distribuicao).toEqual({ portugues: 5, matematica: 5, gerais: 5, especificos: 25 });
    }
  });

  it('cria as 4 disciplinas', async () => {
    const lista = await banco.db.select().from(s.disciplinas);
    expect(lista.map((d) => d.slug).sort()).toEqual([
      'especificos',
      'gerais',
      'matematica',
      'portugues',
    ]);
  });

  it('importa todos os certames do catálogo em provas_origem', async () => {
    const catalogo = await lerCatalogo();
    const total = catalogo.certames.length + (catalogo.provas_pci_amostra?.length ?? 0);
    expect(await contar(s.provasOrigem)).toBe(total);
    const [fau] = await banco.db
      .select({ n: count() })
      .from(s.provasOrigem)
      .where(eq(s.provasOrigem.fonte, 'fau'));
    expect(fau!.n).toBe(catalogo.certames.length);
    const [relevantes] = await banco.db
      .select({ n: count() })
      .from(s.provasOrigem)
      .where(eq(s.provasOrigem.relevanciaPalmital, true));
    expect(relevantes!.n).toBe(catalogo.certames.filter((c) => c.relevancia_palmital).length);
  });

  it('todas as questões do seed são autorais, rascunho, sem prova real e com 5 alternativas', async () => {
    const lista = await banco.db.select().from(s.questoes);
    expect(lista.length).toBe(banco.seed!.questoes);
    for (const q of lista) {
      expect(q.origem).toBe('autoral');
      expect(q.provaOrigemId).toBeNull();
      expect(q.status).toBe('rascunho');
      expect(q.alternativas.map((a) => a.letra).join('')).toBe('ABCDE');
      expect(q.alternativas.map((a) => a.texto)).toSatisfy((t: string[]) => new Set(t).size === 5);
      expect(q.explicacao?.length).toBeGreaterThan(10);
      expect(q.dicaBolso?.length).toBeGreaterThan(5);
      expect(q.dica?.length).toBeGreaterThan(5);
    }
  });

  it('Português e Administrativo têm 2 lições de questões por seção e baú e desafio', async () => {
    for (const chave of ['unidade:portugues-essencial', 'unidade:administrativo-essencial']) {
      const u = UNIDADES_SEED.find((x) => x.chave === chave)!;
      for (const sec of u.secoes) expect(sec.questoes.length).toBeGreaterThanOrEqual(10);
      expect(u.secoes.reduce((n, sec) => n + sec.questoes.length, 0)).toBeGreaterThanOrEqual(10);
      const tipos = planoDeLicoes(u).map((l) => l.tipo);
      expect(tipos).toContain('bau');
      expect(tipos.at(-1)).toBe('desafio');
    }
    const desafios = await banco.db.select().from(s.licoes).where(eq(s.licoes.tipo, 'desafio'));
    expect(desafios.length).toBe(UNIDADES_SEED.length);
    expect(desafios.every((d) => d.tamanho === 10)).toBe(true);
    const unidadeAdm = await banco.db
      .select()
      .from(s.unidades)
      .where(eq(s.unidades.area, 'administrativo'));
    expect(unidadeAdm).toHaveLength(1);
  });

  it('cada assunto tem dica com título, texto e exemplo', async () => {
    const lista = await banco.db.select().from(s.assuntos);
    expect(lista.length).toBe(banco.seed!.assuntos);
    for (const a of lista) {
      expect(a.dicaTitulo && a.dicaTexto && a.dicaExemplo).toBeTruthy();
    }
  });

  it('as questões de Português e de específico estão nas áreas certas', async () => {
    const [adm] = await banco.db
      .select({ n: count() })
      .from(s.questoes)
      .where(sql`${s.questoes.areas} @> array['administrativo']::text[]`);
    expect(adm!.n).toBe(30);
    const [comuns] = await banco.db
      .select({ n: count() })
      .from(s.questoes)
      .where(sql`cardinality(${s.questoes.areas}) = 0`);
    expect(comuns!.n).toBe(banco.seed!.questoes - 30);
  });

  it('é idempotente: rodar de novo não duplica nada', async () => {
    const antes = {
      q: await contar(s.questoes),
      p: await contar(s.provasOrigem),
      l: await contar(s.licoes),
      c: await contar(s.cargos),
      u: await contar(s.unidades),
    };
    await semear(banco.db);
    await semear(banco.db);
    expect({
      q: await contar(s.questoes),
      p: await contar(s.provasOrigem),
      l: await contar(s.licoes),
      c: await contar(s.cargos),
      u: await contar(s.unidades),
    }).toEqual(antes);
  });

  it('SEED_DEV_PUBLICAR publica só as autorais do seed', async () => {
    const r = await semear(banco.db, { publicarAutorais: true, semCatalogo: true });
    expect(r.autoraisPublicadas).toBe(true);
    const [rasc] = await banco.db
      .select({ n: count() })
      .from(s.questoes)
      .where(and(eq(s.questoes.status, 'rascunho')));
    expect(rasc!.n).toBe(0);
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    await expect(semear(banco.db, { publicarAutorais: true, semCatalogo: true })).rejects.toThrow(
      'produção',
    );
    process.env.NODE_ENV = anterior;
  });

  it('lista as pendências de conteúdo das leis de Palmital', () => {
    expect(banco.seed!.pendencias.join(' ')).toContain('Câmara Municipal de Palmital');
  });

  it('limpar() esvazia as tabelas', async () => {
    const outro = await criarBancoTeste({ seed: { semCatalogo: true } });
    expect(await outro.db.select({ n: count() }).from(s.questoes)).not.toEqual([{ n: 0 }]);
    await outro.limpar();
    expect(await outro.db.select({ n: count() }).from(s.questoes)).toEqual([{ n: 0 }]);
    await outro.fechar();
  });
});

describe('utilitários do seed', () => {
  it('idFixo é determinístico e tem formato de UUID v5', () => {
    expect(idFixo('a')).toBe(idFixo('a'));
    expect(idFixo('a')).not.toBe(idFixo('b'));
    expect(idFixo('a')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('converte o catálogo', () => {
    expect(dataBrParaIso('26/07/2026')).toBe('2026-07-26');
    expect(dataBrParaIso(null)).toBeNull();
    expect(nomeLegivel('PREFEITURA MUNICIPAL DE SALGADO FILHO - 2026')).toBe(
      'Prefeitura Municipal de Salgado Filho',
    );
    const linhas = linhasProvasOrigem({
      certames: [
        {
          nome: 'CÂMARA MUNICIPAL DE IRATI',
          tipo: 'Câmara',
          municipio: 'Irati',
          regime: '',
          data_prova: null,
          ano: 2024,
          pagina_fau: 'https://www.concursosfau.com.br/novo/concurso/cmi2024',
          relevancia_palmital: true,
        },
      ],
      provas_pci_amostra: [
        {
          cargo: 'Administrador',
          ano: 2024,
          orgao: 'Câmara de São João do Triunfo/PR',
          url: 'https://x/y',
        },
      ],
    });
    expect(linhas[0]).toMatchObject({
      orgao: 'Câmara de Irati',
      uf: 'PR',
      slugFau: 'cmi2024',
      fonte: 'fau',
    });
    expect(linhas[1]).toMatchObject({
      orgao: 'Câmara de São João do Triunfo',
      uf: 'PR',
      cargo: 'Administrador',
      fonte: 'pci',
    });
  });
});
