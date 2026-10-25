/**
 * Configurações do produto que não são segredo (D13): contato de suporte, modo manutenção,
 * aviso global e texto do aviso do edital. Ficam na tabela `configuracoes` (chave
 * `produto`) e são lidas com um cache curto em memória, porque o modo manutenção é
 * conferido em toda rota de conteúdo. O preço NÃO é configuração: é o PRICE_CENTS do .env.
 */
import { eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { AVISO_EDITAL } from '@fuse/shared';
import { ConfiguracoesProduto, type ConfigPublicaResposta } from '@fuse/shared/api';
import type { Config } from '../config.js';
import type { Db } from '../util.js';

const { configuracoes } = schema;
export const CHAVE_PRODUTO = 'produto';
const CACHE_MS = 10_000;

export type ValoresProduto = ConfiguracoesProduto;

export function valoresPadrao(config: Config): ValoresProduto {
  return {
    suporteWhatsapp: config.suporte.whatsapp.replace(/\D/g, ''),
    suporteEmail: config.suporte.email,
    manutencao: { ativa: false, mensagem: '' },
    aviso: { ativo: false, texto: '', tom: 'info' },
    avisoEdital: AVISO_EDITAL,
  };
}

interface Linha {
  valores: ValoresProduto;
  atualizadoEm: Date | null;
  atualizadoPor: string | null;
}

let cache: { em: number; db: Db; linha: Linha } | null = null;

export function limparCacheConfiguracoes(): void {
  cache = null;
}

/** Lê do banco (ou do cache) e completa com os padrões do .env. */
export async function lerConfiguracoes(db: Db, config: Config, opcoes: { semCache?: boolean } = {}): Promise<Linha> {
  const agora = Date.now();
  if (!opcoes.semCache && cache && cache.db === db && agora - cache.em < CACHE_MS) return cache.linha;
  const [l] = await db.select().from(configuracoes).where(eq(configuracoes.chave, CHAVE_PRODUTO));
  const padrao = valoresPadrao(config);
  let valores = padrao;
  if (l) {
    const salvo = l.valor as Partial<ValoresProduto>;
    const r = ConfiguracoesProduto.safeParse({ ...padrao, ...salvo });
    valores = r.success ? r.data : padrao;
  }
  const linha: Linha = { valores, atualizadoEm: l?.atualizadoEm ?? null, atualizadoPor: l?.atualizadoPor ?? null };
  cache = { em: agora, db, linha };
  return linha;
}

export async function salvarConfiguracoes(db: Db, valores: ValoresProduto, porId: string, agora: Date): Promise<void> {
  await db
    .insert(configuracoes)
    .values({ chave: CHAVE_PRODUTO, valor: valores, atualizadoEm: agora, atualizadoPor: porId })
    .onConflictDoUpdate({
      target: configuracoes.chave,
      set: { valor: valores, atualizadoEm: agora, atualizadoPor: porId },
    });
  limparCacheConfiguracoes();
}

export function configPublica(v: ValoresProduto, config: Config): ConfigPublicaResposta {
  return {
    suporte: { whatsapp: v.suporteWhatsapp, email: v.suporteEmail || 'suporte@fuseaprova.com.br' },
    manutencao: {
      ativa: v.manutencao.ativa,
      mensagem: v.manutencao.mensagem || 'Estamos fazendo uma manutenção rápida. Volte em alguns minutos.',
    },
    aviso: v.aviso.ativo && v.aviso.texto ? { texto: v.aviso.texto, tom: v.aviso.tom } : null,
    avisoEdital: v.avisoEdital || AVISO_EDITAL,
    precoCentavos: config.precoCentavos,
  };
}
