import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useLocationAlerts } from '@/hooks/use-location-alerts';
import { useTheme } from '@/hooks/use-theme';

const ABAS = [
  { nome: 'comunidade', titulo: 'Comunidade', ativo: 'people', inativo: 'people-outline' },
  { nome: 'index', titulo: 'Início', ativo: 'home', inativo: 'home-outline' },
  { nome: 'perfil', titulo: 'Perfil', ativo: 'person', inativo: 'person-outline' },
] as const;

export default function AppLayout() {
  useLocationAlerts();
  return (
    <Tabs initialRouteName="index" screenOptions={{ headerShown: false }} tabBar={(props) => <BarraInferior {...props} />}>
      <Tabs.Screen name="comunidade" options={{ title: 'Comunidade' }} />
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="configurar-familia" options={{ href: null }} />
      <Tabs.Screen name="qr-code" options={{ href: null }} />
    </Tabs>
  );
}

function BarraInferior({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const rotaAtual = state.routes[state.index]?.name;
  const indiceEncontrado = ABAS.findIndex((aba) => aba.nome === rotaAtual);
  // Telas auxiliares (como configurar família) continuam pertencendo à Home.
  const indiceAtivo = indiceEncontrado >= 0 ? indiceEncontrado : 1;

  return (
    <View
      style={[
        styles.barra,
        {
          paddingBottom: Math.max(insets.bottom, Spacing.two),
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
        },
      ]}>
      {ABAS.map((aba, indice) => (
        <BotaoAba
          key={aba.nome}
          aba={aba}
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
  );
}

type Aba = (typeof ABAS)[number];

function BotaoAba({
  aba,
  ativo,
  onPress,
}: {
  aba: Aba;
  ativo: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progresso = useRef(new Animated.Value(ativo ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progresso, {
      toValue: ativo ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 230,
    }).start();
  }, [ativo, progresso]);

  const escala = progresso.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const elevacao = progresso.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={aba.titulo}
      onPress={onPress}
      style={styles.botao}>
      <Animated.View
        style={[
          styles.conteudoBotao,
          ativo && styles.abaElevada,
          { backgroundColor: ativo ? theme.brand : 'transparent' },
          { transform: [{ translateY: elevacao }, { scale: escala }] },
        ]}>
        <Ionicons
          name={(ativo ? aba.ativo : aba.inativo) as keyof typeof Ionicons.glyphMap}
          size={ativo ? 27 : 24}
          color={ativo ? theme.onBrand : theme.textSecondary}
        />
      </Animated.View>
      <ThemedText
        type="small"
        style={[styles.rotulo, { color: ativo ? theme.brand : theme.textSecondary }]}>
        {aba.titulo}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    minHeight: 76,
  },
  botao: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    zIndex: 1,
  },
  conteudoBotao: {
    width: 58,
    height: 48,
    borderRadius: Radii.extraLarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abaElevada: {
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  rotulo: {
    fontSize: 11,
    lineHeight: 16,
  },
});
