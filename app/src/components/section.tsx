import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type SectionProps = {
  titulo: string;
  /** Contador ao lado do título, por exemplo a quantidade de itens. */
  contagem?: number;
  /** Botão encostado à direita do título (ex.: "+" para cadastrar). */
  acao?: ReactNode;
  children: ReactNode;
};

/** Bloco da tela: título em 18/700, 8 px até os itens, 8 px entre os itens. */
export function Section({ titulo, contagem, acao, children }: SectionProps) {
  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <ThemedText type="large" accessibilityRole="header" style={styles.titulo}>
          {titulo}
          {contagem !== undefined ? ` · ${contagem}` : ''}
        </ThemedText>
        {acao}
      </View>
      <View style={styles.itens}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.two,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  titulo: {
    flexShrink: 1,
    fontWeight: 700,
  },
  itens: {
    gap: Spacing.two,
  },
});
