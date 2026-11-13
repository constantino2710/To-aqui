import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { sombraCartao } from '@/components/card';
import { FoundMark } from '@/components/found-logo';
import { ThemedText } from '@/components/themed-text';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LocationHeroProps = {
  /** Texto do selo na base do card. */
  selo?: string;
  /**
   * Com marca: o símbolo Found é o pin no centro do raio e o nome fica no canto
   * do card (tela de entrada). Sem marca: só um ponto em degradê.
   */
  marca?: boolean;
};

// Coordenadas do desenho (viewBox 350 × 260). O card mantém essa proporção,
// então as posições em % abaixo continuam alinhadas em qualquer largura.
const VB_W = 350;
const VB_H = 260;
const CENTRO = { x: 175, y: 140 };
const MARCA = 76;
// O pin fica 29 unidades acima do centro do raio (a "ponta" toca o centro).
const MARCA_CENTRO_Y = CENTRO.y - 29;

/**
 * Ilustração de mapa com raio de localização, usada como destaque nas telas de
 * entrada. É decorativa: não mostra nenhuma posição real.
 */
export function LocationHero({ selo = 'Localização consentida', marca = false }: LocationHeroProps) {
  const theme = useTheme();
  const gradId = `hero-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View
      style={[styles.card, sombraCartao(theme.shadow), { backgroundColor: theme.backgroundElement }]}
      aria-hidden={!marca}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={StyleSheet.absoluteFill}
        aria-hidden>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradientFrom} />
            <Stop offset="1" stopColor={theme.gradientTo} />
          </LinearGradient>
        </Defs>
        <G stroke={theme.background} strokeLinecap="round" fill="none">
          <Path d="M-10 64 L360 40" strokeWidth={12} />
          <Path d="M-10 212 L360 232" strokeWidth={12} />
          <Path d="M80 -10 L110 270" strokeWidth={10} />
          <Path d="M260 -10 L240 270" strokeWidth={10} />
          <Path d="M-10 130 L360 124" strokeWidth={4} />
          <Path d="M30 -10 L50 270" strokeWidth={4} />
          <Path d="M180 -10 L190 270" strokeWidth={4} />
        </G>
        <Circle
          cx={CENTRO.x}
          cy={CENTRO.y}
          r={96}
          fill={theme.gradientFrom}
          fillOpacity={0.08}
          stroke={theme.gradientFrom}
          strokeOpacity={0.5}
          strokeWidth={1.5}
        />
        <Circle cx={CENTRO.x} cy={CENTRO.y} r={54} fill={theme.gradientFrom} fillOpacity={0.12} />
        {marca ? (
          <Ellipse cx={CENTRO.x} cy={CENTRO.y + 28} rx={18} ry={5} fill={theme.text} fillOpacity={0.12} />
        ) : (
          <Circle cx={CENTRO.x} cy={CENTRO.y} r={16} fill={`url(#${gradId})`} stroke={theme.backgroundElement} strokeWidth={4} />
        )}
      </Svg>

      {marca && (
        <>
          <ThemedText style={styles.nome} accessibilityRole="header">
            found
          </ThemedText>
          <View style={[styles.marca, { boxShadow: `0 10px 18px ${theme.shadow}` }]}>
            <FoundMark size={MARCA} />
          </View>
        </>
      )}

      <View style={styles.seloLinha} pointerEvents="none">
        <View style={[styles.selo, { backgroundColor: theme.backgroundElement, boxShadow: `0 4px 14px ${theme.shadow}` }]}>
          <View style={[styles.ponto, { backgroundColor: theme.gradientTo }]} />
          <ThemedText style={styles.seloTexto}>{selo}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: VB_W / VB_H,
    borderRadius: Radii.huge,
    overflow: 'hidden',
  },
  // O nome é parte da marca (logotipo), por isso fica fora da escala de texto.
  nome: {
    position: 'absolute',
    left: Spacing.four,
    top: Spacing.three,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
    letterSpacing: -1.3,
  },
  marca: {
    position: 'absolute',
    left: '50%',
    top: `${(MARCA_CENTRO_Y / VB_H) * 100}%`,
    marginLeft: -MARCA / 2,
    marginTop: -MARCA / 2,
    width: MARCA,
    height: MARCA,
    borderRadius: (14 / 48) * MARCA,
  },
  seloLinha: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.three,
    alignItems: 'center',
  },
  selo: {
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  seloTexto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 600,
  },
});
