import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Tempo real do achador. O banco empurra eventos por Realtime Broadcast num
 * canal cujo nome é o SHA-256 do finder_token (ver a migration
 * `limits_notes_realtime`): o token nunca vira nome de canal.
 *
 * Um canal só por página, compartilhado pelo mapa e pelo chat: dois canais no
 * mesmo tópico, no mesmo socket, derrubam um ao outro.
 *
 * Eventos: "mensagem" (nova mensagem na conversa) e "sessao" (status e
 * posição do responsável).
 */
export type EventoSessao = 'mensagem' | 'sessao';
type Ouvinte = (payload: Record<string, unknown>) => void;

const ouvintes = new Map<EventoSessao, Set<Ouvinte>>();
const aoReconectar = new Set<() => void>();
let canal: RealtimeChannel | null = null;
let tokenAtual: string | null = null;

async function topicoDe(finderToken: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(finderToken));
  const hex = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  return `found-achador-${hex}`;
}

/** Conecta ao canal da sessão (idempotente para o mesmo token). */
export async function conectarSessao(finderToken: string) {
  if (tokenAtual === finderToken) return;
  desconectarSessao();
  tokenAtual = finderToken;
  const topico = await topicoDe(finderToken);
  if (tokenAtual !== finderToken) return; // trocou no meio do caminho

  canal = supabase
    .channel(topico, { config: { private: false } })
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      ouvintes.get(event as EventoSessao)?.forEach((ouvinte) => ouvinte(payload as Record<string, unknown>));
    })
    .subscribe((status) => {
      // Ao (re)conectar, quem escuta busca o que pode ter perdido enquanto caiu.
      if (status === 'SUBSCRIBED') aoReconectar.forEach((fn) => fn());
    });
}

export function desconectarSessao() {
  if (canal) void supabase.removeChannel(canal);
  canal = null;
  tokenAtual = null;
}

/** Escuta um evento do canal da sessão enquanto o componente está montado. */
export function useEventoSessao(evento: EventoSessao, aoReceber: Ouvinte, aoConectar?: () => void) {
  const receberRef = useRef(aoReceber);
  const conectarRef = useRef(aoConectar);
  receberRef.current = aoReceber;
  conectarRef.current = aoConectar;

  useEffect(() => {
    const ouvinte: Ouvinte = (payload) => receberRef.current(payload);
    const reconectou = () => conectarRef.current?.();
    if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
    ouvintes.get(evento)!.add(ouvinte);
    aoReconectar.add(reconectou);
    return () => {
      ouvintes.get(evento)?.delete(ouvinte);
      aoReconectar.delete(reconectou);
    };
  }, [evento]);
}
