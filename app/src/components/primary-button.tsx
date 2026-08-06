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

export function PrimaryButton({ label, onPress, loading = false, disabled = false }: PrimaryButtonProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
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
  button: {
    borderRadius: Radii.medium,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  inativo: {
    opacity: 0.5,
  },
  pressionado: {
    opacity: 0.8,
  },
  label: {
    fontSize: 16,
  },
});
