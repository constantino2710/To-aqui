import { useEffect, useId, useState, type Ref } from 'react';
import {
  Animated,
  InputAccessoryView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { FundoCartao } from '@/components/card';
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
  icon: NomeIcone;
  /** `true` quando o campo está dentro de um Card branco: ele passa a ser cinza. */
  sobreCartao?: boolean;
  /** Selo sobre a borda superior direita, como um rótulo flutuante. */
  status?: IconFieldStatus;
  /** Referência ao campo (para o anterior chamar `focus()` neste ao tocar "Próximo"). */
  ref?: Ref<TextInput>;
};

// Teclados numéricos do iOS não têm tecla de retorno: sem uma barra extra, não
// haveria como avançar para o próximo campo pelo teclado.
const TECLADOS_SEM_RETORNO = new Set(['phone-pad', 'number-pad', 'decimal-pad', 'numeric']);

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
  ref,
  ...rest
}: IconFieldProps) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const [focado, setFocado] = useState(false);
  const [input, setInput] = useState<TextInput | null>(null);
  const idAcessorio = `campo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const precisaBarra =
    Platform.OS === 'ios' && !!rest.onSubmitEditing && TECLADOS_SEM_RETORNO.has(rest.keyboardType ?? '');
  const rotuloBarra = rest.returnKeyType === 'next' ? 'Próximo' : 'Concluir';

  // Guarda a referência interna (tocar na pílula foca o campo) e repassa a externa.
  const guardarRef = (no: TextInput | null) => {
    setInput(no);
    if (typeof ref === 'function') ref(no);
    else if (ref) (ref as { current: TextInput | null }).current = no;
  };

  const fundoCampo = sobreCartao ? theme.background : theme.backgroundElement;
  const fundoPagina = sobreCartao ? theme.backgroundElement : theme.background;

  const erro = status?.tom === 'erro';
  const ok = status?.tom === 'ok';
  const destacado = focado || ok;

  // A borda aparece com fade (foco, "ok" ou erro) em vez de surgir de uma vez.
  const forte = erro || destacado;
  // Contorno suave: cor translúcida (o halo em volta completa o destaque).
  // Contorno único e suave: a cor da marca (ou do erro) translúcida, sem halo.
  const corBordaForte = erro ? `${theme.danger}A6` : `${theme.brand}80`;
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
  // Em repouso a borda é a mesma cor, transparente: só a opacidade anima.
  const corBordaRepouso = `${(erro ? theme.danger : theme.brand).slice(0, 7)}00`;
  const corBorda = destaque.interpolate({ inputRange: [0, 1], outputRange: [corBordaRepouso, corBordaForte] });
  const corDestaque = erro ? theme.danger : destacado ? theme.brand : theme.textSecondary;
  const corStatus = status?.tom === 'erro' ? theme.danger : status?.tom === 'ok' ? theme.brand : theme.textSecondary;

  return (
    <Pressable onPress={() => input?.focus()} accessible={false}>
     <Animated.View
       style={[
         styles.caixa,
         { backgroundColor: fundoCampo, borderColor: corBorda },
       ]}>
      {/* Dentro de um cartão, o campo ganha degradê próprio (outra matiz) para se destacar. */}
      {sobreCartao && (
        <View style={styles.fundoDegrade} pointerEvents="none">
          <FundoCartao de={theme.fieldGradientFrom} para={theme.fieldGradientTo} />
        </View>
      )}
      <View style={styles.icone}>
        <Icone nome={icon} tamanho={20} cor={corDestaque} />
      </View>
      <View style={styles.textos}>
        <ThemedText style={[styles.rotulo, { color: corDestaque }]}>{label}</ThemedText>
        <TextInput
          ref={guardarRef}
          accessibilityLabel={label}
          // "Próximo" leva ao campo seguinte sem fechar e reabrir o teclado.
          submitBehavior={rest.returnKeyType === 'next' ? 'submit' : undefined}
          inputAccessoryViewID={precisaBarra ? idAcessorio : undefined}
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
          {ok && <Icone nome="check" tamanho={14} cor={corStatus} />}
          <ThemedText style={[styles.seloTexto, { color: corStatus }]}>{status.texto}</ThemedText>
        </View>
      )}
     </Animated.View>

      {precisaBarra && (
        <InputAccessoryView nativeID={idAcessorio}>
          <View style={[styles.barraTeclado, { backgroundColor: theme.backgroundSelected, borderTopColor: theme.border }]}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => rest.onSubmitEditing?.({ nativeEvent: { text: String(rest.value ?? '') } } as never)}>
              <ThemedText type="smallBold" themeColor="brand">{rotuloBarra}</ThemedText>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Recortado na pílula aqui (e não na caixa), para o selo de status poder
  // continuar saindo pela borda de cima.
  fundoDegrade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  barraTeclado: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
