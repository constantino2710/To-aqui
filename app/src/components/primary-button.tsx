import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Ação principal da tela: preenchida com a cor da marca. Uma por tela. */
export function PrimaryButton({ label, onPress, loading = false, disabled = false }: PrimaryButtonProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        { backgroundColor: theme.brand, shadowColor: theme.shadow },
        inativo && styles.inativo,
        pressed && !inativo && styles.pressionado,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.onBrand} />
      ) : (
        <ThemedText type="smallBold" style={[styles.label, { color: theme.onBrand }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 54,
    borderRadius: Radii.large,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  label: {
    fontSize: 16,
  },
  inativo: {
    opacity: 0.5,
  },
  pressionado: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
