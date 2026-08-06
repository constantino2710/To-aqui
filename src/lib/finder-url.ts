import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** URL pública gravada no QR. Em produção, configure EXPO_PUBLIC_PUBLIC_SITE_URL. */
export function finderUrl(token: string) {
  const configuredBase = process.env.EXPO_PUBLIC_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configuredBase) return `${configuredBase}/?token=${encodeURIComponent(token)}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/?token=${encodeURIComponent(token)}`;
  }

  return Linking.createURL('/encontrado', { queryParams: { token } });
}
