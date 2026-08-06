import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <ThemedText type="small" themeColor="textSecondary">
          {subtitulo}
        </ThemedText>
      )}
    </View>
  );

  const corpo = (
    <View style={styles.conteudo}>
      {cabecalho}
      {children}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rolagem: {
    flexGrow: 1,
    // Folga no fim para o último item não ficar embaixo da barra de abas.
    paddingBottom: Spacing.six,
  },
  conteudo: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  cabecalho: {
    gap: Spacing.one,
  },
  tituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titulo: {
    flexShrink: 1,
  },
});
