/**
 * pnpm --filter @fuse/db conteudo:aplicar <pacote.json> [--simular]
 * Aplica um pacote de conteúdo oficial (D15). --simular só valida e mostra o resumo,
 * desfazendo tudo no fim.
 */
import { readFile } from 'node:fs/promises';
import { aplicarPacote, validarPacote, type PacoteConteudo } from '../conteudo/pacote.js';
import { conectar } from '../cliente.js';
import { carregarEnv } from './ambiente.js';

const args = process.argv.slice(2);
const simular = args.includes('--simular');
const arquivo = args.find((a) => !a.startsWith('--'));
if (!arquivo) {
  console.error('Uso: conteudo:aplicar <pacote.json> [--simular]');
  process.exit(1);
}

const pacote = JSON.parse(await readFile(arquivo, 'utf8')) as PacoteConteudo;
const erros = validarPacote(pacote);
if (erros.length) {
  console.error(`Pacote inválido (${erros.length} problemas):\n- ${erros.join('\n- ')}`);
  process.exit(1);
}

carregarEnv();
const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
const DESFAZER = new Error('simulação');
try {
  await conexao.db
    .transaction(async (tx) => {
      const resumo = await aplicarPacote(tx as unknown as typeof conexao.db, pacote);
      console.info(JSON.stringify(resumo, null, 2));
      if (simular) throw DESFAZER;
    })
    .catch((e: unknown) => {
      if (e !== DESFAZER) throw e;
      console.info('Simulação: nada foi gravado.');
    });
} finally {
  await conexao.fechar();
}
