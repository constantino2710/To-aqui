import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Vibration } from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Familia = { group_id: string; name: string };
type NovoPing = { session_id: string; group_id: string };

/** Mantém o aviso de localização ativo enquanto o usuário navega por qualquer aba. */
export function useLocationAlerts() {
  const { session } = useAuth();
  const sessoesAvisadas = useRef(new Set<string>());

  useEffect(() => {
    if (!session) return;
    let ativo = true;
    let canal: ReturnType<typeof supabase.channel> | null = null;

    void supabase.rpc('list_my_groups').then(({ data }) => {
      if (!ativo) return;
      const familias = (data ?? []) as Familia[];
      canal = supabase.channel(`alertas-localizacao-${session.user.id}`);

      familias.forEach((familia) => {
        canal?.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'location_pings', filter: `group_id=eq.${familia.group_id}` },
          (payload) => {
            const ping = payload.new as NovoPing;
            if (sessoesAvisadas.current.has(ping.session_id)) return;
            sessoesAvisadas.current.add(ping.session_id);
            // Três pulsos longos: suficiente para chamar atenção sem manter a
            // vibração presa caso o usuário já esteja olhando para a tela.
            Vibration.vibrate([0, 700, 250, 700, 250, 700]);
            Alert.alert(
              'Nova localização recebida',
              `Alguém escaneou um QR Code da ${familia.name} e compartilhou a posição.`,
              [
                { text: 'Depois', style: 'cancel' },
                {
                  text: 'Ver no mapa',
                  onPress: () => router.push(`/configurar-familia?id=${familia.group_id}&aba=qrcodes` as Href),
                },
              ]
            );
          }
        );
      });
      canal.subscribe();
    });

    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [session]);
}
