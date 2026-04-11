self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'DEFFIZZY BAKE';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'deffizzy-notif',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
