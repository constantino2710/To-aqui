import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { traduzErroAuth } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

/**
 * Para onde o link do e-mail de confirmação deve voltar.
 * No Expo Go isso vira algo como `exp://192.168.0.10:8081/--/auth/callback`;
 * num build nativo vira `app://auth/callback`, seguindo o `scheme` do app.json.
 * Esta URL precisa estar na allow list de redirect do painel do Supabase.
 */
export const emailRedirectTo = Linking.createURL('/auth/callback');

type AuthState = {
  session: Session | null;
  /** True até sabermos se existe sessão salva. Evita piscar a tela de login. */
  isLoading: boolean;
  /** Erro vindo do link de confirmação de e-mail, se houver. */
  confirmError: string | null;
  limparConfirmError: () => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  isLoading: true,
  confirmError: null,
  limparConfirmError: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    // Sessão já persistida no AsyncStorage (usuário que fechou e reabriu o app).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // Toda mudança posterior: login, logout, refresh de token, troca de usuário.
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // O link de confirmação abre o app com ?code=... — trocamos esse code por uma
  // sessão, o que já deixa a pessoa logada sem precisar digitar a senha de novo.
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url) return;

    const { queryParams } = Linking.parse(url);
    const code = queryParams?.code;
    const erro = queryParams?.error_description ?? queryParams?.error;

    if (typeof erro === 'string') {
      setConfirmError(traduzErroAuth(decodeURIComponent(erro.replace(/\+/g, ' '))));
      return;
    }

    if (typeof code !== 'string') return;

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      setConfirmError(error ? traduzErroAuth(error.message) : null);
    });
  }, [url]);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      confirmError,
      limparConfirmError: () => setConfirmError(null),
    }),
    [session, isLoading, confirmError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
