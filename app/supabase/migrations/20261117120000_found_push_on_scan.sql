-- O alerta "[nome] foi encontrado" passa a sair no momento do escaneamento,
-- não só quando chega a primeira posição. A coluna continua sendo o lock que
-- impede alertas duplicados da mesma sessão; só o nome e o sentido mudam.
alter table public.tracking_sessions
  rename column location_notification_sent_at to found_notification_sent_at;

comment on column public.tracking_sessions.found_notification_sent_at is
  'Instante em que o push "[nome] foi encontrado" desta sessão foi aceito pelo Expo Push Service.';

-- A Edge Function consulta "outra sessão do mesmo QR avisou no último minuto?"
-- para não tocar o alarme de novo quando o achador recarrega a página.
create index tracking_sessions_qr_notified_idx
  on public.tracking_sessions (qr_code_id, found_notification_sent_at)
  where found_notification_sent_at is not null;
