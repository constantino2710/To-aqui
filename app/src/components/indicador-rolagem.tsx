import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Motion } from '@/constants/motion';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const NA_WEB = Platform.OS === 'web';
/** Tempo parado até o indicador sumir. */
const OCIOSO_MS = 1200;
const MARGEM = 6;
const LARGURA = 4;
const MINIMO = 32;
/** Teto do polegar: discreto mesmo quando a página quase não rola. */
const MAXIMO = 0.35;

/**
 * Indicador de rolagem da web: uma pílula fina que flutua sobre o conteúdo (não
 * ocupa largura, então não descentraliza o layout), aparece ao rolar e some
 * depois de um instante parado. No celular valem os indicadores do sistema,
 * que já se comportam assim.
 *
 * Uso: espalhe `propsRolagem` no ScrollView e renderize `indicador` como irmão
 * dele, dentro de uma view com `flex: 1` (o indicador é absoluto nela).
 */
export function useIndicadorRolagem() {
  const theme = useTheme();
  const [visivel, setVisivel] = useState(0);
  const [conteudo, setConteudo] = useState(0);
  const [posicao] = useState(() => new Animated.Value(0));
  const [opacidade] = useState(() => new Animated.Value(0));
  const ocioso = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (ocioso.current) clearTimeout(ocioso.current);
  }, []);

  function mostrarPorUmInstante() {
    Animated.timing(opacidade, { toValue: 1, duration: Motion.rapido, easing: Motion.suave, useNativeDriver: false }).start();
    if (ocioso.current) clearTimeout(ocioso.current);
    ocioso.current = setTimeout(() => {
      Animated.timing(opacidade, { toValue: 0, duration: Motion.lento, easing: Motion.saida, useNativeDriver: false }).start();
    }, OCIOSO_MS);
  }

  const propsRolagem = {
    // Na web a barra nativa some (ela ocuparia largura); no celular fica a do sistema.
    showsVerticalScrollIndicator: !NA_WEB,
    scrollEventThrottle: 16,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!NA_WEB) return;
      posicao.setValue(e.nativeEvent.contentOffset.y);
      mostrarPorUmInstante();
    },
    onLayout: (e: LayoutChangeEvent) => setVisivel(e.nativeEvent.layout.height),
    onContentSizeChange: (_largura: number, altura: number) => setConteudo(altura),
  };

  const sobra = conteudo - visivel;
  let indicador = null;
  if (NA_WEB && visivel > 0 && sobra > 1) {
    const trilho = visivel - MARGEM * 2;
    const polegar = Math.max(MINIMO, Math.min((visivel / conteudo) * trilho, trilho * MAXIMO));
    indicador = (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.polegar,
          {
            height: polegar,
            backgroundColor: theme.textSecondary,
            opacity: Animated.multiply(opacidade, 0.55),
            transform: [
              {
                translateY: posicao.interpolate({
                  inputRange: [0, sobra],
                  outputRange: [0, trilho - polegar],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      />
    );
  }

  return { propsRolagem, indicador };
}

const styles = StyleSheet.create({
  polegar: {
    position: 'absolute',
    top: MARGEM,
    right: MARGEM / 2 + 1,
    width: LARGURA,
    borderRadius: Radii.pill,
  },
});
