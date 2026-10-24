/** Resolve a prova de origem de uma importação (id, slug FAU, id do PCI ou hash do caderno). */
import { eq, or } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import { arquivosColetados, provasOrigem } from '@fuse/db/schema';
import { urlDaProvaPci } from './pci/parser.js';

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolverProva(
  db: BancoDados,
  ref: string | null | undefined,
  hashCaderno?: string,
): Promise<string> {
  if (ref) {
    const r = ref.trim();
    if (RE_UUID.test(r)) {
      const [p] = await db
        .select({ id: provasOrigem.id })
        .from(provasOrigem)
        .where(eq(provasOrigem.id, r));
      if (!p) throw new Error(`Prova de origem ${r} não encontrada.`);
      return p.id;
    }
    const linhas = await db
      .select({
        id: provasOrigem.id,
        nome: provasOrigem.nome,
        orgao: provasOrigem.orgao,
        cargo: provasOrigem.cargo,
      })
      .from(provasOrigem)
      .where(or(eq(provasOrigem.slugFau, r), eq(provasOrigem.urlPagina, urlDaProvaPci(r))));
    if (linhas.length === 1) return linhas[0]!.id;
    if (linhas.length > 1) {
      throw new Error(
        `"${r}" corresponde a ${linhas.length} provas; use o id:\n` +
          linhas
            .map((l) => `  ${l.id}  ${l.nome ?? l.orgao}${l.cargo ? ` (${l.cargo})` : ''}`)
            .join('\n'),
      );
    }
    throw new Error(`Nenhuma prova de origem com id, slug FAU ou id do PCI "${r}".`);
  }
  if (hashCaderno) {
    const [a] = await db
      .select({ provaOrigemId: arquivosColetados.provaOrigemId })
      .from(arquivosColetados)
      .where(eq(arquivosColetados.hashSha256, hashCaderno));
    if (a?.provaOrigemId) return a.provaOrigemId;
  }
  throw new Error(
    'Não deu para saber de qual prova é o caderno. Informe --prova <id | slug FAU | id do PCI>.',
  );
}
