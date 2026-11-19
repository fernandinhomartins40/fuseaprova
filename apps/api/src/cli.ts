/**
 * CLI da API.
 *
 *   pnpm --filter api cli admin:criar --email dono@x.com --nome "Luiz Oliveira" [--senha …]
 *
 * Sem --senha (e sem ADMIN_SENHA no ambiente), pede a senha no terminal sem eco.
 * O admin entra pelo /admin/entrar e cuida do conteúdo; a equipe não estuda, então a conta não
 * ganha acesso pago (D24). Se o e-mail já existe, vira admin.
 *
 * D13:
 *   pnpm --filter @fuse/api cli superadmin:criar --email dono@x.com [--nome "Luiz Oliveira"] [--senha …]
 *     Conta que já existe: só promove o papel (a senha NÃO muda nem é pedida).
 *     Conta nova: precisa de --nome; sem --senha (e sem ADMIN_SENHA), gera uma senha forte e
 *     mostra uma única vez. O 2FA é configurado no primeiro login, em /super/2fa.
 *   pnpm --filter @fuse/api cli superadmin:resetar-2fa --email dono@x.com
 *     Apaga o 2FA (perdeu o celular e os códigos de recuperação). Encerra as sessões.
 *
 * D45:
 *   pnpm --filter @fuse/api cli edital:palmital [--simular]
 *     Mostra o que a importação dos 49 cargos do edital de Palmital vai mudar. Não grava nada.
 *   pnpm --filter @fuse/api cli edital:palmital --aplicar --confirmar
 *     Grava os cargos do edital (invisíveis para o aluno até publicar), com a foto do antes.
 *   pnpm --filter @fuse/api cli edital:palmital --publicar --confirmar
 *     Liga o modo edital (o mesmo botão "Publicar edital" do painel).
 *   pnpm --filter @fuse/api cli edital:palmital --desfazer --confirmar
 *     Volta o concurso e os cargos à foto da importação.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { conectar, migrar, schema } from '@fuse/db';
import { normalizarEmail, validarEmail, validarNomeCompleto, SENHA_MINIMA } from '@fuse/shared';
import {
  aplicarEditalPalmital,
  descreverPlano,
  desfazerEditalPalmital,
  planejarEditalPalmital,
  publicarEditalPalmital,
} from './servicos/editalPalmital.js';
import { gerarHashSenha } from './servicos/senhas.js';
import { criarOuPromoverSuperadmin } from './servicos/superadminCli.js';

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
    const { usuarios, auditoria } = schema;
    const senhaHash = await gerarHashSenha(senha);
    const [existente] = await conexao.db.select().from(usuarios).where(eq(usuarios.email, email));
    let id: string;
    if (existente) {
      await conexao.db.update(usuarios).set({ papel: 'admin', senhaHash, nome }).where(eq(usuarios.id, existente.id));
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

async function superadminCriar(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { email: { type: 'string' }, nome: { type: 'string' }, senha: { type: 'string' } },
  });
  const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
  try {
    if (conexao.tipo === 'pglite') await migrar(conexao);
    const r = await criarOuPromoverSuperadmin(conexao.db, {
      email: values.email ?? process.env.ADMIN_EMAIL ?? '',
      nome: values.nome ?? process.env.ADMIN_NOME,
      senha: values.senha ?? (process.env.ADMIN_SENHA || undefined),
    });
    if (r.promovido) {
      console.info(`Usuário ${r.email} promovido a superadmin. A senha não mudou; as sessões abertas foram encerradas.`);
    } else {
      console.info(`Superadmin ${r.email} criado.`);
      if (r.senhaGerada) {
        console.info('');
        console.info(`  Senha gerada (aparece só agora, guarde num gerenciador de senhas): ${r.senhaGerada}`);
        console.info('');
      }
    }
    console.info('No primeiro login, configure o 2FA em /super/2fa com um app autenticador.');
  } finally {
    await conexao.fechar();
  }
}

async function superadminResetar2fa(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { email: { type: 'string' } } });
  const email = normalizarEmail(values.email ?? '');
  if (!validarEmail(email)) throw new Error('Informe um e-mail válido com --email.');
  const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
  try {
    const { usuarios, auditoria, sessoes, codigosRecuperacao } = schema;
    const [u] = await conexao.db.select().from(usuarios).where(eq(usuarios.email, email));
    if (!u) throw new Error(`Não existe conta com o e-mail ${email}.`);
    await conexao.db.update(usuarios).set({ totpSegredo: null, totpAtivadoEm: null, totpUltimoPasso: null }).where(eq(usuarios.id, u.id));
    await conexao.db.delete(codigosRecuperacao).where(eq(codigosRecuperacao.usuarioId, u.id));
    await conexao.db.delete(sessoes).where(eq(sessoes.usuarioId, u.id));
    await conexao.db.insert(auditoria).values({ adminId: u.id, acao: '2fa.resetar', alvo: `usuario:${u.id}`, motivo: 'CLI superadmin:resetar-2fa' });
    console.info(`2FA de ${email} apagado. Configure de novo no próximo login.`);
  } finally {
    await conexao.fechar();
  }
}

async function editalPalmital(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      simular: { type: 'boolean' },
      aplicar: { type: 'boolean' },
      publicar: { type: 'boolean' },
      desfazer: { type: 'boolean' },
      confirmar: { type: 'boolean' },
    },
  });
  const modos = (['aplicar', 'publicar', 'desfazer'] as const).filter((m) => values[m]);
  if (modos.length > 1) throw new Error('Use um modo por vez: --simular, --aplicar, --publicar ou --desfazer.');
  const modo = modos[0] ?? 'simular';
  if (modo !== 'simular' && !values.confirmar) {
    throw new Error(`--${modo} grava no banco: rode antes sem ele para conferir e repita com --confirmar.`);
  }
  const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
  try {
    if (conexao.tipo === 'pglite') await migrar(conexao);
    const agora = new Date();
    if (modo === 'simular') {
      console.info(descreverPlano(await planejarEditalPalmital(conexao.db)));
      console.info('');
      console.info('SIMULAÇÃO: nada foi gravado. Para gravar: --aplicar --confirmar');
    } else if (modo === 'aplicar') {
      console.info(descreverPlano(await aplicarEditalPalmital(conexao.db, agora)));
      console.info('');
      console.info('Cargos do edital gravados. Os alunos só veem depois de publicar (--publicar --confirmar ou o painel).');
    } else if (modo === 'publicar') {
      const r = await publicarEditalPalmital(conexao.db, agora);
      console.info(`Edital publicado. ${r.usuariosParaConfirmar} alunos vão ver "Confirme seu cargo".`);
    } else {
      const r = await desfazerEditalPalmital(conexao.db, agora);
      console.info(`Desfeito: o concurso e ${r.restaurados} cargos voltaram ao estado de antes da importação de ${r.fotoDe}.`);
    }
  } finally {
    await conexao.fechar();
  }
}

const [comando, ...resto] = process.argv.slice(2);
try {
  if (comando === 'admin:criar') await adminCriar(resto);
  else if (comando === 'superadmin:criar') await superadminCriar(resto);
  else if (comando === 'superadmin:resetar-2fa') await superadminResetar2fa(resto);
  else if (comando === 'edital:palmital') await editalPalmital(resto);
  else {
    console.info(
      'Comandos:\n  admin:criar --email <e-mail> --nome "<nome completo>" [--senha <senha>]\n  superadmin:criar --email <e-mail> [--nome "<nome completo>"] [--senha <senha>]\n  superadmin:resetar-2fa --email <e-mail>\n  edital:palmital [--simular | --aplicar | --publicar | --desfazer] [--confirmar]',
    );
    process.exitCode = comando ? 1 : 0;
  }
} catch (e) {
  console.error(`Erro: ${(e as Error).message}`);
  process.exitCode = 1;
}
