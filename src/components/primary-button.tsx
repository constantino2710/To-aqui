import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const BRAND = '#208AEF';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, loading = false, disabled = false }: PrimaryButtonProps) {
  const inativo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        inativo && styles.inativo,
        pressed && !inativo && styles.pressionado,
      ]}>
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  inativo: {
    opacity: 0.5,
  },
  pressionado: {
    opacity: 0.8,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
  },
});
