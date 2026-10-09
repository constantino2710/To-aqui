import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

type SessionRow = {
  id: string;
  group_id: string;
  status: 'awaiting_consent' | 'active' | 'ended';
  location_notification_sent_at: string | null;
  qr_codes: { dependent_name: string } | { dependent_name: string }[];
};

type ExpoPushResult = {
  status?: string;
  details?: { error?: string };
};

type GroupMemberRow = { user_id: string };
type DeviceRow = { push_token: string };

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

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
    .select('id, group_id, status, location_notification_sent_at, qr_codes!inner(dependent_name)')
    .eq('finder_token', finderToken)
    .maybeSingle<SessionRow>();

  if (sessionError || !session) return json({ error: 'Sessão não encontrada' }, 404);
  if (session.status !== 'active') return json({ sent: false, reason: 'session-not-active' });
  if (session.location_notification_sent_at) return json({ sent: false, reason: 'already-sent' });

  // A atualização condicional faz o papel de lock: dois envios simultâneos do
  // navegador só conseguem reservar a sessão uma vez.
  const { data: claimed, error: claimError } = await admin
    .from('tracking_sessions')
    .update({ location_notification_sent_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('status', 'active')
    .is('location_notification_sent_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) {
    return json({ error: 'Não foi possível reservar o alerta' }, 500);
  }
  if (!claimed) return json({ sent: false, reason: 'already-sending' });

  const qr = Array.isArray(session.qr_codes) ? session.qr_codes[0] : session.qr_codes;
  const { data: members, error: membersError } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', session.group_id);
  if (membersError) {
    await admin.from('tracking_sessions').update({ location_notification_sent_at: null }).eq('id', session.id);
    return json({ error: 'Não foi possível localizar a família' }, 500);
  }

  const memberIds = (members as GroupMemberRow[] | null ?? []).map((member) => member.user_id);
  const { data: devices, error: devicesError } = memberIds.length
    ? await admin.from('devices').select('push_token').in('user_id', memberIds)
    : { data: [], error: null };
  if (devicesError) {
    await admin.from('tracking_sessions').update({ location_notification_sent_at: null }).eq('id', session.id);
    return json({ error: 'Não foi possível localizar os aparelhos' }, 500);
  }

  const tokens = [...new Set((devices as DeviceRow[] | null ?? []).map((device) => device.push_token))];
  if (tokens.length === 0) {
    // Um responsável pode abrir o app depois do primeiro ping. Nesse caso,
    // não consumimos a única tentativa: o próximo ping poderá avisá-lo.
    await admin.from('tracking_sessions').update({ location_notification_sent_at: null }).eq('id', session.id);
    return json({ sent: false, reason: 'no-devices' });
  }

  const messages = tokens.map((token) => ({
    to: token,
    title: 'Encontraram seu QR Code',
    body: `A localização de ${qr?.dependent_name ?? 'sua família'} foi compartilhada.`,
    data: {
      sessionId: session.id,
      url: `/configurar-familia?id=${session.group_id}&aba=qrcodes`,
    },
    channelId: 'location-found',
    priority: 'high',
    sound: 'default',
  }));

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const expoBody = await expoResponse.json().catch(() => ({}));

  if (!expoResponse.ok) {
    await admin.from('tracking_sessions').update({ location_notification_sent_at: null }).eq('id', session.id);
    return json({ error: 'O serviço de notificações recusou o envio' }, 502);
  }

  const results = (Array.isArray(expoBody.data) ? expoBody.data : []) as ExpoPushResult[];
  const invalidTokens = results
    .map((result, index) => result.details?.error === 'DeviceNotRegistered' ? tokens[index] : null)
    .filter((token): token is string => Boolean(token));
  if (invalidTokens.length > 0) {
    await admin.from('devices').delete().in('push_token', invalidTokens);
  }

  return json({ sent: true, devices: tokens.length });
});
