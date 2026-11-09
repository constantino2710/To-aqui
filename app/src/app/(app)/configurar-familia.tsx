import Ionicons from '@expo/vector-icons/Ionicons';
import { QRCode } from '@ttsalpha/qrcode/native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActionPill } from '@/components/action-pill';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { JanelaAnimada } from '@/components/familia/janela-animada';
import { IconButton } from '@/components/icon-button';
import { IconField } from '@/components/icon-field';
import { LocationMap } from '@/components/location-map';
import { PersonRow } from '@/components/person-row';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { SecondaryButton } from '@/components/secondary-button';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { Palette, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { traduzErroBanco } from '@/lib/db-errors';
import { finderUrl } from '@/lib/finder-url';
import { openStreetMapUrl } from '@/lib/map-url';
import { salvarImagemQr } from '@/lib/save-qr-image';
import { supabase } from '@/lib/supabase';

type AbaFamilia = 'membros' | 'qrcodes';
type Pessoa = { profile_id: string; username: string; full_name: string; papel?: string };
type Amizade = { profile_id: string; username: string; full_name: string; status: string };
type FamiliaResumo = { group_id: string; name: string; meu_papel: string };
type QrCadastrado = {
  id: string;
  dependent_name: string;
  token: string;
  short_code: string;
  is_active: boolean;
  created_at: string;
};
type SessaoRastreamento = {
  id: string;
  qr_code_id: string;
  status: 'awaiting_consent' | 'active' | 'ended';
  started_at: string;
  last_ping_at: string | null;
  responsible_lat: number | null;
  responsible_lng: number | null;
  responsible_recorded_at: string | null;
};
type PingLocalizacao = {
  id: number;
  session_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  recorded_at: string;
  received_at: string;
};

type QrCodeHandle = {
  toDataURL: (callback: (base64: string) => void) => void;
};

export default function ConfigurarFamiliaScreen() {
  const theme = useTheme();
  const { notificar } = useToast();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string; aba?: AbaFamilia }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const [aba, setAba] = useState<AbaFamilia>(params.aba === 'qrcodes' ? 'qrcodes' : 'membros');
  const [nome, setNome] = useState('');
  const [nomeSalvo, setNomeSalvo] = useState('');
  const [papel, setPapel] = useState('chefe');
  const [membros, setMembros] = useState<Pessoa[]>([]);
  const [amigos, setAmigos] = useState<Pessoa[]>([]);
  const [qrs, setQrs] = useState<QrCadastrado[]>([]);
  const [sessoes, setSessoes] = useState<SessaoRastreamento[]>([]);
  const [pings, setPings] = useState<PingLocalizacao[]>([]);
  const [nomeQr, setNomeQr] = useState('');
  const [editandoNome, setEditandoNome] = useState(false);
  const [mostrandoNovoQr, setMostrandoNovoQr] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [convidando, setConvidando] = useState<string | null>(null);
  const [cadastrandoQr, setCadastrandoQr] = useState(false);
  const [alterandoQr, setAlterandoQr] = useState<string | null>(null);
  const [excluindoQr, setExcluindoQr] = useState<string | null>(null);
  const [compartilhandoLocalizacao, setCompartilhandoLocalizacao] = useState<string | null>(null);
  const [encerrandoSessao, setEncerrandoSessao] = useState<string | null>(null);
  const [qrAberto, setQrAberto] = useState<QrCadastrado | null>(null);
  const [qrConfigurando, setQrConfigurando] = useState<QrCadastrado | null>(null);
  const [nomeQrEditando, setNomeQrEditando] = useState('');
  const [salvandoEdicaoQr, setSalvandoEdicaoQr] = useState(false);
  const [qrRenderizado, setQrRenderizado] = useState<QrCodeHandle | null>(null);
  const [baixandoQr, setBaixandoQr] = useState(false);
  const [exibindoLinkQr, setExibindoLinkQr] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);

    if (groupId) {
      const [grupos, pessoas, convidaveis, qrCodes, sessoesAtivas, localizacoes] = await Promise.all([
        supabase.rpc('list_my_groups'),
        supabase.rpc('list_group_members', { p_group_id: groupId }),
        supabase.rpc('list_invitable_friends', { p_group_id: groupId }),
        supabase
          .from('qr_codes')
          .select('id, dependent_name, token, short_code, is_active, created_at')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false }),
        supabase
          .from('tracking_sessions')
          .select('id, qr_code_id, status, started_at, last_ping_at, responsible_lat, responsible_lng, responsible_recorded_at')
          .eq('group_id', groupId)
          .eq('status', 'active')
          .order('started_at', { ascending: false }),
        supabase
          .from('location_pings')
          .select('id, session_id, lat, lng, accuracy_m, recorded_at, received_at')
          .eq('group_id', groupId)
          .order('recorded_at', { ascending: false })
          .limit(100),
      ]);
      setCarregando(false);

      // Os QR Codes continuam sendo úteis mesmo se uma atualização nova do
      // rastreamento ainda não foi aplicada no banco. Preencher esses dados
      // antes de tratar o erro evita que a tela pareça vazia nesse intervalo.
      setQrs((qrCodes.data ?? []) as QrCadastrado[]);
      if (!sessoesAtivas.error) setSessoes((sessoesAtivas.data ?? []) as SessaoRastreamento[]);
      if (!localizacoes.error) setPings((localizacoes.data ?? []) as PingLocalizacao[]);

      // O rastreamento é complementar à configuração da família. Uma falha
      // temporária nele não pode esconder o nome, membros ou QR Codes.
      const error = grupos.error ?? pessoas.error ?? convidaveis.error ?? qrCodes.error;
      if (error) {
        notificar({ titulo: 'Não foi possível carregar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
        return;
      }

      const familia = ((grupos.data ?? []) as FamiliaResumo[]).find(
        (item) => item.group_id === groupId
      );
      if (!familia) {
        notificar({ titulo: 'Família não encontrada', mensagem: 'Você não participa mais desta família.', tom: 'aviso' });
        router.replace('/');
        return;
      }

      setNome(familia.name);
      setNomeSalvo(familia.name);
      setPapel(familia.meu_papel);
      setMembros((pessoas.data ?? []) as Pessoa[]);
      setAmigos((convidaveis.data ?? []) as Pessoa[]);
      return;
    }

    const { data, error } = await supabase.rpc('list_friendships');
    setCarregando(false);
    if (error) {
      notificar({ titulo: 'Não foi possível carregar seus amigos', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setAmigos(
      ((data ?? []) as Amizade[])
        .filter((item) => item.status === 'aceito')
        .map(({ profile_id, username, full_name }) => ({ profile_id, username, full_name }))
    );
  }, [groupId, notificar]);

  useEffect(() => {
    const temporizador = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(temporizador);
  }, [carregar]);

  useEffect(() => {
    if (!groupId) return;
    const canal = supabase
      .channel(`familia-localizacao-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_pings', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const ping = payload.new as PingLocalizacao;
          setPings((atuais) => [ping, ...atuais.filter((item) => item.id !== ping.id)].slice(0, 100));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tracking_sessions', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const sessao = payload.new as SessaoRastreamento;
          setSessoes((atuais) => {
            if (sessao.status !== 'active') return atuais.filter((item) => item.id !== sessao.id);
            return [sessao, ...atuais.filter((item) => item.id !== sessao.id)]
              .sort((a, b) => b.started_at.localeCompare(a.started_at));
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(canal); };
  }, [carregar, groupId]);

  function alternarSelecionado(profileId: string) {
    setSelecionados((atuais) =>
      atuais.includes(profileId)
        ? atuais.filter((id) => id !== profileId)
        : [...atuais, profileId]
    );
  }

  async function salvar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      notificar({ titulo: 'Dê um nome à família', mensagem: 'O nome ajuda todos a reconhecerem o grupo.', tom: 'aviso' });
      return;
    }

    setSalvando(true);
    if (groupId) {
      const { error } = await supabase.from('groups').update({ name: nomeLimpo }).eq('id', groupId);
      setSalvando(false);
      if (error) {
        notificar({ titulo: 'Não foi possível salvar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
        return;
      }
      setNomeSalvo(nomeLimpo);
      setEditandoNome(false);
      notificar({ titulo: 'Família atualizada', mensagem: 'O novo nome já está visível para todos.', tom: 'sucesso' });
      return;
    }

    const { data: novoGroupId, error } = await supabase.rpc('create_group', { p_name: nomeLimpo });
    if (error || !novoGroupId) {
      setSalvando(false);
      notificar({ titulo: 'Não foi possível criar', mensagem: traduzErroBanco(error?.message ?? 'Tente novamente.'), tom: 'erro' });
      return;
    }

    const convites = selecionados.map((profileId) => ({
      group_id: novoGroupId,
      invited_by: session!.user.id,
      invited_user_id: profileId,
    }));
    if (convites.length > 0) {
      const { error: erroConvites } = await supabase.from('group_invites').insert(convites);
      if (erroConvites) {
        setSalvando(false);
        notificar({ titulo: 'Família criada', mensagem: 'A família foi criada, mas alguns convites não foram enviados.', tom: 'aviso' });
        router.replace(`/configurar-familia?id=${novoGroupId}` as Href);
        return;
      }
    }

    setSalvando(false);
    notificar({ titulo: 'Família criada', mensagem: convites.length ? 'Os convites foram enviados.' : 'Agora você pode adicionar membros e QR Codes.', tom: 'sucesso' });
    router.replace(`/configurar-familia?id=${novoGroupId}` as Href);
  }

  async function convidar(pessoa: Pessoa) {
    if (!groupId || !session) return;
    setConvidando(pessoa.profile_id);
    const { error } = await supabase.from('group_invites').insert({
      group_id: groupId,
      invited_by: session.user.id,
      invited_user_id: pessoa.profile_id,
    });
    setConvidando(null);

    if (error) {
      notificar({ titulo: 'Não foi possível convidar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setAmigos((atuais) => atuais.filter((item) => item.profile_id !== pessoa.profile_id));
    notificar({ titulo: 'Convite enviado', mensagem: `${pessoa.full_name} receberá o convite.`, tom: 'sucesso' });
  }

  async function cadastrarQr() {
    const nomeLimpo = nomeQr.trim();
    if (!groupId || !session) return;
    if (!nomeLimpo) {
      notificar({ titulo: 'Dê um nome ao QR Code', mensagem: 'Use o nome do filho, pet ou objeto protegido.', tom: 'aviso' });
      return;
    }

    setCadastrandoQr(true);
    const { error } = await supabase.from('qr_codes').insert({
      group_id: groupId,
      created_by: session.user.id,
      dependent_name: nomeLimpo,
    });
    setCadastrandoQr(false);

    if (error) {
      notificar({ titulo: 'Não foi possível cadastrar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setNomeQr('');
    setMostrandoNovoQr(false);
    await carregar();
    notificar({ titulo: 'QR Code cadastrado', mensagem: `${nomeLimpo} já aparece na família.`, tom: 'sucesso' });
  }

  async function alternarQr(qr: QrCadastrado) {
    setAlterandoQr(qr.id);
    const { error } = await supabase
      .from('qr_codes')
      .update({ is_active: !qr.is_active })
      .eq('id', qr.id);
    setAlterandoQr(null);

    if (error) {
      notificar({ titulo: 'Não foi possível alterar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setQrs((atuais) =>
      atuais.map((item) => item.id === qr.id ? { ...item, is_active: !item.is_active } : item)
    );
    setQrConfigurando((aberto) => aberto?.id === qr.id ? { ...aberto, is_active: !aberto.is_active } : aberto);
  }

  function abrirConfiguracaoQr(qr: QrCadastrado) {
    setQrAberto(null);
    setNomeQrEditando(qr.dependent_name);
    setQrConfigurando(qr);
  }

  async function salvarEdicaoQr() {
    if (!qrConfigurando) return;
    const nomeLimpo = nomeQrEditando.trim();
    if (!nomeLimpo) {
      notificar({ titulo: 'Dê um nome ao QR Code', mensagem: 'Use um nome para identificá-lo na família.', tom: 'aviso' });
      return;
    }
    setSalvandoEdicaoQr(true);
    const { error } = await supabase
      .from('qr_codes')
      .update({ dependent_name: nomeLimpo })
      .eq('id', qrConfigurando.id);
    setSalvandoEdicaoQr(false);
    if (error) {
      notificar({ titulo: 'Não foi possível editar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setQrs((atuais) => atuais.map((item) => item.id === qrConfigurando.id ? { ...item, dependent_name: nomeLimpo } : item));
    setQrConfigurando(null);
  }

  function confirmarExclusaoQr(qr: QrCadastrado) {
    Alert.alert(
      'Excluir QR Code?',
      `O QR Code de ${qr.dependent_name} e o histórico de atendimentos vinculados a ele serão apagados. Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void excluirQr(qr) },
      ]
    );
  }

  async function excluirQr(qr: QrCadastrado) {
    setExcluindoQr(qr.id);
    const { error } = await supabase.from('qr_codes').delete().eq('id', qr.id);
    setExcluindoQr(null);
    if (error) {
      notificar({ titulo: 'Não foi possível excluir', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setQrAberto((aberto) => aberto?.id === qr.id ? null : aberto);
    setQrConfigurando((aberto) => aberto?.id === qr.id ? null : aberto);
    setQrs((atuais) => atuais.filter((item) => item.id !== qr.id));
    setSessoes((atuais) => atuais.filter((item) => item.qr_code_id !== qr.id));
  }

  async function resolverSessao(sessaoId: string) {
    setEncerrandoSessao(sessaoId);
    const { error } = await supabase.rpc('resolve_tracking_session', { p_session_id: sessaoId });
    setEncerrandoSessao(null);
    if (error) {
      notificar({ titulo: 'Não foi possível encerrar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setSessoes((atuais) => atuais.filter((item) => item.id !== sessaoId));
    notificar({ titulo: 'Atendimento encerrado', mensagem: 'O celular que compartilhou a localização receberá o aviso.', tom: 'sucesso' });
  }

  function confirmarDescarteSessao(sessaoId: string) {
    Alert.alert(
      'Descartar solicitação?',
      'Essa solicitação vai sair da família e o rastreamento será encerrado.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => void descartarSessao(sessaoId) },
      ],
    );
  }

  async function descartarSessao(sessaoId: string) {
    setEncerrandoSessao(sessaoId);
    const { error } = await supabase.rpc('resolve_tracking_session', { p_session_id: sessaoId });
    setEncerrandoSessao(null);
    if (error) {
      notificar({ titulo: 'Não foi possível descartar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setSessoes((atuais) => atuais.filter((item) => item.id !== sessaoId));
    notificar({ titulo: 'Solicitação descartada', mensagem: 'Ela não aparecerá mais na lista de localizações.', tom: 'sucesso' });
  }

  async function compartilharLocalizacao(sessaoId: string) {
    setCompartilhandoLocalizacao(sessaoId);
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      setCompartilhandoLocalizacao(null);
      notificar({ titulo: 'Localização não permitida', mensagem: 'Autorize a localização para que a pessoa que encontrou o QR possa ver onde você está.', tom: 'aviso' });
      return;
    }

    const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { error } = await supabase.rpc('record_responsible_location', {
      p_session_id: sessaoId,
      p_lat: posicao.coords.latitude,
      p_lng: posicao.coords.longitude,
      p_accuracy_m: posicao.coords.accuracy,
      p_recorded_at: new Date(posicao.timestamp).toISOString(),
    });
    setCompartilhandoLocalizacao(null);
    if (error) {
      notificar({ titulo: 'Não foi possível compartilhar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    await carregar();
    notificar({ titulo: 'Localização compartilhada', mensagem: 'A pessoa que escaneou o QR agora vê sua posição no mapa desta sessão.', tom: 'sucesso' });
  }

  async function baixarImagemQr() {
    if (!qrAberto || !qrRenderizado) return;
    setBaixandoQr(true);

    try {
      const base64 = await new Promise<string>((resolve) => qrRenderizado.toDataURL(resolve));
      const nomeSeguro = qrAberto.dependent_name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'qr-code';
      const resultado = await salvarImagemQr(base64, `found-${nomeSeguro}.png`);

      if (resultado === 'permissao-negada') {
        notificar({
          titulo: 'Permissão necessária',
          mensagem: 'Autorize o acesso às fotos para salvar a imagem do QR Code.',
          tom: 'aviso',
        });
        return;
      }

      notificar({
        titulo: 'QR Code salvo',
        mensagem: 'A imagem foi adicionada à sua galeria.',
        tom: 'sucesso',
      });
    } catch {
      notificar({
        titulo: 'Não foi possível salvar',
        mensagem: 'Tente novamente com o QR Code aberto.',
        tom: 'erro',
      });
    } finally {
      setBaixandoQr(false);
    }
  }

  function abrirQr(qr: QrCadastrado) {
    setExibindoLinkQr(false);
    setQrRenderizado(null);
    setQrAberto(qr);
  }

  function fecharQr() {
    setQrAberto(null);
    setExibindoLinkQr(false);
    setQrRenderizado(null);
  }

  const podeEditar = !groupId || papel === 'chefe';
  const tamanhoQr = Math.min(width - 128, 296);

  function cancelarEdicaoNome() {
    setNome(nomeSalvo);
    setEditandoNome(false);
  }

  const qrExibido = useUltimo(qrAberto);
  const configExibido = useUltimo(qrConfigurando);

  return (
    <Screen
      titulo={groupId ? nomeSalvo || nome || 'Família' : 'Nova família'}
      subtitulo={groupId ? 'Gerencie membros e QR Codes em um só lugar.' : 'Escolha um nome e convide seus amigos.'}
      acao={
        <View style={styles.acoesCabecalho}>
          {groupId && podeEditar && (
            <IconButton
              icone="pencil-outline"
              rotulo="Editar nome da família"
              variante="claro"
              onPress={() => setEditandoNome(true)}
            />
          )}
          <IconButton icone="arrow-back" rotulo="Voltar para o início" onPress={() => router.replace('/')} />
        </View>
      }
      aoAtualizar={carregar}
      atualizando={carregando}>
      {(!groupId || editandoNome) && (
        <Card>
          <View style={styles.tituloCard}>
            <Ionicons name={groupId ? 'pencil-outline' : 'home-outline'} size={22} color={theme.brand} />
            <ThemedText type="large" style={styles.negrito}>
              {groupId ? 'Editar nome da família' : 'Informações da família'}
            </ThemedText>
          </View>
          <IconField
            sobreCartao
            icon="home-outline"
            label="Nome da família"
            placeholder="Ex.: Família Oliveira"
            value={nome}
            onChangeText={setNome}
            maxLength={60}
          />
          {groupId && <PrimaryButton label="Salvar nome" onPress={salvar} loading={salvando} />}
          {groupId && <SecondaryButton label="Cancelar" onPress={cancelarEdicaoNome} />}
        </Card>
      )}

      {groupId && (
        <SegmentedTabs
          opcoes={[
            { chave: 'membros', rotulo: `Membros (${membros.length})`, icone: 'people-outline' },
            { chave: 'qrcodes', rotulo: `QR Codes (${qrs.length})`, icone: 'qr-code-outline' },
          ]}
          valor={aba}
          onChange={setAba}
        />
      )}

      {(!groupId || aba === 'membros') && (
        <AbaMembros
          groupId={groupId}
          membros={membros}
          amigos={amigos}
          selecionados={selecionados}
          podeEditar={podeEditar}
          carregando={carregando}
          convidando={convidando}
          onConvidar={convidar}
          onAlternarSelecionado={alternarSelecionado}
        />
      )}

      {!groupId && <PrimaryButton label="Criar família" onPress={salvar} loading={salvando} />}

      {groupId && aba === 'qrcodes' && sessoes.length > 0 && (
        <View style={styles.lista}>
          {sessoes.map((sessao) => {
            const ping = pings.find((item) => item.session_id === sessao.id);
            const qr = qrs.find((item) => item.id === sessao.qr_code_id);
            return (
              <Card key={sessao.id}>
                <View style={styles.alertaCabecalho}>
                  <View style={[styles.alertaIcone, { backgroundColor: theme.dangerSoft }]}>
                    <Ionicons name="location" size={24} color={theme.danger} />
                  </View>
                  <View style={styles.textos}>
                    <ThemedText style={styles.negrito}>Localização recebida</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      QR Code: {qr?.dependent_name ?? 'QR cadastrado'}
                    </ThemedText>
                  </View>
                </View>
                {ping ? (
                  <>
                    <LocationMap lat={ping.lat} lng={ping.lng} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Atualizada em {new Date(ping.recorded_at).toLocaleString('pt-BR')}
                      {ping.accuracy_m ? ` · precisão aproximada de ${Math.round(ping.accuracy_m)} m` : ''}
                    </ThemedText>
                    <View style={styles.lista}>
                      <SecondaryButton compacto bloco label="Compartilhar minha localização" tom="marca" onPress={() => void compartilharLocalizacao(sessao.id)} loading={compartilhandoLocalizacao === sessao.id} />
                      <SecondaryButton compacto bloco label="Abrir mapa" tom="marca" onPress={() => void Linking.openURL(openStreetMapUrl(ping.lat, ping.lng))} />
                      <PrimaryButton label="Já encontramos" onPress={() => void resolverSessao(sessao.id)} />
                    </View>
                    {sessao.responsible_lat != null && sessao.responsible_lng != null && (
                      <>
                        <ThemedText style={styles.negrito}>Sua localização compartilhada</ThemedText>
                        <LocationMap lat={sessao.responsible_lat} lng={sessao.responsible_lng} />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      Ainda não recebemos a primeira posição. Se o envio falhou, você pode descartar esta solicitação.
                    </ThemedText>
                    <SecondaryButton
                      label="Descartar solicitação"
                      tom="perigo"
                      loading={encerrandoSessao === sessao.id}
                      onPress={() => confirmarDescarteSessao(sessao.id)}
                    />
                  </>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {groupId && aba === 'qrcodes' && (
        <Section
          titulo="QR Codes cadastrados"
          acao={<IconButton icone="add" rotulo="Cadastrar QR Code" onPress={() => setMostrandoNovoQr(true)} />}>
          {mostrandoNovoQr && (
            <Card>
              <View style={styles.tituloCard}>
                <Ionicons name="qr-code-outline" size={22} color={theme.brand} />
                <ThemedText type="large" style={styles.negrito}>Novo QR Code</ThemedText>
              </View>
              <IconField
                sobreCartao
                icon="qr-code-outline"
                label="Nome de identificação"
                placeholder="Ex.: Lucas, Mochila da Ana, Rex"
                value={nomeQr}
                onChangeText={setNomeQr}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={cadastrarQr}
              />
              <PrimaryButton label="Cadastrar QR Code" onPress={cadastrarQr} loading={cadastrandoQr} />
              <SecondaryButton
                label="Cancelar"
                onPress={() => {
                  setNomeQr('');
                  setMostrandoNovoQr(false);
                }}
              />
            </Card>
          )}

          {!carregando && qrs.length === 0 ? (
            <EmptyState icone="qr-code-outline" titulo="Nenhum QR Code cadastrado" descricao="Cadastre o primeiro QR com o nome da pessoa, pet ou objeto que ele protegerá." />
          ) : (
            qrs.map((qr) => (
              <Card key={qr.id} style={styles.cartaoLista} onPress={() => abrirQr(qr)}>
                <View style={styles.qrLinha}>
                  <View style={[styles.qrIcone, { backgroundColor: theme.brandSoft }]}>
                    <Ionicons name="qr-code" size={26} color={theme.brand} />
                  </View>
                  <View style={styles.textos}>
                    <ThemedText style={styles.negrito} numberOfLines={1}>{qr.dependent_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" selectable>
                      Código: {qr.short_code}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      <ThemedText type="small" style={[styles.negrito, { color: qr.is_active ? theme.success : theme.danger }]}>
                        {qr.is_active ? 'Ativo' : 'Desativado'}
                      </ThemedText>
                      {' · Uso ilimitado'}
                    </ThemedText>
                  </View>
                  <IconButton
                    icone="pencil-outline"
                    rotulo={`Configurar ${qr.dependent_name}`}
                    variante="contorno"
                    onPress={() => abrirConfiguracaoQr(qr)}
                  />
                </View>
              </Card>
            ))
          )}
        </Section>
      )}

      <JanelaAnimada visivel={!!qrAberto} onFechar={fecharQr}>
        <View style={styles.modalCabecalho}>
          <View style={styles.textos}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {qrExibido?.dependent_name}
            </ThemedText>
          </View>
          <IconButton
            icone="download-outline"
            rotulo="Baixar imagem do QR Code"
            loading={baixandoQr}
            onPress={() => void baixarImagemQr()}
          />
          <IconButton icone="close" rotulo="Fechar" variante="contorno" onPress={fecharQr} />
        </View>

        <Pressable
          accessibilityRole={exibindoLinkQr ? 'link' : 'button'}
          accessibilityLabel={exibindoLinkQr ? 'Abrir página deste QR Code' : 'Mostrar link deste QR Code'}
          onPress={() => {
            if (!qrAberto) return;
            if (exibindoLinkQr) {
              void Linking.openURL(finderUrl(qrAberto.token));
              return;
            }
            setExibindoLinkQr(true);
          }}
          style={[
            styles.imagemFundo,
            {
              backgroundColor: Palette.white,
              borderColor: theme.border,
              height: tamanhoQr + 48,
            },
          ]}>
          <View style={exibindoLinkQr ? styles.qrDesmaiado : undefined} pointerEvents="none">
            {qrExibido && (
              <QRCode
                ref={(referencia) => setQrRenderizado(referencia as QrCodeHandle | null)}
                value={finderUrl(qrExibido.token)}
                size={tamanhoQr}
                margin={4}
                dotStyle="circle"
                dotColor={Palette.graphite}
                backgroundColor={Palette.white}
                corner={{
                  square: { style: 'extra-rounded', color: Palette.graphite },
                  dot: { style: 'circle', color: Palette.graphite },
                }}
                logo={{
                  src: require('@/assets/images/found-qr-logo.png'),
                  size: 0.3,
                  margin: 1,
                  hideDots: true,
                  radius: 0.18,
                }}
                ariaLabel={`QR Code de ${qrExibido.dependent_name}`}
              />
            )}
          </View>
          {qrAberto && exibindoLinkQr && (
            <View style={styles.linkSobreQr} pointerEvents="none">
              <Ionicons name="open-outline" size={24} color={theme.brand} />
              <ThemedText type="smallBold" style={[styles.textoCentralizado, { color: theme.brand }]}>
                Abrir link
              </ThemedText>
            </View>
          )}
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary" style={styles.textoCentralizado}>
          Toque no QR para abrir o link.
        </ThemedText>
      </JanelaAnimada>

      <JanelaAnimada visivel={!!qrConfigurando} onFechar={() => setQrConfigurando(null)} fecharAoTocarFora={false}>
        <View style={styles.modalCabecalho}>
          <View style={styles.textos}>
            <ThemedText type="large" style={styles.negrito}>Configurar QR Code</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Altere as opções deste QR Code.
            </ThemedText>
          </View>
          <IconButton icone="close" rotulo="Fechar" variante="contorno" onPress={() => setQrConfigurando(null)} />
        </View>

        <IconField
          sobreCartao
          icon="qr-code-outline"
          label="Nome de identificação"
          value={nomeQrEditando}
          onChangeText={setNomeQrEditando}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => void salvarEdicaoQr()}
        />
        <PrimaryButton label="Salvar alterações" onPress={() => void salvarEdicaoQr()} loading={salvandoEdicaoQr} />
        <View style={[styles.divisoria, { backgroundColor: theme.border }]} />
        {configExibido && (
          <SecondaryButton
            label={configExibido.is_active ? 'Desativar QR Code' : 'Ativar QR Code'}
            tom={configExibido.is_active ? 'neutro' : 'marca'}
            loading={alterandoQr === configExibido.id}
            onPress={() => void alternarQr(configExibido)}
          />
        )}
        {configExibido && papel === 'chefe' && (
          <SecondaryButton
            label="Excluir QR Code"
            tom="perigo"
            loading={excluindoQr === configExibido.id}
            onPress={() => confirmarExclusaoQr(configExibido)}
          />
        )}
      </JanelaAnimada>
    </Screen>
  );
}

/** Guarda o último valor não nulo, para a janela não esvaziar durante a animação de saída. */
function useUltimo<T>(valor: T | null): T | null {
  const [ultimo, setUltimo] = useState<T | null>(valor);
  if (valor && valor !== ultimo) setUltimo(valor);
  return valor ?? ultimo;
}

function AbaMembros({ groupId, membros, amigos, selecionados, podeEditar, carregando, convidando, onConvidar, onAlternarSelecionado }: {
  groupId?: string;
  membros: Pessoa[];
  amigos: Pessoa[];
  selecionados: string[];
  podeEditar: boolean;
  carregando: boolean;
  convidando: string | null;
  onConvidar: (pessoa: Pessoa) => void;
  onAlternarSelecionado: (profileId: string) => void;
}) {
  return (
    <>
      {groupId && (
        <Section titulo="Membros da família">
          {membros.map((pessoa) => (
            <PersonRow key={pessoa.profile_id} nome={pessoa.full_name} username={pessoa.username} semente={pessoa.profile_id} detalhe={pessoa.papel === 'chefe' ? 'Chefe da família' : `@${pessoa.username}`} />
          ))}
        </Section>
      )}

      {podeEditar && (
        <Section titulo="Adicionar membros">
          {!carregando && amigos.length === 0 ? (
            <EmptyState icone="people-outline" titulo="Nenhum amigo disponível" descricao="Adicione amigos na Comunidade. Depois, eles aparecerão aqui para receber um convite." />
          ) : (
            amigos.map((pessoa) => {
              const selecionado = selecionados.includes(pessoa.profile_id);
              return (
                <PersonRow
                  key={pessoa.profile_id}
                  nome={pessoa.full_name}
                  username={pessoa.username}
                  semente={pessoa.profile_id}
                  direita={
                    groupId ? (
                      <ActionPill
                        label="Convidar"
                        loading={convidando === pessoa.profile_id}
                        onPress={() => onConvidar(pessoa)}
                      />
                    ) : (
                      <ActionPill
                        label={selecionado ? 'Selecionado' : 'Adicionar'}
                        variante={selecionado ? 'suave' : 'escuro'}
                        icone={selecionado ? 'checkmark' : undefined}
                        onPress={() => onAlternarSelecionado(pessoa.profile_id)}
                      />
                    )
                  }
                />
              );
            })
          )}
          {!groupId && amigos.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.nota}>
              Os amigos selecionados receberão um convite depois que a família for criada.
            </ThemedText>
          )}
        </Section>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  acoesCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tituloCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  negrito: { fontWeight: 700 },
  lista: { gap: Spacing.two },
  nota: { paddingHorizontal: Spacing.two },
  cartaoLista: { padding: Spacing.three },
  textos: { flex: 1, minWidth: 0 },
  qrLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  qrIcone: { width: 56, height: 56, borderRadius: Radii.medium, alignItems: 'center', justifyContent: 'center' },
  alertaCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  alertaIcone: { width: 48, height: 48, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  modalCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  divisoria: { height: 1 },
  imagemFundo: {
    width: '100%',
    borderRadius: Radii.large,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    overflow: 'hidden',
  },
  qrDesmaiado: { opacity: 0.12 },
  linkSobreQr: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  textoCentralizado: { textAlign: 'center' },
});
