#!/usr/bin/env node
/**
 * CLI `crawler` (PRD 7.5). Códigos de saída: 0 ok, 1 erro, 2 captcha/login detectado
 * (o coletor parou sem contornar), 3 proibido pelo robots.txt.
 */
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { conectar, type Conexao } from '@fuse/db';
import type { TipoArquivoColeta } from '@fuse/shared';
import { TIPOS_ARQUIVO_COLETA } from '@fuse/shared';
import { sha256DoArquivo } from './arquivos/armazenamento.js';
import { lerConfig } from './config.js';
import { atualizarCertames } from './fau/certames.js';
import { baixarDocsCertame } from './fau/docs.js';
import { importarProva } from './importacao/importar.js';
import { baixarPci, listarPci } from './pci/comandos.js';
import { parseIntervaloPaginas } from './pci/parser.js';
import { resolverProva } from './prova.js';
import { ErroBloqueio, ErroRobots } from './rede/bloqueio.js';
import { ClienteHttp } from './rede/cliente.js';

const AJUDA = `Uso: crawler <comando> [opções]

Comandos:
  fau:certames [--sem-andamento]
      Atualiza provas_origem com os certames da FAU (encerrados e em andamento).
  fau:docs <slug> [--tipos edital,gabarito,recursos,caderno] [--todos] [--forcar]
      Baixa os PDFs de edital, gabarito definitivo e respostas a recursos do certame.
  pci:listar [--paginas 1-28] [--sem-banco]
      Lista as provas FAU do PCI Concursos (e grava em provas_origem).
  pci:baixar <id>
      Baixa caderno e gabarito de uma prova do PCI (para se houver captcha).
  importar <caderno.pdf> --gabarito <gabarito.pdf> [--prova <id|slug>] [--cargo <nome>]
           [--preliminar <gabarito-preliminar.pdf>] [--forcar] [--simular]
      Extrai as questões, confronta com o gabarito definitivo e grava como rascunho.

Opções gerais: --json (saída em JSON), --ajuda
Ambiente: DATABASE_URL, ARQUIVOS_DIR, CRAWLER_USER_AGENT, CRAWLER_INTERVALO_MS (mín. 2000), PDFTOTEXT_BIN.
`;

function imprimir(json: boolean, dados: unknown, texto: () => string): void {
  if (json)
    console.log(
      JSON.stringify(dados, (_k, v) => (v instanceof Map ? Object.fromEntries(v) : v), 2),
    );
  else console.log(texto());
}

