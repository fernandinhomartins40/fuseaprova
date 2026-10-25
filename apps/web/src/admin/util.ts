/**
 * Nomes e formatação do painel admin (pt-BR, America/Sao_Paulo).
 */
import {
  ocultarCpf,
  type AreaCargo,
  type OrigemQuestao,
  type StatusConcurso,
  type StatusImportacao,
  type StatusPedido,
  type StatusQuestao,
  type StatusReport,
  type TipoLicao,
} from '@fuse/shared';

export const BASE_ADMIN = '/admin';

export const NOMES_STATUS_QUESTAO: Record<StatusQuestao, string> = {
  rascunho: 'Rascunho',
  revisao: 'Em revisão',
  publicada: 'Publicada',
  anulada: 'Anulada',
  retirada: 'Retirada',
};

export const NOMES_ORIGEM: Record<OrigemQuestao, string> = {
  fau_real: 'FAU real',
  autoral: 'Autoral',
};

export const NOMES_STATUS_PEDIDO: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  estornado: 'Estornado',
};

export const NOMES_STATUS_REPORT: Record<StatusReport, string> = {
  aberto: 'Aberto',
  resolvido: 'Resolvido',
  descartado: 'Descartado',
};

export const NOMES_STATUS_IMPORTACAO: Record<StatusImportacao, string> = {
  baixado: 'PDF baixado',
  extraido: 'Questões extraídas',
  confrontado: 'Confrontado com o gabarito',
  concluido: 'Concluído',
  erro: 'Erro',
};

export const NOMES_TIPO_LICAO: Record<TipoLicao, string> = {
  normal: 'Lição',
  bau: 'Baú',
  desafio: 'Desafio da unidade',
};

export const NOMES_STATUS_CONCURSO_CURTO: Record<StatusConcurso, string> = {
  aguardando_edital: 'Aguardando edital',
  edital_publicado: 'Edital publicado',
  prova_realizada: 'Prova realizada',
  homologado: 'Homologado',
};

export const NOMES_ESCOLARIDADE: Record<string, string> = {
  fundamental: 'Fundamental',
  medio: 'Médio',
  tecnico: 'Técnico',
  superior: 'Superior',
};

export const NOMES_DIFICULDADE: Record<number, string> = { 1: 'Fácil', 2: 'Média', 3: 'Difícil' };

export const NOMES_ACAO_AUDITORIA: Record<string, string> = {
  'acesso.liberar': 'Liberou acesso',
  'acesso.revogar': 'Revogou acesso',
  'pedido.reembolso': 'Pediu reembolso',
  'questao.criar': 'Criou questão',
  'questao.editar': 'Editou questão',
  'questao.lote': 'Ação em lote em questões',
  'questao.retirar_origem': 'Retirou origem',
  'questao.auto_retirada': 'Retirada automática (reports)',
  'prova.editar': 'Editou prova',
  'concurso.editar': 'Editou concurso',
  'cargo.editar': 'Editou cargo',
  'edital.salvar': 'Salvou edital',
  'edital.publicar': 'Publicou edital',
  'trilha.editar': 'Editou trilha',
  'report.atualizar': 'Atualizou report',
  'usuario.revogar_sessoes': 'Revogou sessões',
  'admin.criar': 'Criou admin',
  // D13: superadmin
  'superadmin.criar': 'Criou superadmin',
  '2fa.ativar': 'Ativou o 2FA',
  '2fa.codigos': 'Gerou códigos de recuperação',
  '2fa.recuperacao_usada': 'Usou código de recuperação',
  '2fa.resetar': 'Resetou o 2FA',
  'pedido.conciliar': 'Conciliou pedido',
  'pedido.conciliar_lote': 'Conciliou em lote',
  'pedido.cancelar_pix': 'Cancelou Pix',
  'pedido.reenviar_email': 'Reenviou e-mail',
  'pedido.aprovar_manual': 'Aprovou pagamento manual',
  'pedido.desfazer_manual': 'Desfez pagamento manual',
  'comprovante.enviar': 'Enviou comprovante',
  'webhook.reprocessar': 'Reprocessou webhook',
  'webhook.reprocessar_lote': 'Reprocessou webhooks em lote',
  'asaas.testar': 'Testou o Asaas',
  'asaas.webhook_salvar': 'Salvou o webhook do Asaas',
  'asaas.webhook_reativar': 'Reativou o webhook do Asaas',
  'usuario.editar': 'Editou usuário',
  'usuario.forcar_senha': 'Forçou troca de senha',
  'usuario.bloquear': 'Bloqueou usuário',
  'usuario.desbloquear': 'Desbloqueou usuário',
  'usuario.papel': 'Mudou o papel',
  'usuario.exportar': 'Exportou dados (LGPD)',
  'usuario.anonimizar': 'Excluiu conta (LGPD)',
  'usuario.revogar_sessao': 'Encerrou sessão',
  'exportar.csv': 'Exportou CSV',
  'equipe.convidar': 'Convidou para a equipe',
  'comunicacao.criar': 'Criou comunicação',
  'comunicacao.cancelar': 'Cancelou comunicação',
  'config.salvar': 'Salvou configurações',
};

export type TomSelo = 'neutro' | 'sucesso' | 'aviso' | 'erro' | 'info' | 'destaque';

export const TOM_STATUS_QUESTAO: Record<StatusQuestao, TomSelo> = {
  rascunho: 'neutro',
  revisao: 'info',
  publicada: 'sucesso',
  anulada: 'aviso',
  retirada: 'erro',
};

export const TOM_STATUS_PEDIDO: Record<StatusPedido, TomSelo> = {
  pendente: 'aviso',
  pago: 'sucesso',
  vencido: 'neutro',
  estornado: 'erro',
};

const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "23/10/2026 14:05" (São Paulo). */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : fmtDataHora.format(d);
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA'. */
export function dia(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [a, m, d] = valor.split('-');
  return a && m && d ? `${d}/${m}/${a}` : valor;
}

export function numero(n: number | null | undefined, casas = 0): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/**
 * CPF sempre mascarado no admin (PRD 8.8). A API já manda `cpfOculto`; se algum dia chegar
 * um CPF completo por engano, mascaramos aqui também.
 */
export function cpfMascarado(valor: string | null | undefined): string {
  if (!valor) return '***.***.***-**';
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 11) return ocultarCpf(digitos);
  return valor;
}

export function nomeArea(area: AreaCargo | null | undefined, nomes: Record<string, string>): string {
  if (!area) return 'Comum';
  return nomes[area] ?? area;
}

export function juntarClasses(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}
