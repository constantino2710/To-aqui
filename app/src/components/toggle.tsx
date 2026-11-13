import { useEffect, useId, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Motion } from '@/constants/motion';
import { Palette, Radii } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';

export type ToggleProps = {
  value: boolean;
  onValueChange: (valor: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const LARGURA = 52;
const ALTURA = 32;
const FOLGA = 4;
const BOLINHA = ALTURA - FOLGA * 2;
const CURSO = LARGURA - BOLINHA - FOLGA * 2;

/**
 * Interruptor em pílula do Found: trilho neutro quando desligado, degradê
 * sálvia quando ligado, bolinha branca sempre dentro do trilho. Substitui o
 * `Switch` nativo, que muda de cara em cada plataforma.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const gradId = `toggle-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [progresso] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    const animacao = Animated.timing(progresso, {
      toValue: value ? 1 : 0,
      duration: reduzido ? 0 : Motion.base,
      easing: Motion.suave,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacao.start();
    return () => animacao.stop();
  }, [progresso, reduzido, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      // Trilho de 32 de altura; a folga leva a área de toque a 48.
      hitSlop={8}
      style={[styles.trilho, { backgroundColor: theme.toggleTrack, opacity: disabled ? 0.5 : 1 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progresso }]} pointerEvents="none">
        <Svg width={LARGURA} height={ALTURA}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.gradientFrom} />
              <Stop offset="1" stopColor={theme.gradientTo} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={LARGURA} height={ALTURA} fill={`url(#${gradId})`} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bolinha,
          {
            boxShadow: `0 1px 3px ${Palette.shadowDark}`,
            transform: [{ translateX: progresso.interpolate({ inputRange: [0, 1], outputRange: [0, CURSO] }) }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trilho: {
    width: LARGURA,
    height: ALTURA,
    borderRadius: Radii.pill,
    padding: FOLGA,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bolinha: {
    width: BOLINHA,
    height: BOLINHA,
    borderRadius: Radii.pill,
    backgroundColor: Palette.white,
  },
});
