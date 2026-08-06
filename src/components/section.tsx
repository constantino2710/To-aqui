import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type SectionProps = {
  titulo: string;
  /** Contador ao lado do título, por exemplo a quantidade de itens. */
  contagem?: number;
  children: ReactNode;
};

export function Section({ titulo, contagem, children }: SectionProps) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {titulo.toUpperCase()}
        {contagem !== undefined ? ` · ${contagem}` : ''}
      </ThemedText>
      <View style={styles.itens}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.two,
  },
  itens: {
    gap: Spacing.two,
  },
});
