import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useLocationAlerts } from '@/hooks/use-location-alerts';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useTheme } from '@/hooks/use-theme';

const ABAS = [
  { nome: 'comunidade', titulo: 'Comunidade', ativo: 'people', inativo: 'people-outline' },
  { nome: 'index', titulo: 'Início', ativo: 'home', inativo: 'home-outline' },
  { nome: 'perfil', titulo: 'Perfil', ativo: 'person', inativo: 'person-outline' },
] as const;

export default function AppLayout() {
  useLocationAlerts();
  usePushNotifications();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        // Troca de aba: as telas se sobrepõem com um fade curto.
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: Motion.base, easing: Motion.suave } },
      }}
      tabBar={(props) => <BarraInferior {...props} />}>
      <Tabs.Screen name="comunidade" options={{ title: 'Comunidade' }} />
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="configurar-familia" options={{ href: null }} />
      <Tabs.Screen name="qr-code" options={{ href: null }} />
    </Tabs>
  );
}

// Geometria da barra (px). A aba ativa ocupa RAZAO vezes a largura de uma inativa.
const PADDING = Spacing.two;
const FOLGA = Spacing.one;
const RAZAO = 2.2;
const ALTURA_ABA = 48;
const ESTICAR = 14; // quanto a pílula estica no meio do deslize (morph)
const GAP_ROTULO = Spacing.two;
// Largura do rótulo em 14/700: estimativa por caractere (evita medir o texto).
const larguraRotulo = (titulo: string) => Math.ceil(titulo.length * 8.4);

/**
 * Barra flutuante: pílula grafite com UMA pílula branca que desliza até a aba
 * escolhida (e estica um pouco no caminho). As abas ao redor abrem e fecham
 * espaço no mesmo ritmo. Fica no fluxo, abaixo das telas e sobre o mesmo fundo
 * delas — por isso o conteúdo nunca passa por baixo dela.
 */
