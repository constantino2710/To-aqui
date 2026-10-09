import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/lib/theme-preference';

function leafletDocument(
  lat: number,
  lng: number,
  mode: 'light' | 'dark',
  brand: string,
  background: string,
) {
  const tiles =
    mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; background: ${background}; }
      body { overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
      #map { z-index: 1; }
      .leaflet-container { font-family: inherit; }
      .leaflet-control-attribution {
        border-radius: 8px 0 0 0;
        color: ${mode === 'dark' ? '#D8D9DE' : '#50535B'};
        background: ${mode === 'dark' ? 'rgba(17, 19, 24, 0.82)' : 'rgba(255, 254, 252, 0.88)'} !important;
        font-size: 9px;
        padding: 2px 5px;
      }
      .leaflet-control-attribution a { color: inherit; }
      .found-pin-shell {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: ${brand}33;
        border: 1px solid ${brand}66;
        box-sizing: border-box;
      }
      .found-pin {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: ${brand};
        border: 3px solid ${mode === 'dark' ? '#1A1D24' : '#FFFEFC'};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
        box-sizing: border-box;
      }
      .found-pin::after {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${mode === 'dark' ? '#111318' : '#FFFFFF'};
      }
      #fallback {
        position: fixed;
        inset: 0;
        z-index: 2;
        display: none;
        place-items: center;
        padding: 24px;
        color: ${mode === 'dark' ? '#D8D9DE' : '#50535B'};
        background: ${background};
        text-align: center;
        font-size: 14px;
      }
      #fallback.visible { display: grid; }
    </style>
  </head>
  <body>
    <div id="map" role="img" aria-label="Mapa da localização recebida"></div>
    <div id="fallback">Não foi possível carregar o mapa. Use “Abrir mapa” logo abaixo.</div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (() => {
        const fallback = document.getElementById('fallback');
        if (!window.L) {
          fallback.classList.add('visible');
          return;
        }

        const point = [${lat}, ${lng}];
        const map = L.map('map', {
          attributionControl: true,
          doubleClickZoom: true,
          preferCanvas: true,
          zoomControl: false,
        }).setView(point, 16);

        const layer = L.tileLayer('${tiles}', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 20,
          subdomains: 'abcd',
        });

        let tileErrors = 0;
        layer.on('tileerror', () => {
          tileErrors += 1;
          if (tileErrors >= 6) fallback.classList.add('visible');
        });
        layer.addTo(map);

        const icon = L.divIcon({
          className: '',
          html: '<div class="found-pin-shell"><div class="found-pin"></div></div>',
          iconAnchor: [24, 24],
          iconSize: [48, 48],
        });
        L.marker(point, { icon, keyboard: false }).addTo(map);

        setTimeout(() => map.invalidateSize(false), 100);
      })();
    </script>
  </body>
</html>`;
}

export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const theme = useTheme();
  const { mode } = useThemePreference();
  const html = leafletDocument(lat, lng, mode, theme.brand, theme.backgroundElement);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <WebView
        accessibilityLabel="Mapa da localização recebida"
        cacheEnabled
        nestedScrollEnabled
        originWhitelist={['https://*']}
        renderError={() => (
          <View style={[styles.feedback, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.feedbackText}>
              Não foi possível carregar o mapa. Use “Abrir mapa” logo abaixo.
            </ThemedText>
          </View>
        )}
        renderLoading={() => (
          <View style={[styles.feedback, { backgroundColor: theme.backgroundElement }]}>
            <ActivityIndicator color={theme.brand} />
          </View>
        )}
        source={{ html, baseUrl: 'https://localhost' }}
        startInLoadingState
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    borderRadius: Radii.large,
    overflow: 'hidden',
  },
  map: { flex: 1, backgroundColor: 'transparent' },
  feedback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  feedbackText: { textAlign: 'center' },
});
