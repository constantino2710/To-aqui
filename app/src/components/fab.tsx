import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FabProps = {
  onPress: () => void;
  /** Descrição para leitores de tela, ex.: "Criar família". */
  accessibilityLabel: string;
  /** Ícone do MaterialCommunityIcons. Padrão: um "+" encorpado. */
  icone?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** Quando a tela NÃO está dentro das abas, desliga a folga da barra inferior. */
  semBarraDeAbas?: boolean;
};

/**
 * Botão de ação flutuante: círculo fixo no canto inferior direito, logo acima
 * da barra de abas. É a ação de criar da tela.
 */
export function Fab({ onPress, accessibilityLabel, icone = 'plus-thick', semBarraDeAbas = false }: FabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // A barra de abas é personalizada, então o contexto de altura do navigator
  // não é sempre preenchido. Reservamos a área dela explicitamente para o
  // botão não ficar escondido atrás da navegação inferior.
  const bottom =
    semBarraDeAbas
      ? insets.bottom + Spacing.three
      : Math.max(BottomTabInset, insets.bottom + 76) + Spacing.three;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.fab,
        { backgroundColor: theme.brand, shadowColor: theme.shadow, right: Spacing.four, bottom },
      ]}>
      <MaterialCommunityIcons name={icone} size={32} color={theme.onBrand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
});
