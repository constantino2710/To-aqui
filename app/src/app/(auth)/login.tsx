import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconField } from '@/components/icon-field';
import { useIndicadorRolagem } from '@/components/indicador-rolagem';
import { LocationHero } from '@/components/location-hero';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { traduzErroAuth } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { confirmError } = useAuth();
  const { propsRolagem, indicador } = useIndicadorRolagem();
  const [email, setEmail] = useState('');
  const campoSenha = useRef<TextInput>(null);
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
        {/* iOS: a rolagem abre espaço para o teclado e mostra o campo em foco.
            Android: a janela encolhe (softwareKeyboardLayoutMode: resize). */}
        <View style={styles.container}>
          <ScrollView
            {...propsRolagem}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive">
            <View style={styles.content}>
              <LocationHero marca />

              <View style={styles.titulos}>
                <ThemedText type="subtitle">Bem-vindo de volta</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.apoio}>
                  Entre para acompanhar sua família no Found.
                </ThemedText>
              </View>

              {confirmError && (
                <ThemedView type="backgroundSelected" style={styles.aviso}>
                  <ThemedText type="small">{confirmError}</ThemedText>
                </ThemedView>
              )}

              <View style={styles.formulario}>
                <IconField
                  label="E-mail"
                  icon="mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="voce@exemplo.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => campoSenha.current?.focus()}
                />

                <IconField
                  ref={campoSenha}
                  label="Senha"
                  icon="lock"
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
                  <ThemedText type="small" themeColor="danger" style={styles.erro}>
                    {erro}
                  </ThemedText>
                )}

                <View style={styles.acao}>
                  <PrimaryButton label="Entrar" onPress={entrar} loading={enviando} disabled={!podeEnviar} />
                </View>
              </View>

              <View style={styles.rodape}>
                <ThemedText type="small" themeColor="textSecondary">
                  Ainda não tem conta?
                </ThemedText>
                <Link href="/signup">
                  <ThemedText type="small" themeColor="brand" style={styles.link}>
                    Cadastre-se
                  </ThemedText>
                </Link>
              </View>
            </View>
          </ScrollView>
          {indicador}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Ritmo vertical: 24 entre os blocos (mapa, títulos, formulário, rodapé),
  // 8 entre itens do mesmo grupo (título/apoio, campo/campo).
  scroll: {
    flexGrow: 1,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  titulos: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  apoio: {
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    fontWeight: 400,
  },
  aviso: {
    padding: Spacing.three,
    borderRadius: Radii.medium,
  },
  formulario: {
    gap: Spacing.two,
  },
  erro: {
    paddingHorizontal: Spacing.two,
  },
  // 8 do gap + 8 aqui = 16 entre o último campo e o botão.
  acao: {
    marginTop: Spacing.two,
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  link: {
    fontWeight: 700,
  },
});
