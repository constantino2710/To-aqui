import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ActionPill } from '@/components/action-pill';
import { Avatar } from '@/components/avatar';
import { BarraBusca } from '@/components/barra-busca';
import { Card } from '@/components/card';
import { FormaIngresso } from '@/components/forma-ingresso';
import { FoundMark } from '@/components/found-logo';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { PersonRow } from '@/components/person-row';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { FontSize, LineHeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { traduzErroBanco } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';
import { tempoRelativo } from '@/lib/tempo-relativo';

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

/**
 * Feed "Atividade recente": depende da função `list_community_activity`, que
 * ainda está em revisão (supabase/propostas/community_activity.sql). Ligue
 * depois que ela for aplicada no banco.
 */
const ATIVIDADE_RECENTE_HABILITADA = false;

const LARGURA_CANHOTO = 80;

type Atividade = {
  tipo: 'entrada_familia' | 'novo_qr' | 'nova_amizade';
  ocorrido_em: string;
  ator_id: string | null;
  ator_nome: string | null;
  grupo_nome: string | null;
  detalhe: string | null;
};

export default function ComunidadeScreen() {
  const theme = useTheme();
  const { notificar } = useToast();
  const { session } = useAuth();
  const [minhaTag, setMinhaTag] = useState('');
  const [totalFamilias, setTotalFamilias] = useState<number | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [amizades, setAmizades] = useState<Amizade[]>([]);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [amizadesRes, perfilRes, gruposRes, atividadeRes] = await Promise.all([
      supabase.rpc('list_friendships'),
      session
        ? supabase.from('profiles').select('friend_code').eq('id', session.user.id).single()
        : Promise.resolve({ data: null }),
      supabase.rpc('list_my_groups'),
      ATIVIDADE_RECENTE_HABILITADA
        ? supabase.rpc('list_community_activity', { p_limit: 8 })
        : Promise.resolve({ data: [], error: null }),
    ]);
    setCarregando(false);
    setMinhaTag((perfilRes.data as { friend_code?: string } | null)?.friend_code ?? '');
    // Resumo do cartão: se a contagem falhar, a linha das famílias só não aparece.
    setTotalFamilias(gruposRes.error ? null : (gruposRes.data ?? []).length);
    // O feed é um extra: se falhar (ex.: função ainda não aplicada no banco), só não aparece.
    setAtividades(atividadeRes.error ? [] : ((atividadeRes.data ?? []) as Atividade[]));

    const { data, error } = amizadesRes;

    if (error) {
      notificar({ titulo: 'Não foi possível carregar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setAmizades((data ?? []) as Amizade[]);
  }, [notificar, session]);

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

  async function copiarTag() {
    try {
      await Clipboard.setStringAsync(minhaTag);
      notificar({ titulo: 'Tag copiada', mensagem: 'Cole para compartilhar com seus amigos.', tom: 'sucesso' });
    } catch {
      notificar({ titulo: 'Não foi possível copiar', tom: 'erro' });
    }
  }

  async function compartilharTag() {
    try {
      await Share.share({ message: `Me adicione no Found para cuidarmos juntos! Minha tag de amizade é ${minhaTag}.` });
    } catch {
      // Sem compartilhamento nativo (ex.: navegador sem suporte): copia a tag.
      await copiarTag();
    }
  }

  function fraseAtividade(a: Atividade) {
    const sou = a.ator_id === session?.user.id;
    const ator = sou ? 'Você' : a.ator_nome ?? 'Alguém';
    if (a.tipo === 'entrada_familia') return { ator, resto: ` entrou em ${a.grupo_nome}` };
    if (a.tipo === 'novo_qr') return { ator, resto: ` cadastrou o QR Code “${a.detalhe}” em ${a.grupo_nome}` };
    return { ator: 'Você', resto: ` e ${a.ator_nome ?? 'alguém'} agora são amigos` };
  }

  const pedidos = amizades.filter((item) => item.status === 'pendente');
  const amigos = amizades.filter((item) => item.status === 'aceito');

  return (
    <Screen
      titulo="Comunidade"
      subtitulo="Encontre pessoas pela tag ou @username."
      aoAtualizar={carregar}
      atualizando={carregando}>
      {minhaTag !== '' && (
        // Cartão de embarque: a tag é o "passe" que você entrega a alguém. Canhoto
        // verde com a marca, picote vertical e o corpo claro com a tag e as ações.
        <FormaIngresso canhoto={LARGURA_CANHOTO}>
          <View style={styles.canhoto}>
            {/* Numa View: na web, um Svg solto fica atrás do degradê absoluto. */}
            <View>
              <FoundMark size={40} />
            </View>
          </View>

          {/* Espaço do picote (o tracejado e os furos são desenhados pela forma). */}
          <View style={styles.picote} />

          {/* Informação à esquerda, ações empilhadas na borda direita. */}
          <View style={styles.passeCorpo}>
            <View style={styles.passeTextos}>
              <ThemedText type="small" themeColor="textSecondary">Sua tag de amizade</ThemedText>
              <ThemedText selectable style={[styles.tag, { color: theme.text }]}>{minhaTag}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                <ThemedText type="smallBold">{amigos.length}</ThemedText> {amigos.length === 1 ? 'amigo' : 'amigos'}
                {totalFamilias != null && (
                  <>
                    {' · '}
                    <ThemedText type="smallBold">{totalFamilias}</ThemedText> {totalFamilias === 1 ? 'família' : 'famílias'}
                  </>
                )}
              </ThemedText>
            </View>
            {/* Só ícones: a tag é o destaque. Os rótulos ficam para leitores de tela. */}
            <View style={styles.passeAcoes}>
              <IconButton icone="copy" rotulo={`Copiar tag de amizade ${minhaTag}`} variante="contorno" tamanho={44} onPress={copiarTag} />
              <IconButton icone="share" rotulo="Compartilhar tag de amizade" variante="escuro" tamanho={44} onPress={compartilharTag} />
            </View>
          </View>
        </FormaIngresso>
      )}

      <BarraBusca
        accessibilityLabel="Buscar amigos"
        placeholder="Buscar amigos"
        valor={busca}
        onChangeText={setBusca}
        onPesquisar={pesquisar}
        onLimpar={() => {
          setBusca('');
          setResultados([]);
        }}
        carregando={buscando}
        autoCapitalize="none"
        autoCorrect={false}
      />

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
                      <Icone nome="check" tamanho={16} cor={theme.success} />
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
                      icone="x"
                      variante="perigo"
                      rotulo={`Recusar pedido de ${pessoa.full_name}`}
                      onPress={() => responder(pessoa.friendship_id, false)}
                    />
                    <IconButton
                      icone="check"
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
          <EmptyState icone="user-plus" titulo="Sua comunidade começa aqui" descricao="Busque alguém acima para enviar o primeiro pedido de amizade." />
        ) : (
          amigos.map((pessoa) => <PersonRow key={pessoa.friendship_id} nome={pessoa.full_name} username={pessoa.username} semente={pessoa.profile_id} />)
        )}
      </Section>

      {atividades.length > 0 && (
        <Section titulo="Atividade recente">
          <Card style={{ padding: Spacing.three }}>
            {atividades.map((a, i) => {
              const { ator, resto } = fraseAtividade(a);
              return (
                <View key={`${a.tipo}-${a.ocorrido_em}-${i}`} style={styles.atividade}>
                  <Avatar nome={a.ator_nome ?? '?'} semente={a.ator_id ?? a.tipo} tamanho={40} />
                  <View style={styles.atividadeTextos}>
                    <ThemedText type="small">
                      <ThemedText type="smallBold">{ator}</ThemedText>
                      {resto}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{tempoRelativo(a.ocorrido_em)}</ThemedText>
                  </View>
                  <Icone
                    nome={a.tipo === 'novo_qr' ? 'qr-code' : a.tipo === 'nova_amizade' ? 'users' : 'home'}
                    tamanho={18}
                    cor={theme.brand}
                  />
                </View>
              );
            })}
          </Card>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amigo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  negrito: { fontWeight: 700 },
  canhoto: {
    width: LARGURA_CANHOTO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picote: { width: 2 },
  passeCorpo: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  passeTextos: { flex: 1, minWidth: 0, gap: Spacing.half },
  passeAcoes: { gap: Spacing.two },
  tag: {
    fontSize: FontSize.heading,
    lineHeight: LineHeight.heading,
    fontWeight: 800,
    letterSpacing: FontSize.heading * 0.12,
  },
  atividade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  atividadeTextos: { flex: 1, gap: Spacing.half },
});
