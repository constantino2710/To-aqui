import { ActivityIndicator, StyleSheet } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Ação principal da tela: pílula grafite. Uma por tela. */
export function PrimaryButton({ label, onPress, loading = false, disabled = false }: PrimaryButtonProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: loading }}
      disabled={inativo}
      onPress={onPress}
      style={[styles.botao, { backgroundColor: theme.action }, inativo && styles.inativo]}>
      {loading ? (
        <ActivityIndicator color={theme.onAction} />
      ) : (
        <ThemedText style={[styles.label, { color: theme.onAction }]}>{label}</ThemedText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 58,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    fontWeight: 600,
  },
  inativo: {
    opacity: 0.4,
  },
});
