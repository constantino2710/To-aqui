import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionPill } from '@/components/action-pill';
import { FundoCartao } from '@/components/card';
import { Fab } from '@/components/fab';
import { IconButton } from '@/components/icon-button';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { FontSize, JakartaFamilies, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { traduzErroBanco } from '@/lib/db-errors';
import { marcarChatAberto } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

type Mensagem = {
  id: number;
  session_id: string;
  sender: 'finder' | 'family';
  sender_id: string | null;
  body: string;
  created_at: string;
};

const LIMITE = 500;
/** Respostas de um toque, só até a família mandar a primeira mensagem. */
const RAPIDAS = ['Estou a caminho', 'Pode esperar aí, por favor?', 'Muito obrigado!'];

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// No navegador, o <input> ganha anel de foco próprio dentro da pílula.
const semAnelDoNavegador = (Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}) as TextStyle;

/**
 * Última mensagem de quem encontrou que já foi vista, por sessão. Fica fora do
 * componente para o contador do FAB não voltar ao sair e entrar na tela.
 */
const vistasPorSessao = new Map<string, number>();

/** Mensagens da sessão: carga inicial + Realtime, e o envio da família. */
function useMensagens(sessaoId: string) {
  const { notificar } = useToast();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [enviando, setEnviando] = useState(false);

  const juntar = useCallback((novas: Mensagem[]) => {
    setMensagens((atuais) => {
      const vistos = new Set(atuais.map((m) => m.id));
      return [...atuais, ...novas.filter((m) => !vistos.has(m.id))].sort((a, b) => a.id - b.id);
    });
  }, []);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from('session_messages')
      .select('id, session_id, sender, sender_id, body, created_at')
      .eq('session_id', sessaoId)
      .order('id', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!cancelado && data) juntar(data as Mensagem[]);
      });

    const canal = supabase
      .channel(`chat-sessao-${sessaoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessaoId}` },
        (payload) => juntar([payload.new as Mensagem]),
      )
      .subscribe();

    return () => {
      cancelado = true;
      void supabase.removeChannel(canal);
    };
  }, [juntar, sessaoId]);

  async function enviar(corpo: string) {
    const limpo = corpo.trim();
    if (!limpo || enviando) return false;
    setEnviando(true);
    const { data, error } = await supabase.rpc('send_family_message', {
      p_session_id: sessaoId,
      p_body: limpo.slice(0, LIMITE),
    });
    setEnviando(false);
    if (error) {
      notificar({ titulo: 'Mensagem não enviada', mensagem: traduzErroBanco(error.message), tom: 'erro' });
      return false;
    }
    // Não espera o Realtime: a própria mensagem aparece na hora.
    if (data) juntar([data as Mensagem]);
    return true;
  }

  return { mensagens, enviando, enviar };
}

export type ChatSessaoProps = {
  sessaoId: string;
  /** Muda de valor para abrir a conversa (ex.: ao tocar no push de mensagem). */
  abrirSinal?: string;
};

/**
 * Conversa entre a família e quem encontrou o QR: um FAB com o contador de
 * mensagens não lidas, que abre o chat em tela cheia. Quem encontrou não tem
 * identidade (aparece como "Quem encontrou"); do lado de lá, a família aparece
 * só como "Família". Vai na prop `fab` do `Screen`.
 */
export function ChatSessao({ sessaoId, abrirSinal }: ChatSessaoProps) {
  const { mensagens, enviando, enviar } = useMensagens(sessaoId);
  const [aberto, setAberto] = useState(Boolean(abrirSinal));
  const [vistaAte, setVistaAte] = useState(() => vistasPorSessao.get(sessaoId) ?? 0);

  // Um novo toque no push (sinal diferente) abre de novo.
  const [sinalAnterior, setSinalAnterior] = useState(abrirSinal);
  if (abrirSinal !== sinalAnterior) {
    setSinalAnterior(abrirSinal);
    if (abrirSinal) setAberto(true);
  }

  const ultimaDeQuemEncontrou = mensagens.reduce(
    (maior, m) => (m.sender === 'finder' ? Math.max(maior, m.id) : maior),
    0,
  );
  // Com o chat aberto, tudo o que chega já está sendo visto.
  if (aberto && ultimaDeQuemEncontrou > vistaAte) setVistaAte(ultimaDeQuemEncontrou);
  useEffect(() => {
    vistasPorSessao.set(sessaoId, vistaAte);
  }, [sessaoId, vistaAte]);

  // Enquanto a conversa está na tela, o push das mensagens dela não aparece.
  useEffect(() => {
    marcarChatAberto(aberto ? sessaoId : null);
    return () => marcarChatAberto(null);
  }, [aberto, sessaoId]);

  const naoLidas = mensagens.filter((m) => m.sender === 'finder' && m.id > vistaAte).length;

  return (
    <>
      <Fab
        icone="message-circle"
        accessibilityLabel={
          naoLidas > 0 ? `Abrir conversa, ${naoLidas} mensagens novas` : 'Abrir conversa com quem encontrou'
        }
        contador={naoLidas}
        onPress={() => setAberto(true)}
      />
      <JanelaChat
        visivel={aberto}
        aoFechar={() => setAberto(false)}
        mensagens={mensagens}
        enviando={enviando}
        aoEnviar={enviar}
      />
    </>
  );
}

