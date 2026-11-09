import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { ActionPill } from '@/components/action-pill';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { PersonRow } from '@/components/person-row';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { FontSize, JakartaFamilies, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  const { notificar } = useToast();
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
      notificar({ titulo: 'Não foi possível carregar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setAmizades((data ?? []) as Amizade[]);
  }, [notificar]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function pesquisar() {
    const termo = busca.trim();
    if (termo.length < 3) {
      notificar({ titulo: 'Digite mais um pouco', mensagem: 'Use ao menos 3 caracteres do username ou a tag completa.', tom: 'aviso' });
      return;
    }

    setBuscando(true);
    const { data, error } = await supabase.rpc('search_people', { p_query: termo });
    setBuscando(false);

    if (error) {
      notificar({ titulo: 'Busca indisponível', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setResultados((data ?? []) as ResultadoBusca[]);
  }

  async function adicionar(pessoa: ResultadoBusca) {
    setProcessando(pessoa.id);
    const { error } = await supabase.rpc('send_friend_request', { p_user_id: pessoa.id });
    setProcessando(null);

    if (error) {
      notificar({ titulo: 'Não foi possível adicionar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    await Promise.all([carregar(), pesquisar()]);
    notificar({ titulo: 'Solicitação enviada', mensagem: `${pessoa.full_name} receberá seu pedido.`, tom: 'sucesso' });
  }

  async function responder(friendshipId: string, aceitar: boolean) {
    setProcessando(friendshipId);
    const { error } = await supabase.rpc('respond_to_friend_request', {
      p_friendship_id: friendshipId,
      p_accept: aceitar,
    });
    setProcessando(null);

    if (error) {
      notificar({ titulo: 'Não foi possível responder', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    await carregar();
    notificar({ titulo: aceitar ? 'Amizade aceita' : 'Solicitação recusada', tom: aceitar ? 'sucesso' : 'info' });
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
        <View style={[styles.campoBusca, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            accessibilityLabel="Buscar amigos"
            placeholder="Buscar amigos"
            placeholderTextColor={theme.textSecondary}
            value={busca}
            onChangeText={setBusca}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={pesquisar}
            style={[styles.input, semAnelDoNavegador, { color: theme.text }]}
          />
        </View>
        <IconButton icone="search" rotulo="Buscar" tamanho={56} loading={buscando} onPress={pesquisar} />
      </View>

      {resultados.length > 0 && (
        <Section titulo="Resultados">
          {resultados.map((pessoa) => {
            const amigo = pessoa.friendship_status === 'aceito';
            const enviado = pessoa.friendship_status === 'pendente' && !!pessoa.sou_o_solicitante;
            return (
              <PersonRow
                key={pessoa.id}
                nome={pessoa.full_name}
                username={pessoa.username}
                semente={pessoa.id}
                direitaSolta={amigo || enviado}
                direita={
                  amigo ? (
                    <View style={styles.amigo}>
                      <Ionicons name="checkmark" size={16} color={theme.success} />
                      <ThemedText type="small" themeColor="success" style={styles.negrito}>
                        Amigo
                      </ThemedText>
                    </View>
                  ) : enviado ? (
                    <ThemedText type="small" themeColor="textSecondary">Enviado</ThemedText>
                  ) : (
                    <ActionPill
                      label={pessoa.friendship_status === 'pendente' ? 'Aceitar' : 'Adicionar'}
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
            );
          })}
        </Section>
      )}

      {pedidos.length > 0 && (
        <Section titulo="Pedidos">
          {pedidos.map((pessoa) => (
            <PersonRow
              key={pessoa.friendship_id}
              nome={pessoa.full_name}
              username={pessoa.username}
              semente={pessoa.profile_id}
              detalhe={pessoa.sou_o_solicitante ? 'Pedido enviado' : 'Quer adicionar você'}
              direita={
                pessoa.sou_o_solicitante ? undefined : (
                  <>
                    <IconButton
                      icone="close"
                      variante="perigo"
                      rotulo={`Recusar pedido de ${pessoa.full_name}`}
                      onPress={() => responder(pessoa.friendship_id, false)}
                    />
                    <IconButton
                      icone="checkmark"
                      variante="escuro"
                      rotulo={`Aceitar pedido de ${pessoa.full_name}`}
                      loading={processando === pessoa.friendship_id}
                      onPress={() => responder(pessoa.friendship_id, true)}
                    />
                  </>
                )
              }
            />
          ))}
        </Section>
      )}

      <Section titulo="Meus amigos">
        {!carregando && amigos.length === 0 ? (
          <EmptyState icone="person-add-outline" titulo="Sua comunidade começa aqui" descricao="Busque alguém acima para enviar o primeiro pedido de amizade." />
        ) : (
          amigos.map((pessoa) => <PersonRow key={pessoa.friendship_id} nome={pessoa.full_name} username={pessoa.username} semente={pessoa.profile_id} />)
        )}
      </Section>
    </Screen>
  );
}

// No navegador, o <input> ganha um anel de foco próprio; a pílula já basta.
const semAnelDoNavegador = (
  Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}
) as TextStyle;

const styles = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  campoBusca: {
    flex: 1,
    minWidth: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: JakartaFamilies[500],
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  amigo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  negrito: { fontWeight: 700 },
});
