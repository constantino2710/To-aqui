import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Radii } from '@/constants/theme';
import { openStreetMapEmbedUrl } from '@/lib/map-url';

export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: openStreetMapEmbedUrl(lat, lng) }} style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 260, borderRadius: Radii.large, overflow: 'hidden' },
  map: { flex: 1 },
});
