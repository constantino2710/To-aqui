import { ActivityIndicator, StyleSheet } from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ActionPillProps = {
  label: string;
  onPress: () => void;
  /**
   * - `escuro`: preenchido grafite (Adicionar, Aceitar, Convidar)
   * - `contorno`: só contorno grafite (Editar)
   * - `suave`: verde suave (Selecionado)
   */
  variante?: 'escuro' | 'contorno' | 'suave';
  icone?: NomeIcone;
  loading?: boolean;
  disabled?: boolean;
  /** 48 (padrão, dentro de linhas de pessoa) ou 44 (ao lado de títulos). */
  altura?: 44 | 48;
  /** Largura fixa, para o botão não mudar de tamanho quando o rótulo troca. */
  largura?: number;
  accessibilityLabel?: string;
};

/**
 * Botão compacto em pílula, para ações dentro de linhas e cartões. Para a ação
 * principal da tela use `PrimaryButton`; para botões só de ícone, `IconButton`.
 */
export function ActionPill({
  label,
  onPress,
  variante = 'escuro',
  icone,
  loading = false,
  disabled = false,
  altura = 48,
  largura,
  accessibilityLabel,
}: ActionPillProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  const fundo =
    variante === 'escuro'
      ? theme.action
      : variante === 'suave'
        ? theme.brandSoft
        : 'transparent';
  const cor =
    variante === 'escuro'
      ? theme.onAction
      : variante === 'suave'
        ? theme.brand
        : theme.action;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inativo, busy: loading }}
      disabled={inativo}
      onPress={onPress}
      externo={styles.externo}
      style={[
        styles.pilula,
        { height: altura, backgroundColor: fundo },
        largura != null && { width: largura, paddingHorizontal: 0, justifyContent: 'center' },
        // Contorno suave (o mesmo dos botões redondos): o texto grafite já dá o peso.
        variante === 'contorno' && { borderWidth: 1.5, borderColor: theme.border },
        inativo && styles.inativo,
      ]}>
      {loading ? (
        <ActivityIndicator color={cor} size="small" />
      ) : (
        <>
          {icone && <Icone nome={icone} tamanho={18} cor={cor} />}
          <ThemedText style={[styles.texto, { color: cor }]}>{label}</ThemedText>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  externo: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three + Spacing.one,
    borderRadius: Radii.pill,
  },
  texto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
  inativo: {
    opacity: 0.4,
  },
});
