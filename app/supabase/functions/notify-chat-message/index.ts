import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Precisa bater com o canal criado em `src/lib/push-notifications.ts`. Não é o
// canal do alarme: mensagem toca o som padrão, não a sirene.
const CHAT_CHANNEL = 'found-mensagens';
const MAX_LINHA = 150;
// Como num app de conversa: as últimas mensagens pendentes, uma por linha.
const MAX_LINHAS = 4;

type SessionRow = {
  id: string;
  group_id: string;
  status: 'awaiting_consent' | 'active' | 'ended';
  chat_notified_message_id: number | null;
  qr_codes: { dependent_name: string } | { dependent_name: string }[];
};
type MessageRow = { id: number; body: string };
type ExpoPushResult = { status?: string; details?: { error?: string } };

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

/**
 * Avisa a família que quem encontrou mandou mensagem no chat. O finder-site
 * chama logo depois de `send_finder_message`. O texto vem do banco, nunca do
 * pedido: o chamador só prova a posse do `finder_token`.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const { finder_token: finderToken } = await request.json().catch(() => ({}));
  if (typeof finderToken !== 'string' || !/^[0-9a-f]{32}$/.test(finderToken)) {
    return json({ error: 'Token inválido' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Servidor não configurado' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: session, error: sessionError } = await admin
    .from('tracking_sessions')
    .select('id, group_id, status, chat_notified_message_id, qr_codes!inner(dependent_name)')
    .eq('finder_token', finderToken)
    .maybeSingle<SessionRow>();

  if (sessionError || !session) return json({ error: 'Sessão não encontrada' }, 404);
  if (session.status === 'ended') return json({ sent: false, reason: 'session-ended' });

  const ultimoAvisado = session.chat_notified_message_id ?? 0;

  // Todas as mensagens de quem encontrou que ainda não viraram push.
  const { data: pendentes, error: messagesError } = await admin
    .from('session_messages')
    .select('id, body')
    .eq('session_id', session.id)
    .eq('sender', 'finder')
    .gt('id', ultimoAvisado)
    .order('id', { ascending: false })
    .limit(20);
  if (messagesError) return json({ error: 'Não foi possível ler as mensagens' }, 500);

  const novas = (pendentes as MessageRow[] | null) ?? [];
  if (novas.length === 0) return json({ sent: false, reason: 'nothing-new' });
  const ultima = novas[0];

  // Atualização condicional = lock: só uma chamada consegue avançar o marcador
  // até esta mensagem.
  let reserva = admin
    .from('tracking_sessions')
    .update({ chat_notified_message_id: ultima.id })
    .eq('id', session.id);
  reserva = session.chat_notified_message_id === null
    ? reserva.is('chat_notified_message_id', null)
    : reserva.eq('chat_notified_message_id', session.chat_notified_message_id);
  const { data: claimed, error: claimError } = await reserva.select('id').maybeSingle();

  if (claimError) return json({ error: 'Não foi possível reservar o aviso' }, 500);
  if (!claimed) return json({ sent: false, reason: 'already-sending' });

  // Devolve o marcador se o envio falhar, para a próxima mensagem levar esta junto.
  const release = () =>
    admin
      .from('tracking_sessions')
      .update({ chat_notified_message_id: session.chat_notified_message_id })
      .eq('id', session.id)
      .eq('chat_notified_message_id', ultima.id);

  const { data: members, error: membersError } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', session.group_id);
  if (membersError) {
    await release();
    return json({ error: 'Não foi possível localizar a família' }, 500);
  }

  const memberIds = ((members as { user_id: string }[] | null) ?? []).map((m) => m.user_id);
  const { data: devices, error: devicesError } = memberIds.length
    ? await admin.from('devices').select('push_token').in('user_id', memberIds)
    : { data: [], error: null };
  if (devicesError) {
    await release();
    return json({ error: 'Não foi possível localizar os aparelhos' }, 500);
  }

  const tokens = [...new Set(((devices as { push_token: string }[] | null) ?? []).map((d) => d.push_token))];
  // Sem aparelho registrado, não há a quem avisar; a mensagem continua no chat.
  if (tokens.length === 0) return json({ sent: false, reason: 'no-devices' });

  const qr = Array.isArray(session.qr_codes) ? session.qr_codes[0] : session.qr_codes;
  const nome = qr?.dependent_name?.trim() || 'seu QR Code';
  const cortar = (texto: string) => (texto.length > MAX_LINHA ? `${texto.slice(0, MAX_LINHA - 1)}…` : texto);
  // `novas` vem da mais nova para a mais antiga; na notificação, a ordem da conversa.
  const linhas = novas.slice(0, MAX_LINHAS).reverse().map((m) => cortar(m.body));
  const corpo = linhas.join('\n'); // uma mensagem por linha

  const messages = tokens.map((token) => ({
    to: token,
    // Título = quem mandou; corpo = a mensagem (como WhatsApp/Instagram).
    title: `Quem encontrou ${nome}`,
    subtitle: novas.length > 1 ? `${novas.length} mensagens novas` : undefined,
    body: corpo,
    data: {
      tipo: 'chat',
      sessionId: session.id,
      url: `/encontrado?sessao=${session.id}`,
    },
    channelId: CHAT_CHANNEL,
    priority: 'high',
    sound: 'default',
    interruptionLevel: 'time-sensitive',
  }));

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const expoBody = await expoResponse.json().catch(() => ({}));

  if (!expoResponse.ok) {
    await release();
    return json({ error: 'O serviço de notificações recusou o envio' }, 502);
  }

  const results = (Array.isArray(expoBody.data) ? expoBody.data : []) as ExpoPushResult[];
  const invalidTokens = results
    .map((result, index) => (result.details?.error === 'DeviceNotRegistered' ? tokens[index] : null))
    .filter((token): token is string => Boolean(token));
  if (invalidTokens.length > 0) {
    await admin.from('devices').delete().in('push_token', invalidTokens);
  }

  return json({ sent: true, devices: tokens.length });
});
