import AsyncStorage from '@react-native-async-storage/async-storage';

// Contas que o usuário já logou neste aparelho, guardadas para troca rápida
// estilo Instagram. Guardamos os tokens da sessão para poder restaurar a conta
// com supabase.auth.setSession, sem pedir senha de novo.
//
// Os tokens de cada conta são atualizados sempre que aquela conta está ativa e
// o Supabase renova o token (ver sincronização em src/lib/auth.tsx). Uma conta
// inativa mantém o último token válido até você voltar para ela.

const KEY = 'to-aqui.saved-accounts';

export type SavedAccount = {
  userId: string;
  email: string;
  username?: string;
  fullName?: string;
  accessToken: string;
  refreshToken: string;
};

let cache: SavedAccount[] | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

/** Avisa a UI quando a lista muda. Devolve a função para cancelar. */
export function subscribeSavedAccounts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as SavedAccount[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(list: SavedAccount[]) {
  cache = list;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sem persistência local não é fatal; a lista vale pelo menos nesta sessão.
  }
  notify();
}

export async function upsertSavedAccount(acc: SavedAccount): Promise<void> {
  const list = await getSavedAccounts();
  const idx = list.findIndex((a) => a.userId === acc.userId);
  const next = [...list];
  if (idx >= 0) {
    // Mantém nome/username já descobertos se os novos vierem vazios.
    next[idx] = {
      ...next[idx],
      ...acc,
      username: acc.username ?? next[idx].username,
      fullName: acc.fullName ?? next[idx].fullName,
    };
  } else {
    next.push(acc);
  }
  await persist(next);
}

export async function removeSavedAccount(userId: string): Promise<void> {
  const list = await getSavedAccounts();
  await persist(list.filter((a) => a.userId !== userId));
}