async function principal(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      paginas: { type: 'string', default: '1-28' },
      gabarito: { type: 'string' },
      preliminar: { type: 'string' },
      prova: { type: 'string' },
      cargo: { type: 'string' },
      tipos: { type: 'string' },
      todos: { type: 'boolean', default: false },
      forcar: { type: 'boolean', default: false },
      simular: { type: 'boolean', default: false },
      'sem-banco': { type: 'boolean', default: false },
      'sem-andamento': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      ajuda: { type: 'boolean', short: 'h', default: false },
    },
  });
  const [comando, ...args] = positionals;
  if (!comando || values.ajuda) {
    console.log(AJUDA);
    return comando || values.ajuda ? 0 : 1;
  }
  const config = lerConfig();
  const log = values.json ? undefined : (m: string) => console.error(m);
  const cliente = new ClienteHttp({
    userAgent: config.userAgent,
    intervaloMs: config.intervaloMs,
    log,
  });
  let conexao: Conexao | null = null;
  const banco = () => {
    conexao ??= conectar(config.databaseUrl, { max: 2 });
    return conexao.db;
  };

  try {
    switch (comando) {
      case 'fau:certames': {
        const r = await atualizarCertames({
          db: banco(),
          cliente,
          incluirAndamento: !values['sem-andamento'],
          log,
        });
        imprimir(values.json, r, () =>
          [
            `Certames lidos: ${r.lidos} (${Object.entries(r.porSituacao)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')})`,
            `Novos: ${r.inseridos} · atualizados: ${r.atualizados} · sem mudança: ${r.inalterados} · descartados: ${r.descartados.length}`,
            ...r.novos.map((n) => `  + ${n.nome} (${n.url})`),
          ].join('\n'),
        );
        return 0;
      }
      case 'fau:docs': {
        const slug = args[0];
        if (!slug) throw new Error('Informe o slug: crawler fau:docs pmsf2026');
        const tipos = values.tipos?.split(',').map((t) => t.trim()) as
          | TipoArquivoColeta[]
          | undefined;
        const invalido = tipos?.find((t) => !TIPOS_ARQUIVO_COLETA.includes(t));
        if (invalido)
          throw new Error(`Tipo inválido: ${invalido}. Use: ${TIPOS_ARQUIVO_COLETA.join(', ')}.`);
        const r = await baixarDocsCertame({
          db: banco(),
          cliente,
          slug,
          arquivosDir: config.arquivosDir,
          tipos,
          todos: values.todos,
          forcar: values.forcar,
          log,
        });
        imprimir(values.json, r, () =>
          [
            `${r.nome} (${r.url})`,
            ...r.baixados.map(
              (b) =>
                `  [${b.tipo}] ${b.titulo}: ${b.situacao} → ${b.caminho} (sha256 ${b.hash.slice(0, 12)}…)`,
            ),
            ...r.falhas.map((f) => `  FALHOU ${f.titulo}: ${f.erro}`),
            ...r.avisos.map((a) => `Aviso: ${a}`),
          ].join('\n'),
        );
        return r.falhas.length ? 1 : 0;
      }
      case 'pci:listar': {
        const paginas = parseIntervaloPaginas(values.paginas);
        const r = await listarPci({
          cliente,
          paginas,
          db: values['sem-banco'] ? undefined : banco(),
          log,
        });
        imprimir(values.json, r, () =>
          [
            ...r.provas.map((p) => `${p.id}\t${p.ano ?? '-'}\t${p.cargo}\t${p.orgao}`),
            `${r.provas.length} provas em ${r.paginasLidas.length} página(s)${r.totalPaginas ? ` de ${r.totalPaginas}` : ''}; gravadas em provas_origem: ${r.gravadas}.`,
          ].join('\n'),
        );
        return 0;
      }
      case 'pci:baixar': {
        const id = args[0];
        if (!id)
          throw new Error(
            'Informe o id do PCI: crawler pci:baixar administrador-…-fau-unicentro-2024',
          );
        const r = await baixarPci({
          db: banco(),
          cliente,
          id,
          arquivosDir: config.arquivosDir,
          forcar: values.forcar,
          log,
        });
        imprimir(values.json, r, () =>
          [
            `${r.id} → prova ${r.provaOrigemId}`,
            ...r.baixados.map((b) => `  ${b.nome}: ${b.situacao} → ${b.caminho}`),
            ...r.avisos.map((a) => `Aviso: ${a}`),
          ].join('\n'),
        );
        return 0;
      }
      case 'importar': {
        const caderno = args[0];
        if (!caderno || !values.gabarito)
          throw new Error(
            'Uso: crawler importar <caderno.pdf> --gabarito <gabarito.pdf> [--prova <id>]',
          );
        const db = banco();
        const cadernoAbs = resolve(caderno);
        const provaId = await resolverProva(db, values.prova, await sha256DoArquivo(cadernoAbs));
        const r = await importarProva({
          db,
          caderno: cadernoAbs,
          gabarito: resolve(values.gabarito),
          preliminar: values.preliminar ? resolve(values.preliminar) : null,
          provaId,
          cargo: values.cargo,
          forcar: values.forcar,
          simular: values.simular,
          pdf: { binario: config.pdftotext },
        });
        imprimir(
          values.json,
          {
            ...r,
            caderno: undefined,
            gabarito: undefined,
            confronto: {
              ...r.confronto,
              itens: r.confronto.itens.map(({ questao: _q, ...i }) => i),
            },
          },
          () =>
            [
              values.simular
                ? 'SIMULAÇÃO: nada foi gravado.'
                : `Importação ${r.importacaoId} registrada (status confrontado) para revisão no painel.`,
              `Prova ${r.provaId}${r.cargo ? ` · cargo ${r.cargo}` : ''}`,
              `Extraídas ${r.extraidas} · gravadas ${r.gravadas} · atualizadas ${r.atualizadas} · já existiam ${r.jaExistiam}`,
              `Anuladas ${r.anuladas} · alteradas ${r.alteradas} · divergências ${r.divergencias}`,
              ...r.confronto.itens
                .filter((i) => i.problemas.length || i.avisos.length)
                .map(
                  (i) =>
                    `  ${String(i.numero).padStart(2, '0')} [${i.gabaritoDefinitivo ?? '?'}] ${[...i.problemas, ...i.avisos].join('; ')}`,
                ),
              ...r.avisos.map((a) => `Aviso: ${a}`),
              'Nada foi publicado: publicar exige dica, explicação e revisão humana no painel.',
            ].join('\n'),
        );
        return 0;
      }
      default:
        console.error(`Comando desconhecido: ${comando}\n`);
        console.log(AJUDA);
        return 1;
    }
  } catch (e) {
    console.error(`Erro: ${(e as Error).message}`);
    if (e instanceof ErroBloqueio) return 2;
    if (e instanceof ErroRobots) return 3;
    return 1;
  } finally {
    await (conexao as Conexao | null)?.fechar();
  }
}

principal(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (e: unknown) => {
    console.error(`Erro: ${(e as Error).message}`);
    process.exitCode = 1;
  },
);
