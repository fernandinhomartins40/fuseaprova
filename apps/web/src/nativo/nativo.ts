/**
 * Recursos do app nativo (Capacitor). Só é carregado no build `app` (import dinâmico atrás
 * de `EH_APP`): o site não baixa nada disto.
 *
 * - splash, barra de status e botão voltar do Android;
 * - lembretes por notificação LOCAL, agendados no aparelho no horário escolhido pelo
 *   aluno, com texto e tela calculados pela API (sem Firebase/FCM; DECISOES D20 e D30);
 * - "Adicionar à agenda": arquivo .ics pelo compartilhamento do sistema (sem permissão);
 * - exportação dos dados (LGPD) pelo compartilhamento do sistema;
 * - imagens dos enunciados pelo HTTP nativo (o cookie de sessão não vai em <img> de outra origem).
 */
import { App } from '@capacitor/app';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import type { LembretesResposta } from '@fuse/shared/api';
import {
  CANAL_LEMBRETES,
  idsDosLembretes,
  paraNotificacoesLocais,
  rotaDaNotificacao,
} from './notificacoes';
import { EVENTO_VOLTAR, urlDoServidor } from './plataforma';

/** Telas em que o "voltar" do Android sai do app em vez de voltar no histórico. */
const RAIZES = new Set([
  '/',
  '/entrar',
  '/aprender',
  '/revisar',
  '/simulado',
  '/liga',
  '/perfil',
  '/acesso',
]);

export async function iniciarApp(): Promise<void> {
  await App.addListener('backButton', ({ canGoBack }) => {
    if (!window.dispatchEvent(new Event(EVENTO_VOLTAR, { cancelable: true }))) return;
    if (canGoBack && !RAIZES.has(window.location.pathname)) window.history.back();
    else void App.minimizeApp();
  });
  // A splash some quando o React já pintou a 1ª tela.
  requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 200 }));
}

/* ------------------------------------------------------------- atualização */

/**
 * D42: pergunta ao Google Play se há versão nova, sem depender de ninguém avisar o servidor. Fora da
 * loja (APK de teste) ou sem conexão a consulta falha, e não há aviso.
 * shortcut: só Android, porque o iOS precisa do ID da App Store; incluir quando o app sair por lá.
 */
export async function temAtualizacao(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false;
  try {
    const { updateAvailability } = await AppUpdate.getAppUpdateInfo();
    return updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE;
  } catch {
    return false;
  }
}

/** Abre a página do app na loja. */
export function abrirLoja(): void {
  void AppUpdate.openAppStore().catch(() => undefined);
}

/* --------------------------------------------------------------- lembrete */

/*
 * D30: notificações LOCAIS personalizadas (sem Firebase/FCM). O plano dos próximos 7 dias vem
 * da API (GET /me/lembretes): texto e tela calculados no servidor a partir do progresso.
 *
 * Por que o agendamento falhava (corrigido aqui):
 * 1. o canal Android `lembrete-diario` só era criado ao ligar o lembrete em Configurações NAQUELE
 *    aparelho; quem ativou no onboarding da web, ou reinstalou o app, agendava num canal
 *    inexistente e o Android descartava a notificação em silêncio;
 * 2. o plugin 8.3 agenda com alarme EXATO por padrão e, sem a permissão (removida do manifesto
 *    para a Play Store), abria a tela "Alarmes e lembretes" a cada abertura do app; agora todo
 *    item vai com `isExactNotification: false` (inexato + allowWhileIdle);
 * 3. `schedule()` sem permissão fazia o Android 13+ pedir a permissão sem explicação, na abertura
 *    do app; agora só agenda com a permissão já concedida (o pedido sai de um toque do aluno em
 *    Configurações ou no onboarding, com o texto explicando antes);
 * 4. só reagendava quando o perfil mudava; agora também ao voltar ao app (resume).
 */

export type PermissaoLembrete = 'ativado' | 'negado' | 'indisponivel';
export type EstadoPermissaoLembrete = 'ativado' | 'negado' | 'pendente' | 'indisponivel';

async function garantirCanal(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  // Idempotente: recriar o canal só atualiza nome e descrição.
  await LocalNotifications.createChannel({
    id: CANAL_LEMBRETES,
    name: 'Lembretes de estudo',
    description: 'Lembretes no horário que você escolheu, com o que revisar e reforçar.',
    importance: 4,
    visibility: 1,
  });
}

/** Estado da permissão sem pedir nada ao sistema. */
export async function estadoPermissaoLembrete(): Promise<EstadoPermissaoLembrete> {
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === 'granted') return 'ativado';
    if (p.display === 'denied') return 'negado';
    return 'pendente';
  } catch {
    return 'indisponivel';
  }
}

/** Pede a permissão (só a partir de um toque do aluno, depois da explicação na tela). */
export async function pedirPermissaoLembrete(): Promise<PermissaoLembrete> {
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
    if (p.display !== 'granted') return 'negado';
    await garantirCanal();
    return 'ativado';
  } catch {
    return 'indisponivel';
  }
}

/** Cancela os lembretes pendentes do Fuse (os do plano e os das versões antigas). */
export async function cancelarLembretes(): Promise<void> {
  try {
    const pendentes = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
    const ids = new Set([...idsDosLembretes(), ...pendentes.notifications.map((n) => n.id)]);
    await LocalNotifications.cancel({ notifications: [...ids].map((id) => ({ id })) });
  } catch {
    /* sem permissão ou nada agendado */
  }
}

