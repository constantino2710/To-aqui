import { Stack } from 'expo-router';

import { Motion } from '@/constants/motion';

export default function AuthLayout() {
  // Login ↔ cadastro: a tela nova sobe de leve enquanto aparece (sem deslizar a tela inteira).
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: Motion.lento,
      }}
    />
  );
}
