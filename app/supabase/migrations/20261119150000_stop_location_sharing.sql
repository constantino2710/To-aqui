-- =============================================================================
-- Parar de compartilhar a localização, dos dois lados, sem encerrar o atendimento
-- =============================================================================
-- Antes, o único "parar" do achador encerrava tudo (posição e conversa), e a
-- família não tinha como parar de mostrar a própria posição. Agora cada lado
-- liga e desliga a sua localização; a conversa continua até alguém encerrar.

-- -----------------------------------------------------------------------------
-- Achador: pausar e retomar
-- -----------------------------------------------------------------------------
-- Instante em que o achador pausou. Nulo = compartilhando. A família vê "pausou
-- a localização" em vez de um rastro que parece só atrasado.
alter table public.tracking_sessions
  add column finder_location_paused_at timestamptz;

comment on column public.tracking_sessions.finder_location_paused_at is
  'Quando quem encontrou pausou a localização (sem encerrar o atendimento). Nulo = compartilhando.';

create or replace function public.set_finder_location_sharing(p_finder_token text, p_sharing boolean)
returns public.tracking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.tracking_sessions;
begin
  select * into v_session
    from public.tracking_sessions
   where finder_token = p_finder_token
   for update;

  if not found then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  if v_session.status <> 'active' then
    return v_session.status;
  end if;

  update public.tracking_sessions
     set finder_location_paused_at = case when p_sharing then null else now() end
   where id = v_session.id;

  return v_session.status;
end;
$$;

revoke execute on function public.set_finder_location_sharing(text, boolean) from public;
grant execute on function public.set_finder_location_sharing(text, boolean) to anon, authenticated;

comment on function public.set_finder_location_sharing(text, boolean) is
  'Quem encontrou pausa (false) ou retoma (true) a localização. A conversa continua.';

-- Com a localização pausada, posição nenhuma entra, nem uma atrasada que o
-- navegador ainda despache ao sair da página. Mesmo corpo da versão anterior
-- (limits_notes_realtime) + a checagem da pausa.
create or replace function public.record_location_ping(
  p_finder_token  text,
  p_lat           double precision,
  p_lng           double precision,
  p_accuracy_m    real                default null,
  p_source        public.ping_source  default 'gps',
  p_recorded_at   timestamptz         default null
)
returns public.tracking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session     public.tracking_sessions;
  v_recorded_at timestamptz;
begin
  select * into v_session
    from public.tracking_sessions
   where finder_token = p_finder_token
   for update;

  if not found then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  if v_session.status <> 'active' then
    return v_session.status;
  end if;

  if v_session.finder_location_paused_at is not null then
    return v_session.status;
  end if;

  if v_session.last_ping_received_at > now() - interval '2 seconds' then
    return v_session.status;
  end if;

  v_recorded_at := least(coalesce(p_recorded_at, now()), now());
  v_recorded_at := greatest(v_recorded_at, v_session.started_at);

  insert into public.location_pings (
    session_id, group_id, lat, lng, accuracy_m, source, recorded_at
  )
  values (
    v_session.id, v_session.group_id, p_lat, p_lng, p_accuracy_m, p_source, v_recorded_at
  );

  update public.tracking_sessions
     set last_ping_at          = greatest(coalesce(last_ping_at, v_recorded_at), v_recorded_at),
         last_ping_received_at = now()
   where id = v_session.id;

  return v_session.status;
end;
$$;

-- O site precisa saber, ao recarregar, se estava pausado (para não religar o
-- GPS sozinho). Mudar o retorno de uma função exige recriá-la.
drop function public.get_finder_session(text);

create function public.get_finder_session(p_finder_token text)
returns table (
  session_id       uuid,
  status           public.tracking_status,
  ended_reason     public.tracking_end_reason,
  started_at       timestamptz,
  last_ping_at     timestamptz,
  location_paused  boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.status, s.ended_reason, s.started_at, s.last_ping_at,
         s.finder_location_paused_at is not null
    from public.tracking_sessions s
   where s.finder_token = p_finder_token;
$$;

revoke execute on function public.get_finder_session(text) from public;
grant execute on function public.get_finder_session(text) to anon, authenticated;

comment on function public.get_finder_session(text) is
  'Estado da sessão na visão do achador. Não expõe grupo, dependente nem responsáveis.';

-- -----------------------------------------------------------------------------
-- Família: parar de mostrar a própria posição
-- -----------------------------------------------------------------------------
-- Apaga a posição do responsável da sessão. O gatilho de broadcast (que olha
-- responsible_lat/lng) avisa o site na hora, e o marcador da família some.
create or replace function public.clear_responsible_location(p_session_id uuid)
returns public.tracking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.tracking_sessions;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = 'insufficient_privilege';
  end if;

  select * into v_session
    from public.tracking_sessions
   where id = p_session_id
   for update;

  if not found or not private.is_group_member(v_session.group_id) then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  update public.tracking_sessions
     set responsible_lat = null,
         responsible_lng = null,
         responsible_accuracy_m = null,
         responsible_recorded_at = null
   where id = v_session.id;

  return v_session.status;
end;
$$;

revoke execute on function public.clear_responsible_location(uuid) from public, anon;
grant execute on function public.clear_responsible_location(uuid) to authenticated;

comment on function public.clear_responsible_location(uuid) is
  'A família para de compartilhar a própria posição com quem encontrou.';
