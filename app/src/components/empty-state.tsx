import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  icone: NomeIcone;
  titulo: string;
  descricao: string;
  /** Botão de saída: um estado vazio sem caminho adiante é um beco sem saída. */
  acao?: ReactNode;
};

export function EmptyState({ icone, titulo, descricao, acao }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.circulo, { backgroundColor: theme.brandSoft }]}>
        <View style={[styles.anel, { borderColor: theme.gradientFrom }]} />
        <Icone nome={icone} tamanho={48} cor={theme.brand} />
      </View>
      <View style={styles.textos}>
        <ThemedText type="large" style={styles.titulo}>
          {titulo}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.descricao}>
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
    gap: Spacing.four,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  circulo: {
    width: 112,
    height: 112,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Anel decorativo ao redor do círculo, no mesmo tom da marca.
  anel: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    opacity: 0.25,
  },
  textos: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  titulo: {
    fontWeight: 700,
    textAlign: 'center',
  },
  descricao: {
    textAlign: 'center',
    fontWeight: 400,
  },
  acao: {
    alignSelf: 'stretch',
  },
});
