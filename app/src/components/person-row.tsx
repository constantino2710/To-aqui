import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type PersonRowProps = {
  nome: string;
  username: string;
  /** Id do perfil: mantém a cor do avatar estável mesmo se a pessoa mudar de nome. */
  semente?: string;
  /** Substitui a linha do @username quando você precisa dizer outra coisa. */
  detalhe?: string;
  /** Botões ou selo encostados à direita. */
  direita?: ReactNode;
  onPress?: () => void;
};

/** Uma pessoa numa lista: avatar, nome, @username e uma área de ação à direita. */
export function PersonRow({
  nome,
  username,
  semente,
  detalhe,
  direita,
  onPress,
}: PersonRowProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.linha}>
        <Avatar nome={nome} semente={semente} />

        <View style={styles.textos}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {nome}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detalhe ?? `@${username}`}
          </ThemedText>
        </View>

        {direita && <View style={styles.direita}>{direita}</View>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textos: {
    flex: 1,
    gap: 1,
  },
  direita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
