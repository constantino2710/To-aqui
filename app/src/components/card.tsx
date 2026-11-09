import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedView } from '@/components/themed-view';
import { EscalaToque } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = {
  children: ReactNode;
  /** Quando presente, o cartão inteiro vira área de toque. */
  onPress?: () => void;
  style?: ViewStyle;
};

export function Card({ children, onPress, style }: CardProps) {
  const theme = useTheme();
  const cardStyle = [styles.card, { borderColor: theme.border, shadowColor: theme.shadow }, style];

  if (!onPress) {
    return (
      <ThemedView type="backgroundElement" style={cardStyle}>
        {children}
      </ThemedView>
    );
  }

  return (
    <PressableScale accessibilityRole="button" onPress={onPress} escala={EscalaToque.cartao}>
      <ThemedView type="backgroundElement" style={cardStyle}>
        {children}
      </ThemedView>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Cartão branco sobre o fundo cinza: sem borda nem sombra, cantos de 28 e
  // 24 de respiro (listas densas passam `padding` menor pelo `style`).
  card: {
    borderRadius: Radii.extraLarge,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
