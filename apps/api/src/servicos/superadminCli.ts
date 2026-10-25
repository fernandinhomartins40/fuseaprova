/**
 * CLI `superadmin:criar` (D13), separado do cli.ts para ser testável:
 * - conta que já existe: só promove o papel (a senha NÃO muda) e encerra as sessões abertas;
 * - conta nova: cria com a senha informada ou, sem ela, com uma senha forte gerada aqui,
 *   devolvida uma única vez para a CLI mostrar.
 * O 2FA é configurado no primeiro login, em /super/2fa.
 */
import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { normalizarEmail, SENHA_MINIMA, validarEmail, validarNomeCompleto } from '@fuse/shared';
import type { Db } from '../util.js';
import { gerarHashSenha } from './senhas.js';

/** Sem caracteres parecidos (0/O, 1/l/I) para ler e digitar sem erro. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const SIMBOLOS = '-_.!@#';

/** Senha forte aleatória (CSPRNG): 20 caracteres com maiúscula, minúscula, número e símbolo. */
export function gerarSenhaForte(tamanho = 20): string {
  const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', SIMBOLOS];
  const chars = grupos.map((g) => g[randomInt(g.length)]!);
  const todos = ALFABETO + SIMBOLOS;
  while (chars.length < tamanho) chars.push(todos[randomInt(todos.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

export interface ResultadoSuperadmin {
  id: string;
  email: string;
  promovido: boolean;
  /** Só quando a conta foi criada sem senha informada: mostrar uma vez e descartar. */
  senhaGerada: string | null;
}

export async function criarOuPromoverSuperadmin(
  db: Db,
  entrada: { email: string; nome?: string | undefined; senha?: string | undefined },
): Promise<ResultadoSuperadmin> {
  const email = normalizarEmail(entrada.email);
  if (!validarEmail(email)) throw new Error('Informe um e-mail válido com --email.');
  const { usuarios, auditoria, concursos, sessoes } = schema;
  const [existente] = await db.select().from(usuarios).where(eq(usuarios.email, email));

  if (existente) {
    await db
      .update(usuarios)
      .set({ papel: 'superadmin', acesso: true, bloqueadoEm: null, bloqueioMotivo: null })
      .where(eq(usuarios.id, existente.id));
    // As sessões abertas caem: a próxima já entra com as regras do superadmin (2FA e 12 h).
    await db.delete(sessoes).where(eq(sessoes.usuarioId, existente.id));
    await db.insert(auditoria).values({
      adminId: existente.id,
      acao: 'superadmin.criar',
      alvo: `usuario:${existente.id}`,
      detalhes: { email, promovido: true, papelAnterior: existente.papel },
      motivo: 'CLI superadmin:criar',
    });
    return { id: existente.id, email, promovido: true, senhaGerada: null };
  }

  const nome = (entrada.nome ?? '').trim();
  if (!validarNomeCompleto(nome)) throw new Error('Conta nova: informe nome e sobrenome com --nome.');
  const senhaGerada = entrada.senha ? null : gerarSenhaForte();
  const senha = entrada.senha ?? senhaGerada!;
  if (senha.length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  const [concurso] = await db.select({ id: concursos.id }).from(concursos).where(eq(concursos.ativo, true)).limit(1);
  const agora = new Date();
  const [u] = await db
    .insert(usuarios)
    .values({
      nome,
      email,
      senhaHash: await gerarHashSenha(senha),
      papel: 'superadmin',
      acesso: true,
      concursoId: concurso?.id ?? null,
      onboardingConcluidoEm: agora,
      aceiteTermosEm: agora,
      versaoTermos: 'admin',
    })
    .returning({ id: usuarios.id });
  await db.insert(auditoria).values({
    adminId: u!.id,
    acao: 'superadmin.criar',
    alvo: `usuario:${u!.id}`,
    detalhes: { email, promovido: false },
    motivo: 'CLI superadmin:criar',
  });
  return { id: u!.id, email, promovido: false, senhaGerada };
}
