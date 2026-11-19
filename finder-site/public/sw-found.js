// Service worker do Found: só existe para mostrar as notificações de mensagem
// da família (no Android, o Chrome não deixa a página criar notificação sem um).
// Não guarda cache nem recebe push do servidor.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Tocar na notificação volta para a aba do Found e abre a conversa. Nunca abre
// uma aba nova: recarregar o link do QR começaria outro atendimento.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const aba = abas[0];
      if (!aba) return;
      await aba.focus();
      aba.postMessage({ tipo: 'abrir-chat' });
    })(),
  );
});
