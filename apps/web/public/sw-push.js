/*
 * Notificações push no service worker (importado pelo SW gerado pelo Workbox).
 * Payload do worker: { titulo, corpo, url, tag } (lembretes e comunicações do superadmin).
 * Só abre caminhos do próprio app: um `url` externo vira a tela inicial.
 */
/* global self */
self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  const url = typeof dados.url === 'string' && dados.url.startsWith('/') && !dados.url.startsWith('//') ? dados.url : '/aprender';
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Fuse Aprova', {
      body: dados.corpo || '',
      tag: dados.tag || undefined,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'pt-BR',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || '/aprender';
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === self.location.origin && 'focus' in j) {
          return j.focus().then((f) => (f && 'navigate' in f ? f.navigate(url) : f));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
