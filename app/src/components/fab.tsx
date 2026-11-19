import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/icone';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { FontSize, LineHeight, Palette, Radii, Spacing } from '@/constants/theme';
import { useEspacoBarra } from '@/hooks/use-espaco-barra';
import { useTheme } from '@/hooks/use-theme';

export type FabProps = {
  onPress: () => void;
  /** Descrição para leitores de tela, ex.: "Criar família". */
  accessibilityLabel: string;
  /** Ícone (ver `Icone`). Padrão: "plus". */
  icone?: NomeIcone;
  /** Quando a tela NÃO está dentro das abas, soma a área segura de baixo. */
  semBarraDeAbas?: boolean;
  /** Selo com um número no canto (ex.: mensagens não lidas). 0 esconde. */
  contador?: number;
};

/**
 * Botão de ação flutuante: círculo grafite de 56 px no canto inferior direito.
 * Dentro das abas, a barra inferior flutua sobre a tela, então o botão sobe
 * a altura dela (ver `useEspacoBarra`) mais 16 px de folga.
 */
export function Fab({ onPress, accessibilityLabel, icone = 'plus', semBarraDeAbas = false, contador = 0 }: FabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const espacoBarra = useEspacoBarra();

  // Dentro das abas, fica 16 px acima da barra flutuante.
  const bottom = semBarraDeAbas ? insets.bottom + Spacing.three : espacoBarra + Spacing.three;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      externo={[styles.posicao, { right: Spacing.four, bottom }]}
      style={[styles.fab, { backgroundColor: theme.action, boxShadow: `0 10px 24px ${theme.shadowStrong}` }]}>
      <Icone nome={icone} tamanho={30} cor={theme.onAction} />
      {contador > 0 && (
        <View
          style={[styles.contador, { backgroundColor: theme.gradientFrom, borderColor: theme.background }]}
          pointerEvents="none">
          <ThemedText style={[styles.contadorTexto, { color: Palette.white }]}>
            {contador > 9 ? '9+' : contador}
          </ThemedText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  posicao: {
    position: 'absolute',
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  // Verde da marca = boa notícia (mensagem nova), nunca o vermelho de erro.
  contador: {
    position: 'absolute',
    top: -Spacing.one,
    right: -Spacing.one,
    minWidth: 24,
    height: 24,
    paddingHorizontal: Spacing.one,
    borderRadius: Radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
});
