import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { Palette } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export const LOCATION_FOUND_CHANNEL = 'location-found';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Carrega o `expo-notifications` de forma preguiçosa. O Expo Go (SDK 53+) removeu
 * o push remoto no Android e **só avaliar** o módulo/APIs de push já lança lá; um
 * `import` estático é avaliado de forma ansiosa pelo bundler e derrubaria o app no
 * Expo Go. Via `require` sob guarda, o módulo nunca é avaliado no Expo Go/web.
 * Para testar push de verdade, use um development build.
 */
function carregarNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  return require('expo-notifications') as NotificationsModule;
}

const Notifications = carregarNotifications();

Notifications?.setNotificationHandler({
  handleNotification: async () => {
    const emPrimeiroPlano = AppState.currentState === 'active';
    return {
      // Em primeiro plano, o Realtime mostra o toast Found; fora dele, o SO
      // assume o aviso com som e vibração sem duplicar a mensagem na tela.
      shouldPlaySound: !emPrimeiroPlano,
      shouldSetBadge: true,
      shouldShowBanner: !emPrimeiroPlano,
      shouldShowList: !emPrimeiroPlano,
    };
  },
});

async function prepararCanalAndroid(notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;

  await notifications.setNotificationChannelAsync(LOCATION_FOUND_CHANNEL, {
    name: 'Localização encontrada',
    description: 'Alertas quando alguém compartilha a localização de um QR Code.',
    importance: notifications.AndroidImportance.MAX,
    // Sem a chave `sound`, o canal usa o som padrão do sistema. Passar
    // 'default' faria o nativo procurar um arquivo chamado "default" e falhar;
    // `null` deixaria o canal mudo.
    vibrationPattern: [0, 800, 250, 800, 250, 1200],
    enableVibrate: true,
    enableLights: true,
    lightColor: Palette.denim500,
    lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

/**
 * Registra o aparelho no banco para que a Edge Function consiga avisá-lo
 * mesmo quando o Found estiver fechado. No Expo Go/web não há push, então
 * `carregarNotifications` devolve `null` e saímos sem tocar em nada de push.
 */
export async function registrarPushDoAparelho(userId: string) {
  const notifications = carregarNotifications();
  if (!notifications) return;

  try {
    await prepararCanalAndroid(notifications);

    const permissoesAtuais = await notifications.getPermissionsAsync();
    let status = permissoesAtuais.status;
    if (status !== 'granted') {
      const solicitadas = await notifications.requestPermissionsAsync();
      status = solicitadas.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await supabase.from('devices').upsert(
      {
        user_id: userId,
        push_token: token,
        platform,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' },
    );
  } catch {
    // Token/credenciais são opcionais durante desenvolvimento; não bloquear o app.
  }
}
