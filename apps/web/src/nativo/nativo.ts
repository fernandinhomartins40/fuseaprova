/**
 * Recursos do app nativo (Capacitor). Só é carregado no build `app` (import dinâmico atrás
 * de `EH_APP`): o site não baixa nada disto.
 *
 * - splash, barra de status e botão voltar do Android;
 * - lembrete diário por notificação LOCAL, agendada no aparelho no horário escolhido pelo
 *   aluno (sem Firebase/FCM, regra do CLAUDE.md; ver DECISOES D20);
 * - exportação dos dados (LGPD) pelo compartilhamento do sistema;
 * - imagens dos enunciados pelo HTTP nativo (o cookie de sessão não vai em <img> de outra origem).
 */
import { App } from '@capacitor/app';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { diaSP, inicioDoDiaSP, somarDias, textoLembrete } from '@fuse/shared';
import { urlDoServidor } from './plataforma';

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
    if (canGoBack && !RAIZES.has(window.location.pathname)) window.history.back();
    else void App.minimizeApp();
  });
  // A splash some quando o React já pintou a 1ª tela.
  requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 200 }));
}

/* --------------------------------------------------------------- lembrete */

const DIAS_AGENDADOS = 7;
const ID_BASE = 1000;
const CANAL = 'lembrete-diario';

export type PermissaoLembrete = 'ativado' | 'negado' | 'indisponivel';

export async function pedirPermissaoLembrete(): Promise<PermissaoLembrete> {
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
    if (p.display !== 'granted') return 'negado';
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: CANAL,
        name: 'Lembrete diário',
        description: 'O lembrete para estudar no horário que você escolheu.',
        importance: 4,
      });
    }
    return 'ativado';
  } catch {
    return 'indisponivel';
  }
}

export async function cancelarLembretes(): Promise<void> {
  try {
    const ids = Array.from({ length: DIAS_AGENDADOS + 1 }, (_, i) => ({ id: ID_BASE + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch {
    /* sem permissão ou nada agendado */
  }
}

/**
 * Agenda os lembretes dos próximos 7 dias no horário de São Paulo escolhido (o mesmo
 * `lembrete_hora` que o worker usa no Web Push). Hoje fica de fora se a meta já foi cumprida.
 * Reagendado a cada abertura do app e quando o perfil muda.
 */
export async function agendarLembretes(o: {
  hora: string;
  ofensiva: number;
  metaCumpridaHoje: boolean;
  agora?: Date;
}): Promise<void> {
  const agora = o.agora ?? new Date();
  const [h, m] = o.hora.split(':').map(Number) as [number, number];
  const hoje = diaSP(agora);
  const avisos = [];
  for (let i = 0; i <= DIAS_AGENDADOS; i++) {
    const quando = new Date(inicioDoDiaSP(somarDias(hoje, i)).getTime() + (h * 60 + m) * 60_000);
    if (quando.getTime() <= agora.getTime() + 60_000) continue;
    if (i === 0 && o.metaCumpridaHoje) continue;
    avisos.push({
      id: ID_BASE + i,
      title: 'Fuse Aprova',
      body: textoLembrete(i === 0 ? o.ofensiva : 0),
      schedule: { at: quando, allowWhileIdle: true },
      channelId: CANAL,
      extra: { url: '/aprender' },
    });
  }
  await cancelarLembretes();
  if (avisos.length) await LocalNotifications.schedule({ notifications: avisos });
}

/** Tocar no lembrete abre a trilha. */
export async function aoTocarLembrete(abrir: (url: string) => void): Promise<void> {
  await LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const url = (a.notification.extra as { url?: string } | undefined)?.url;
    abrir(typeof url === 'string' && url.startsWith('/') ? url : '/aprender');
  });
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

/* ---------------------------------------------------------------- imagens */

const cacheImagens = new Map<string, Promise<string>>();

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
