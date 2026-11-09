import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { EscalaToque } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PersonRowProps = {
  nome: string;
  username: string;
  /** Id do perfil: mantém a cor do avatar estável mesmo se a pessoa mudar de nome. */
  semente?: string;
  /** Substitui a linha do @username quando você precisa dizer outra coisa. */
  detalhe?: string;
  /** Botões ou selo encostados à direita. */
  direita?: ReactNode;
  /**
   * `true` quando `direita` é só texto/ícone (sem botão). A pílula tem 8 px de
   * folga nas pontas, que combina com botões de 48 px; texto solto precisa de
   * mais respiro.
   */
  direitaSolta?: boolean;
  onPress?: () => void;
};

/**
 * Uma pessoa numa lista: pílula de 64 px com avatar de 48 e folga de 8 px nos
 * quatro lados, então avatar e botão ficam concêntricos com as pontas.
 */
export function PersonRow({
  nome,
  username,
  semente,
  detalhe,
  direita,
  direitaSolta = false,
  onPress,
}: PersonRowProps) {
  const theme = useTheme();

  const linha = (
    <View style={[styles.linha, { backgroundColor: theme.backgroundElement }]}>
      <Avatar nome={nome} semente={semente} tamanho={48} />

      <View style={styles.textos}>
        <ThemedText style={styles.nome} numberOfLines={1}>
          {nome}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {detalhe ?? `@${username}`}
        </ThemedText>
      </View>

      {direita && (
        <View style={[styles.direita, direitaSolta && styles.direitaSolta]}>{direita}</View>
      )}
    </View>
  );

  if (!onPress) return linha;

  return (
    <PressableScale accessibilityRole="button" onPress={onPress} escala={EscalaToque.cartao}>
      {linha}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  linha: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radii.pill,
  },
  textos: {
    flex: 1,
    minWidth: 0,
  },
  nome: {
    fontWeight: 700,
  },
  direita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  direitaSolta: {
    paddingRight: Spacing.three,
  },
});
