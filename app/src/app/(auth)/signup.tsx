import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Entrada } from '@/components/entrada';
import { FoundLogo } from '@/components/found-logo';
import { IconField, type IconFieldStatus } from '@/components/icon-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
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
    let cancelado = false;

    if (!valor) {
      const temporizador = setTimeout(() => setStatusUsername('vazio'), 0);
      return () => clearTimeout(temporizador);
    }
    if (!USERNAME_REGEX.test(valor)) {
      const temporizador = setTimeout(() => setStatusUsername('invalido'), 0);
      return () => clearTimeout(temporizador);
    }

    const indicador = setTimeout(() => {
      if (!cancelado) setStatusUsername('checando');
    }, 0);

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
      clearTimeout(indicador);
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
          <ScrollView contentContainerStyle={[styles.scroll, styles.scrollCentro]}>
            <View style={styles.content}>
              <Entrada indice={0}>
                <Card style={styles.cartaoEmail}>
                  <View style={[styles.circulo, { backgroundColor: theme.brandSoft }]}>
                    <Ionicons name="mail-outline" size={40} color={theme.brand} />
                  </View>

                  <View style={styles.titulos}>
                    <ThemedText type="subtitle" style={styles.centro}>
                      Confirme seu e-mail
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={[styles.apoio, styles.centro]}>
                      Enviamos um link de confirmação para{' '}
                      <ThemedText style={styles.negrito}>{email.trim()}</ThemedText>. Abra esse
                      link para ativar sua conta — só depois disso o login funciona.
                    </ThemedText>
                  </View>

                  <View style={[styles.dica, { backgroundColor: theme.background }]}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={theme.brand}
                      style={styles.dicaIcone}
                    />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.dicaTexto}>
                      Se abrir o link neste mesmo aparelho, o app entra sozinho. Caso contrário,
                      volte aqui e faça login normalmente.
                    </ThemedText>
                  </View>
                </Card>
              </Entrada>

              <Entrada indice={1}>
                <Link href="/login" asChild>
                  <View accessibilityRole="link" style={styles.voltar}>
                    <Ionicons name="arrow-back" size={18} color={theme.brand} />
                    <ThemedText type="linkPrimary">Voltar para o login</ThemedText>
                  </View>
                </Link>
              </Entrada>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Selo sobre a borda do campo. O formato inválido não cabe no selo: vira
  // texto de erro logo abaixo do campo.
  const seloUsername: IconFieldStatus | undefined =
    statusUsername === 'checando'
      ? { texto: 'Verificando…', tom: 'neutro' }
      : statusUsername === 'livre'
        ? { texto: 'Disponível', tom: 'ok' }
        : statusUsername === 'ocupado'
          ? { texto: 'Já está em uso', tom: 'erro' }
          : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <Entrada indice={0}>
                <FoundLogo size={40} />
              </Entrada>

              <Entrada indice={1}>
                <View style={styles.titulos}>
                  <ThemedText type="subtitle">Criar conta</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.apoio}>
                    Precisamos do seu nome e telefone para que os outros responsáveis da sua
                    família saibam com quem estão falando. A foto fica para depois.
                  </ThemedText>
                </View>
              </Entrada>

              <Entrada indice={2}>
                <View style={styles.formulario}>
                  <IconField
                    label="Nome completo"
                    icon="person-outline"
                    value={nomeCompleto}
                    onChangeText={setNomeCompleto}
                    placeholder="Como você quer ser chamado"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    maxLength={80}
                  />

                  <IconField
                    label="Nome de usuário"
                    icon="at-outline"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="joao.silva"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    maxLength={30}
                    status={seloUsername}
                  />
                  {statusUsername === 'invalido' && (
                    <ThemedText type="small" themeColor="danger" style={styles.recuo}>
                      Use de 3 a 30 caracteres: letras, números, ponto e underline.
                    </ThemedText>
                  )}

                  <IconField
                    label="Telefone"
                    icon="call-outline"
                    value={telefone}
                    onChangeText={(texto) => setTelefone(formatarTelefone(texto))}
                    placeholder="(81) 99999-8888"
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    inputMode="tel"
                    textContentType="telephoneNumber"
                    maxLength={16}
                  />

                  <IconField
                    label="E-mail"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="voce@exemplo.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    inputMode="email"
                    textContentType="emailAddress"
                  />

                  <IconField
                    label="Senha"
                    icon="lock-closed-outline"
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

                  {erro && (
                    <ThemedText type="small" themeColor="danger" style={styles.recuo}>
                      {erro}
                    </ThemedText>
                  )}

                  <View style={styles.acao}>
                    <PrimaryButton
                      label="Criar conta"
                      onPress={cadastrar}
                      loading={enviando}
                      disabled={!podeEnviar}
                    />
                  </View>
                </View>
              </Entrada>

              <Entrada indice={3}>
                <View style={styles.rodape}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Já tem conta?
                  </ThemedText>
                  <Link href="/login">
                    <ThemedText type="small" themeColor="brand" style={styles.link}>
                      Entrar
                    </ThemedText>
                  </Link>
                </View>
              </Entrada>
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
  // Ritmo vertical: 24 entre blocos, 8 entre itens do mesmo grupo.
  scroll: {
    flexGrow: 1,
    padding: Spacing.four,
  },
  scrollCentro: {
    justifyContent: 'center',
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
  formulario: {
    gap: Spacing.two,
  },
  recuo: {
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
    paddingVertical: Spacing.three,
  },
  cartaoEmail: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  circulo: {
    width: 96,
    height: 96,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    textAlign: 'center',
  },
  negrito: {
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    fontWeight: 700,
  },
  dica: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  dicaIcone: {
    marginTop: Spacing.half,
  },
  dicaTexto: {
    flex: 1,
  },
  voltar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.two,
  },
});
