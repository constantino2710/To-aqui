-- =============================================================================
-- Retenção — o que o banco esquece sozinho
-- =============================================================================
-- Três limpezas, uma rotina só:
--
--   1. location_pings com mais de 90 dias vira pó.
--      É o trajeto exato que uma criança andou, com hora. A LGPD trabalha com
--      minimização — guardar só o necessário, pelo tempo necessário — e 90 dias
--      dão folga para investigar um incidente e fechar relatório de evento.
--      tracking_sessions NÃO é apagada: ela guarda que houve uma sessão, quando,
--      quanto durou e como terminou. Nunca onde. É disso que sai a métrica de
--      produto e o relatório pós-evento sem carregar o dado sensível junto.
--
--   2. Convites pendentes vencidos passam para 'expirado'.
--
--   3. Sessão esquecida aberta é encerrada como 'timeout'.
--      Acontece toda vez que o achador simplesmente fecha a aba — e é o caso
--      comum, não a exceção.

create or replace function private.purge_expired_data()
returns table (
  pings_removed       bigint,
  invites_expired     bigint,
  sessions_timed_out  bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pings    bigint;
  v_invites  bigint;
  v_sessions bigint;
begin
  -- received_at (relógio do servidor) e não recorded_at (relógio do celular do
  -- achador): senão bastaria um aparelho com a data adiantada para o ping nunca
  -- ser expurgado.
  with removidos as (
    delete from public.location_pings
     where received_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_pings from removidos;

  with expirados as (
    update public.group_invites
       set status = 'expirado'
     where status = 'pendente'
       and expires_at <= now()
    returning 1
  )
  select count(*) into v_invites from expirados;

  with encerrados as (
    update public.tracking_sessions
       set status       = 'ended',
           ended_at     = now(),
           ended_reason = 'timeout'
     where status <> 'ended'
       and coalesce(last_ping_at, started_at) < now() - interval '1 hour'
    returning 1
  )
  select count(*) into v_sessions from encerrados;

  return query select v_pings, v_invites, v_sessions;
end;
$$;

revoke execute on function private.purge_expired_data()
  from public, anon, authenticated, service_role;

comment on function private.purge_expired_data() is
  'Rotina diária de retenção. Roda via pg_cron; pode ser chamada à mão pelo dono do banco.';

-- -----------------------------------------------------------------------------
-- Agendamento
-- -----------------------------------------------------------------------------
-- O pg_cron depende de shared_preload_libraries e nem todo ambiente tem (um
-- Postgres cru de teste, por exemplo). A migration não pode quebrar por causa
-- disso, então a falha vira aviso: a função de expurgo já existe e continua
-- chamável na mão. Este é o único lugar do schema onde engolir erro se justifica.
do $do$
begin
  create extension if not exists pg_cron;

  -- 04:17 UTC, ou seja, ~01:17 em Brasília: longe do pico e longe da virada de
  -- hora, onde todo mundo agenda as próprias rotinas.
  perform cron.schedule(
    'purge-expired-data',
    '17 4 * * *',
    $job$ select private.purge_expired_data(); $job$
  );

  raise notice 'Expurgo agendado: purge-expired-data, todo dia às 04:17 UTC.';
exception
  when others then
    raise notice 'pg_cron indisponível (%). A função private.purge_expired_data() existe e pode ser agendada depois.', sqlerrm;
end;
$do$;
