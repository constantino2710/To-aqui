import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { registrarPushDoAparelho } from '@/lib/push-notifications';

type DadosNotificacao = { url?: unknown };

function abrirDestino(notification: Notifications.Notification | undefined) {
  const dados = notification?.request.content.data as DadosNotificacao | undefined;
  if (typeof dados?.url === 'string') router.push(dados.url as Href);
}

/** Registra o aparelho e abre a família certa quando o usuário toca no push. */
export function usePushNotifications() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user.id) return;
    void registrarPushDoAparelho(session.user.id);

    const resposta = Notifications.addNotificationResponseReceivedListener((evento) => {
      abrirDestino(evento.notification);
    });

    const ultima = Notifications.getLastNotificationResponse();
    if (ultima?.notification) abrirDestino(ultima.notification);

    return () => resposta.remove();
  }, [session?.user.id]);
}
