import { useId, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Palette, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FormaIngressoProps = {
  /** Largura do canhoto verde (à esquerda do picote). */
  canhoto: number;
  children: ReactNode;
  style?: ViewStyle;
};

const RAIO = Radii.huge;
const FURO = 10;

/**
 * Formato de ingresso desenhado em SVG: cantos de 32, canhoto verde à
 * esquerda e o picote com furos de verdade (recortados do contorno, não
 * pintados por cima). A sombra segue esse contorno, então não passa por baixo
 * dos furos: na web via `drop-shadow`, no iOS pela sombra nativa (que acompanha
 * a forma desenhada). O Android só desenha sombras retangulares, então lá o
 * cartão fica sem sombra para não "tapar" os furos.
 *
 * Os filhos ficam por cima, em linha: o primeiro ocupa o canhoto.
 */
export function FormaIngresso({ canhoto, children, style }: FormaIngressoProps) {
  const theme = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [tamanho, setTamanho] = useState({ l: 0, a: 0 });
  const { l, a } = tamanho;
  const x = canhoto + 1; // centro dos furos, sobre o picote

  // Contorno: retângulo arredondado com dois semicírculos recortados.
  const contorno =
    l > 0
      ? `M${RAIO},0 H${x - FURO} A${FURO},${FURO} 0 0 0 ${x + FURO},0 H${l - RAIO} A${RAIO},${RAIO} 0 0 1 ${l},${RAIO}` +
        ` V${a - RAIO} A${RAIO},${RAIO} 0 0 1 ${l - RAIO},${a} H${x + FURO} A${FURO},${FURO} 0 0 0 ${x - FURO},${a}` +
        ` H${RAIO} A${RAIO},${RAIO} 0 0 1 0,${a - RAIO} V${RAIO} A${RAIO},${RAIO} 0 0 1 ${RAIO},0 Z`
      : '';

  return (
    <View
      style={[styles.caixa, sombraDaForma(theme.shadow), style]}
      onLayout={(e) => setTamanho({ l: e.nativeEvent.layout.width, a: e.nativeEvent.layout.height })}>
      {l > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={l} height={a} aria-hidden>
          <Defs>
            <ClipPath id={`${id}forma`}>
              <Path d={contorno} />
            </ClipPath>
            <LinearGradient id={`${id}verde`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.gradientFrom} />
              <Stop offset="1" stopColor={theme.gradientTo} />
            </LinearGradient>
            <LinearGradient id={`${id}corpo`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.backgroundElement} />
              <Stop offset="1" stopColor={theme.cardGradientTo} />
            </LinearGradient>
          </Defs>
          <G clipPath={`url(#${id}forma)`}>
            <Rect x="0" y="0" width={l} height={a} fill={`url(#${id}corpo)`} />
            <Rect x="0" y="0" width={canhoto} height={a} fill={`url(#${id}verde)`} />
            {/* Ondas de "raio de localização" saindo do símbolo: só textura. */}
            {[34, 52, 70].map((r, i) => (
              <Circle
                key={r}
                cx={canhoto / 2}
                cy={a / 2}
                r={r}
                stroke={Palette.white}
                strokeOpacity={0.35 - i * 0.12}
                strokeWidth={1.5}
                fill="none"
              />
            ))}
          </G>
          {/* Picote: tracejado entre os furos. */}
          <Line
            x1={x}
            y1={FURO + 6}
            x2={x}
            y2={a - FURO - 6}
            stroke={theme.border}
            strokeWidth={2}
            strokeDasharray="4 5"
            strokeLinecap="round"
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

/** Sombra que acompanha o contorno desenhado (ver comentário do componente). */
function sombraDaForma(cor: string): ViewStyle {
  if (Platform.OS === 'web') {
    return { filter: `drop-shadow(0 1px 1px ${cor}) drop-shadow(0 8px 12px ${cor})` } as unknown as ViewStyle;
  }
  if (Platform.OS === 'ios') {
    return { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } };
  }
  return {};
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row' },
});
