import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { EstadoAsync } from '@/hooks/use-dados-async';

export type AsyncContentProps<T> = {
  estado: EstadoAsync<T>;
  children: (dados: T) => ReactNode;
};

/**
 * Traduz o estado de um carregamento em tela: girando, erro com botão de tentar
 * de novo, ou o conteúdo. Sem isto, cada tela reescreveria os mesmos três `if` —
 * e a que esquecesse o do erro ficaria eternamente em branco quando a rede caísse.
 */
export function AsyncContent<T>({ estado, children }: AsyncContentProps<T>) {
  if (estado.carregando && estado.dados === null) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator />
      </View>
    );
  }

  if (estado.erro && estado.dados === null) {
    return (
      <View style={styles.centro}>
        <ThemedText type="small" themeColor="danger" style={styles.mensagem}>
          {estado.erro}
        </ThemedText>
        <SecondaryButton label="Tentar de novo" onPress={estado.recarregar} />
      </View>
    );
  }

  if (estado.dados === null) return null;

  return <>{children(estado.dados)}</>;
}

const styles = StyleSheet.create({
  centro: {
    paddingVertical: Spacing.five,
    gap: Spacing.three,
    alignItems: 'center',
  },
  mensagem: {
    textAlign: 'center',
  },
});
