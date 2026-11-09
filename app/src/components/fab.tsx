import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FabProps = {
  onPress: () => void;
  /** Descrição para leitores de tela, ex.: "Criar família". */
  accessibilityLabel: string;
  /** Ícone do Ionicons. Padrão: "add". */
  icone?: ComponentProps<typeof Ionicons>['name'];
  /** Quando a tela NÃO está dentro das abas, soma a área segura de baixo. */
  semBarraDeAbas?: boolean;
};

/**
 * Botão de ação flutuante: círculo grafite de 56 px no canto inferior direito.
 * Dentro das abas, a barra inferior fica no fluxo (abaixo da tela), então 16 px
 * de folga já deixam o botão logo acima dela.
 */
export function Fab({ onPress, accessibilityLabel, icone = 'add', semBarraDeAbas = false }: FabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const bottom = semBarraDeAbas ? insets.bottom + Spacing.three : Spacing.three;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      externo={[styles.posicao, { right: Spacing.four, bottom }]}
      style={[styles.fab, { backgroundColor: theme.action }]}>
      <Ionicons name={icone} size={30} color={theme.onAction} />
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
    boxShadow: '0 10px 24px rgba(30, 35, 32, 0.28)',
    elevation: 6,
  },
});
