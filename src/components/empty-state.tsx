import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  icone: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  descricao: string;
  /** Botão de saída: um estado vazio sem caminho adiante é um beco sem saída. */
  acao?: ReactNode;
};

export function EmptyState({ icone, titulo, descricao, acao }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icone} size={44} color={theme.textSecondary} />
      <View style={styles.textos}>
        <ThemedText type="smallBold">{titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.descricao}>
          {descricao}
        </ThemedText>
      </View>
      {acao && <View style={styles.acao}>{acao}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  textos: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  descricao: {
    textAlign: 'center',
  },
  acao: {
    alignSelf: 'stretch',
  },
});
