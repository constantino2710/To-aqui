import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { Avatar } from '@/components/avatar';
import { FundoCartao, sombraCartao } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDevAccounts } from '@/lib/dev-accounts';
import {
  getSavedAccounts,
  type SavedAccount,
  subscribeSavedAccounts,
  upsertSavedAccount,
} from '@/lib/saved-accounts';
import { soltarFocoDevolvido } from '@/lib/foco-web';
import { supabase } from '@/lib/supabase';

export type DevAccountSwitcherProps = {
  /** E-mail logado agora, para marcar a conta ativa na lista. */
  currentEmail?: string;
  /** Texto do botão que abre a lista. */
  label?: string;
  /** Chamado após trocar de conta com sucesso (ex.: voltar para a Início). */
  aposTrocar?: () => void;
};

/**
 * Troca rápida entre contas, no estilo do seletor do Instagram. As contas em
 * que você já logou ficam salvas; tocar numa restaura a sessão dela (sem digitar
 * senha). "Adicionar conta" leva ao login para somar outra. Só em desenvolvimento.
 */
export function DevAccountSwitcher({ currentEmail, label = 'Trocar de conta', aposTrocar }: DevAccountSwitcherProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [contas, setContas] = useState<SavedAccount[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [semeando, setSemeando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // 0 = fechada, 1 = aberta. O fundo usa como opacidade e a folha como deslocamento.
  const [progresso] = useState(() => new Animated.Value(0));
  const [alturaFolha, setAlturaFolha] = useState(600);

  function abrir() {
    setAberto(true);
    Animated.timing(progresso, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  function fechar() {
    Animated.timing(progresso, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setAberto(false);
      soltarFocoDevolvido();
    });
  }

  useEffect(() => {
    let vivo = true;
    const recarregar = () => {
      getSavedAccounts().then((lista) => vivo && setContas(lista));
    };
    recarregar();
    const cancelar = subscribeSavedAccounts(recarregar);
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  if (!__DEV__) return null;

  const contasTeste = getDevAccounts();

  function nomeConta(a: SavedAccount) {
    const contaTeste = contasTeste.find((conta) => conta.email.toLowerCase() === a.email.toLowerCase());
    return a.fullName ?? contaTeste?.label ?? a.username ?? a.email;
  }

  function identificadorConta(a: SavedAccount) {
    return a.username ? `@${a.username}` : a.email;
  }

  function ehAtiva(a: SavedAccount) {
    return !!currentEmail && a.email.toLowerCase() === currentEmail.toLowerCase();
  }

  async function trocar(a: SavedAccount) {
    if (ehAtiva(a)) {
      fechar();
      return;
    }
    setOcupado(a.userId);
    setErro(null);
    const { error } = await supabase.auth.setSession({
      access_token: a.accessToken,
      refresh_token: a.refreshToken,
    });
    setOcupado(null);
    if (error) {
      setErro(`${a.username ?? a.email}: a sessão expirou. Remova e entre de novo.`);
      return;
    }
    fechar();
    aposTrocar?.();
  }

  async function adicionar() {
    setErro(null);
    // Logout só local: não revoga o token no servidor, então dá para voltar.
    await supabase.auth.signOut({ scope: 'local' });
    fechar();
  }

  async function semearTeste() {
    setSemeando(true);
    setErro(null);
    for (const d of contasTeste) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: d.email,
        password: d.password,
      });
      if (error) {
        setErro(`${d.label}: ${error.message}`);
        break;
      }
      const sessao = data.session;
      if (!sessao) continue;

      // Busca o username AGORA, enquanto esta conta está ativa — a RLS só deixa
      // ler o próprio perfil, então isso precisa acontecer antes do próximo login.
      const { data: perfil } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', sessao.user.id)
        .single();

      await upsertSavedAccount({
        userId: sessao.user.id,
        email: sessao.user.email ?? d.email,
        username: perfil?.username ?? undefined,
        fullName: perfil?.full_name ?? undefined,
        accessToken: sessao.access_token,
        refreshToken: sessao.refresh_token,
      });
    }
    setSemeando(false);
  }

  // Inclui contas de teste ainda não salvas e também as salvas sem username,
  // para o botão reaparecer e completar o @username que faltou.
  const naoSalvas = contasTeste.filter((d) => {
    const existente = contas.find((c) => c.email.toLowerCase() === d.email.toLowerCase());
    return !existente || !existente.username;
  });

  const contaAtual = contas.find(ehAtiva);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={abrir}
        style={[styles.trigger, sombraCartao(theme.shadow), { backgroundColor: theme.backgroundElement }]}>
        <FundoCartao />
        {contaAtual ? (
          <Avatar
            nome={nomeConta(contaAtual)}
            semente={contaAtual.userId}
            tamanho={40}
          />
        ) : (
          <View style={[styles.triggerIcone, { backgroundColor: theme.background }]}>
            <Icone nome="users" tamanho={18} cor={theme.text} />
          </View>
        )}
        <View style={styles.triggerTextos}>
          <ThemedText type="smallBold">
            {contaAtual ? nomeConta(contaAtual) : label}
          </ThemedText>
          {contaAtual && (
            <ThemedText type="small" themeColor="textSecondary">
              Toque para trocar de conta
            </ThemedText>
          )}
        </View>
        <Icone nome="chevron-right" tamanho={18} cor={theme.textSecondary} estilo={styles.triggerSeta} />
      </Pressable>

      <Modal visible={aberto} transparent animationType="none" statusBarTranslucent onRequestClose={fechar}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: progresso }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={fechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            />
          </Animated.View>
          <Animated.View
            onLayout={(e) => setAlturaFolha(e.nativeEvent.layout.height)}
            style={{
              transform: [
                {
                  translateY: progresso.interpolate({
                    inputRange: [0, 1],
                    outputRange: [alturaFolha, 0],
                  }),
                },
              ],
            }}>
            <ThemedView
              type="backgroundElement"
              style={[styles.folha, sombraCartao(theme.shadow), { paddingBottom: Math.max(insets.bottom, Spacing.four) }]}>
              <FundoCartao />
              <View style={[styles.puxador, { backgroundColor: theme.border }]} />
              <View style={styles.titulos}>
                <ThemedText type="subtitle">Trocar de conta</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Toque numa conta para entrar sem digitar senha.
                </ThemedText>
              </View>

              {contas.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Nenhuma conta salva ainda. Faça login numa conta e ela aparece aqui.
                </ThemedText>
              )}

              <View style={styles.lista}>
                {contas.map((a) => {
                  const ativa = ehAtiva(a);
                  return (
                    <Pressable
                      key={a.userId}
                      disabled={ocupado !== null || semeando}
                      onPress={() => trocar(a)}
                      style={[
                        styles.item,
                        { backgroundColor: ativa ? theme.brandSoft : theme.backgroundSelected },
                      ]}>
                      <Avatar nome={nomeConta(a)} semente={a.userId} tamanho={48} />
                      <View style={styles.itemTextos}>
                        <ThemedText type="smallBold">{nomeConta(a)}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {identificadorConta(a)}
                        </ThemedText>
                      </View>
                      {ocupado === a.userId ? (
                        <ActivityIndicator color={theme.brand} />
                      ) : ativa ? (
                        <Icone nome="check-circle" tamanho={22} cor={theme.brand} />
                      ) : (
                        <Icone nome="chevron-right" tamanho={18} cor={theme.textSecondary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {erro && (
                <ThemedText type="small" themeColor="danger">
                  {erro}
                </ThemedText>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={ocupado !== null || semeando}
                onPress={adicionar}
                style={styles.acao}>
                <Icone nome="plus-circle" tamanho={20} cor={theme.brand} />
                <ThemedText type="smallBold" style={{ color: theme.brand }}>
                  Adicionar outra conta
                </ThemedText>
              </Pressable>

              {naoSalvas.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  disabled={semeando || ocupado !== null}
                  onPress={semearTeste}
                  style={styles.acao}>
                  {semeando ? (
                    <ActivityIndicator color={theme.textSecondary} />
                  ) : (
                    <Icone nome="zap" tamanho={20} cor={theme.textSecondary} />
                  )}
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {semeando ? 'Entrando nas contas de teste…' : `Salvar ${naoSalvas.length} contas de teste`}
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  triggerIcone: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerSeta: {
    marginRight: Spacing.two,
  },
  triggerTextos: {
    flex: 1,
    gap: Spacing.half,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  folha: {
    width: '100%',
    borderTopLeftRadius: Radii.extraLarge,
    borderTopRightRadius: Radii.extraLarge,
    overflow: 'hidden',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  puxador: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radii.pill,
  },
  titulos: {
    gap: Spacing.one,
  },
  lista: {
    width: '100%',
    gap: Spacing.two,
  },
  item: {
    width: '100%',
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Radii.pill,
  },
  itemTextos: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
