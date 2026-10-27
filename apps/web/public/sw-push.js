/*
 * Notificações push no service worker (importado pelo SW gerado pelo Workbox).
 * Payload do worker: { titulo, corpo, url, tag } (lembretes e comunicações do superadmin).
 * Só abre caminhos do próprio app: um `url` externo vira a tela inicial.
 */
/* global self */

/** Caminho dentro da origem do app (barra invertida e `//` não escapam); senão, a trilha. */
function caminhoDoApp(url) {
  if (!url) return '/aprender';
  try {
    const u = new URL(String(url || ''), self.location.origin);
    if (u.origin === self.location.origin) return u.pathname + u.search + u.hash;
  } catch {
    /* url inválida */
  }
  return '/aprender';
}

self.addEventListener('push', (evento) => {
  let dados;
  try {
    dados = evento.data ? evento.data.json() : null;
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  if (!dados || typeof dados !== 'object') dados = {};
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Fuse Aprova', {
      body: dados.corpo || '',
      tag: dados.tag || undefined,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'pt-BR',
      data: { url: caminhoDoApp(dados.url) },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = caminhoDoApp(evento.notification.data && evento.notification.data.url);
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === self.location.origin && 'focus' in j) {
          // navigate() falha em janela não controlada pelo SW: abre uma nova nesse caso.
          return j
            .focus()
            .then((f) => (f && 'navigate' in f ? f.navigate(url) : f))
            .catch(() => self.clients.openWindow(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
