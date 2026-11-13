import { View, type ViewStyle } from 'react-native';

import type { EntradaProps } from '@/components/entrada';
import { Motion } from '@/constants/motion';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';

// Mesmo movimento do celular: fade + 10 px de baixo para cima, curva `Motion.suave`.
const QUADROS = [
  {
    from: { opacity: 0, transform: [{ translateY: Motion.deslize }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] },
  },
];

/**
 * Web: animação CSS pura (o React Native Web aceita `animationKeyframes` no
 * style). Roda fora do JavaScript, como no celular, e não mexe no layout: a
 * animação de entrada do Reanimated na web deixava o bloco com
 * `position: absolute` e ele deixava de ocupar espaço (cartões "encolhiam").
 */
export function Entrada({ children, indice = 0, rapida = false }: EntradaProps) {
  const reduzido = useMovimentoReduzido();
  if (reduzido) return <View>{children}</View>;

  const animacao = {
    animationKeyframes: QUADROS,
    animationDuration: `${rapida ? Motion.base : Motion.lento}ms`,
    animationDelay: `${Math.min(indice, 6) * (rapida ? 30 : Motion.escalonamento)}ms`,
    animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    // `both`: invisível durante o atraso e parado no fim, sem piscar.
    animationFillMode: 'both',
  } as unknown as ViewStyle;

  return <View style={animacao}>{children}</View>;
}
