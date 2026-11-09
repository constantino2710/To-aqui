import { Children, isValidElement, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Entrada } from '@/components/entrada';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  titulo?: string;
  subtitulo?: string;
  /** Encostado à direita do título — normalmente um botão de ação. */
  acao?: ReactNode;
  children: ReactNode;
  /** Passar habilita o "puxar para atualizar". */
  aoAtualizar?: () => void;
  atualizando?: boolean;
  /** Para telas que gerenciam a própria rolagem (uma FlatList, por exemplo). */
  semRolagem?: boolean;
  /** Botão flutuante opcional, fixo sobre o conteúdo (ver componente `Fab`). */
  fab?: ReactNode;
};

/**
 * Andaime comum de todas as telas: fundo do tema, área segura, largura máxima,
 * cabeçalho e "puxar para atualizar". Existe para nenhuma tela precisar repetir
 * esse bloco de layout — e para todas ficarem alinhadas quando ele mudar.
 */
export function Screen({
  titulo,
  subtitulo,
  acao,
  children,
  aoAtualizar,
  atualizando = false,
  semRolagem = false,
  fab,
}: ScreenProps) {
  const theme = useTheme();

  const cabecalho = (titulo || subtitulo) && (
    <View style={styles.cabecalho}>
      <View style={styles.tituloLinha}>
        <ThemedText type="subtitle" style={styles.titulo}>
          {titulo}
        </ThemedText>
        {acao}
      </View>
      {subtitulo && (
        <ThemedText themeColor="textSecondary" style={styles.subtitulo}>
          {subtitulo}
        </ThemedText>
      )}
    </View>
  );

  // Cada bloco entra com fade + leve deslize, um depois do outro. Em telas que
  // gerenciam a própria rolagem (FlatList) os filhos ficam como estão, porque
  // envolvê-los quebraria o `flex: 1` deles.
  const blocos = semRolagem
    ? children
    : Children.toArray(children).map((filho, i) => (
        <Entrada key={isValidElement(filho) && filho.key != null ? filho.key : i} indice={i + 1}>
          {filho}
        </Entrada>
      ));

  const corpo = (
    <View style={styles.conteudo}>
      {cabecalho && <Entrada indice={0}>{cabecalho}</Entrada>}
      {blocos}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {semRolagem ? (
          corpo
        ) : (
          <ScrollView
            contentContainerStyle={styles.rolagem}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              aoAtualizar ? (
                <RefreshControl
                  refreshing={atualizando}
                  onRefresh={aoAtualizar}
                  tintColor={theme.textSecondary}
                />
              ) : undefined
            }>
            {corpo}
          </ScrollView>
        )}
      </SafeAreaView>
      {fab}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rolagem: {
    flexGrow: 1,
    // A barra de abas fica no fluxo (abaixo do conteúdo), então só sobra respiro.
    paddingBottom: Spacing.four,
  },
  conteudo: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  // Ritmo: 24 entre o cabeçalho e os blocos (gap de `conteudo`), 8 entre título
  // e subtítulo, e 8 de recuo lateral para alinhar com a curva das pílulas.
  cabecalho: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  tituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titulo: {
    flexShrink: 1,
  },
  subtitulo: {
    fontWeight: 400,
  },
});
