import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';
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
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <ThemedView
          type="backgroundElement"
          style={[cardStyle, pressed && styles.pressionado]}>
          {children}
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.large,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  pressionado: {
    opacity: 0.7,
  },
});
