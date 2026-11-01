/**
 * D30: "Adicionar à agenda" no site e no app, sem permissão de calendário.
 *
 * - Site: baixa o .ics (o iPhone abre o "Adicionar ao Calendário"; Android e computador importam
 *   ao abrir o arquivo).
 * - App nativo: grava o .ics no cache e abre o compartilhamento do sistema (escolher a agenda).
 * - Os dois: link do Google Agenda, que abre o app ou o site do Google já com o evento.
 */
import { gerarIcsEstudo, linkGoogleAgenda, NOME_ARQUIVO_AGENDA, type Dia } from '@fuse/shared';
import { EH_APP, ORIGEM_API } from '../nativo/plataforma';

export interface DadosAgenda {
  hora: string;
  dataProva: Dia | null;
}

function urlDoApp(): string {
  const origem = EH_APP ? ORIGEM_API : window.location.origin;
  return `${origem}/aprender`;
}

export function montarIcs(d: DadosAgenda, agora = new Date()): string {
  return gerarIcsEstudo({ hora: d.hora, dataProva: d.dataProva, agora, url: urlDoApp() });
}

export function linkDoGoogleAgenda(d: DadosAgenda, agora = new Date()): string {
  return linkGoogleAgenda({ hora: d.hora, dataProva: d.dataProva, agora, url: urlDoApp() });
}

/** Entrega o .ics: download no site, compartilhamento no app. */
export async function adicionarNaAgenda(d: DadosAgenda): Promise<void> {
  const ics = montarIcs(d);
  if (EH_APP) {
    await (await import('../nativo/nativo')).compartilharAgenda(NOME_ARQUIVO_AGENDA, ics);
    return;
  }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = NOME_ARQUIVO_AGENDA;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
