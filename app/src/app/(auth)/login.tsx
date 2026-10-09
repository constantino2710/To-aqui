import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { DevAccountSwitcher } from '@/components/dev-account-switcher';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { traduzErroAuth } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { confirmError } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeEnviar = email.trim().length > 0 && senha.length > 0;

  async function entrar() {
    setEnviando(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    // No sucesso não navegamos daqui: o Stack.Protected do layout raiz troca de
    // grupo sozinho assim que o onAuthStateChange dispara.
    if (error) {
      setErro(traduzErroAuth(error.message));
      setEnviando(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.cabecalho}>
                <Image
                  source={require('@/assets/images/found-logo-v2.png')}
                  style={styles.marca}
                  contentFit="contain"
                  accessibilityLabel="Found"
                />
                <View style={styles.titulos}>
                  <ThemedText type="subtitle">Bem-vindo de volta</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Entre para acompanhar sua família no Found.
                  </ThemedText>
                </View>
              </View>

              {confirmError && (
                <ThemedView type="backgroundSelected" style={styles.aviso}>
                  <ThemedText type="small">{confirmError}</ThemedText>
                </ThemedView>
              )}

              <Card style={styles.card}>
                <TextField
                  label="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="voce@exemplo.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  textContentType="emailAddress"
                />

                <TextField
                  label="Senha"
                  value={senha}
                  onChangeText={setSenha}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  secureTextEntry
                  textContentType="password"
                  onSubmitEditing={() => podeEnviar && entrar()}
                  returnKeyType="go"
                />

                {erro && (
                  <ThemedText type="small" themeColor="danger">
                    {erro}
                  </ThemedText>
                )}

                <PrimaryButton label="Entrar" onPress={entrar} loading={enviando} disabled={!podeEnviar} />
              </Card>

              <View style={styles.rodape}>
                <ThemedText type="small" themeColor="textSecondary">
                  Ainda não tem conta?
                </ThemedText>
                <Link href="/signup">
                  <ThemedText type="linkPrimary">Cadastre-se</ThemedText>
                </Link>
              </View>

              <DevAccountSwitcher label="Trocar de conta" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  cabecalho: {
    gap: Spacing.three,
  },
  marca: {
    width: 64,
    height: 64,
  },
  titulos: {
    gap: Spacing.one,
  },
  aviso: {
    padding: Spacing.three,
    borderRadius: Radii.medium,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
