-- Guarda se o primeiro ping desta sessão já disparou o alerta push.
-- O valor fica na sessão para impedir alertas duplicados quando o navegador
-- recarrega a página ou tenta reenviar a primeira posição.
alter table public.tracking_sessions
  add column location_notification_sent_at timestamptz;

comment on column public.tracking_sessions.location_notification_sent_at is
  'Instante em que o push de primeira localização foi aceito pelo Expo Push Service.';
