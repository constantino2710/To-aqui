import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mapaFoundHtml, type PontoMapa } from '@/lib/mapa-found';
import { useThemePreference } from '@/lib/theme-preference';

export type LocationMapProps = {
  pontos: PontoMapa[];
  /** Selo flutuante no canto do mapa (ex.: "Atualizada há 2 min"). */
  selo?: string;
};

/** Mapa no padrão visual do Found (ver `lib/mapa-found.ts`). Celular: WebView. */
export function LocationMap({ pontos, selo }: LocationMapProps) {
  const theme = useTheme();
  const { mode } = useThemePreference();
  if (pontos.length === 0) return null;
  const html = mapaFoundHtml({ pontos, modo: mode, selo });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WebView
        accessibilityLabel="Mapa das localizações"
        cacheEnabled
        nestedScrollEnabled
        originWhitelist={['https://*']}
        renderError={() => (
          <View style={[styles.feedback, { backgroundColor: theme.background }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.feedbackText}>
              Não foi possível carregar o mapa. Use “Abrir mapa” logo abaixo.
            </ThemedText>
          </View>
        )}
        renderLoading={() => (
          <View style={[styles.feedback, { backgroundColor: theme.background }]}>
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
  // Dentro de um cartão (cantos 28, respiro 24): 22 deixa as curvas concêntricas.
  container: {
    width: '100%',
    height: 280,
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
