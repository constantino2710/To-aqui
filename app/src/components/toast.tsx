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

import { Icone } from '@/components/icone';
import { FundoCartao, sombraCartao } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
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
  const reduzido = useMovimentoReduzido();
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
          Animated.timing(translateX, {
            toValue: 0,
            duration: Motion.base,
            easing: Motion.suave,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.timing(translateX, {
            toValue: 0,
            duration: Motion.base,
            easing: Motion.suave,
            useNativeDriver: true,
          }).start();
        },
      }),
    [fechar, translateX]
  );

  useEffect(() => {
    if (!toast) return;

    translateX.setValue(0);
    translateY.setValue(reduzido ? 0 : -24);
    opacity.setValue(0);
    progresso.setValue(1);

    // Entra descendo um pouco e "pousando", sem quicar.
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduzido ? 0 : Motion.lento,
        easing: Motion.suave,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduzido ? 0 : Motion.base,
        easing: Motion.suave,
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
  }, [fechar, opacity, progresso, reduzido, toast, translateX, translateY]);

  if (!toast) return null;

  const executarAcao = () => {
    const acao = toast.acao;
    onClose();
    acao?.onPress();
  };

  const visual = {
    sucesso: { cor: theme.success, fundo: theme.brandSoft, icone: 'check' as const },
    erro: { cor: theme.danger, fundo: theme.dangerSoft, icone: 'alert-circle' as const },
    aviso: { cor: theme.warning, fundo: theme.warningSoft, icone: 'alert-triangle' as const },
    info: { cor: theme.brand, fundo: theme.brandSoft, icone: 'info' as const },
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
          sombraCartao(theme.shadow),
          {
            backgroundColor: theme.backgroundElement,
            opacity,
            transform: [{ translateX }, { translateY }],
          },
        ]}>
        <FundoCartao />
        <View style={styles.conteudo}>
          <View style={[styles.selo, { backgroundColor: visual.fundo }]}>
            <Icone nome={visual.icone} tamanho={20} cor={visual.cor} />
          </View>
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
            style={[styles.fechar, { backgroundColor: theme.backgroundSelected }]}>
            <Icone nome="x" tamanho={16} cor={theme.textSecondary} />
          </Pressable>
        </View>
        {toast.acao ? (
          <Pressable accessibilityRole="button" onPress={executarAcao} style={styles.acao}>
            <ThemedText type="smallBold" themeColor="brand">
              {toast.acao.rotulo}
            </ThemedText>
          </Pressable>
        ) : null}
        {/* Tempo restante: fio em pílula, recuado das bordas do cartão. */}
        <View style={[styles.trilho, { backgroundColor: theme.backgroundSelected }]}>
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
    borderRadius: Radii.extraLarge,
    paddingBottom: Spacing.three,
  },
  conteudo: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.two,
  },
  selo: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  fechar: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acao: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  trilho: {
    height: 4,
    marginHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progresso: {
    height: '100%',
    borderRadius: Radii.pill,
  },
});
