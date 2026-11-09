import { useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { EscalaToque, Motion } from '@/constants/motion';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Aparência da caixa tocável (aplicada à view animada, que é a que encolhe). */
  style?: StyleProp<ViewStyle>;
  /**
   * Posição/layout dentro do pai (`alignSelf`, `position`, `flex`, margens):
   * aplicado ao `Pressable` externo, que é quem participa do layout.
   */
  externo?: StyleProp<ViewStyle>;
  /** Escala enquanto pressionado. Padrão: 0,97 (botões); use 0,985 em cartões grandes. */
  escala?: number;
};

/**
 * Pressable com feedback sutil: encolhe um pouco enquanto pressionado e volta
 * suavemente. Substitui `Pressable` em botões, cartões e itens de lista.
 */
export function PressableScale({
  children,
  style,
  externo,
  escala = EscalaToque.botao,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduzido = useMovimentoReduzido();
  const [valor] = useState(() => new Animated.Value(1));

  function animarPara(alvo: number, duracao: number) {
    if (reduzido) return;
    Animated.timing(valor, {
      toValue: alvo,
      duration: duracao,
      easing: Motion.suave,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  return (
    <Pressable
      {...rest}
      style={externo}
      onPressIn={(e) => {
        animarPara(escala, Motion.rapido / 2);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animarPara(1, Motion.rapido * 1.5);
        onPressOut?.(e);
      }}>
      <Animated.View style={[style, { transform: [{ scale: valor }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
