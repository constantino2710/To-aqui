import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Precisam bater com o app: canal criado em `src/lib/push-notifications.ts` e
// som registrado no plugin `expo-notifications` do `app.json`.
const ALARM_CHANNEL = 'found-alarme';
const ALARM_SOUND = 'alarme_found.wav';
// Recarregar a página do achador abre outra sessão do mesmo QR; dentro desta
// janela o alarme não toca de novo.
const REPEAT_WINDOW_MS = 60_000;

type SessionRow = {
  id: string;
  group_id: string;
  qr_code_id: string;
  status: 'awaiting_consent' | 'active' | 'ended';
  found_notification_sent_at: string | null;
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

/**
 * Avisa a família que o QR foi escaneado: "[nome] foi encontrado!", com alarme,
 * vibração e um toque que abre a tela da sessão no app. O finder-site chama logo
 * após o escaneamento e de novo no primeiro ping (caso a primeira chamada tenha
 * falhado); a coluna `found_notification_sent_at` garante um único alerta.
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
    .select('id, group_id, qr_code_id, status, found_notification_sent_at, qr_codes!inner(dependent_name)')
    .eq('finder_token', finderToken)
    .maybeSingle<SessionRow>();

  if (sessionError || !session) return json({ error: 'Sessão não encontrada' }, 404);
  if (session.status === 'ended') return json({ sent: false, reason: 'session-ended' });
  if (session.found_notification_sent_at) return json({ sent: false, reason: 'already-sent' });

  // Anti-spam: escaneamentos seguidos do mesmo QR (recarregar a página, alguém
  // brincando com o código) não disparam o alarme a cada vez.
  const { data: recent } = await admin
    .from('tracking_sessions')
    .select('id')
    .eq('qr_code_id', session.qr_code_id)
    .gte('found_notification_sent_at', new Date(Date.now() - REPEAT_WINDOW_MS).toISOString())
    .limit(1);
  if (recent && recent.length > 0) return json({ sent: false, reason: 'recently-sent' });

  // A atualização condicional faz o papel de lock: duas chamadas simultâneas
  // (escaneamento + primeiro ping) só conseguem reservar a sessão uma vez.
  const { data: claimed, error: claimError } = await admin
    .from('tracking_sessions')
    .update({ found_notification_sent_at: new Date().toISOString() })
    .eq('id', session.id)
    .neq('status', 'ended')
    .is('found_notification_sent_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) return json({ error: 'Não foi possível reservar o alerta' }, 500);
  if (!claimed) return json({ sent: false, reason: 'already-sending' });

  const release = () =>
    admin.from('tracking_sessions').update({ found_notification_sent_at: null }).eq('id', session.id);

  const qr = Array.isArray(session.qr_codes) ? session.qr_codes[0] : session.qr_codes;
  const { data: members, error: membersError } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', session.group_id);
  if (membersError) {
    await release();
    return json({ error: 'Não foi possível localizar a família' }, 500);
  }

  const memberIds = (members as GroupMemberRow[] | null ?? []).map((member) => member.user_id);
  const { data: devices, error: devicesError } = memberIds.length
    ? await admin.from('devices').select('push_token').in('user_id', memberIds)
    : { data: [], error: null };
  if (devicesError) {
    await release();
    return json({ error: 'Não foi possível localizar os aparelhos' }, 500);
  }

  const tokens = [...new Set((devices as DeviceRow[] | null ?? []).map((device) => device.push_token))];
  if (tokens.length === 0) {
    // Um responsável pode abrir o app depois do escaneamento. Nesse caso,
    // não consumimos a tentativa: o primeiro ping poderá avisá-lo.
    await release();
    return json({ sent: false, reason: 'no-devices' });
  }

  const nome = qr?.dependent_name?.trim() || 'Seu QR Code';
  const messages = tokens.map((token) => ({
    to: token,
    title: `${nome} foi encontrado!`,
    body: 'Clique para ver.',
    data: {
      tipo: 'encontrado',
      sessionId: session.id,
      url: `/encontrado?sessao=${session.id}`,
    },
    channelId: ALARM_CHANNEL,
    priority: 'high',
    sound: ALARM_SOUND,
    // iOS 15+: fura o resumo agendado e o modo Foco quando o usuário permitir.
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
    .map((result, index) => result.details?.error === 'DeviceNotRegistered' ? tokens[index] : null)
    .filter((token): token is string => Boolean(token));
  if (invalidTokens.length > 0) {
    await admin.from('devices').delete().in('push_token', invalidTokens);
  }

  return json({ sent: true, devices: tokens.length });
});
