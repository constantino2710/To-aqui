import '../../global.css';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastProvider } from '@/components/toast';
import { Motion } from '@/constants/motion';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // Enquanto a sessão salva no AsyncStorage não terminou de carregar não dá para
  // saber para qual lado ir. Renderizar o Stack agora faria a tela de login
  // piscar por um instante para quem já está logado.
  if (isLoading) return null;

  return (
    // Entrar/sair do app: as duas áreas se sobrepõem com um fade curto.
    <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: Motion.base }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootContent() {
  const { mode } = useThemePreference();

  return (
    <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontesProntas, erroFontes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Segura a splash até as fontes chegarem; se falharem, segue com a do sistema.
  if (!fontesProntas && !erroFontes) return null;

  return (
    <ThemePreferenceProvider>
      <RootContent />
    </ThemePreferenceProvider>
  );
}
