import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ComponentProps } from 'react';
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

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { FontSize, JakartaFamilies, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';

export type IconFieldStatus = {
  /** Texto curto (ex.: "Disponível", "Verificando…", "Já está em uso"). */
  texto: string;
  /** `ok` = verde com check; `erro` = vermelho; `neutro` = cinza. */
  tom: 'ok' | 'erro' | 'neutro';
};

export type IconFieldProps = TextInputProps & {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** `true` quando o campo está dentro de um Card branco: ele passa a ser cinza. */
  sobreCartao?: boolean;
  /** Selo sobre a borda superior direita, como um rótulo flutuante. */
  status?: IconFieldStatus;
};

// No navegador, o <input> ganha um anel de foco próprio por dentro da pílula.
// O foco já é indicado pela borda verde da pílula, então removemos esse anel.
const semAnelDoNavegador = (Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}) as TextStyle;

/**
 * Campo no padrão Sálvia: pílula, ícone solto à esquerda e rótulo dentro do
 * campo, acima do valor. Em foco, a pílula ganha borda verde e o ícone e o
 * rótulo ficam na cor da marca. `status` mostra um selo curto sobre a borda.
 */
export function IconField({
  label,
  icon,
  sobreCartao = false,
  status,
  style,
  onFocus,
  onBlur,
  ...rest
}: IconFieldProps) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const [focado, setFocado] = useState(false);
  const [input, setInput] = useState<TextInput | null>(null);

  const fundoCampo = sobreCartao ? theme.background : theme.backgroundElement;
  const fundoPagina = sobreCartao ? theme.backgroundElement : theme.background;

  const erro = status?.tom === 'erro';
  const ok = status?.tom === 'ok';
  const destacado = focado || ok;

  // A borda aparece com fade (foco, "ok" ou erro) em vez de surgir de uma vez.
  const forte = erro || destacado;
  const corBordaForte = erro ? theme.danger : theme.gradientFrom;
  const [destaque] = useState(() => new Animated.Value(forte ? 1 : 0));
  useEffect(() => {
    if (reduzido) {
      destaque.setValue(forte ? 1 : 0);
      return;
    }
    const animacao = Animated.timing(destaque, {
      toValue: forte ? 1 : 0,
      duration: Motion.rapido,
      easing: Motion.suave,
      useNativeDriver: false, // cor de borda não roda no thread nativo
    });
    animacao.start();
    return () => animacao.stop();
  }, [forte, reduzido, destaque]);
  const corBorda = destaque.interpolate({ inputRange: [0, 1], outputRange: [fundoCampo, corBordaForte] });
  const corDestaque = erro ? theme.danger : destacado ? theme.brand : theme.textSecondary;
  const corStatus = status?.tom === 'erro' ? theme.danger : status?.tom === 'ok' ? theme.brand : theme.textSecondary;

  return (
    <Pressable onPress={() => input?.focus()} accessible={false}>
     <Animated.View style={[styles.caixa, { backgroundColor: fundoCampo, borderColor: corBorda }]}>
      <View style={styles.icone}>
        <Ionicons name={icon} size={20} color={corDestaque} />
      </View>
      <View style={styles.textos}>
        <ThemedText style={[styles.rotulo, { color: corDestaque }]}>{label}</ThemedText>
        <TextInput
          ref={setInput}
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          style={[styles.input, semAnelDoNavegador, { color: theme.text }, style]}
          {...rest}
        />
      </View>

      {status && (
        <View style={styles.selo} accessibilityLiveRegion="polite">
          {/* Fundo em duas cores, divididas na linha da borda: cinza (tela) por
              cima e a cor do campo por baixo. Assim o selo "corta" a borda. */}
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, backgroundColor: fundoPagina }} />
            <View style={{ flex: 1, backgroundColor: fundoCampo }} />
          </View>
          {ok && <Ionicons name="checkmark" size={14} color={corStatus} />}
          <ThemedText style={[styles.seloTexto, { color: corStatus }]}>{status.texto}</ThemedText>
        </View>
      )}
     </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caixa: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  icone: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.two,
  },
  rotulo: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 500,
  },
  input: {
    fontFamily: JakartaFamilies[600],
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  // 40 de recuo: o selo fica no trecho reto da borda, longe da curva do canto.
  selo: {
    position: 'absolute',
    top: -11,
    right: Spacing.five + Spacing.two,
    height: LineHeight.small,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  seloTexto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
});
