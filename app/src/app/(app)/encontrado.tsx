import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/action-pill';
import { AvisoPosicaoAntiga } from '@/components/aviso-posicao';
import { BotaoMinhaLocalizacao } from '@/components/botao-minha-localizacao';
import { Card } from '@/components/card';
import { ChatSessao } from '@/components/chat-sessao';
import { EmptyState } from '@/components/empty-state';
import { Icone } from '@/components/icone';
import { LocationMap } from '@/components/location-map';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { Radii, Spacing } from '@/constants/theme';
import { useAgora } from '@/hooks/use-agora';
import { useTheme } from '@/hooks/use-theme';
import { traduzErroBanco } from '@/lib/db-errors';
import { idadePosicao } from '@/lib/idade-posicao';
import { openStreetMapUrl } from '@/lib/map-url';
import { supabase } from '@/lib/supabase';
import { tempoRelativo } from '@/lib/tempo-relativo';

type Sessao = {
  id: string;
  group_id: string;
  status: 'awaiting_consent' | 'active' | 'ended';
  started_at: string;
  responsible_lat: number | null;
  responsible_lng: number | null;
  finder_location_paused_at: string | null;
  qr_codes: { dependent_name: string } | { dependent_name: string }[] | null;
};
type Ping = {
  id: number;
  session_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  recorded_at: string;
};

const nomeDoQr = (sessao: Sessao | null) => {
  const qr = Array.isArray(sessao?.qr_codes) ? sessao.qr_codes[0] : sessao?.qr_codes;
  return qr?.dependent_name ?? 'Seu QR Code';
};

/**
 * Destino do push "[nome] foi encontrado": uma sessão de rastreamento só, ao
 * vivo. A rota é uma aba oculta (fica montada); a `key` faz cada sessão
 * começar do zero, como em `configurar-familia`.
 */
export default function EncontradoScreen() {
  const params = useLocalSearchParams<{ sessao?: string; chat?: string }>();
  const sessaoId = Array.isArray(params.sessao) ? params.sessao[0] : params.sessao;
  // `chat` vem do push de mensagem: abre a conversa direto.
  const chat = Array.isArray(params.chat) ? params.chat[0] : params.chat;
  return <SessaoEncontrada key={sessaoId ?? 'nenhuma'} sessaoId={sessaoId} abrirChat={chat} />;
}

