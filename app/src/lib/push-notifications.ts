import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { Palette } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * Canal do alerta "[nome] foi encontrado". O som de um canal Android não muda
 * depois de criado, por isso o alarme ganhou um canal novo em vez de reaproveitar
 * o antigo `location-found` (que é apagado na primeira execução).
 */
export const FOUND_ALARM_CHANNEL = 'found-alarme';
/** Arquivo em `assets/sounds/`, registrado no plugin `expo-notifications` do app.json. */
export const FOUND_ALARM_SOUND = 'alarme_found.wav';
const CANAIS_ANTIGOS = ['location-found'];

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
  handleNotification: async (notificacao) => {
    const emPrimeiroPlano = AppState.currentState === 'active';
    // "Foi encontrado" é urgente: toca e aparece mesmo com o app aberto, porque
    // nesse momento ainda não há localização para o toast do Realtime mostrar.
    const urgente = (notificacao.request.content.data as { tipo?: unknown } | undefined)?.tipo === 'encontrado';
    const mostrar = urgente || !emPrimeiroPlano;
    return {
      shouldPlaySound: mostrar,
      shouldSetBadge: true,
      shouldShowBanner: mostrar,
      shouldShowList: mostrar,
    };
  },
});

async function prepararCanalAndroid(notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    CANAIS_ANTIGOS.map((id) => notifications.deleteNotificationChannelAsync(id).catch(() => undefined)),
  );

  await notifications.setNotificationChannelAsync(FOUND_ALARM_CHANNEL, {
    name: 'Alguém foi encontrado',
    description: 'Alarme quando alguém escaneia um QR Code da sua família.',
    importance: notifications.AndroidImportance.MAX,
    sound: FOUND_ALARM_SOUND,
    // Toca mesmo no "Não perturbe" quando o usuário liberar o canal nas
    // configurações; o Android não deixa o app forçar isso sozinho.
    bypassDnd: true,
    audioAttributes: {
      usage: notifications.AndroidAudioUsage.ALARM,
      contentType: notifications.AndroidAudioContentType.SONIFICATION,
    },
    vibrationPattern: [0, 800, 250, 800, 250, 1200, 250, 800, 250, 800],
    enableVibrate: true,
    enableLights: true,
    lightColor: Palette.sage500,
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
