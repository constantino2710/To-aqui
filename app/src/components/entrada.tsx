import type { ReactNode } from 'react';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';

export type EntradaProps = {
  children: ReactNode;
  /** Posição na sequência: cada degrau atrasa a entrada em 50 ms (máx. 6). */
  indice?: number;
  /** Versão curta (260 ms, degraus de 30 ms), para trocas dentro de um cartão. */
  rapida?: boolean;
};

// A mesma curva de `Motion.suave`, no formato do Reanimated.
const SUAVE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Aparece com fade e um leve deslize de baixo para cima (10 px) ao montar.
 * O `Screen` já aplica isso a cada bloco; use direto só para itens soltos.
 *
 * Usa a animação de entrada do Reanimated, que roda fora do JavaScript (thread
 * de UI no celular, animação CSS no navegador). Com o `Animated` comum, na web
 * ela rodava quadro a quadro em JS e engasgava enquanto a tela montava.
 */
export function Entrada({ children, indice = 0, rapida = false }: EntradaProps) {
  const reduzido = useMovimentoReduzido();

  const entrada = reduzido
    ? undefined
    : FadeInDown.duration(rapida ? Motion.base : Motion.lento)
        .delay(Math.min(indice, 6) * (rapida ? 30 : Motion.escalonamento))
        .easing(SUAVE)
        .withInitialValues({ opacity: 0, transform: [{ translateY: Motion.deslize }] });

  return <Animated.View entering={entrada}>{children}</Animated.View>;
}
