import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radii } from '@/constants/theme';
import { openStreetMapEmbedUrl } from '@/lib/map-url';

export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <View style={styles.container}>
      {createElement('iframe', {
        title: 'Mapa da localização recebida',
        src: openStreetMapEmbedUrl(lat, lng),
        style: { width: '100%', height: '100%', border: 0 },
        loading: 'lazy',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 260, borderRadius: Radii.large, overflow: 'hidden' },
});
