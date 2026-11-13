import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { CartaoDestaque, SobreDestaque } from '@/components/cartao-destaque';
import { BarraBusca } from '@/components/barra-busca';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { PressableScale } from '@/components/pressable-scale';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { traduzErroBanco } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

type Familia = {
  group_id: string;
  name: string;
  meu_papel: 'chefe' | 'membro';
  membros: number;
  qr_codes: number;
};

type ConviteFamilia = {
  invite_id: string;
  group_name: string;
  convidou: string;
};

export default function HomeScreen() {
  const theme = useTheme();
  const { notificar } = useToast();
  const { session } = useAuth();
  const [primeiroNome, setPrimeiroNome] = useState('');
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [convites, setConvites] = useState<ConviteFamilia[]>([]);
  const [busca, setBusca] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [respondendo, setRespondendo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [grupos, convitesPendentes, perfil] = await Promise.all([
      supabase.rpc('list_my_groups'),
      supabase.rpc('list_my_group_invites'),
      session
        ? supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
        : Promise.resolve({ data: null }),
    ]);
    setCarregando(false);
    // A saudação é um detalhe: se o nome não vier, ela só fica sem nome.
    const nomeCompleto = (perfil.data as { full_name?: string } | null)?.full_name ?? '';
    setPrimeiroNome(nomeCompleto.trim().split(/\s+/)[0] ?? '');

    const error = grupos.error ?? convitesPendentes.error;
    if (error) {
      notificar({ titulo: 'Não foi possível carregar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }

    setFamilias((grupos.data ?? []) as Familia[]);
    setConvites((convitesPendentes.data ?? []) as ConviteFamilia[]);
  }, [notificar, session]);

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

  const totalMembros = familias.reduce((soma, f) => soma + Number(f.membros), 0);
  const totalQr = familias.reduce((soma, f) => soma + Number(f.qr_codes ?? 0), 0);
  const resumo = [
    { valor: familias.length, rotulo: familias.length === 1 ? 'família' : 'famílias' },
    { valor: totalMembros, rotulo: totalMembros === 1 ? 'membro' : 'membros' },
    { valor: totalQr, rotulo: totalQr === 1 ? 'QR Code' : 'QR Codes' },
  ];
  const primeiraFamilia = familias[0];

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
      {/* Boas-vindas com o resumo de tudo que a pessoa acompanha. */}
      {familias.length > 0 && (
        <CartaoDestaque>
          <View style={styles.saudacao}>
            <ThemedText type="large" style={styles.ola}>
              {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
            </ThemedText>
            <ThemedText type="small" style={{ color: SobreDestaque.suave }}>
              Tudo o que você acompanha, num só lugar.
            </ThemedText>
          </View>
          <View style={[styles.resumo, { borderTopColor: SobreDestaque.divisoria }]}>
            {resumo.map((item) => (
              <View key={item.rotulo} style={styles.resumoItem}>
                <ThemedText style={styles.resumoValor}>{item.valor}</ThemedText>
                <ThemedText type="small" style={{ color: SobreDestaque.suave }}>
                  {item.rotulo}
                </ThemedText>
              </View>
            ))}
          </View>
        </CartaoDestaque>
      )}

      <BarraBusca
        accessibilityLabel="Buscar família"
        placeholder="Digite o nome da família"
        valor={busca}
        onChangeText={setBusca}
        onPesquisar={pesquisarFamilias}
        onLimpar={limparBusca}
      />

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
          icone="users"
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
          icone="search"
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
                router.push(`/configurar-familia?id=${familia.group_id}&nome=${encodeURIComponent(familia.name)}` as Href)
              }>
              <View style={styles.linha}>
                {/* Cada família tem cor própria (pela semente), em vez de um ícone repetido. */}
                <Avatar nome={familia.name} semente={familia.group_id} tamanho={48} />
                <View style={styles.textos}>
                  <View style={styles.nomeLinha}>
                    <ThemedText style={styles.nome} numberOfLines={1}>{familia.name}</ThemedText>
                    {familia.meu_papel === 'chefe' && <Badge label="Chefe" tom="marca" />}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {familia.membros} {Number(familia.membros) === 1 ? 'membro' : 'membros'} ·{' '}
                    {familia.qr_codes ?? 0} {Number(familia.qr_codes) === 1 ? 'QR Code' : 'QR Codes'}
                  </ThemedText>
                </View>
                <Icone nome="chevron-right" tamanho={20} cor={theme.textSecondary} />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Próximo passo sugerido: a tela vazia vira convite para agir. Não depende
          de `carregando`: senão sumiria e reapareceria (animando) a cada visita. */}
      {!termoBusca && primeiraFamilia && (
        <Card
          onPress={() =>
            totalQr === 0
              ? router.push(`/configurar-familia?id=${primeiraFamilia.group_id}&nome=${encodeURIComponent(primeiraFamilia.name)}` as Href)
              : router.push('/comunidade' as Href)
          }>
          <View style={styles.linha}>
            <View style={[styles.icone, { backgroundColor: theme.brandSoft }]}>
              <Icone nome={totalQr === 0 ? 'qr-code' : 'user-plus'} tamanho={22} cor={theme.brand} />
            </View>
            <View style={styles.textos}>
              <ThemedText style={styles.nome}>
                {totalQr === 0 ? 'Cadastre um QR Code' : 'Convide mais alguém'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {totalQr === 0
                  ? 'Cole na mochila, na coleira ou no chaveiro. Quem encontrar avisa sua família.'
                  : 'Adicione amigos pela tag e chame-os para uma família.'}
              </ThemedText>
            </View>
            <Icone nome="chevron-right" tamanho={20} cor={theme.textSecondary} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  nomeLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nome: { flexShrink: 1, fontWeight: 700 },
  saudacao: { gap: Spacing.one, paddingRight: Spacing.six },
  ola: { color: SobreDestaque.texto, fontWeight: 700 },
  resumo: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  resumoItem: { flex: 1, gap: Spacing.half },
  resumoValor: {
    color: SobreDestaque.texto,
    fontSize: FontSize.heading,
    lineHeight: LineHeight.heading,
    fontWeight: 800,
  },
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
