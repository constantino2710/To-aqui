import * as Location from 'expo-location';
import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Posição ao vivo da família para quem encontrou o QR. Fica fora das telas
 * para continuar enviando quando o responsável troca de tela (do "foi
 * encontrado!" para a família e de volta); só para quando ele toca em "Parar
 * de compartilhar minha localização", quando o atendimento acaba ou quando o
 * app é fechado.
 */

type Estado = {
  /** Sessões cuja posição está sendo enviada agora. */
  ativas: ReadonlySet<string>;
  /** Sessões ligando (pedindo permissão / primeira posição). */
  ligando: ReadonlySet<string>;
};

let estado: Estado = { ativas: new Set(), ligando: new Set() };
const ouvintes = new Set<() => void>();
const observadores = new Map<string, Location.LocationSubscription>();

function publicar(novo: Partial<Estado>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((ouvinte) => ouvinte());
}

const com = (conjunto: ReadonlySet<string>, id: string) => new Set(conjunto).add(id);
const sem = (conjunto: ReadonlySet<string>, id: string) => {
  const novo = new Set(conjunto);
  novo.delete(id);
  return novo;
};

async function enviar(sessaoId: string, posicao: Location.LocationObject) {
  const { data } = await supabase.rpc('record_responsible_location', {
    p_session_id: sessaoId,
    p_lat: posicao.coords.latitude,
    p_lng: posicao.coords.longitude,
    p_accuracy_m: posicao.coords.accuracy,
    p_recorded_at: new Date(posicao.timestamp).toISOString(),
  });
  // O atendimento acabou (alguém tocou em "Já encontramos"): para sozinho.
  if (data === 'ended') pararObservador(sessaoId);
}

function pararObservador(sessaoId: string) {
  observadores.get(sessaoId)?.remove();
  observadores.delete(sessaoId);
  publicar({ ativas: sem(estado.ativas, sessaoId), ligando: sem(estado.ligando, sessaoId) });
}

export type ResultadoLigar = 'ok' | 'sem-permissao' | 'erro';

/** Começa a enviar a posição ao vivo para a sessão. */
export async function ligarMinhaLocalizacao(sessaoId: string): Promise<ResultadoLigar> {
  if (observadores.has(sessaoId)) return 'ok';
  publicar({ ligando: com(estado.ligando, sessaoId) });
  try {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      publicar({ ligando: sem(estado.ligando, sessaoId) });
      return 'sem-permissao';
    }
    // A primeira posição vai na hora; depois, a cada ~5 s ou 5 m andados.
    const primeira = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await enviar(sessaoId, primeira);
    const observador = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
      (posicao) => void enviar(sessaoId, posicao),
    );
    observadores.set(sessaoId, observador);
    publicar({ ativas: com(estado.ativas, sessaoId), ligando: sem(estado.ligando, sessaoId) });
    return 'ok';
  } catch {
    publicar({ ligando: sem(estado.ligando, sessaoId) });
    return 'erro';
  }
}

/** Para de enviar e apaga a posição da família do mapa de quem encontrou. */
export async function desligarMinhaLocalizacao(sessaoId: string) {
  pararObservador(sessaoId);
  const { error } = await supabase.rpc('clear_responsible_location', { p_session_id: sessaoId });
  return !error;
}

/** O atendimento acabou: só para o envio (não há mais o que apagar). */
export function esquecerMinhaLocalizacao(sessaoId: string) {
  if (observadores.has(sessaoId)) pararObservador(sessaoId);
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Estado da posição ao vivo da família nesta sessão. */
export function useMinhaLocalizacao(sessaoId: string | undefined) {
  const atual = useSyncExternalStore(assinar, () => estado, () => estado);
  return {
    compartilhando: Boolean(sessaoId && atual.ativas.has(sessaoId)),
    ligando: Boolean(sessaoId && atual.ligando.has(sessaoId)),
  };
}
