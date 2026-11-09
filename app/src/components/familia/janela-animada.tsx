import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Motion } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';

export type JanelaAnimadaProps = {
  visivel: boolean;
  onFechar: () => void;
  /** Quando `false`, tocar no fundo escurecido não fecha a janela. */
  fecharAoTocarFora?: boolean;
  /** Estilo extra do cartão (padding e gap, por exemplo). */
  estilo?: ViewStyle;
  children: ReactNode;
};

/**
 * Janela central: o fundo escurece com fade e o cartão entra com fade, leve
 * subida e escala. Ao fechar faz o inverso, mais rápido, e só então desmonta o
 * Modal. Com "reduzir movimento" a troca é instantânea.
 */
export function JanelaAnimada({ visivel, onFechar, fecharAoTocarFora = true, estilo, children }: JanelaAnimadaProps) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const [montado, setMontado] = useState(visivel);
  // 0 = fechada, 1 = aberta.
  const [progresso] = useState(() => new Animated.Value(0));

  if (visivel && !montado) setMontado(true);

  useEffect(() => {
    if (!montado) return;
    const abrindo = visivel;
    const animacao = Animated.timing(progresso, {
      toValue: abrindo ? 1 : 0,
      duration: reduzido ? 0 : abrindo ? Motion.base : Motion.rapido * 1.4,
      easing: abrindo ? Motion.suave : Motion.saida,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacao.start(({ finished }) => {
      if (finished && !abrindo) setMontado(false);
    });
    return () => animacao.stop();
  }, [visivel, montado, reduzido, progresso]);

  return (
    <Modal visible={montado} transparent animationType="none" statusBarTranslucent onRequestClose={onFechar}>
      <View style={styles.raiz}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: progresso }]}>
          {fecharAoTocarFora && <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onFechar} />}
        </Animated.View>
        <Animated.View
          style={[
            styles.cartao,
            { backgroundColor: theme.backgroundElement, opacity: progresso },
            estilo,
            {
              transform: [
                { translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                { scale: progresso.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cartao: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radii.huge,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
