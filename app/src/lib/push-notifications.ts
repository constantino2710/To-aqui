import Constants, { AppOwnership } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { Palette } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export const LOCATION_FOUND_CHANNEL = 'location-found';

Notifications.setNotificationHandler({
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

async function prepararCanalAndroid() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(LOCATION_FOUND_CHANNEL, {
    name: 'Localização encontrada',
    description: 'Alertas quando alguém compartilha a localização de um QR Code.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 800, 250, 800, 250, 1200],
    enableVibrate: true,
    enableLights: true,
    lightColor: Palette.denim500,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

/**
 * Registra o aparelho no banco para que a Edge Function consiga avisá-lo
 * mesmo quando o Found estiver fechado. Expo Go não entrega push remoto no
 * Android; nesse caso falhamos silenciosamente e o app continua funcionando.
 */
export async function registrarPushDoAparelho(userId: string) {
  if (Platform.OS === 'web' || Constants.appOwnership === AppOwnership.Expo) return;

  try {
    await prepararCanalAndroid();

    const permissoesAtuais = await Notifications.getPermissionsAsync();
    let status = permissoesAtuais.status;
    if (status !== 'granted') {
      const solicitadas = await Notifications.requestPermissionsAsync();
      status = solicitadas.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
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
