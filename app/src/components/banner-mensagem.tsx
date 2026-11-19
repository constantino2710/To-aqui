import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FundoCartao, sombraCartao } from '@/components/card';
import { Icone } from '@/components/icone';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { EscalaToque, Motion } from '@/constants/motion';
import { Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { chatAbertoAgora } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

type Familia = { group_id: string };
type NovaMensagem = { id: number; session_id: string; sender: 'finder' | 'family'; body: string };
type SessaoCodigo = { qr_codes: { dependent_name: string } | { dependent_name: string }[] | null };

type Aviso = {
  sessaoId: string;
  nome: string;
  texto: string;
  /** Quantas mensagens chegaram desde que o banner apareceu. */
  quantidade: number;
  /** Muda a cada mensagem, para reiniciar o tempo do banner. */
  chave: number;
};

const DURACAO_MS = 6000;

/**
 * Banner de mensagem nova, no estilo de notificação de app de conversa: quem
 * mandou + o texto, e um toque abre o chat. Aparece com o app aberto em
 * qualquer tela (o push do sistema cobre o app fechado). Não aparece quando a
 * conversa daquela sessão já está aberta.
 */
export function BannerMensagem() {
  const { session } = useAuth();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const nomes = useRef(new Map<string, string>());

  useEffect(() => {
    if (!session) return;
    let ativo = true;
    let canal: ReturnType<typeof supabase.channel> | null = null;

    void supabase.rpc('list_my_groups').then(({ data }) => {
      if (!ativo) return;
      const familias = (data ?? []) as Familia[];
      canal = supabase.channel(`mensagens-${session.user.id}`);
      familias.forEach((familia) => {
        canal?.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `group_id=eq.${familia.group_id}` },
          (payload) => {
            const mensagem = payload.new as NovaMensagem;
            if (mensagem.sender !== 'finder' || chatAbertoAgora() === mensagem.session_id) return;
            void (async () => {
              let nome = nomes.current.get(mensagem.session_id);
              if (!nome) {
                const { data: sessao } = await supabase
                  .from('tracking_sessions')
                  .select('qr_codes(dependent_name)')
                  .eq('id', mensagem.session_id)
                  .maybeSingle<SessaoCodigo>();
                const qr = Array.isArray(sessao?.qr_codes) ? sessao.qr_codes[0] : sessao?.qr_codes;
                nome = qr?.dependent_name?.trim() || 'seu QR Code';
                nomes.current.set(mensagem.session_id, nome);
              }
              if (!ativo) return;
              if (Platform.OS !== 'web') Vibration.vibrate([0, 120, 80, 120]);
              setAviso((atual) => ({
                sessaoId: mensagem.session_id,
                nome: nome ?? 'seu QR Code',
                texto: mensagem.body,
                quantidade: atual?.sessaoId === mensagem.session_id ? atual.quantidade + 1 : 1,
                chave: mensagem.id,
              }));
            })();
          },
        );
      });
      canal.subscribe();
    });

    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [session]);

  const fechar = useCallback(() => setAviso(null), []);

  if (!aviso) return null;
  return <CartaoAviso key={aviso.sessaoId} aviso={aviso} aoFechar={fechar} />;
}

function CartaoAviso({ aviso, aoFechar }: { aviso: Aviso; aoFechar: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduzido = useMovimentoReduzido();
  const [progresso] = useState(() => new Animated.Value(0));

  const sair = useCallback(() => {
    Animated.timing(progresso, {
      toValue: 0,
      duration: reduzido ? 0 : Motion.rapido,
      easing: Motion.saida,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) aoFechar();
    });
  }, [aoFechar, progresso, reduzido]);

  // Entra descendo e "pousa"; cada mensagem nova reinicia o tempo na tela.
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: 1,
      duration: reduzido ? 0 : Motion.base,
      easing: Motion.suave,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    const timer = setTimeout(sair, DURACAO_MS);
    return () => clearTimeout(timer);
  }, [aviso.chave, progresso, reduzido, sair]);

  function abrir() {
    aoFechar();
    router.push(`/encontrado?sessao=${aviso.sessaoId}&chat=${Date.now()}` as Href);
  }

  const translateY = progresso.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <View pointerEvents="box-none" style={[styles.viewport, { paddingTop: insets.top + Spacing.two }]}>
      <Animated.View style={[styles.sombra, { opacity: progresso, transform: [{ translateY }] }]}>
        {/* Dois botões lado a lado no mesmo cartão (abrir a conversa / dispensar),
            nunca um dentro do outro: na web isso vira <button> dentro de <button>. */}
        <View
          accessibilityLiveRegion="polite"
          style={[styles.cartao, sombraCartao(theme.shadow), { backgroundColor: theme.backgroundElement }]}>
          <FundoCartao />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Mensagem de quem encontrou ${aviso.nome}: ${aviso.texto}. Toque para abrir a conversa.`}
            onPress={abrir}
            escala={EscalaToque.cartao}
            externo={styles.abrirExterno}
            style={styles.abrir}>
            <View style={[styles.icone, { backgroundColor: theme.brandSoft }]}>
              <Icone nome="message-circle" tamanho={22} cor={theme.brand} />
            </View>
            <View style={styles.textos}>
              <View style={styles.linhaTitulo}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.titulo}>
                  Quem encontrou {aviso.nome}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  agora
                </ThemedText>
              </View>
              <ThemedText numberOfLines={2}>{aviso.texto}</ThemedText>
              {aviso.quantidade > 1 && (
                <ThemedText type="small" themeColor="brand">
                  {aviso.quantidade} mensagens novas
                </ThemedText>
              )}
            </View>
          </PressableScale>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dispensar"
            hitSlop={12}
            onPress={sair}
            style={[styles.fechar, { backgroundColor: theme.backgroundSelected }]}>
            <Icone nome="x" tamanho={16} cor={theme.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1900,
    elevation: 19,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  sombra: { width: '100%', maxWidth: 520 },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.extraLarge,
    overflow: 'hidden',
  },
  abrirExterno: { flex: 1, minWidth: 0 },
  abrir: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icone: { width: 44, height: 44, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: Spacing.half },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titulo: { flexShrink: 1 },
  fechar: { width: 32, height: 32, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
});
