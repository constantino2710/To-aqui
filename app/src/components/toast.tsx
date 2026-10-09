import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ToastTone = 'sucesso' | 'erro' | 'aviso' | 'info';

export type ToastInput = {
  titulo: string;
  mensagem?: string;
  tom?: ToastTone;
  duracao?: number;
  acao?: { rotulo: string; onPress: () => void };
};

type ToastItem = ToastInput & { id: number; tom: ToastTone; duracao: number };
type ToastContextValue = { notificar: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast precisa estar dentro de ToastProvider.');
  return contexto;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const proximoId = useRef(0);

  const notificar = useCallback((novo: ToastInput) => {
    const tom = novo.tom ?? 'info';
    const duracao = novo.duracao ?? (tom === 'erro' ? 6000 : 4500);
    proximoId.current += 1;
    setToast({ ...novo, tom, duracao, id: proximoId.current });
  }, []);

  const contexto = useMemo(() => ({ notificar }), [notificar]);
  const fecharAtual = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={contexto}>
      {children}
      <ToastViewport toast={toast} onClose={fecharAtual} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toast, onClose }: { toast: ToastItem | null; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [translateX] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));
  const [progresso] = useState(() => new Animated.Value(1));

  const fechar = useCallback(
    (direcao = 1) => {
      progresso.stopAnimation();
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: direcao * width,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onClose();
      });
    },
    [onClose, opacity, progresso, translateX, width]
  );

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, movimento) =>
          Math.abs(movimento.dx) > 6 && Math.abs(movimento.dx) > Math.abs(movimento.dy),
        onPanResponderMove: (_, movimento) => translateX.setValue(movimento.dx),
        onPanResponderRelease: (_, movimento) => {
          if (Math.abs(movimento.dx) > 72 || Math.abs(movimento.vx) > 0.55) {
            fechar(movimento.dx < 0 ? -1 : 1);
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [fechar, translateX]
  );

  useEffect(() => {
    if (!toast) return;

    translateX.setValue(0);
    translateY.setValue(-120);
    opacity.setValue(0);
    progresso.setValue(1);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    const temporizador = Animated.timing(progresso, {
      toValue: 0,
      duration: toast.duracao,
      useNativeDriver: false,
    });
    temporizador.start(({ finished }) => {
      if (finished) fechar(1);
    });

    return () => temporizador.stop();
  }, [fechar, opacity, progresso, toast, translateX, translateY]);

  if (!toast) return null;

  const executarAcao = () => {
    const acao = toast.acao;
    onClose();
    acao?.onPress();
  };

  const visual = {
    sucesso: { cor: theme.success, icone: 'checkmark-circle' as const },
    erro: { cor: theme.danger, icone: 'alert-circle' as const },
    aviso: { cor: theme.accentOrange, icone: 'warning' as const },
    info: { cor: theme.brand, icone: 'information-circle' as const },
  }[toast.tom];

  const larguraProgresso = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View pointerEvents="box-none" style={[styles.viewport, { paddingTop: insets.top + Spacing.two }]}>
      <Animated.View
        accessibilityRole="alert"
        {...gesto.panHandlers}
        style={[
          styles.toast,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            opacity,
            transform: [{ translateX }, { translateY }],
          },
        ]}>
        <View style={styles.conteudo}>
          <Ionicons name={visual.icone} size={24} color={visual.cor} />
          <View style={styles.textos}>
            <ThemedText type="smallBold">{toast.titulo}</ThemedText>
            {toast.mensagem ? (
              <ThemedText type="small" themeColor="textSecondary">
                {toast.mensagem}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar notificação"
            hitSlop={12}
            onPress={() => fechar(1)}
            style={styles.fechar}>
            <Ionicons name="close" size={19} color={theme.textSecondary} />
          </Pressable>
        </View>
        {toast.acao ? (
          <Pressable accessibilityRole="button" onPress={executarAcao} style={styles.acao}>
            <ThemedText type="smallBold" themeColor="brand">
              {toast.acao.rotulo}
            </ThemedText>
          </Pressable>
        ) : null}
        <View style={[styles.trilho, { backgroundColor: theme.border }]}>
          <Animated.View
            style={[styles.progresso, { backgroundColor: visual.cor, width: larguraProgresso }]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2000,
    elevation: 20,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.large,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  conteudo: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  fechar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acao: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  trilho: {
    height: 3,
    width: '100%',
  },
  progresso: {
    height: '100%',
  },
});
