import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { type ComponentProps, useContext } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii, Spacing } from '@/constants/theme';
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

  // Altura real da barra de abas, medida pelo navigator (inclui a área segura).
  const alturaBarra = useContext(BottomTabBarHeightContext);
  const bottom =
    semBarraDeAbas || alturaBarra == null
      ? insets.bottom + Spacing.three
      : alturaBarra - Spacing.four;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.brand, shadowColor: theme.shadow, right: Spacing.four, bottom },
        pressed && styles.pressionado,
      ]}>
      <MaterialCommunityIcons name={icone} size={32} color={theme.onBrand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  pressionado: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
