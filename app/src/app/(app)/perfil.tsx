import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { ActionPill } from '@/components/action-pill';
import { AlturaAnimada } from '@/components/altura-animada';
import { AneisMarca } from '@/components/aneis-marca';
import { Badge } from '@/components/badge';
import { Card, FundoCartao } from '@/components/card';
import { JanelaAnimada } from '@/components/familia/janela-animada';
import { Entrada } from '@/components/entrada';
import { IconButton } from '@/components/icon-button';
import { IconField } from '@/components/icon-field';
import { Icone } from '@/components/icone';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { Toggle } from '@/components/toggle';
import { FontSize, JakartaFamilies, Palette, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { traduzErroBanco } from '@/lib/db-errors';
import { removerPushDoAparelho } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import { useThemePreference } from '@/lib/theme-preference';

type Perfil = {
  username: string;
  full_name: string;
  phone: string;
  friend_code: string;
};


function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function PerfilScreen() {
  const theme = useTheme();
  const { notificar } = useToast();
  const { mode, setMode } = useThemePreference();
  const { session } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [telefone, setTelefone] = useState('');
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [resumo, setResumo] = useState<{ familias: number; amigos: number } | null>(null);
  // "Próximo" no teclado leva de um campo ao outro.
  const campoUsername = useRef<TextInput>(null);
  const campoTelefone = useRef<TextInput>(null);

  async function sair() {
    setSaindo(true);
    const userId = session?.user.id;
    // Tira o aparelho dos avisos antes de sair (depois a sessão já não deixa).
    // No máximo 4 s: sem rede, a pessoa não pode ficar presa aqui.
    if (userId) {
      await Promise.race([removerPushDoAparelho(userId), new Promise((resolve) => setTimeout(resolve, 4000))]);
    }
    // "local": encerra só a sessão deste aparelho; os outros continuam logados.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setSaindo(false);
      notificar({ titulo: 'Não foi possível sair', mensagem: 'Verifique sua conexão e tente de novo.', tom: 'erro' });
      return;
    }
    // Sem sessão, o layout raiz troca para a tela de entrada sozinho.
  }

  const carregar = useCallback(async () => {
    if (!session) return;
    setCarregando(true);
    const [perfilRes, gruposRes, amizadesRes] = await Promise.all([
      supabase.from('profiles').select('username, full_name, phone, friend_code').eq('id', session.user.id).single(),
      supabase.rpc('list_my_groups'),
      supabase.rpc('list_friendships'),
    ]);
    setCarregando(false);
    // Resumo da capa: um extra, então falhas aqui só o escondem.
    if (!gruposRes.error && !amizadesRes.error) {
      const amizades = (amizadesRes.data ?? []) as { status: string }[];
      setResumo({
        familias: (gruposRes.data ?? []).length,
        amigos: amizades.filter((a) => a.status === 'aceito').length,
      });
    }
    const { data, error } = perfilRes;

    if (error) {
      notificar({ titulo: 'Não foi possível carregar seu perfil', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }

    const atual = data as Perfil;
    setPerfil(atual);
    setNome(atual.full_name);
    setUsername(atual.username);
    setTelefone(atual.phone);
  }, [notificar, session]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function copiarTag() {
    if (!perfil) return;
    try {
      await Clipboard.setStringAsync(perfil.friend_code);
      notificar({ titulo: 'Tag copiada', mensagem: 'Cole para compartilhar com seus amigos.', tom: 'sucesso' });
    } catch {
      notificar({ titulo: 'Não foi possível copiar', tom: 'erro' });
    }
  }

  function cancelarEdicao() {
    if (!perfil) return;
    setNome(perfil.full_name);
    setUsername(perfil.username);
    setTelefone(perfil.phone);
    setEditando(false);
  }

  async function salvar() {
    if (!session) return;
    setSalvando(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nome.trim(), username: username.trim(), phone: telefone.trim() })
      .eq('id', session.user.id);
    setSalvando(false);

    if (error) {
      notificar({ titulo: 'Não foi possível salvar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setEditando(false);
    await carregar();
    notificar({ titulo: 'Perfil atualizado', mensagem: 'Suas informações foram salvas.', tom: 'sucesso' });
  }

  return (
    <Screen titulo="Meu perfil" subtitulo="Seus dados e como os amigos veem você." aoAtualizar={carregar} atualizando={carregando}>
      {perfil && (
        <>
          {/* Cartão de perfil: capa em verde suave com os anéis da marca e o
              avatar sobreposto a ela, como num perfil de rede social. */}
          <Card style={styles.cartaoPerfil}>
            <View style={styles.capa}>
              <FundoCartao de={theme.brandSoft} para={theme.fieldGradientTo} />
              <AneisMarca />
            </View>
            <View style={styles.perfilCorpo}>
              <View style={[styles.avatarAnel, { borderColor: theme.backgroundElement }]}>
                <Svg width={72} height={72} viewBox="0 0 72 72" accessibilityLabel={`Avatar de ${perfil.full_name}`}>
                  <Defs>
                    <LinearGradient id="avatarVerde" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={theme.gradientFrom} />
                      <Stop offset="1" stopColor={theme.gradientTo} />
                    </LinearGradient>
                  </Defs>
                  <Circle cx="36" cy="36" r="36" fill="url(#avatarVerde)" />
                  <SvgText
                    x="36"
                    y="46"
                    textAnchor="middle"
                    fill={Palette.graphite}
                    fontSize={FontSize.heading}
                    fontFamily={JakartaFamilies[800]}>
                    {iniciais(perfil.full_name)}
                  </SvgText>
                </Svg>
              </View>
              <View style={styles.identidadeTextos}>
                <ThemedText type="large" style={styles.nome}>{perfil.full_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">@{perfil.username}</ThemedText>
              </View>
              {resumo && (
                <View style={styles.resumo}>
                  <Badge label={`${resumo.familias} ${resumo.familias === 1 ? 'família' : 'famílias'}`} tom="marca" />
                  <Badge label={`${resumo.amigos} ${resumo.amigos === 1 ? 'amigo' : 'amigos'}`} />
                </View>
              )}
            </View>
          </Card>

          <Card>
            <View style={styles.cabecalhoCard}>
              <ThemedText type="large" style={styles.tituloCard}>Informações pessoais</ThemedText>
              {/* A mesma pílula, de largura fixa, alterna entre "Editar" e "Cancelar":
                  o cabeçalho não se mexe na troca. */}
              <ActionPill
                label={editando ? 'Cancelar' : 'Editar'}
                variante="contorno"
                altura={44}
                largura={92}
                onPress={editando ? cancelarEdicao : () => setEditando(true)}
              />
            </View>

            {/* A altura do cartão desliza entre os modos; cada linha entra em sequência. */}
            <AlturaAnimada folga={Spacing.two} chave={editando ? 'editar' : 'ver'}>
              {editando ? (
                <View key="editar" style={styles.formulario}>
                  <Entrada rapida indice={0}>
                    <ThemedText type="small" themeColor="textSecondary">
                      É assim que seus amigos encontram você.
                    </ThemedText>
                  </Entrada>
                  <Entrada rapida indice={1}>
                    <IconField sobreCartao label="Nome completo" icon="user" value={nome} onChangeText={setNome} autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={80} returnKeyType="next" onSubmitEditing={() => campoUsername.current?.focus()} />
                  </Entrada>
                  <Entrada rapida indice={2}>
                    <IconField ref={campoUsername} sobreCartao label="Nome de usuário" icon="at-sign" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={30} returnKeyType="next" onSubmitEditing={() => campoTelefone.current?.focus()} />
                  </Entrada>
                  <Entrada rapida indice={3}>
                    <IconField ref={campoTelefone} sobreCartao label="Telefone" icon="phone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" placeholder="(81) 99999-8888" returnKeyType="done" onSubmitEditing={() => void salvar()} />
                  </Entrada>
                  <Entrada rapida indice={4}>
                    <View style={styles.acoes}>
                      <PrimaryButton label="Salvar alterações" onPress={salvar} loading={salvando} />
                    </View>
                  </Entrada>
                </View>
              ) : (
                <View key="ver" style={styles.dados}>
                  <Entrada rapida indice={0}><Campo label="E-mail" valor={session?.user.email ?? '—'} /></Entrada>
                  <Entrada rapida indice={1}><Campo label="Telefone" valor={perfil.phone} /></Entrada>
                  <Entrada rapida indice={2}><Campo label="Username" valor={`@${perfil.username}`} /></Entrada>
                  <Entrada rapida indice={3}>
                    <Campo
                      label="Tag de amizade"
                      valor={perfil.friend_code}
                      acao={
                        <IconButton
                          icone="copy"
                          rotulo={`Copiar tag de amizade ${perfil.friend_code}`}
                          variante="contorno"
                          tamanho={44}
                          onPress={copiarTag}
                        />
                      }
                    />
                  </Entrada>
                </View>
              )}
            </AlturaAnimada>
          </Card>

          <Card>
            <View style={styles.temaLinha}>
              <View style={styles.temaTextos}>
                <ThemedText type="smallBold">Tema claro</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Use o fundo claro e verde do aplicativo.
                </ThemedText>
              </View>
              <Toggle
                accessibilityLabel="Ativar tema claro"
                value={mode === 'light'}
                onValueChange={(claro) => setMode(claro ? 'light' : 'dark')}
              />
            </View>
          </Card>
        </>
      )}

      {perfil && (
        // Cartão e confirmação juntos: a janela não ocupa um espaço próprio na lista.
        <View>
          <Card onPress={() => setConfirmandoSaida(true)}>
            <View style={styles.temaLinha}>
              <View style={styles.temaTextos}>
                <ThemedText type="smallBold">Sair da conta</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Encerra a sessão neste aparelho.
                </ThemedText>
              </View>
              <View style={[styles.sairIcone, { backgroundColor: theme.backgroundSelected }]}>
                <Icone nome="log-out" tamanho={20} cor={theme.text} />
              </View>
            </View>
          </Card>

          <JanelaAnimada visivel={confirmandoSaida} onFechar={() => !saindo && setConfirmandoSaida(false)}>
            <View style={styles.saidaTextos}>
              <ThemedText type="large" style={styles.nome}>
                Sair da conta?
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Você deixa de receber os avisos das suas famílias neste aparelho até entrar de novo.
              </ThemedText>
            </View>
            <View style={styles.saidaAcoes}>
              <PrimaryButton label="Sair" onPress={() => void sair()} loading={saindo} />
              <SecondaryButton label="Voltar" onPress={() => setConfirmandoSaida(false)} disabled={saindo} />
            </View>
          </JanelaAnimada>
        </View>
      )}
    </Screen>
  );
}

function Campo({ label, valor, acao }: { label: string; valor: string; acao?: ReactNode }) {
  return (
    <View style={styles.campoLinha}>
      <View style={styles.campo}>
        <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
        <ThemedText selectable style={styles.valor}>{valor}</ThemedText>
      </View>
      {acao}
    </View>
  );
}

const styles = StyleSheet.create({
  cartaoPerfil: { padding: 0, gap: 0 },
  capa: { height: 88, overflow: 'hidden' },
  perfilCorpo: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three },
  // Anel na cor do cartão: o avatar parece "recortado" sobre a capa.
  avatarAnel: {
    alignSelf: 'flex-start',
    marginTop: -40,
    borderWidth: 4,
    borderRadius: Radii.pill,
  },
  resumo: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  identidadeTextos: { flex: 1, gap: Spacing.one },
  nome: { fontWeight: 700 },
  cabecalhoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  tituloCard: { flex: 1, fontWeight: 700 },
  // 16 entre campos e 24 antes do botão: o formulário respira dentro do cartão.
  formulario: { gap: Spacing.three },
  acoes: { marginTop: Spacing.two },
  dados: { gap: Spacing.three },
  campoLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  campo: { flex: 1, gap: Spacing.half },
  valor: { fontWeight: 600 },
  temaLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  temaTextos: { flex: 1, gap: Spacing.one },
  sairIcone: { width: 44, height: 44, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  saidaTextos: { gap: Spacing.one },
  saidaAcoes: { gap: Spacing.two, marginTop: Spacing.two },
});
