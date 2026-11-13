import { ActivityIndicator, StyleSheet } from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { PressableScale } from '@/components/pressable-scale';
import { Palette, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconButtonProps = {
  icone: NomeIcone;
  onPress: () => void;
  /** Obrigatório: botão só de ícone precisa de nome para leitores de tela. */
  rotulo: string;
  /**
   * - `escuro`: círculo grafite, ícone claro (voltar, buscar, +)
   * - `claro`: círculo branco, ícone escuro (editar nome)
   * - `contorno`: só contorno cinza (fechar, configurar)
   * - `perigo`: contorno vermelho (recusar)
   * - `vidro`: grafite translúcido, para cartões coloridos (ingresso da tag)
   */
  variante?: 'escuro' | 'claro' | 'contorno' | 'perigo' | 'vidro';
  /** Diâmetro: 48 (padrão), 44 ou 56 (busca). */
  tamanho?: 44 | 48 | 56;
  loading?: boolean;
  disabled?: boolean;
};

/** Botão redondo só com ícone. */
export function IconButton({
  icone,
  onPress,
  rotulo,
  variante = 'escuro',
  tamanho = 48,
  loading = false,
  disabled = false,
}: IconButtonProps) {
  const theme = useTheme();
  const inativo = disabled || loading;

  const fundo =
    variante === 'escuro'
      ? theme.action
      : variante === 'claro'
        ? theme.backgroundElement
        : variante === 'vidro'
          ? Palette.graphiteGlass
          : 'transparent';
  const cor =
    variante === 'escuro'
      ? theme.onAction
      : variante === 'perigo'
        ? theme.danger
        : variante === 'vidro'
          ? Palette.graphite
          : theme.text;
  const borda = variante === 'perigo' ? theme.danger : variante === 'contorno' ? theme.border : undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: inativo, busy: loading }}
      disabled={inativo}
      onPress={onPress}
      externo={styles.externo}
      style={[
        styles.circulo,
        { width: tamanho, height: tamanho, backgroundColor: fundo },
        borda ? { borderWidth: 1.5, borderColor: borda } : undefined,
        inativo && styles.inativo,
      ]}>
      {loading ? (
        <ActivityIndicator color={cor} size="small" />
      ) : (
        <Icone nome={icone} tamanho={tamanho === 56 ? 22 : 20} cor={cor} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  externo: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  circulo: {
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inativo: {
    opacity: 0.4,
  },
});
