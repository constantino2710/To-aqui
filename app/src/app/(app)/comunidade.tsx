import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PersonRow } from '@/components/person-row';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { traduzErroBanco } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

type Amizade = {
  friendship_id: string;
  profile_id: string;
  username: string;
  full_name: string;
  status: 'pendente' | 'aceito';
  sou_o_solicitante: boolean;
};

type ResultadoBusca = {
  id: string;
  username: string;
  full_name: string;
  friendship_id: string | null;
  friendship_status: 'pendente' | 'aceito' | 'recusado' | null;
  sou_o_solicitante: boolean | null;
};

export default function ComunidadeScreen() {
  const [amizades, setAmizades] = useState<Amizade[]>([]);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc('list_friendships');
    setCarregando(false);

    if (error) {
      Alert.alert('Não foi possível carregar', traduzErroBanco(error.message));
      return;
    }
    setAmizades((data ?? []) as Amizade[]);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function pesquisar() {
    const termo = busca.trim();
    if (termo.length < 3) {
      Alert.alert('Digite mais um pouco', 'Use ao menos 3 caracteres do username ou a tag completa.');
      return;
    }

    setBuscando(true);
    const { data, error } = await supabase.rpc('search_people', { p_query: termo });
    setBuscando(false);

    if (error) {
      Alert.alert('Busca indisponível', traduzErroBanco(error.message));
      return;
    }
    setResultados((data ?? []) as ResultadoBusca[]);
  }

  async function adicionar(pessoa: ResultadoBusca) {
    setProcessando(pessoa.id);
    const { error } = await supabase.rpc('send_friend_request', { p_user_id: pessoa.id });
    setProcessando(null);

    if (error) {
      Alert.alert('Não foi possível adicionar', traduzErroBanco(error.message));
      return;
    }
    await Promise.all([carregar(), pesquisar()]);
  }

  async function responder(friendshipId: string, aceitar: boolean) {
    setProcessando(friendshipId);
    const { error } = await supabase.rpc('respond_to_friend_request', {
      p_friendship_id: friendshipId,
      p_accept: aceitar,
    });
    setProcessando(null);

    if (error) {
      Alert.alert('Não foi possível responder', traduzErroBanco(error.message));
      return;
    }
    await carregar();
  }

  const pedidos = amizades.filter((item) => item.status === 'pendente');
  const amigos = amizades.filter((item) => item.status === 'aceito');

  return (
    <Screen
      titulo="Comunidade"
      subtitulo="Encontre pessoas pela tag de amizade ou pelo @username."
      aoAtualizar={carregar}
      atualizando={carregando}>
      <View style={styles.busca}>
        <TextField
          label="Buscar amigos"
          placeholder="@username ou tag, ex.: ABC234"
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={pesquisar}
        />
        <PrimaryButton label="Buscar" onPress={pesquisar} loading={buscando} />
      </View>

      {resultados.length > 0 && (
        <View style={styles.secao}>
          <ThemedText type="smallBold">Resultados</ThemedText>
          {resultados.map((pessoa) => (
            <PersonRow
              key={pessoa.id}
              nome={pessoa.full_name}
              username={pessoa.username}
              semente={pessoa.id}
              direita={
                pessoa.friendship_status === 'aceito' ? (
                  <ThemedText type="small" themeColor="success">Amigo</ThemedText>
                ) : pessoa.friendship_status === 'pendente' && pessoa.sou_o_solicitante ? (
                  <ThemedText type="small" themeColor="textSecondary">Enviado</ThemedText>
                ) : (
                  <SecondaryButton
                    label={pessoa.friendship_status === 'pendente' ? 'Aceitar' : 'Adicionar'}
                    tom="marca"
                    compacto
                    loading={processando === pessoa.id}
                    onPress={() =>
                      pessoa.friendship_status === 'pendente' && pessoa.friendship_id
                        ? responder(pessoa.friendship_id, true)
                        : adicionar(pessoa)
                    }
                  />
                )
              }
            />
          ))}
        </View>
      )}

      {pedidos.length > 0 && (
        <View style={styles.secao}>
          <ThemedText type="smallBold">Pedidos</ThemedText>
          {pedidos.map((pessoa) => (
            <PersonRow
              key={pessoa.friendship_id}
              nome={pessoa.full_name}
              username={pessoa.username}
              semente={pessoa.profile_id}
              detalhe={pessoa.sou_o_solicitante ? 'Pedido enviado' : 'Quer adicionar você'}
              direita={
                pessoa.sou_o_solicitante ? undefined : (
                  <View style={styles.acoes}>
                    <SecondaryButton label="Recusar" compacto tom="perigo" onPress={() => responder(pessoa.friendship_id, false)} />
                    <SecondaryButton label="Aceitar" compacto tom="marca" loading={processando === pessoa.friendship_id} onPress={() => responder(pessoa.friendship_id, true)} />
                  </View>
                )
              }
            />
          ))}
        </View>
      )}

      <View style={styles.secao}>
        <ThemedText type="smallBold">Meus amigos</ThemedText>
        {!carregando && amigos.length === 0 ? (
          <EmptyState icone="person-add-outline" titulo="Sua comunidade começa aqui" descricao="Busque alguém acima para enviar o primeiro pedido de amizade." />
        ) : (
          amigos.map((pessoa) => <PersonRow key={pessoa.friendship_id} nome={pessoa.full_name} username={pessoa.username} semente={pessoa.profile_id} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  busca: { gap: Spacing.two },
  secao: { gap: Spacing.two },
  acoes: { flexDirection: 'row', gap: Spacing.one },
});
