import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Chama uma RPC sem esperar resposta, de um jeito que sobrevive à aba indo
 * para segundo plano ou sendo fechada. É o papel do `navigator.sendBeacon`,
 * mas o beacon não deixa enviar o cabeçalho `apikey` que o Supabase exige;
 * `fetch` com `keepalive` deixa e tem a mesma garantia de entrega.
 */
export function chamarRpcAoSair(funcao: string, argumentos: Record<string, unknown>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: publishableKey };
  // Chave antiga (JWT "anon") também precisa ir no Authorization; a nova (sb_publishable_…) não.
  if (publishableKey.startsWith('eyJ')) headers.Authorization = `Bearer ${publishableKey}`;
  try {
    void fetch(`${url}/rest/v1/rpc/${funcao}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(argumentos),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Navegador sem keepalive: o "última posição há X" do app cobre o buraco.
  }
}