export type ResultadoSincronizacao =
  | 'agendado'
  | 'desligado'
  | 'sem_permissao'
  | 'sem_acesso'
  | 'sem_conexao';

/**
 * Busca o plano na API, cancela os antigos e agenda os novos. Sem conexão (ou erro do servidor),
 * mantém os que já estão agendados. Sem sessão ou sem acesso (401/402/403), cancela.
 */
export async function sincronizarLembretes(
  buscar: () => Promise<LembretesResposta>,
  agora: () => Date = () => new Date(),
): Promise<ResultadoSincronizacao> {
  if ((await estadoPermissaoLembrete()) !== 'ativado') return 'sem_permissao';
  let plano: LembretesResposta;
  try {
    plano = await buscar();
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 402 || status === 403) {
      await cancelarLembretes();
      return 'sem_acesso';
    }
    return 'sem_conexao';
  }
  await cancelarLembretes();
  if (!plano.ativo) return 'desligado';
  const notificacoes = paraNotificacoesLocais(plano.itens, agora());
  if (!notificacoes.length) return 'agendado';
  await garantirCanal();
  await LocalNotifications.schedule({ notifications: notificacoes });
  return 'agendado';
}

/**
 * Toque na notificação → abre a tela de `extra.rota` (validada; senão, a trilha). O plugin guarda
 * o toque que abriu o app fechado até alguém escutar, então o toque nunca se perde.
 */
export async function aoTocarLembrete(abrir: (rota: string) => void): Promise<() => void> {
  const h = await LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    abrir(rotaDaNotificacao(a.notification.extra));
  });
  return () => void h.remove();
}

/** O app voltou do segundo plano (reagenda os lembretes). */
export async function aoVoltarAoApp(fazer: () => void): Promise<() => void> {
  const h = await App.addListener('resume', fazer);
  return () => void h.remove();
}

/* --------------------------------------------------------------- arquivos */

/** Grava o JSON no cache do app e abre o compartilhamento do sistema (salvar, e-mail etc.). */
export async function compartilharArquivo(nome: string, conteudo: string): Promise<void> {
  const r = await Filesystem.writeFile({
    path: nome,
    data: conteudo,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ title: nome, files: [r.uri], dialogTitle: 'Salvar meus dados' });
}

/**
 * D30: grava o .ics no cache e abre o compartilhamento do sistema, onde o aluno escolhe o app de
 * agenda (Agenda do Google/Samsung, Outlook, Calendário, Arquivos…). Sem permissão de calendário.
 */
export async function compartilharAgenda(nome: string, ics: string): Promise<void> {
  const r = await Filesystem.writeFile({
    path: nome,
    data: ics,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({
    title: 'Horário de estudo',
    files: [r.uri],
    dialogTitle: 'Adicionar à agenda',
  });
}

/* ---------------------------------------------------------------- imagens */

const cacheImagens = new Map<string, Promise<string>>();

/**
 * D41: videoaula do servidor (exige a sessão), baixada uma vez pelo HTTP nativo e guardada no cache
 * do app, que o sistema limpa quando falta espaço. Vídeo novo tem slug novo, então o arquivo nunca
 * fica velho. Grava com outro nome e renomeia: download interrompido não vira vídeo corrompido.
 */
export async function carregarVideo(caminho: string): Promise<string> {
  const path = `videoaulas/${caminho.split('/').pop()}.mp4`;
  const directory = Directory.Cache;
  try {
    const { uri } = await Filesystem.stat({ path, directory });
    return Capacitor.convertFileSrc(uri);
  } catch {
    /* ainda não baixado */
  }
  const r = await CapacitorHttp.get({ url: urlDoServidor(caminho), responseType: 'blob' });
  if (r.status !== 200 || typeof r.data !== 'string') throw new Error(`video ${r.status}`);
  const parcial = `${path}.parcial`;
  await Filesystem.writeFile({ path: parcial, data: r.data, directory, recursive: true });
  await Filesystem.rename({ from: parcial, to: path, directory });
  const { uri } = await Filesystem.getUri({ path, directory });
  return Capacitor.convertFileSrc(uri);
}

/** Esconde a barra de status enquanto a videoaula ocupa a tela inteira. */
export function barraDeStatus(visivel: boolean): void {
  void (visivel ? StatusBar.show() : StatusBar.hide()).catch(() => undefined);
}

/** Imagem do servidor (exige a sessão) como data URL, pelo HTTP nativo. */
export function carregarImagem(caminho: string): Promise<string> {
  const url = urlDoServidor(caminho);
  let p = cacheImagens.get(url);
  if (!p) {
    p = CapacitorHttp.get({ url, responseType: 'blob' }).then((r) => {
      if (r.status !== 200 || typeof r.data !== 'string') throw new Error(`imagem ${r.status}`);
      const tipo = (r.headers['Content-Type'] ?? r.headers['content-type'] ?? 'image/png').split(
        ';',
      )[0];
      return `data:${tipo};base64,${r.data}`;
    });
    p.catch(() => cacheImagens.delete(url));
    cacheImagens.set(url, p);
  }
  return p;
}
