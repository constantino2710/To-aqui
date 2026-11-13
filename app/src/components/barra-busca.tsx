import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { Icone } from '@/components/icone';
import { sombraCartao } from '@/components/card';
import { IconButton } from '@/components/icon-button';
import { Motion } from '@/constants/motion';
import { FontSize, JakartaFamilies, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';

export type BarraBuscaProps = {
  valor: string;
  onChangeText: (texto: string) => void;
  /** Toque na lupa ou "buscar" no teclado. */
  onPesquisar: () => void;
  /** Toque no "X": a busca é apagada e fechada. */
  onLimpar: () => void;
  placeholder: string;
  accessibilityLabel: string;
  carregando?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
};

const BOTAO = 56;

// No navegador, o <input> ganha um anel de foco próprio; a borda da pílula já basta.
const semAnelDoNavegador = (
  Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}
) as TextStyle;

/**
 * Busca em pílula. A lupa de "pesquisar" e o "X" de fechar só aparecem com a
 * busca em uso (campo em foco ou com texto); em repouso fica só o campo.
 */
export function BarraBusca({
  valor,
  onChangeText,
  onPesquisar,
  onLimpar,
  placeholder,
  accessibilityLabel,
  carregando = false,
  autoCapitalize,
  autoCorrect,
}: BarraBuscaProps) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const [focado, setFocado] = useState(false);
  const [entrada, setEntrada] = useState<TextInput | null>(null);
  // Com texto, a busca continua "aberta" mesmo sem foco (ex.: teclado fechado).
  const ativa = focado || valor.length > 0 || carregando;
  const [progresso] = useState(() => new Animated.Value(ativa ? 1 : 0));

  useEffect(() => {
    const animacao = Animated.timing(progresso, {
      toValue: ativa ? 1 : 0,
      duration: reduzido ? 0 : Motion.base,
      easing: Motion.suave,
      useNativeDriver: false, // anima largura, que não roda no thread nativo
    });
    animacao.start();
    return () => animacao.stop();
  }, [ativa, progresso, reduzido]);

  function fechar() {
    onLimpar();
    entrada?.blur();
    setFocado(false);
  }

  return (
    <View style={styles.linha}>
      <View
        style={[
          styles.campo,
          // Em foco: um contorno só, verde translúcido (sem halo nem sombra).
          focado
            ? { borderColor: `${theme.brand}80` }
            : [sombraCartao(theme.shadow), { borderColor: 'transparent' }],
          { backgroundColor: theme.backgroundElement },
        ]}>
        <Icone nome="search" tamanho={20} cor={theme.textSecondary} />
        <TextInput
          ref={setEntrada}
          accessibilityLabel={accessibilityLabel}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={valor}
          onChangeText={onChangeText}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType="search"
          onSubmitEditing={onPesquisar}
          style={[styles.input, semAnelDoNavegador, { color: theme.text }]}
        />
        {/* O "X" surge com fade junto com a lupa (mesmo progresso), em vez de pular. */}
        <Animated.View
          style={{
            opacity: progresso,
            transform: [{ scale: progresso.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          }}
          pointerEvents={ativa ? 'auto' : 'none'}
          aria-hidden={!ativa}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar busca"
            hitSlop={8}
            onPress={fechar}
            disabled={!ativa}
            style={[styles.limpar, { backgroundColor: theme.backgroundSelected }]}>
            <Icone nome="x" tamanho={16} cor={theme.textSecondary} />
          </Pressable>
        </Animated.View>
      </View>

      {/* A lupa entra deslizando da direita e o campo cede espaço a ela. */}
      <Animated.View
        pointerEvents={ativa ? 'auto' : 'none'}
        aria-hidden={!ativa}
        style={[
          styles.areaBotao,
          {
            width: progresso.interpolate({ inputRange: [0, 1], outputRange: [0, BOTAO + Spacing.two] }),
            opacity: progresso,
          },
        ]}>
        <Animated.View
          style={{
            transform: [{ scale: progresso.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          }}>
          <IconButton icone="search" rotulo="Pesquisar" tamanho={BOTAO} loading={carregando} onPress={onPesquisar} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center' },
  campo: {
    flex: 1,
    minWidth: 0,
    height: BOTAO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.four,
    paddingRight: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: JakartaFamilies[500],
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  limpar: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaBotao: {
    height: BOTAO,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});
