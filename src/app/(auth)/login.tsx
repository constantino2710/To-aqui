import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.cabecalho}>
                <ThemedText type="subtitle">Entrar</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Use seu e-mail e senha para acessar.
                </ThemedText>
              </View>

              {confirmError && (
                <ThemedView type="backgroundElement" style={styles.aviso}>
                  <ThemedText type="small">{confirmError}</ThemedText>
                </ThemedView>
              )}

              <View style={styles.formulario}>
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
              </View>

              {erro && (
                <ThemedText type="small" themeColor="danger">
                  {erro}
                </ThemedText>
              )}

              <PrimaryButton
                label="Entrar"
                onPress={entrar}
                loading={enviando}
                disabled={!podeEnviar}
              />

              <View style={styles.rodape}>
                <ThemedText type="small" themeColor="textSecondary">
                  Ainda não tem conta?
                </ThemedText>
                <Link href="/signup">
                  <ThemedText type="linkPrimary">Cadastre-se</ThemedText>
                </Link>
              </View>
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
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  cabecalho: {
    gap: Spacing.one,
  },
  formulario: {
    gap: Spacing.three,
  },
  aviso: {
    borderRadius: Radii.medium,
    padding: Spacing.three,
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
