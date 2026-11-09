import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { ActionPill } from '@/components/action-pill';
import { Card } from '@/components/card';
import { DevAccountSwitcher } from '@/components/dev-account-switcher';
import { IconField } from '@/components/icon-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { FontSize, JakartaFamilies, LineHeight, Palette, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { traduzErroBanco } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';
import { useThemePreference } from '@/lib/theme-preference';

type Perfil = {
  username: string;
  full_name: string;
  phone: string;
  friend_code: string;
};

// O cartão de identidade é escuro nos dois temas, então suas cores são fixas.
const CARTAO_FIM = '#2B3A33';
const TEXTO_SUAVE = '#B9C7BF';
const DIVISORIA = 'rgba(255, 255, 255, 0.12)';

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

  const carregar = useCallback(async () => {
    if (!session) return;
    setCarregando(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('username, full_name, phone, friend_code')
      .eq('id', session.user.id)
      .single();
    setCarregando(false);

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
    <Screen titulo="Meu perfil" subtitulo="Suas informações e sua identidade na comunidade." aoAtualizar={carregar} atualizando={carregando}>
      {perfil && (
        <>
          <View style={styles.cartaoEscuro}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="fundoIdentidade" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={Palette.graphite} />
                  <Stop offset="1" stopColor={CARTAO_FIM} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill="url(#fundoIdentidade)" />
            </Svg>
            <Svg style={styles.aneis} width={160} height={160} viewBox="0 0 160 160" pointerEvents="none">
              <Circle cx="120" cy="40" r="56" stroke={theme.gradientFrom} strokeOpacity={0.35} strokeWidth={2} fill="none" />
              <Circle cx="120" cy="40" r="84" stroke={theme.gradientTo} strokeOpacity={0.2} strokeWidth={2} fill="none" />
              <Circle cx="120" cy="40" r="112" stroke={theme.gradientFrom} strokeOpacity={0.12} strokeWidth={2} fill="none" />
            </Svg>

            <View style={styles.identidade}>
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
              <View style={styles.identidadeTextos}>
                <ThemedText type="large" style={styles.nome}>{perfil.full_name}</ThemedText>
                <ThemedText type="small" style={{ color: TEXTO_SUAVE }}>@{perfil.username}</ThemedText>
              </View>
            </View>

            <View style={styles.divisoria} />

            <View style={styles.tagLinha}>
              <ThemedText type="smallBold" style={styles.tagRotulo}>Sua tag de amizade</ThemedText>
              <ActionPill
                label="Copiar"
                icone="copy-outline"
                variante="translucido"
                altura={44}
                onPress={copiarTag}
                accessibilityLabel={`Copiar tag de amizade ${perfil.friend_code}`}
              />
            </View>
            <ThemedText selectable style={styles.codigo}>{perfil.friend_code}</ThemedText>
            <ThemedText type="small" style={{ color: TEXTO_SUAVE }}>
              Compartilhe esta tag para seus amigos encontrarem você na Comunidade.
            </ThemedText>
          </View>

          <Card>
            <View style={styles.cabecalhoCard}>
              <ThemedText type="large" style={styles.tituloCard}>Informações pessoais</ThemedText>
              {!editando && <ActionPill label="Editar" variante="contorno" altura={44} onPress={() => setEditando(true)} />}
            </View>

            {editando ? (
              <View style={styles.formulario}>
                <IconField sobreCartao label="Nome completo" icon="person-outline" value={nome} onChangeText={setNome} autoCapitalize="words" maxLength={80} />
                <IconField sobreCartao label="Nome de usuário" icon="at-outline" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={30} />
                <IconField sobreCartao label="Telefone" icon="call-outline" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(81) 99999-8888" />
                <View style={styles.acoes}>
                  <PrimaryButton label="Salvar alterações" onPress={salvar} loading={salvando} />
                  <SecondaryButton label="Cancelar" onPress={cancelarEdicao} />
                </View>
              </View>
            ) : (
              <View style={styles.dados}>
                <Campo label="E-mail" valor={session?.user.email ?? '—'} />
                <Campo label="Telefone" valor={perfil.phone} />
                <Campo label="Username" valor={`@${perfil.username}`} />
              </View>
            )}
          </Card>

          <Card>
            <View style={styles.temaLinha}>
              <View style={styles.temaTextos}>
                <ThemedText type="smallBold">Tema claro</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Use o fundo claro e verde do aplicativo.
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="Ativar tema claro"
                value={mode === 'light'}
                onValueChange={(claro) => setMode(claro ? 'light' : 'dark')}
                trackColor={{ false: theme.backgroundSelected, true: theme.gradientFrom }}
                thumbColor={Palette.white}
              />
            </View>
          </Card>
        </>
      )}

      <DevAccountSwitcher currentEmail={session?.user.email} aposTrocar={() => router.replace('/')} />
    </Screen>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.campo}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText selectable style={styles.valor}>{valor}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  cartaoEscuro: {
    borderRadius: Radii.huge,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
    backgroundColor: Palette.graphite,
  },
  aneis: { position: 'absolute', top: 0, right: 0 },
  identidade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  identidadeTextos: { flex: 1, gap: Spacing.one },
  nome: { color: Palette.white, fontWeight: 700 },
  divisoria: { height: 1, backgroundColor: DIVISORIA },
  tagLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  tagRotulo: { flex: 1, color: TEXTO_SUAVE, fontWeight: 600 },
  codigo: {
    color: Palette.white,
    fontSize: FontSize.display,
    lineHeight: LineHeight.display,
    fontWeight: 800,
    letterSpacing: FontSize.display * 0.12,
  },
  cabecalhoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  tituloCard: { flex: 1, fontWeight: 700 },
  formulario: { gap: Spacing.two },
  acoes: { gap: Spacing.two, marginTop: Spacing.two },
  dados: { gap: Spacing.three },
  campo: { gap: Spacing.half },
  valor: { fontWeight: 600 },
  temaLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  temaTextos: { flex: 1, gap: Spacing.one },
});
