import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { traduzErroBanco } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

type Familia = {
  group_id: string;
  name: string;
  meu_papel: string;
  membros: number;
};

type ConviteFamilia = {
  invite_id: string;
  group_name: string;
  convidou: string;
};

export default function HomeScreen() {
  const theme = useTheme();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [convites, setConvites] = useState<ConviteFamilia[]>([]);
  const [busca, setBusca] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [respondendo, setRespondendo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [grupos, convitesPendentes] = await Promise.all([
      supabase.rpc('list_my_groups'),
      supabase.rpc('list_my_group_invites'),
    ]);
    setCarregando(false);

    const error = grupos.error ?? convitesPendentes.error;
    if (error) {
      Alert.alert('Não foi possível carregar', traduzErroBanco(error.message));
      return;
    }

    setFamilias((grupos.data ?? []) as Familia[]);
    setConvites((convitesPendentes.data ?? []) as ConviteFamilia[]);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function pesquisarFamilias() {
    setTermoBusca(busca.trim().toLocaleLowerCase('pt-BR'));
  }

  function limparBusca() {
    setBusca('');
    setTermoBusca('');
  }

  async function responderConvite(inviteId: string, aceitar: boolean) {
    setRespondendo(inviteId);
    const { error } = await supabase.rpc('respond_to_group_invite', {
      p_invite_id: inviteId,
      p_accept: aceitar,
    });
    setRespondendo(null);

    if (error) {
      Alert.alert('Não foi possível responder', traduzErroBanco(error.message));
      return;
    }
    await carregar();
  }

  const familiasVisiveis = termoBusca
    ? familias.filter((familia) =>
        familia.name.toLocaleLowerCase('pt-BR').includes(termoBusca)
      )
    : familias;

  return (
    <Screen
      titulo="Minhas famílias"
      subtitulo="As pessoas que cuidam juntas."
      aoAtualizar={carregar}
      atualizando={carregando}>
      <View style={styles.busca}>
        <TextInput
          placeholder="Digite o nome da família"
          placeholderTextColor={theme.textSecondary}
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
          onSubmitEditing={pesquisarFamilias}
          style={[
            styles.campoBusca,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pesquisar famílias"
          onPress={pesquisarFamilias}
          style={({ pressed }) => [
            styles.botaoBusca,
            { backgroundColor: theme.brand },
            pressed && styles.botaoBuscaPressionado,
          ]}>
          <Ionicons name="search" size={22} color={theme.onBrand} />
        </Pressable>
      </View>

      {convites.length > 0 && (
        <View style={styles.lista}>
          <ThemedText type="smallBold">Convites para famílias</ThemedText>
          {convites.map((convite) => (
            <Card key={convite.invite_id}>
              <ThemedText type="smallBold">{convite.group_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {convite.convidou} convidou você para participar.
              </ThemedText>
              <View style={styles.acoes}>
                <View style={styles.acaoMetade}>
                  <SecondaryButton
                    label="Recusar"
                    tom="perigo"
                    disabled={respondendo === convite.invite_id}
                    onPress={() => responderConvite(convite.invite_id, false)}
                  />
                </View>
                <View style={styles.acaoMetade}>
                  <SecondaryButton
                    label="Aceitar"
                    tom="marca"
                    loading={respondendo === convite.invite_id}
                    onPress={() => responderConvite(convite.invite_id, true)}
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {!carregando && familias.length === 0 ? (
        <EmptyState
          icone="people-outline"
          titulo="Você ainda não participa de uma família"
          descricao="Crie sua família e convide seus amigos para cuidar junto."
          acao={
            <PrimaryButton
              label="Criar família"
              onPress={() => router.push('/configurar-familia' as Href)}
            />
          }
        />
      ) : !carregando && familiasVisiveis.length === 0 ? (
        <EmptyState
          icone="search-outline"
          titulo="Nenhuma família encontrada"
          descricao={`Não encontramos uma família com “${busca.trim()}”.`}
          acao={<SecondaryButton label="Limpar pesquisa" onPress={limparBusca} />}
        />
      ) : (
        <View style={styles.lista}>
          {familiasVisiveis.map((familia) => (
            <Card
              key={familia.group_id}
              onPress={() =>
                router.push(`/configurar-familia?id=${familia.group_id}` as Href)
              }>
              <View style={styles.linha}>
                <View style={[styles.icone, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name="people" size={22} color={theme.brand} />
                </View>
                <View style={styles.textos}>
                  <ThemedText type="smallBold">{familia.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {familia.membros} {familia.membros === 1 ? 'membro' : 'membros'} · Você é{' '}
                    {familia.meu_papel}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
            </Card>
          ))}

          <PrimaryButton
            label="Criar outra família"
            onPress={() => router.push('/configurar-familia' as Href)}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  campoBusca: {
    flex: 1,
    height: 48,
    borderRadius: Radii.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  botaoBusca: {
    width: 48,
    height: 48,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoBuscaPressionado: { opacity: 0.8 },
  lista: { gap: Spacing.two },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: Spacing.half },
  acoes: { flexDirection: 'row', gap: Spacing.two },
  acaoMetade: { flex: 1 },
});
