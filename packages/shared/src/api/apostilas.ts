/**
 * D34: as 4 apostilas em PDF, produto à parte do preparatório. R$ 47 no Pix via Asaas, pagamento
 * único, sem cupom nem desconto. A compra libera só o download das apostilas: não libera o app,
 * não gasta o teste grátis e não conta para o desconto de concurso adicional (D21).
 */
import { z } from 'zod';
import { DataHora, Uuid, ZStatusPedido } from './comum.js';

export const PRECO_APOSTILAS_CENTAVOS = 4700;

/** Os 4 volumes publicados em ARQUIVOS_DIR/apostilas/volume-N.pdf. */
export const VOLUMES_APOSTILA = [
  {
    volume: 1,
    titulo: 'Base comum',
    subtitulo: 'Português, Matemática, Conhecimentos Gerais, Informática e Rotinas do Serviço Público',
    cor: '#D9480F',
    questoes: 2739,
    paginas: 1078,
  },
  {
    volume: 2,
    titulo: 'Saúde pública e enfermagem',
    subtitulo: 'SUS, vigilância, atenção básica, enfermagem, farmacologia e clínica',
    cor: '#15803D',
    questoes: 2496,
    paginas: 1076,
  },
  {
    volume: 3,
    titulo: 'Profissões da saúde, educação e assistência social',
    subtitulo: 'Odontologia, fonoaudiologia, fisioterapia, nutrição, psicologia, veterinária, educação e serviço social',
    cor: '#1D6FE0',
    questoes: 2542,
    paginas: 1096,
  },
  {
    volume: 4,
    titulo: 'Administração, direito e áreas técnicas',
    subtitulo: 'Direito, contabilidade, legislação, trânsito, engenharia, agronomia e serviços operacionais',
    cor: '#8B5CF6',
    questoes: 2810,
    paginas: 1171,
  },
] as const;

export type VolumeApostila = (typeof VOLUMES_APOSTILA)[number];
export const TOTAL_QUESTOES_APOSTILAS = VOLUMES_APOSTILA.reduce((s, v) => s + v.questoes, 0);

/** Nome do arquivo no disco e no download. */
export function arquivoApostila(volume: number): string {
  return `volume-${volume}.pdf`;
}
export function nomeDownloadApostila(volume: number): string {
  const v = VOLUMES_APOSTILA.find((x) => x.volume === volume);
  return `Apostila Fuse Aprova - Volume ${volume}${v ? ` - ${v.titulo}` : ''}.pdf`;
}

/** Caminho do download (rota binária fora do contrato JSON; sessão de aluno com a compra paga). */
export function caminhoDownloadApostila(volume: number): string {
  return `/api/apostilas/${volume}/pdf`;
}

/** Aparece para o pagador e no painel da conta compartilhada do Asaas. */
export function descricaoCobrancaApostilas(): string {
  return 'Fuse Aprova: 4 apostilas de questões comentadas da banca FAU (PDF)';
}

/** POST /apostilas/pix — gera ou reaproveita o Pix pendente não expirado das apostilas. */
export const ApostilasPixResposta = z.object({
  pedidoId: Uuid,
  valorCentavos: z.number().int(),
  /** PNG em base64 (sem o prefixo data:), vindo do Asaas (`encodedImage`). */
  imagem: z.string(),
  /** Pix copia e cola. */
  payload: z.string(),
  expiraEm: DataHora,
  status: ZStatusPedido,
});
export type ApostilasPixResposta = z.infer<typeof ApostilasPixResposta>;

/** GET /apostilas/status — consultado a cada 4 s pela página enquanto o Pix está pendente. */
export const ApostilasStatusResposta = z.object({
  /** Há pedido de apostilas pago (e não estornado): os downloads estão liberados. */
  comprado: z.boolean(),
  /** O pedido de apostilas mais recente (null = nunca gerou Pix). */
  status: z.union([ZStatusPedido, z.literal('nenhum')]),
  pedidoId: Uuid.nullable(),
  expiraEm: DataHora.nullable(),
  pagoEm: DataHora.nullable(),
  /** O Pix pendente passou da validade: mostrar "Esse Pix expirou." e gerar outro. */
  expirado: z.boolean(),
  valorCentavos: z.number().int(),
});
export type ApostilasStatusResposta = z.infer<typeof ApostilasStatusResposta>;
