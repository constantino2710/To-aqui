import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Motion } from '@/constants/motion';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';

export type AlturaAnimadaProps = {
  children: ReactNode;
  /**
   * Identifica o conteúdo atual (ex.: 'ver' | 'editar'). Quando muda, a caixa
   * desliza da altura antiga para a nova em vez de pular.
   */
  chave: string;
  /**
   * Margem extra em volta do conteúdo que não é recortada (ex.: o halo de foco
   * dos campos). A caixa se expande para fora na mesma medida, sem mudar o layout.
   */
  folga?: number;
};

/**
 * Anima a altura só durante a troca de conteúdo. Fora dela, a altura é
 * automática: nada depende de medição, então a caixa nunca fica "presa" num
 * tamanho errado (ex.: medido com a aba oculta ou no meio de uma animação).
 * Com "reduzir movimento" a troca é imediata.
 */
export function AlturaAnimada({ children, chave, folga = 0 }: AlturaAnimadaProps) {
  const reduzido = useMovimentoReduzido();
  const [altura] = useState(() => new Animated.Value(0));
  const [animando, setAnimando] = useState(false);
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  // Lidas só em efeitos e handlers (nunca no render).
  const ultimaAltura = useRef(0);
  const aguardandoMedida = useRef(false);

  // Troca de conteúdo: congela a caixa (na altura antiga) antes de pintar o novo.
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    if (!reduzido) setAnimando(true);
  }

  useEffect(() => {
    if (!animando) return;
    if (ultimaAltura.current <= 0) {
      // Nunca medido (ex.: tela ainda oculta): troca sem animar.
      setAnimando(false);
      return;
    }
    altura.setValue(ultimaAltura.current);
    aguardandoMedida.current = true;
    // Garantia: se a altura nova for igual à antiga, não chega medida nova;
    // sem isto a caixa ficaria congelada e não acompanharia mudanças futuras.
    const garantia = setTimeout(() => {
      if (!aguardandoMedida.current) return;
      aguardandoMedida.current = false;
      setAnimando(false);
    }, Motion.lento);
    return () => clearTimeout(garantia);
  }, [animando, altura]);

  function aoMedir(h: number) {
    ultimaAltura.current = h;
    if (!aguardandoMedida.current || h <= 0) return;
    aguardandoMedida.current = false;
    Animated.timing(altura, {
      toValue: h,
      duration: Motion.base,
      easing: Motion.suave,
      useNativeDriver: false, // altura não roda no thread nativo
    }).start(() => setAnimando(false));
  }

  return (
    <Animated.View style={[styles.caixa, { margin: -folga }, animando && { height: altura }]}>
      {/* Sempre no fluxo normal: mede a altura natural mesmo com a caixa congelada. */}
      <View style={{ padding: folga }} onLayout={(e) => aoMedir(e.nativeEvent.layout.height)}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caixa: { overflow: 'hidden' },
});
