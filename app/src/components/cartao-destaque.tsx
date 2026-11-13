import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AneisMarca } from '@/components/aneis-marca';
import { FundoCartao, sombraDestaque } from '@/components/card';
import { Palette, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CartaoDestaqueProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Cartão escuro de destaque (identidade no perfil, resumo no Início): degradê
 * grafite, anéis com o pin da marca no canto e sombra mais funda. É escuro nos
 * dois temas, então o texto dentro dele usa cores fixas claras.
 */
export function CartaoDestaque({ children, style }: CartaoDestaqueProps) {
  const theme = useTheme();

  return (
    <View style={[styles.cartao, sombraDestaque(theme.shadowStrong), style]}>
      <FundoCartao de={Palette.graphite} para={Palette.graphiteSoft} />
      <AneisMarca />
      {children}
    </View>
  );
}

/** Cores de texto sobre o cartão escuro. */
export const SobreDestaque = {
  texto: Palette.white,
  suave: Palette.onGraphiteSoft,
  divisoria: Palette.onGraphiteLine,
} as const;

const styles = StyleSheet.create({
  cartao: {
    borderRadius: Radii.huge,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
    backgroundColor: Palette.graphite,
  },
});
