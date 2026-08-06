import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
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

export default function PerfilScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemePreference();
  const { session } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [telefone, setTelefone] = useState('');
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [saindo, setSaindo] = useState(false);

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
      Alert.alert('Não foi possível carregar seu perfil', traduzErroBanco(error.message));
      return;
    }

    const atual = data as Perfil;
    setPerfil(atual);
    setNome(atual.full_name);
    setUsername(atual.username);
    setTelefone(atual.phone);
  }, [session]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

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
      Alert.alert('Não foi possível salvar', traduzErroBanco(error.message));
      return;
    }
    setEditando(false);
    await carregar();
    Alert.alert('Perfil atualizado', 'Suas informações foram salvas.');
  }

  async function sair() {
    setSaindo(true);
    const { error } = await supabase.auth.signOut();
    setSaindo(false);
    if (error) Alert.alert('Não foi possível sair', error.message);
  }

  return (
    <Screen titulo="Meu perfil" subtitulo="Suas informações e sua identidade na comunidade." aoAtualizar={carregar} atualizando={carregando}>
      {perfil && (
        <>
          <View style={styles.identidade}>
            <Avatar nome={perfil.full_name} semente={session?.user.id} tamanho={76} />
            <View style={styles.identidadeTextos}>
              <ThemedText type="subtitle">{perfil.full_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">@{perfil.username}</ThemedText>
            </View>
          </View>

          <Card>
            <ThemedText type="smallBold">Sua tag de amizade</ThemedText>
            <ThemedText type="title" selectable>{perfil.friend_code}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Compartilhe esta tag para seus amigos encontrarem você na Comunidade.</ThemedText>
          </Card>

          <Card>
            <View style={styles.cabecalhoCard}>
              <ThemedText type="smallBold">Informações pessoais</ThemedText>
              {!editando && <SecondaryButton label="Editar" compacto tom="marca" onPress={() => setEditando(true)} />}
            </View>

            {editando ? (
              <View style={styles.formulario}>
                <TextField label="Nome completo" value={nome} onChangeText={setNome} autoCapitalize="words" maxLength={80} />
                <TextField label="Nome de usuário" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={30} />
                <TextField label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(81) 99999-8888" />
                <PrimaryButton label="Salvar alterações" onPress={salvar} loading={salvando} />
                <SecondaryButton label="Cancelar" onPress={cancelarEdicao} />
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
                  Use o fundo claro e lavanda do design do aplicativo.
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="Ativar tema claro"
                value={mode === 'light'}
                onValueChange={(claro) => setMode(claro ? 'light' : 'dark')}
                trackColor={{ false: theme.backgroundSelected, true: theme.brand }}
                thumbColor={theme.onBrand}
              />
            </View>
          </Card>
        </>
      )}

      <SecondaryButton label="Sair da conta" tom="perigo" onPress={sair} loading={saindo} />
    </Screen>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.campo}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText selectable>{valor}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  identidade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  identidadeTextos: { flex: 1, gap: Spacing.one },
  cabecalhoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  formulario: { gap: Spacing.three },
  dados: { gap: Spacing.three },
  campo: { gap: Spacing.half },
  temaLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  temaTextos: { flex: 1, gap: Spacing.one },
});
