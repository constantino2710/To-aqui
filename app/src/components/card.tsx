import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedView } from '@/components/themed-view';
import { EscalaToque } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = {
  children: ReactNode;
  /** Quando presente, o cartão inteiro vira área de toque. */
  onPress?: () => void;
  style?: ViewStyle;
};

/** Sombra leve e difusa dos cartões: um contato curto + um halo largo. */
export function sombraCartao(cor: string): ViewStyle {
  return { boxShadow: `0 1px 2px ${cor}, 0 10px 28px -8px ${cor}` };
}

/** Sombra de cartões escuros: mais funda, para destacar do fundo claro. */
export function sombraDestaque(cor: string): ViewStyle {
  return { boxShadow: `0 2px 6px ${cor}, 0 18px 36px -14px ${cor}` };
}

/**
 * Degradê sutil de fundo dos cartões (de `backgroundElement` para
 * `cardGradientTo`, na diagonal; `de`/`para` trocam as pontas). Vai como primeiro filho de uma view com
 * `overflow: 'hidden'` e cantos arredondados.
 */
export function FundoCartao({ de, para }: { de?: string; para?: string } = {}) {
  const theme = useTheme();
  const gradId = `cartao-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // Tamanho medido em px: no Android, o Svg com "100%" às vezes é dimensionado
  // pela caixa errada e o degradê não cobre o cartão inteiro.
  const [tamanho, setTamanho] = useState<{ w: number; h: number } | null>(null);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setTamanho((t) => (t && t.w === width && t.h === height ? t : { w: width, h: height }));
      }}>
      {tamanho && (
        <Svg width={tamanho.w} height={tamanho.h}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={de ?? theme.backgroundElement} />
              <Stop offset="1" stopColor={para ?? theme.cardGradientTo} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={tamanho.w} height={tamanho.h} fill={`url(#${gradId})`} />
        </Svg>
      )}
    </View>
  );
}

export function Card({ children, onPress, style }: CardProps) {
  const theme = useTheme();
  const cardStyle = [styles.card, sombraCartao(theme.shadow), style];

  const conteudo = (
    <ThemedView type="backgroundElement" style={cardStyle}>
      <FundoCartao />
      {children}
    </ThemedView>
  );

  if (!onPress) return conteudo;

  return (
    <PressableScale accessibilityRole="button" onPress={onPress} escala={EscalaToque.cartao}>
      {conteudo}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Cartão sobre o fundo cinza: sem borda, degradê quase imperceptível e
  // sombra leve; cantos de 28 e 24 de respiro (listas densas passam `padding`
  // menor pelo `style`).
  card: {
    borderRadius: Radii.extraLarge,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
});
