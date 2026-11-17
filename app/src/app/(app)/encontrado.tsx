import * as Location from 'expo-location';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Icone } from '@/components/icone';
import { LocationMap } from '@/components/location-map';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { traduzErroBanco } from '@/lib/db-errors';
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
  const params = useLocalSearchParams<{ sessao?: string }>();
  const sessaoId = Array.isArray(params.sessao) ? params.sessao[0] : params.sessao;
  return <SessaoEncontrada key={sessaoId ?? 'nenhuma'} sessaoId={sessaoId} />;
}

function SessaoEncontrada({ sessaoId }: { sessaoId?: string }) {
  const theme = useTheme();
  const { notificar } = useToast();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [ping, setPing] = useState<Ping | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  const carregar = useCallback(async () => {
    if (!sessaoId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const [resSessao, resPing] = await Promise.all([
      supabase
        .from('tracking_sessions')
        .select('id, group_id, status, started_at, responsible_lat, responsible_lng, qr_codes(dependent_name)')
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

  async function compartilharLocalizacao() {
    if (!sessao) return;
    setCompartilhando(true);
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      setCompartilhando(false);
      notificar({ titulo: 'Localização não permitida', mensagem: 'Autorize a localização para que a pessoa que encontrou o QR possa ver onde você está.', tom: 'aviso' });
      return;
    }
    const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { error } = await supabase.rpc('record_responsible_location', {
      p_session_id: sessao.id,
      p_lat: posicao.coords.latitude,
      p_lng: posicao.coords.longitude,
      p_accuracy_m: posicao.coords.accuracy,
      p_recorded_at: new Date(posicao.timestamp).toISOString(),
    });
    setCompartilhando(false);
    if (error) {
      notificar({ titulo: 'Não foi possível compartilhar', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return;
    }
    setSessao({ ...sessao, responsible_lat: posicao.coords.latitude, responsible_lng: posicao.coords.longitude });
    notificar({ titulo: 'Localização compartilhada', mensagem: 'A pessoa que escaneou o QR agora vê sua posição no mapa.', tom: 'sucesso' });
  }

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

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const verFamilia = () =>
    sessao && router.push(`/configurar-familia?id=${sessao.group_id}&aba=qrcodes` as Href);
  const nome = nomeDoQr(sessao);

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
      atualizando={carregando}>
      <Card>
        <View style={styles.cabecalho}>
          <View style={[styles.icone, { backgroundColor: theme.brandSoft }]}>
            <Icone nome={ping ? 'map-pin' : 'radio'} tamanho={24} cor={theme.brand} />
          </View>
          <View style={styles.textos}>
            <ThemedText style={styles.negrito}>
              {ping ? 'Localização ao vivo' : 'Aguardando a localização'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {ping
                ? `Atualizada ${tempoRelativo(ping.recorded_at)}`
                : 'A pessoa que escaneou ainda não liberou o GPS.'}
            </ThemedText>
          </View>
        </View>

        {ping ? (
          <>
            <LocationMap
              selo={`Atualizada ${tempoRelativo(ping.recorded_at)}`}
              pontos={[
                { lat: ping.lat, lng: ping.lng, tipo: 'encontrado', rotulo: nome },
                ...(sessao.responsible_lat != null && sessao.responsible_lng != null
                  ? [{ lat: sessao.responsible_lat, lng: sessao.responsible_lng, tipo: 'pessoa' as const, rotulo: 'Você' }]
                  : []),
              ]}
            />
            {ping.accuracy_m ? (
              <ThemedText type="small" themeColor="textSecondary">
                Precisão aproximada de {Math.round(ping.accuracy_m)} m
              </ThemedText>
            ) : null}
            <View style={styles.acoes}>
              <SecondaryButton
                compacto
                bloco
                tom="marca"
                label="Compartilhar minha localização"
                loading={compartilhando}
                onPress={() => void compartilharLocalizacao()}
              />
              <SecondaryButton
                compacto
                bloco
                tom="marca"
                label="Abrir no mapa"
                onPress={() => void Linking.openURL(openStreetMapUrl(ping.lat, ping.lng))}
              />
            </View>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Assim que a posição chegar, o mapa aparece aqui sozinho. Você pode deixar esta tela aberta.
          </ThemedText>
        )}
      </Card>

      <View style={styles.acoes}>
        <PrimaryButton label="Já encontramos" loading={encerrando} onPress={() => void encerrar()} />
        <SecondaryButton label="Ver família" onPress={() => verFamilia()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  carregando: { paddingVertical: Spacing.five, alignItems: 'center' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icone: { width: 48, height: 48, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  negrito: { fontWeight: 700 },
  acoes: { gap: Spacing.two },
});
