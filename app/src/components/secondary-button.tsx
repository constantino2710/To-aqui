import { ActivityIndicator, StyleSheet } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** `perigo` para ações destrutivas: sair do grupo, apagar, recusar. */
  tom?: 'neutro' | 'marca' | 'perigo';
  /** Botão menor (48 px, texto 14), para caber em cartões e ao lado de nomes. */
  compacto?: boolean;
  /** Ocupa a largura toda do espaço disponível (por padrão o compacto encolhe). */
  bloco?: boolean;
};

/**
 * Ação secundária: pílula só com contorno. O `PrimaryButton` continua sendo a
 * ação principal de cada tela — uma por tela, para não competirem.
 */
export function SecondaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  tom = 'neutro',
  compacto = false,
  bloco = false,
}: SecondaryButtonProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  const cor = tom === 'marca' ? theme.brand : tom === 'perigo' ? theme.danger : theme.text;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: loading }}
      disabled={inativo}
      onPress={onPress}
      externo={compacto && !bloco ? styles.encolhido : undefined}
      style={[
        styles.botao,
        compacto ? styles.compacto : styles.normal,
        { borderColor: cor },
        inativo && styles.inativo,
      ]}>
      {loading ? (
        <ActivityIndicator color={cor} size="small" />
      ) : (
        <ThemedText style={[compacto ? styles.textoCompacto : styles.textoNormal, { color: cor }]}>
          {label}
        </ThemedText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normal: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
  },
  compacto: {
    minHeight: 48,
    paddingHorizontal: Spacing.three + Spacing.one,
  },
  encolhido: {
    alignSelf: 'flex-start',
  },
  textoNormal: {
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    fontWeight: 600,
  },
  textoCompacto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
  inativo: {
    opacity: 0.4,
  },
});
