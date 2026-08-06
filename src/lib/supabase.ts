import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase não configurado. Preencha EXPO_PUBLIC_SUPABASE_URL e ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env, depois reinicie ' +
      'o servidor com `npx expo start --clear`.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // AsyncStorage no nativo; no web o pacote usa localStorage por baixo.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Só o web tem uma URL de callback para ler a sessão depois de um OAuth.
    detectSessionInUrl: Platform.OS === 'web',
    // Com PKCE o link de confirmação volta como ?code=... (query param), que o
    // expo-linking já parseia. No fluxo implícito os tokens viriam no fragmento
    // (#access_token=...), que exigiria parsing manual.
    flowType: 'pkce',
  },
});

// O refresh automático precisa parar enquanto o app está em background: um timer
// rodando ali é suspenso pelo SO e a sessão expira sem ninguém perceber.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
