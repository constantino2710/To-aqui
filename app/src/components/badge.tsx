import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTom = 'neutro' | 'marca' | 'sucesso' | 'alerta';

export type BadgeProps = {
  label: string;
  tom?: BadgeTom;
};

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

  return (
    <View style={[styles.pilula, { borderColor: cor }]}>
      <ThemedText type="smallBold" style={[styles.texto, { color: cor }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pilula: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  texto: {
    fontSize: 11,
    lineHeight: 18,
  },
});
