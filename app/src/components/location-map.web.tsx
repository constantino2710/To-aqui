import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LocationMapProps } from '@/components/location-map';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mapaFoundHtml } from '@/lib/mapa-found';
import { useThemePreference } from '@/lib/theme-preference';

/**
 * Web: o mesmo documento do celular num <iframe srcdoc>, para o mapa ficar
 * idêntico nas duas plataformas (antes era o embed padrão do OpenStreetMap).
 */
export function LocationMap({ pontos, selo }: LocationMapProps) {
  const theme = useTheme();
  const { mode } = useThemePreference();
  if (pontos.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {createElement('iframe', {
        title: 'Mapa das localizações',
        srcDoc: mapaFoundHtml({ pontos, modo: mode, selo, zoom: true }),
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 280, borderRadius: Radii.large, overflow: 'hidden' },
});
