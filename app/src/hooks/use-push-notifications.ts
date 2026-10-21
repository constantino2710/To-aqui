import { isRunningInExpoGo } from 'expo';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { registrarPushDoAparelho } from '@/lib/push-notifications';

type DadosNotificacao = { url?: unknown };

function abrirDestino(data: unknown) {
  const dados = data as DadosNotificacao | undefined;
  if (typeof dados?.url === 'string') router.push(dados.url as Href);
}

/** Registra o aparelho e abre a família certa quando o usuário toca no push. */
export function usePushNotifications() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user.id) return;
    // Expo Go (SDK 53+) removeu o push remoto no Android; carregar o módulo só
    // fora do Expo Go evita o crash. Sem dev build o app roda normal, só sem push.
    if (isRunningInExpoGo()) return;
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    void registrarPushDoAparelho(session.user.id);

    const resposta = Notifications.addNotificationResponseReceivedListener((evento) => {
      abrirDestino(evento.notification.request.content.data);
    });

    const ultima = Notifications.getLastNotificationResponse();
    if (ultima?.notification) abrirDestino(ultima.notification.request.content.data);

    return () => resposta.remove();
  }, [session?.user.id]);
}
