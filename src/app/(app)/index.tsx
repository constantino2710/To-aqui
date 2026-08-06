import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { session } = useAuth();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    // Não navegamos daqui: ao limpar a sessão, o Stack.Protected do layout raiz
    // devolve a pessoa para o grupo (auth) sozinho.
    await supabase.auth.signOut();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.cabecalho}>
            <ThemedText type="subtitle">Olá</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Você está logado como
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.cartao}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              E-mail
            </ThemedText>
            <ThemedText selectable>{session?.user.email ?? '—'}</ThemedText>
          </ThemedView>

          <PrimaryButton label="Sair" onPress={sair} loading={saindo} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  cabecalho: {
    gap: Spacing.one,
  },
  cartao: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