type JanelaChatProps = {
  visivel: boolean;
  aoFechar: () => void;
  mensagens: Mensagem[];
  enviando: boolean;
  aoEnviar: (texto: string) => Promise<boolean>;
};

/** O chat em tela cheia: cabeçalho, mensagens e campo de envio na base. */
function JanelaChat({ visivel, aoFechar, mensagens, enviando, aoEnviar }: JanelaChatProps) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const meuId = session?.user.id;
  const [texto, setTexto] = useState('');
  const rolagemRef = useRef<ScrollView>(null);

  // As sugestões somem quando a família manda a primeira mensagem.
  const familiaJaEscreveu = mensagens.some((m) => m.sender === 'family');

  async function enviar(corpo: string) {
    if (await aoEnviar(corpo)) setTexto('');
  }

  const rotulo = (m: Mensagem) =>
    m.sender === 'finder' ? 'Quem encontrou' : m.sender_id === meuId ? 'Você' : 'Família';

  return (
    <Modal
      visible={visivel}
      animationType={reduzido ? 'none' : 'slide'}
      onRequestClose={aoFechar}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.janela, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.cabecalho, { paddingTop: insets.top + Spacing.three }]}>
          <IconButton icone="arrow-left" rotulo="Fechar conversa" variante="claro" onPress={aoFechar} />
          <View style={styles.textos}>
            <ThemedText type="large" style={styles.negrito} accessibilityRole="header">
              Conversa
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              Quem encontrou não vê o nome de ninguém da família.
            </ThemedText>
          </View>
        </View>

        <ScrollView
          ref={rolagemRef}
          style={styles.lista}
          contentContainerStyle={[styles.listaConteudo, mensagens.length === 0 && styles.listaVazia]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => rolagemRef.current?.scrollToEnd({ animated: !reduzido })}
          accessibilityLabel="Mensagens"
          accessibilityLiveRegion="polite">
          {mensagens.length === 0 ? (
            <View style={styles.vazio}>
              <View style={[styles.vazioIcone, { backgroundColor: theme.brandSoft }]}>
                <Icone nome="message-circle" tamanho={28} cor={theme.brand} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.vazioTexto}>
                Mande uma mensagem para combinar onde se encontrar. A resposta aparece aqui.
              </ThemedText>
            </View>
          ) : (
            mensagens.map((m) => {
              const daFamilia = m.sender === 'family';
              const minha = daFamilia && m.sender_id === meuId;
              const fundo = minha ? theme.action : daFamilia ? theme.backgroundSelected : theme.brandSoft;
              const cor = minha ? theme.onAction : daFamilia ? theme.text : theme.brand;
              return (
                <View key={m.id} style={[styles.mensagem, daFamilia ? styles.direita : styles.esquerda]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
                    {rotulo(m)} · {hora(m.created_at)}
                  </ThemedText>
                  <View style={[styles.balao, { backgroundColor: fundo }]}>
                    <ThemedText style={{ color: cor }}>{m.body}</ThemedText>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.base, { paddingBottom: insets.bottom + Spacing.three }]}>
          {!familiaJaEscreveu && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.rapidas}>
              {RAPIDAS.map((rapida) => (
                <ActionPill
                  key={rapida}
                  label={rapida}
                  variante="suave"
                  altura={44}
                  disabled={enviando}
                  onPress={() => void enviar(rapida)}
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.envio}>
            <View style={[styles.campo, { backgroundColor: theme.backgroundElement }]}>
              <FundoCartao de={theme.fieldGradientFrom} para={theme.fieldGradientTo} />
              <TextInput
                value={texto}
                onChangeText={setTexto}
                maxLength={LIMITE}
                placeholder="Escreva uma mensagem"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Mensagem para quem encontrou"
                returnKeyType="send"
                submitBehavior="submit"
                onSubmitEditing={() => void enviar(texto)}
                style={[styles.input, semAnelDoNavegador, { color: theme.text }]}
              />
            </View>
            <IconButton
              icone="send"
              rotulo="Enviar mensagem"
              tamanho={56}
              loading={enviando}
              disabled={!texto.trim()}
              onPress={() => void enviar(texto)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  janela: { flex: 1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  textos: { flex: 1, minWidth: 0 },
  negrito: { fontWeight: 700 },
  lista: { flex: 1 },
  listaConteudo: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  listaVazia: { flexGrow: 1, justifyContent: 'center' },
  vazio: { alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  vazioIcone: { width: 64, height: 64, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  vazioTexto: { textAlign: 'center' },
  mensagem: { maxWidth: '85%', gap: Spacing.one },
  direita: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  esquerda: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  meta: { paddingHorizontal: Spacing.two },
  balao: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.large,
  },
  base: { gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  rapidas: { gap: Spacing.two },
  envio: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  campo: {
    flex: 1,
    height: 56,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  // Na web, o degradê (absoluto) é pintado por cima de irmãos sem posição;
  // `relative` + zIndex põe o campo acima dele, e aí ele recebe toque e foco.
  input: {
    position: 'relative',
    zIndex: 1,
    fontFamily: JakartaFamilies[400],
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    padding: 0,
  },
});
