import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { EspacoBarraContext } from '@/hooks/use-espaco-barra';
import { useLocationAlerts } from '@/hooks/use-location-alerts';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useTheme } from '@/hooks/use-theme';

const ABAS = [
  { nome: 'comunidade', titulo: 'Comunidade', ativo: 'users', inativo: 'users' },
  { nome: 'index', titulo: 'Início', ativo: 'home', inativo: 'home' },
  { nome: 'perfil', titulo: 'Perfil', ativo: 'user', inativo: 'user' },
] as const;

export default function AppLayout() {
  useLocationAlerts();
  usePushNotifications();
  const insets = useSafeAreaInsets();
  // A barra flutua sobre as telas; elas reservam esse espaço no fim da rolagem.
  const espacoBarra = ALTURA_ABA + PADDING * 2 + margemInferior(insets.bottom);

  return (
    <EspacoBarraContext.Provider value={espacoBarra}>
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
    </EspacoBarraContext.Provider>
  );
}

// Geometria da barra (px). A aba ativa ocupa RAZAO vezes a largura de uma inativa.
const PADDING = Spacing.two;
const FOLGA = Spacing.one;
const RAZAO = 2.2;
const ALTURA_ABA = 48;
const ESTICAR = 14; // quanto a pílula estica no meio do deslize (morph)
const GAP_ROTULO = Spacing.two;
// Distância da barra até a base da tela: a área segura, com no mínimo 24.
const margemInferior = (areaSegura: number) => Math.max(areaSegura, Spacing.four);
// Estimativa da largura do rótulo em 14/700, usada só até a medição real chegar.
const larguraEstimada = (titulo: string) => Math.ceil(titulo.length * 9.6);

/**
 * Barra flutuante: pílula grafite com UMA pílula branca que desliza até a aba
 * escolhida (e estica um pouco no caminho). As abas ao redor abrem e fecham
 * espaço no mesmo ritmo. Flutua sobre as telas, sem fundo próprio: o conteúdo
 * rola por trás dela, e o `Screen` reserva espaço para o fim da lista.
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
  const tecladoAberto = useTecladoAberto();
  // Largura real de cada rótulo, medida fora da tela (a fonte varia por plataforma).
  const [rotulos, setRotulos] = useState<Record<string, number>>({});
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

  // No Android a tela encolhe com o teclado e a barra subiria junto, cobrindo o
  // campo em foco; enquanto o teclado está aberto ela sai de cena.
  if (tecladoAberto) return null;

  return (
    <View pointerEvents="box-none" style={[styles.area, { paddingBottom: margemInferior(insets.bottom) }]}>
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        style={[
          styles.barra,
          { backgroundColor: theme.action, boxShadow: `0 12px 32px -6px ${theme.shadow}`, opacity: largura > 0 ? 1 : 0 },
        ]}>
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
        {/* Medidor invisível: cada rótulo na largura natural, sem corte. */}
        <View style={styles.medidor} pointerEvents="none" aria-hidden>
          {ABAS.map((aba) => (
            <ThemedText
              key={aba.nome}
              style={[styles.rotulo, styles.medida]}
              onLayout={(e) => {
                // O navegador arredonda a medida (88,4 vira 88) e a fração cortaria
                // o rótulo com reticências; a folga de 2 px evita isso.
                const w = Math.ceil(e.nativeEvent.layout.width) + 2;
                setRotulos((atual) => (atual[aba.nome] === w ? atual : { ...atual, [aba.nome]: w }));
              }}>
              {aba.titulo}
            </ThemedText>
          ))}
        </View>
        <View style={styles.abas}>
          {ABAS.map((aba, indice) => (
            <BotaoAba
              key={aba.nome}
              aba={aba}
              indice={indice}
              pos={pos}
              larguraInativa={larguraInativa}
              larguraAtiva={larguraAtiva}
              larguraTexto={rotulos[aba.nome] ?? larguraEstimada(aba.titulo)}
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

/** `true` enquanto o teclado do Android está aberto (no iOS ele cobre a barra). */
function useTecladoAberto() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const abrir = Keyboard.addListener('keyboardDidShow', () => setAberto(true));
    const fechar = Keyboard.addListener('keyboardDidHide', () => setAberto(false));
    return () => {
      abrir.remove();
      fechar.remove();
    };
  }, []);
  return aberto;
}

type Aba = (typeof ABAS)[number];

function BotaoAba({
  aba,
  indice,
  pos,
  larguraInativa,
  larguraAtiva,
  larguraTexto,
  ativo,
  onPress,
}: {
  aba: Aba;
  indice: number;
  pos: Animated.Value;
  larguraInativa: number;
  larguraAtiva: number;
  larguraTexto: number;
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
            <Icone nome={aba.inativo} tamanho={22} cor={theme.onAction} />
          </Animated.View>
          <Animated.View style={[styles.camadaIcone, { opacity: proximidade }]}>
            <Icone nome={aba.ativo} tamanho={22} cor={theme.action} />
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  // Fica dentro da largura da barra (e recortado): um medidor mais largo que a
  // tela faria o navegador do celular alargar a página e permitir rolagem extra.
  medidor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ALTURA_ABA,
    overflow: 'hidden',
    opacity: 0,
    alignItems: 'flex-start',
  },
  medida: {
    alignSelf: 'flex-start',
  },
  rotulo: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
});
