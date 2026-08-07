-- Posição do responsável compartilhada somente com o navegador que abriu a
-- sessão pelo QR. Não é uma posição pública do grupo.
alter table public.tracking_sessions
  add column responsible_lat double precision,
  add column responsible_lng double precision,
  add column responsible_accuracy_m real,
  add column responsible_recorded_at timestamptz,
  add constraint tracking_sessions_responsible_lat_range
    check (responsible_lat is null or responsible_lat between -90 and 90),
  add constraint tracking_sessions_responsible_lng_range
    check (responsible_lng is null or responsible_lng between -180 and 180),
  add constraint tracking_sessions_responsible_accuracy_positive
    check (responsible_accuracy_m is null or responsible_accuracy_m >= 0);

-- Só um membro autenticado da família pode publicar a própria posição, e apenas
-- durante uma sessão ainda ativa.
create or replace function public.record_responsible_location(
  p_session_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m real default null,
  p_recorded_at timestamptz default null
)
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

  if v_session.status <> 'active' then
    return v_session.status;
  end if;

  update public.tracking_sessions
     set responsible_lat = p_lat,
         responsible_lng = p_lng,
         responsible_accuracy_m = p_accuracy_m,
         responsible_recorded_at = least(coalesce(p_recorded_at, now()), now())
   where id = v_session.id;

  return v_session.status;
end;
$$;

-- A posse do finder_token é a autorização do achador. A função não revela
-- nome, grupo, usuário ou histórico; somente os dois últimos pontos da sessão.
create or replace function public.get_session_map(p_finder_token text)
returns table (
  status public.tracking_status,
  finder_lat double precision,
  finder_lng double precision,
  finder_recorded_at timestamptz,
  responsible_lat double precision,
  responsible_lng double precision,
  responsible_recorded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.status,
         p.lat,
         p.lng,
         p.recorded_at,
         s.responsible_lat,
         s.responsible_lng,
         s.responsible_recorded_at
    from public.tracking_sessions s
    left join lateral (
      select lat, lng, recorded_at
        from public.location_pings
       where session_id = s.id
       order by recorded_at desc, id desc
       limit 1
    ) p on true
   where s.finder_token = p_finder_token;
$$;

revoke execute on function public.record_responsible_location(uuid, double precision, double precision, real, timestamptz) from public;
revoke execute on function public.get_session_map(text) from public;
grant execute on function public.record_responsible_location(uuid, double precision, double precision, real, timestamptz) to authenticated;
grant execute on function public.get_session_map(text) to anon, authenticated;
