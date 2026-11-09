import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { FontSize, JakartaFamilies, LineHeight, Radii, Spacing } from '@/constants/theme';
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
  const { notificar } = useToast();
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
      notificar({ titulo: 'Não foi possível carregar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }

    setFamilias((grupos.data ?? []) as Familia[]);
    setConvites((convitesPendentes.data ?? []) as ConviteFamilia[]);
  }, [notificar]);

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
      notificar({ titulo: 'Não foi possível responder', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    await carregar();
    notificar({ titulo: aceitar ? 'Convite aceito' : 'Convite recusado', tom: aceitar ? 'sucesso' : 'info' });
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
      atualizando={carregando}
      fab={
        familias.length > 0 ? (
          <Fab
            accessibilityLabel="Criar família"
            onPress={() => router.push('/configurar-familia' as Href)}
          />
        ) : undefined
      }>
      <View style={styles.busca}>
        <View style={[styles.campoBusca, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            accessibilityLabel="Buscar família"
            placeholder="Digite o nome da família"
            placeholderTextColor={theme.textSecondary}
            value={busca}
            onChangeText={setBusca}
            returnKeyType="search"
            onSubmitEditing={pesquisarFamilias}
            style={[styles.input, semAnelDoNavegador, { color: theme.text }]}
          />
        </View>
        <IconButton icone="search" rotulo="Buscar" tamanho={56} onPress={pesquisarFamilias} />
      </View>

      {convites.length > 0 && (
        <Section titulo="Convites para famílias">
          {convites.map((convite) => (
            <Card key={convite.invite_id}>
              <View style={styles.textos}>
                <ThemedText style={styles.nome}>{convite.group_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {convite.convidou} convidou você para participar.
                </ThemedText>
              </View>
              <View style={styles.acoes}>
                <View style={styles.acaoMetade}>
                  <SecondaryButton
                    label="Recusar"
                    tom="perigo"
                    compacto
                    bloco
                    disabled={respondendo === convite.invite_id}
                    onPress={() => responderConvite(convite.invite_id, false)}
                  />
                </View>
                <View style={styles.acaoMetade}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Aceitar"
                    accessibilityState={{ busy: respondendo === convite.invite_id }}
                    disabled={respondendo === convite.invite_id}
                    onPress={() => responderConvite(convite.invite_id, true)}
                    style={[styles.aceitar, { backgroundColor: theme.action }]}>
                    {respondendo === convite.invite_id ? (
                      <ActivityIndicator color={theme.onAction} size="small" />
                    ) : (
                      <ThemedText style={[styles.aceitarTexto, { color: theme.onAction }]}>
                        Aceitar
                      </ThemedText>
                    )}
                  </PressableScale>
                </View>
              </View>
            </Card>
          ))}
        </Section>
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
              style={{ padding: Spacing.three }}
              onPress={() =>
                router.push(`/configurar-familia?id=${familia.group_id}` as Href)
              }>
              <View style={styles.linha}>
                <View style={[styles.icone, { backgroundColor: theme.brandSoft }]}>
                  <Ionicons name="people" size={22} color={theme.brand} />
                </View>
                <View style={styles.textos}>
                  <ThemedText style={styles.nome}>{familia.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {familia.membros} {familia.membros === 1 ? 'membro' : 'membros'} · Você é{' '}
                    {familia.meu_papel}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
            </Card>
          ))}
        </View>
      )}
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
  lista: { gap: Spacing.two },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icone: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: Spacing.half },
  nome: { fontWeight: 700 },
  acoes: { flexDirection: 'row', gap: Spacing.two },
  acaoMetade: { flex: 1 },
  // Mesma pílula do ActionPill, mas esticada até a metade do cartão.
  aceitar: {
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aceitarTexto: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
});
