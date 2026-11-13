import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTom = 'neutro' | 'marca' | 'sucesso' | 'alerta';

export type BadgeProps = {
  label: string;
  tom?: BadgeTom;
};

/** Selo em pílula: fundo suave e texto na mesma matiz (14 px, contraste ≥ 4,5:1). */
export function Badge({ label, tom = 'neutro' }: BadgeProps) {
  const theme = useTheme();

  const cor =
    tom === 'marca'
      ? theme.brand
      : tom === 'sucesso'
        ? theme.success
        : tom === 'alerta'
          ? theme.danger
          : theme.textSecondary;

  const fundo =
    tom === 'marca' || tom === 'sucesso'
      ? theme.brandSoft
      : tom === 'alerta'
        ? theme.dangerSoft
        : theme.backgroundSelected;

  return (
    <View style={[styles.pilula, { backgroundColor: fundo }]}>
      <ThemedText style={[styles.texto, { color: cor }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pilula: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    alignSelf: 'flex-start',
  },
  texto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
});
