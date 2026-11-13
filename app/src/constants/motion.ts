import { Easing } from 'react-native';

/**
 * Movimento do Found: curto, suave e sem exagero. Nada quica e nada passa de
 * ~350 ms. Tudo respeita "reduzir movimento" do sistema (ver `useMovimentoReduzido`).
 */
export const Motion = {
  /** Feedback de toque e trocas pequenas. */
  rapido: 160,
  /** Padrão: seleção, foco, troca de aba. */
  base: 260,
  /** Entrada de blocos e janelas. */
  lento: 360,
  /** Atraso entre blocos que entram em sequência. */
  escalonamento: 50,
  /** Distância (px) do deslize de entrada: só um sopro. */
  deslize: 10,
  /** Desacelera no fim, como se "pousasse". Curva padrão do app. */
  suave: Easing.bezier(0.22, 1, 0.36, 1),
  /** Para saídas, um pouco mais seca. */
  saida: Easing.bezier(0.4, 0, 1, 1),
} as const;

/** Escala dos elementos tocáveis enquanto pressionados. */
export const EscalaToque = {
  botao: 0.97,
  cartao: 0.985,
} as const;
