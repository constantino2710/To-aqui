import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { emailRedirectTo } from '@/lib/auth';
import { traduzErroAuth } from '@/lib/auth-errors';
import {
  USERNAME_REGEX,
  apenasDigitos,
  formatarTelefone,
  validarNomeCompleto,
  validarTelefone,
  validarUsername,
} from '@/lib/profile-validation';
import { supabase } from '@/lib/supabase';

const MINIMO_SENHA = 6;

/** Estados possíveis da checagem de nome de usuário contra o banco. */
type StatusUsername = 'vazio' | 'invalido' | 'checando' | 'livre' | 'ocupado' | 'indisponivel';

export default function SignupScreen() {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [statusUsername, setStatusUsername] = useState<StatusUsername>('vazio');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // O nome de usuário é o único campo que a tela não consegue validar sozinha:
  // formato ela confere, mas "já existe?" só o banco sabe. Sem esta checagem, a
  // pessoa preenche tudo, envia, e recebe um erro genérico do GoTrue sem
  // entender qual campo estava errado.
  useEffect(() => {
    const valor = username.trim();

    if (!valor) {
      setStatusUsername('vazio');
      return;
    }
    if (!USERNAME_REGEX.test(valor)) {
      setStatusUsername('invalido');
      return;
    }

    setStatusUsername('checando');
    let cancelado = false;

    // Espera a pessoa parar de digitar: sem isso é uma ida ao servidor por tecla.
    const temporizador = setTimeout(async () => {
      const { data, error } = await supabase.rpc('is_username_available', {
        p_username: valor,
      });

      if (cancelado) return;
      // Falha de rede não pode travar o cadastro. Deixa passar e o banco decide
      // na hora do envio — ele é quem garante a unicidade de qualquer jeito.
      setStatusUsername(error ? 'indisponivel' : data ? 'livre' : 'ocupado');
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [username]);

  const podeEnviar =
    validarNomeCompleto(nomeCompleto) === null &&
    validarUsername(username) === null &&
    validarTelefone(telefone) === null &&
    email.trim().length > 0 &&
    senha.length >= MINIMO_SENHA &&
    statusUsername !== 'ocupado' &&
    statusUsername !== 'checando';

  async function cadastrar() {
    const primeiroErro =
      validarNomeCompleto(nomeCompleto) ?? validarUsername(username) ?? validarTelefone(telefone);

    if (primeiroErro) {
      setErro(primeiroErro);
      return;
    }

    setEnviando(true);
    setErro(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo,
        // Vai para raw_user_meta_data, que o gatilho on_auth_user_created lê
        // para montar o perfil. O telefone segue só com dígitos: quem coloca o
        // +55 e valida o formato final é o banco, num lugar só.
        data: {
          username: username.trim(),
          full_name: nomeCompleto.trim(),
          phone: apenasDigitos(telefone),
        },
      },
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
                  Precisamos do seu nome e telefone para que os outros responsáveis da sua
                  família saibam com quem estão falando. A foto fica para depois.
                </ThemedText>
              </View>

              <View style={styles.formulario}>
                <TextField
                  label="Nome completo"
                  value={nomeCompleto}
                  onChangeText={setNomeCompleto}
                  placeholder="Como você quer ser chamado"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  maxLength={80}
                />

                <View style={styles.campoComAviso}>
                  <TextField
                    label="Nome de usuário"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="joao.silva"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    maxLength={30}
                  />
                  <AvisoUsername status={statusUsername} />
                </View>

                <TextField
                  label="Telefone"
                  value={telefone}
                  onChangeText={(texto) => setTelefone(formatarTelefone(texto))}
                  placeholder="(81) 99999-8888"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  inputMode="tel"
                  textContentType="telephoneNumber"
                  maxLength={16}
                />

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
                <ThemedText type="small" themeColor="danger">
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

function AvisoUsername({ status }: { status: StatusUsername }) {
  if (status === 'vazio' || status === 'indisponivel') return null;

  if (status === 'invalido') {
    return (
      <ThemedText type="small" themeColor="danger">
        Use de 3 a 30 caracteres: letras, números, ponto e underline.
      </ThemedText>
    );
  }

  if (status === 'checando') {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Verificando…
      </ThemedText>
    );
  }

  if (status === 'ocupado') {
    return (
      <ThemedText type="small" themeColor="danger">
        Já está em uso. Escolha outro.
      </ThemedText>
    );
  }

  return (
    <ThemedText type="small" themeColor="success">
      Disponível.
    </ThemedText>
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
  campoComAviso: {
    gap: Spacing.one,
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