function SessaoEncontrada({ sessaoId, abrirChat }: { sessaoId?: string; abrirChat?: string }) {
  const theme = useTheme();
  const { notificar } = useToast();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [ping, setPing] = useState<Ping | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [encerrando, setEncerrando] = useState(false);
  const agora = useAgora();

  const carregar = useCallback(async () => {
    if (!sessaoId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const [resSessao, resPing] = await Promise.all([
      supabase
        .from('tracking_sessions')
        .select('id, group_id, status, started_at, responsible_lat, responsible_lng, finder_location_paused_at, qr_codes(dependent_name)')
        .eq('id', sessaoId)
        .maybeSingle<Sessao>(),
      supabase
        .from('location_pings')
        .select('id, session_id, lat, lng, accuracy_m, recorded_at')
        .eq('session_id', sessaoId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle<Ping>(),
    ]);
    setCarregando(false);
    if (resSessao.error) {
      notificar({ titulo: 'Não foi possível carregar', mensagem: traduzErroBanco(resSessao.error.message), tom: 'erro' });
      return;
    }
    setSessao(resSessao.data);
    if (!resPing.error) setPing(resPing.data);
  }, [notificar, sessaoId]);

  useEffect(() => {
    const temporizador = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(temporizador);
  }, [carregar]);

  // Ao vivo: a posição chega e o status muda (consentiu, encerrou) sem recarregar.
  useEffect(() => {
    if (!sessaoId) return;
    const canal = supabase
      .channel(`sessao-encontrada-${sessaoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_pings', filter: `session_id=eq.${sessaoId}` },
        (payload) => {
          const novo = payload.new as Ping;
          setPing((atual) => (!atual || novo.recorded_at >= atual.recorded_at ? novo : atual));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tracking_sessions', filter: `id=eq.${sessaoId}` },
        (payload) => {
          const nova = payload.new as Omit<Sessao, 'qr_codes'>;
          setSessao((atual) => (atual ? { ...atual, ...nova } : atual));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [sessaoId]);

  async function encerrar() {
    if (!sessao) return;
    setEncerrando(true);
    const { error } = await supabase.rpc('resolve_tracking_session', { p_session_id: sessao.id });
    setEncerrando(false);
    if (error) {
      notificar({ titulo: 'Não foi possível encerrar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setSessao({ ...sessao, status: 'ended' });
    notificar({ titulo: 'Atendimento encerrado', mensagem: 'O celular que compartilhou a localização receberá o aviso.', tom: 'sucesso' });
  }

  const verFamilia = () =>
    sessao && router.push(`/configurar-familia?id=${sessao.group_id}&aba=qrcodes&v=${Date.now()}` as Href);
  // Nas abas, `router.back()` volta para a última aba do histórico (ex.:
  // Comunidade), não para a família. O atendimento pertence à aba QR Codes da
  // família dele, então a seta leva sempre para lá (venha do card, do push ou
  // do banner de mensagem).
  const voltar = () => (sessao ? verFamilia() : router.replace('/'));
  const nome = nomeDoQr(sessao);
  const idade = ping ? idadePosicao(ping.recorded_at, agora) : null;
  // Quem encontrou pausou a localização (a conversa continua): não é atraso, é escolha.
  const pausada = Boolean(sessao?.finder_location_paused_at);
  const parada = !pausada && idade !== null && !idade.aoVivo;

  if (carregando && !sessao) {
    return (
      <Screen aoVoltar={voltar}>
        <View style={styles.carregando}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (!sessao) {
    return (
      <Screen aoVoltar={voltar}>
        <EmptyState
          icone="search"
          titulo="Alerta não encontrado"
          descricao="Este aviso não existe mais ou você não participa da família dele."
          acao={<PrimaryButton label="Ir para o início" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  if (sessao.status === 'ended') {
    return (
      <Screen aoVoltar={voltar}>
        <EmptyState
          icone="check-circle"
          titulo="Atendimento encerrado"
          descricao={`O compartilhamento de ${nome} terminou. Obrigado por usar o Found.`}
          acao={<SecondaryButton label="Ver família" onPress={() => verFamilia()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen
      aoVoltar={voltar}
      titulo={`${nome} foi encontrado!`}
      subtitulo={`Alguém escaneou o QR Code ${tempoRelativo(sessao.started_at)}.`}
      aoAtualizar={() => void carregar()}
      atualizando={carregando}
      fab={sessao.status === 'active' ? <ChatSessao sessaoId={sessao.id} abrirSinal={abrirChat} /> : undefined}>
      <Card>
        <View style={styles.cabecalho}>
          <View
            style={[
              styles.icone,
              { backgroundColor: pausada ? theme.backgroundSelected : parada ? theme.warningSoft : theme.brandSoft },
            ]}>
            <Icone
              nome={pausada ? 'pause' : !ping ? 'radio' : idade?.aoVivo ? 'map-pin' : 'clock'}
              tamanho={24}
              cor={pausada ? theme.textSecondary : parada ? theme.warning : theme.brand}
            />
          </View>
          <View style={styles.textos}>
            <ThemedText style={styles.negrito}>
              {pausada
                ? 'Localização pausada'
                : !ping
                  ? 'Aguardando a localização'
                  : idade?.aoVivo
                    ? 'Localização ao vivo'
                    : 'Última posição conhecida'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {pausada
                ? 'Quem encontrou parou de compartilhar. A conversa continua aberta.'
                : idade
                  ? `Atualizada ${idade.ha}`
                  : 'A pessoa que escaneou ainda não liberou o GPS.'}
            </ThemedText>
          </View>
        </View>

        {ping ? (
          <>
            {parada && idade && <AvisoPosicaoAntiga ha={idade.ha} />}
            {/* Selo sem segundos: trocar o texto recarrega o mapa (WebView). */}
            <LocationMap
              selo={!pausada && idade?.aoVivo ? 'Ao vivo' : 'Última posição conhecida'}
              pontos={[
                { lat: ping.lat, lng: ping.lng, tipo: 'encontrado', rotulo: nome },
                ...(sessao.responsible_lat != null && sessao.responsible_lng != null
                  ? [{ lat: sessao.responsible_lat, lng: sessao.responsible_lng, tipo: 'pessoa' as const, rotulo: 'Você' }]
                  : []),
              ]}
            />
            {/* Uma linha: precisão à esquerda, "Abrir no mapa" compacto à direita. */}
            <View style={styles.rodapeMapa}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.precisao}>
                {ping.accuracy_m ? `Precisão de ~${Math.round(ping.accuracy_m)} m` : 'Precisão desconhecida'}
              </ThemedText>
              <ActionPill
                label="Abrir no mapa"
                icone="external-link"
                variante="contorno"
                altura={44}
                onPress={() => void Linking.openURL(openStreetMapUrl(ping.lat, ping.lng))}
              />
            </View>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Assim que a posição chegar, o mapa aparece aqui sozinho. Você pode deixar esta tela aberta.
          </ThemedText>
        )}
        {/* Fora do mapa: dá para mostrar a própria posição mesmo antes de a de quem encontrou chegar. */}
        <BotaoMinhaLocalizacao sessaoId={sessao.id} ativa={sessao.status === 'active'} />
      </Card>

      {/* Uma ação principal só; voltar à família é a seta do topo. */}
      <PrimaryButton label="Já encontramos" loading={encerrando} onPress={() => void encerrar()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rodapeMapa: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  precisao: { flex: 1 },
  carregando: { paddingVertical: Spacing.five, alignItems: 'center' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icone: { width: 48, height: 48, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  negrito: { fontWeight: 700 },
});
