/**
 * Domínio por assunto e disciplina (PRD 6.6), a partir das últimas 30 tentativas por assunto.
 */
import { asc, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { dominioDaDisciplina, dominioDoAssunto, type SlugDisciplina } from '@fuse/shared';
import { agrupar, consultar, type Db } from '../util.js';

const { disciplinas } = schema;

export interface DominioDisciplina {
  slug: SlugDisciplina;
  nome: string;
  cor: string;
  valor: number | null;
}

export async function dominioPorDisciplina(db: Db, usuarioId: string): Promise<DominioDisciplina[]> {
  const linhasT = await consultar<{ disciplina_id: string; assunto_id: string; acertou: boolean }>(
    db,
    sql`select disciplina_id, assunto_id, acertou from (
          select q.disciplina_id, q.assunto_id, t.acertou, t.respondida_em,
                 row_number() over (partition by q.assunto_id order by t.respondida_em desc) as rn
          from tentativas t join questoes q on q.id = t.questao_id
          where t.usuario_id = ${usuarioId}
        ) x where rn <= 30 order by respondida_em asc`,
  );
  const ds = await db.select().from(disciplinas).orderBy(asc(disciplinas.ordem));
  const porDisc = agrupar(linhasT, (l) => l.disciplina_id);
  return ds.map((d) => {
    const porAssunto = agrupar(porDisc.get(d.id) ?? [], (l) => l.assunto_id);
    const assuntos = [...porAssunto.values()].map((ts) => dominioDoAssunto(ts.map((t) => Boolean(t.acertou))));
    return { slug: d.slug, nome: d.nome, cor: d.cor, valor: dominioDaDisciplina(assuntos) };
  });
}
