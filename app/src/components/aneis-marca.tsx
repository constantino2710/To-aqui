import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { PIN } from '@/components/found-logo';
import { Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Decoração dos cartões escuros: anéis concêntricos de "raio de localização"
 * no canto superior direito, com o pin da marca no centro. Puramente visual.
 * Vai dentro de uma view com `overflow: 'hidden'`.
 */
export function AneisMarca() {
  const theme = useTheme();
  const gradId = `pin-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Svg
      style={styles.aneis}
      width={160}
      height={160}
      viewBox="0 0 160 160"
      pointerEvents="none"
      aria-hidden>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.gradientFrom} />
          <Stop offset="1" stopColor={theme.gradientTo} />
        </LinearGradient>
      </Defs>
      <Circle cx="120" cy="40" r="56" stroke={theme.gradientFrom} strokeOpacity={0.35} strokeWidth={2} fill="none" />
      <Circle cx="120" cy="40" r="84" stroke={theme.gradientTo} strokeOpacity={0.2} strokeWidth={2} fill="none" />
      <Circle cx="120" cy="40" r="112" stroke={theme.gradientFrom} strokeOpacity={0.12} strokeWidth={2} fill="none" />
      {/* Pin da marca no centro dos anéis (centro do pin em 24, 24 → 120, 40). */}
      <G transform="translate(90 10) scale(1.25)">
        <Path d={PIN} fill={`url(#${gradId})`} />
        <Rect x="18.5" y="14.5" width="11" height="11" rx="3" fill={Palette.graphite} />
        <Rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill={Palette.white} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  aneis: { position: 'absolute', top: 0, right: 0 },
});
