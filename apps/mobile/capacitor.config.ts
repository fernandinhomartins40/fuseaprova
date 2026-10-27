import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App nativo do aluno (Android e iOS). O conteúdo é o build `app` do @fuse/web
 * (`apps/web/dist-app`): só o painel do aluno, sem /admin, /super, cadastro nem pagamento
 * (ver docs/APP-MOBILE.md e DECISOES D20).
 *
 * A API fica em https://www.fuseaprova.com.br e é chamada pelo HTTP nativo (CapacitorHttp):
 * sem CORS e com o cookie de sessão guardado no armazenamento do sistema (CapacitorCookies).
 */
const config: CapacitorConfig = {
  appId: 'br.com.fuseaprova.app',
  appName: 'Fuse Aprova',
  webDir: '../web/dist-app',
  backgroundColor: '#FAF8F2',
  // Logs do bridge (inclusive respostas HTTP) só no build de debug; nunca no da loja.
  loggingBehavior: 'debug',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      backgroundColor: '#FAF8F2',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    // LIGHT = texto escuro, sobre o creme do app (tokens: --cor-fundo).
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#FAF8F2',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_fuse',
      iconColor: '#00545D',
    },
  },
};

export default config;