function BarraInferior({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduzido = useMovimentoReduzido();
  const rotaAtual = state.routes[state.index]?.name;
  const indiceEncontrado = ABAS.findIndex((aba) => aba.nome === rotaAtual);
  // Telas auxiliares (como configurar família) continuam pertencendo à Home.
  const indiceAtivo = indiceEncontrado >= 0 ? indiceEncontrado : 1;

  const [largura, setLargura] = useState(0);
  // Posição contínua do destaque: 0 = primeira aba, 1 = segunda, 2 = terceira.
  const [pos] = useState(() => new Animated.Value(indiceAtivo));

  useEffect(() => {
    if (reduzido) {
      pos.setValue(indiceAtivo);
      return;
    }
    const animacao = Animated.timing(pos, {
      toValue: indiceAtivo,
      duration: Motion.base + 100,
      easing: Motion.suave,
      useNativeDriver: false, // anima largura/posição, que não rodam no thread nativo
    });
    animacao.start();
    return () => animacao.stop();
  }, [indiceAtivo, reduzido, pos]);

  // Largura de uma aba inativa/ativa a partir do espaço livre (soma é constante).
  const livre = Math.max(largura - PADDING * 2 - FOLGA * (ABAS.length - 1), 0);
  const larguraInativa = livre / (ABAS.length - 1 + RAZAO);
  const larguraAtiva = larguraInativa * RAZAO;
  const esquerdaDe = (i: number) => PADDING + i * (larguraInativa + FOLGA);

  // Pílula: esquerda e largura em cada aba (inteiros) e no meio do caminho (+ESTICAR).
  const pontos: number[] = [];
  const esquerdas: number[] = [];
  const larguras: number[] = [];
  ABAS.forEach((_, i) => {
    pontos.push(i);
    esquerdas.push(esquerdaDe(i));
    larguras.push(larguraAtiva);
    if (i < ABAS.length - 1) {
      pontos.push(i + 0.5);
      esquerdas.push((esquerdaDe(i) + esquerdaDe(i + 1)) / 2 - ESTICAR / 2);
      larguras.push(larguraAtiva + ESTICAR);
    }
  });

  return (
    <View
      style={[
        styles.area,
        { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.four) },
      ]}>
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        style={[styles.barra, { backgroundColor: theme.action, opacity: largura > 0 ? 1 : 0 }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.destaque,
            {
              backgroundColor: theme.onAction,
              left: pos.interpolate({ inputRange: pontos, outputRange: esquerdas }),
              width: pos.interpolate({ inputRange: pontos, outputRange: larguras }),
            },
          ]}
        />
        <View style={styles.abas}>
          {ABAS.map((aba, indice) => (
            <BotaoAba
              key={aba.nome}
              aba={aba}
              indice={indice}
              pos={pos}
              larguraInativa={larguraInativa}
              larguraAtiva={larguraAtiva}
              ativo={indice === indiceAtivo}
              onPress={() => {
                const rota = state.routes.find((item) => item.name === aba.nome);
                if (!rota) return;
                const evento = navigation.emit({
                  type: 'tabPress',
                  target: rota.key,
                  canPreventDefault: true,
                });
                if (!evento.defaultPrevented) navigation.navigate(aba.nome);
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

type Aba = (typeof ABAS)[number];

function BotaoAba({
  aba,
  indice,
  pos,
  larguraInativa,
  larguraAtiva,
  ativo,
  onPress,
}: {
  aba: Aba;
  indice: number;
  pos: Animated.Value;
  larguraInativa: number;
  larguraAtiva: number;
  ativo: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const i = indice;

  // A aba abre espaço quando o destaque chega e devolve quando ele sai.
  const larguraAba = pos.interpolate({
    inputRange: [i - 1, i, i + 1],
    outputRange: [larguraInativa, larguraAtiva, larguraInativa],
    extrapolate: 'clamp',
  });
  // 0 → 1 conforme o destaque se aproxima desta aba.
  const proximidade = pos.interpolate({
    inputRange: [i - 0.6, i, i + 0.6],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const larguraTexto = larguraRotulo(aba.titulo);
  const espacoRotulo = pos.interpolate({
    inputRange: [i - 1, i, i + 1],
    outputRange: [0, larguraTexto, 0],
    extrapolate: 'clamp',
  });
  const margemRotulo = pos.interpolate({
    inputRange: [i - 1, i, i + 1],
    outputRange: [0, GAP_ROTULO, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ width: larguraAba, height: ALTURA_ABA }}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: ativo }}
        accessibilityLabel={aba.titulo}
        onPress={onPress}
        style={styles.toque}>
        <View style={styles.icone}>
          {/* Ícone vazado (claro) some e o preenchido (grafite) aparece sobre o destaque. */}
          <Animated.View style={[styles.camadaIcone, { opacity: Animated.subtract(1, proximidade) }]}>
            <Ionicons name={aba.inativo as keyof typeof Ionicons.glyphMap} size={22} color={theme.onAction} />
          </Animated.View>
          <Animated.View style={[styles.camadaIcone, { opacity: proximidade }]}>
            <Ionicons name={aba.ativo as keyof typeof Ionicons.glyphMap} size={22} color={theme.action} />
          </Animated.View>
        </View>
        <Animated.View
          style={{ width: espacoRotulo, marginLeft: margemRotulo, opacity: proximidade, overflow: 'hidden' }}>
          <ThemedText
            numberOfLines={1}
            style={[styles.rotulo, { color: theme.action, width: larguraTexto }]}>
            {aba.titulo}
          </ThemedText>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  barra: {
    width: '100%',
    maxWidth: 460,
    height: ALTURA_ABA + PADDING * 2,
    borderRadius: Radii.pill,
  },
  destaque: {
    position: 'absolute',
    top: PADDING,
    height: ALTURA_ABA,
    borderRadius: Radii.pill,
  },
  abas: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: FOLGA,
    paddingHorizontal: PADDING,
  },
  toque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icone: {
    width: 22,
    height: 22,
  },
  camadaIcone: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotulo: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
});
