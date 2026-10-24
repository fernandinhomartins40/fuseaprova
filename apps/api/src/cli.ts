/**
 * CLI da API.
 *
 *   pnpm --filter api cli admin:criar --email dono@x.com --nome "Luiz Oliveira" [--senha …]
 *
 * Sem --senha (e sem ADMIN_SENHA no ambiente), pede a senha no terminal sem eco.
 * O admin é criado com acesso liberado (é o dono). Se o e-mail já existe, vira admin.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { conectar, migrar, schema } from '@fuse/db';
import { normalizarEmail, validarEmail, validarNomeCompleto, SENHA_MINIMA } from '@fuse/shared';
import { gerarHashSenha } from './servicos/senhas.js';

const env = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(env)) process.loadEnvFile(env);

function perguntarSenha(pergunta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      reject(new Error('Sem terminal interativo: use --senha ou a variável ADMIN_SENHA.'));
      return;
    }
    process.stdout.write(pergunta);
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding('utf8');
    let senha = '';
    const aoDigitar = (c: string) => {
      for (const ch of c) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off('data', aoDigitar);
          process.stdout.write('\n');
          resolve(senha);
          return;
        }
        if (ch === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') senha = senha.slice(0, -1);
        else senha += ch;
      }
    };
    entrada.on('data', aoDigitar);
  });
}

async function adminCriar(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { email: { type: 'string' }, nome: { type: 'string' }, senha: { type: 'string' } },
  });
  const email = normalizarEmail(values.email ?? process.env.ADMIN_EMAIL ?? '');
  const nome = (values.nome ?? process.env.ADMIN_NOME ?? 'Administrador Fuse').trim();
  if (!validarEmail(email)) throw new Error('Informe um e-mail válido com --email.');
  if (!validarNomeCompleto(nome)) throw new Error('Informe nome e sobrenome com --nome.');
  let senha = values.senha ?? process.env.ADMIN_SENHA ?? '';
  if (!senha) {
    senha = await perguntarSenha('Senha do admin: ');
    const conf = await perguntarSenha('Repita a senha: ');
    if (senha !== conf) throw new Error('As senhas não conferem.');
  }
  if (senha.length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);

  const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
  try {
    if (conexao.tipo === 'pglite') await migrar(conexao);
    const { usuarios, auditoria, concursos } = schema;
    const senhaHash = await gerarHashSenha(senha);
    const [concurso] = await conexao.db.select({ id: concursos.id }).from(concursos).where(eq(concursos.ativo, true)).limit(1);
    const [existente] = await conexao.db.select().from(usuarios).where(eq(usuarios.email, email));
    let id: string;
    if (existente) {
      await conexao.db.update(usuarios).set({ papel: 'admin', acesso: true, senhaHash, nome }).where(eq(usuarios.id, existente.id));
      id = existente.id;
      console.info(`Usuário ${email} promovido a admin.`);
    } else {
      const [u] = await conexao.db
        .insert(usuarios)
        .values({
          nome,
          email,
          senhaHash,
          papel: 'admin',
          acesso: true,
          concursoId: concurso?.id ?? null,
          onboardingConcluidoEm: new Date(),
          aceiteTermosEm: new Date(),
          versaoTermos: 'admin',
        })
        .returning({ id: usuarios.id });
      id = u!.id;
      console.info(`Admin ${email} criado.`);
    }
    await conexao.db.insert(auditoria).values({ adminId: id, acao: 'admin.criar', alvo: `usuario:${id}`, detalhes: { email } });
  } finally {
    await conexao.fechar();
  }
}

const [comando, ...resto] = process.argv.slice(2);
try {
  if (comando === 'admin:criar') await adminCriar(resto);
  else {
    console.info('Comandos:\n  admin:criar --email <e-mail> --nome "<nome completo>" [--senha <senha>]');
    process.exitCode = comando ? 1 : 0;
  }
} catch (e) {
  console.error(`Erro: ${(e as Error).message}`);
  process.exitCode = 1;
}
