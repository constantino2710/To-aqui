import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** `perigo` para ações destrutivas: sair do grupo, apagar, recusar. */
  tom?: 'neutro' | 'marca' | 'perigo';
  /** Botão pequeno, para caber ao lado de um nome numa lista. */
  compacto?: boolean;
};

/**
 * Ação secundária: contorno em vez de preenchimento. O `PrimaryButton` continua
 * sendo a ação principal de cada tela — uma por tela, para não competirem.
 */
export function SecondaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  tom = 'neutro',
  compacto = false,
}: SecondaryButtonProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  const cor = tom === 'marca' ? theme.brand : tom === 'perigo' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        compacto ? styles.compacto : styles.normal,
        { borderColor: cor },
        inativo && styles.inativo,
        pressed && !inativo && styles.pressionado,
      ]}>
      {loading ? (
        <ActivityIndicator color={cor} size="small" />
      ) : (
        <ThemedText type="smallBold" style={{ color: cor }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normal: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  compacto: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    minHeight: 32,
  },
  inativo: {
    opacity: 0.4,
  },
  pressionado: {
    opacity: 0.6,
  },
});
