import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { emailRedirectTo } from '@/lib/auth';
import { traduzErroAuth } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const MINIMO_SENHA = 6;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const podeEnviar = email.trim().length > 0 && senha.length >= MINIMO_SENHA;

  async function cadastrar() {
    setEnviando(true);
    setErro(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo },
    });

    setEnviando(false);

    if (error) {
      setErro(traduzErroAuth(error.message));
      return;
    }

    // O Supabase não revela se um e-mail já existe (proteção contra enumeração
    // de contas): em vez de erro, devolve um usuário com `identities` vazio.
    if (data.user && data.user.identities?.length === 0) {
      setErro('Esse e-mail já está cadastrado. Tente entrar.');
      return;
    }

    // Este projeto exige confirmação de e-mail, então `data.session` vem nulo e
    // não há para onde navegar: a pessoa precisa abrir o link da caixa de entrada.
    setEnviado(true);
  }

  if (enviado) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.content}>
              <ThemedText type="subtitle">Confirme seu e-mail</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Enviamos um link de confirmação para{' '}
                <ThemedText type="smallBold">{email.trim()}</ThemedText>. Abra esse link para
                ativar sua conta — só depois disso o login funciona.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Se abrir o link neste mesmo aparelho, o app entra sozinho. Caso contrário, volte
                aqui e faça login normalmente.
              </ThemedText>

              <Link href="/login" asChild>
                <View>
                  <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
                </View>
              </Link>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
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
                <ThemedText type="subtitle">Criar conta</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Você vai receber um e-mail para confirmar o cadastro.
                </ThemedText>
              </View>

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
                  placeholder={`Mínimo de ${MINIMO_SENHA} caracteres`}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  secureTextEntry
                  textContentType="newPassword"
                  onSubmitEditing={() => podeEnviar && cadastrar()}
                  returnKeyType="go"
                />
              </View>

              {erro && (
                <ThemedText type="small" style={styles.erro}>
                  {erro}
                </ThemedText>
              )}

              <PrimaryButton
                label="Criar conta"
                onPress={cadastrar}
                loading={enviando}
                disabled={!podeEnviar}
              />

              <View style={styles.rodape}>
                <ThemedText type="small" themeColor="textSecondary">
                  Já tem conta?
                </ThemedText>
                <Link href="/login">
                  <ThemedText type="linkPrimary">Entrar</ThemedText>
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
  erro: {
    color: '#e5484d',
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
