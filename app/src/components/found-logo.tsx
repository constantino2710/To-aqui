import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Contorno do pin no viewBox 48 × 48 do símbolo (centro visual em 24, 24). */
export const PIN = 'M24 8c-7.2 0-13 5.6-13 12.6C11 30 24 40 24 40s13-10 13-19.4C37 13.6 31.2 8 24 8z';

export type FoundMarkProps = {
  /** Lado do símbolo em px. */
  size?: number;
};

/**
 * Símbolo "Pin-QR": pin de localização em degradê com o "olho" de um QR Code
 * no centro, sobre um quadrado grafite. Abaixo de 32 px o olho vira um
 * quadrado simples para continuar legível.
 */
export function FoundMark({ size = 40 }: FoundMarkProps) {
  const theme = useTheme();
  const gradId = `found-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pequeno = size < 32;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Found">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.gradientFrom} />
          <Stop offset="1" stopColor={theme.gradientTo} />
        </LinearGradient>
      </Defs>
      <Rect width="48" height="48" rx="14" fill={Palette.graphite} />
      <Path d={PIN} fill={`url(#${gradId})`} />
      {pequeno ? (
        <Rect x="19" y="15" width="10" height="10" rx="2.5" fill={Palette.graphite} />
      ) : (
        <>
          <Rect x="18.5" y="14.5" width="11" height="11" rx="3" fill={Palette.graphite} />
          <Rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill={Palette.white} />
        </>
      )}
    </Svg>
  );
}

export type FoundLogoProps = {
  /** Lado do símbolo; o nome acompanha a proporção. */
  size?: number;
};

/** Logo horizontal: símbolo + "found". */
export function FoundLogo({ size = 40 }: FoundLogoProps) {
  return (
    <View style={styles.linha} accessible accessibilityRole="image" accessibilityLabel="Found">
      <FoundMark size={size} />
      <ThemedText
        style={[styles.nome, { fontSize: size * 0.56, lineHeight: size * 0.7, letterSpacing: -size * 0.025 }]}>
        found
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nome: {
    fontWeight: 800,
  },
});
