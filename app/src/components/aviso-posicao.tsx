import { StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Aviso de rastro parado: aparece quando a última posição passou do limite de
 * "ao vivo" (`lib/idade-posicao.ts`). Diz há quanto tempo e o motivo provável.
 */
export function AvisoPosicaoAntiga({ ha }: { ha: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.aviso, { backgroundColor: theme.warningSoft }]}>
      <Icone nome="clock" tamanho={20} cor={theme.warning} />
      <ThemedText type="small" style={[styles.texto, { color: theme.warning }]}>
        Sem novas posições {ha}. A pessoa pode ter bloqueado a tela ou ficado sem internet. O mapa mostra o
        último ponto recebido.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  texto: { flex: 1, fontWeight: 600 },
});
