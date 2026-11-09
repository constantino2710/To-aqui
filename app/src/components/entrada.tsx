import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform } from 'react-native';

import { Motion } from '@/constants/motion';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';

export type EntradaProps = {
  children: ReactNode;
  /** Posição na sequência: cada degrau atrasa a entrada em 50 ms (máx. 6). */
  indice?: number;
};

/**
 * Aparece com fade e um leve deslize de baixo para cima (10 px) ao montar.
 * O `Screen` já aplica isso a cada bloco; use direto só para itens soltos.
 */
export function Entrada({ children, indice = 0 }: EntradaProps) {
  const reduzido = useMovimentoReduzido();
  const [progresso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduzido) {
      progresso.setValue(1);
      return;
    }
    const animacao = Animated.timing(progresso, {
      toValue: 1,
      duration: Motion.lento,
      delay: Math.min(indice, 6) * Motion.escalonamento,
      easing: Motion.suave,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacao.start();
    return () => animacao.stop();
  }, [indice, progresso, reduzido]);

  return (
    <Animated.View
      style={{
        opacity: progresso,
        transform: [
          {
            translateY: progresso.interpolate({
              inputRange: [0, 1],
              outputRange: [Motion.deslize, 0],
            }),
          },
        ],
      }}>
      {children}
    </Animated.View>
  );
}
