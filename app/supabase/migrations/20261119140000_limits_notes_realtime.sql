-- =============================================================================
-- Limites de uso, observação do QR e tempo real para o site do achador
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Observação do QR ("Sobre quem você encontrou")
-- -----------------------------------------------------------------------------
-- Texto opcional que a família escreve e que aparece no site para quem
-- escaneia (ex.: "É autista, fale baixo e sem tocar."). É a única coisa desta
-- tabela que sai para o achador, e só porque a família escolheu escrever. O
-- nome do dependente continua de fora: o QR segue cego por padrão.
alter table public.qr_codes
  add column finder_note text,
  add constraint qr_codes_finder_note_length
    check (finder_note is null or char_length(btrim(finder_note)) between 1 and 300);

comment on column public.qr_codes.finder_note is
  'Observação que a família escolheu mostrar a quem escaneia. Nula = nada aparece no site.';

grant insert (finder_note) on public.qr_codes to authenticated;
grant update (finder_note) on public.qr_codes to authenticated;

-- O site mostra a observação antes de a pessoa decidir ajudar, sem abrir sessão.
-- Devolve só a observação: nada de nome, grupo ou status além de "está ativo".
create or replace function public.get_qr_public_info(p_token text)
returns table (finder_note text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.finder_note
    from public.qr_codes q
   where q.token = lower(btrim(p_token))
     and q.is_active;
$$;

revoke execute on function public.get_qr_public_info(text) from public;
grant execute on function public.get_qr_public_info(text) to anon, authenticated;

comment on function public.get_qr_public_info(text) is
  'O que o site pode mostrar de um QR antes do escaneamento: só a observação escrita pela família.';

-- -----------------------------------------------------------------------------
-- 2. Limites de uso do lado público
-- -----------------------------------------------------------------------------
-- Quem escaneia é anônimo, então o limite é por QR, não por pessoa (IP não
-- serve: num bloco de carnaval, centenas de celulares saem pelo mesmo IP).

create index tracking_sessions_qr_started_idx
  on public.tracking_sessions (qr_code_id, started_at desc);

-- Instante (do servidor) do último ping aceito. É o que segura o ritmo de
-- posições sem depender do relógio do celular do achador.
alter table public.tracking_sessions
  add column last_ping_received_at timestamptz;

-- 2a. Escanear: no máximo 5 sessões novas do mesmo QR em 10 minutos. Duas ou
-- três pessoas ajudando a mesma criança cabem folgado; uma foto do QR
-- espalhada ou um script não.
create or replace function public.scan_qr_code(p_token text)
returns table (session_id uuid, finder_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qr      public.qr_codes;
  v_session public.tracking_sessions;
begin
  select * into v_qr
    from public.qr_codes
   where token = lower(trim(p_token))
     and is_active;

  -- Mensagem propositalmente vaga (ver a versão original em finder_api).
  if not found then
    raise exception 'QR Code inválido' using errcode = 'no_data_found';
  end if;

  -- Trava a linha do QR: duas leituras simultâneas não passam juntas pela contagem.
  perform 1 from public.qr_codes where id = v_qr.id for update;

  if (
    select count(*)
      from public.tracking_sessions s
     where s.qr_code_id = v_qr.id
       and s.started_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'LIMITE_LEITURAS: Este QR Code foi lido muitas vezes agora. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;

  insert into public.tracking_sessions (qr_code_id)
  values (v_qr.id)
  returning * into v_session;

  return query select v_session.id, v_session.finder_token;
end;
$$;

-- 2b. Posições: no máximo uma a cada 2 s por sessão. O excesso é descartado em
-- silêncio (devolve o status normalmente): a página do achador não vê erro e o
-- mapa da família continua igual, só sem o lixo.
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

  if v_session.last_ping_received_at > now() - interval '2 seconds' then
    return v_session.status;
  end if;

  -- Prende o horário do aparelho entre o começo da sessão e agora.
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

-- -----------------------------------------------------------------------------
-- 3. Tempo real para o site do achador
-- -----------------------------------------------------------------------------
-- O achador não tem login, então não recebe postgres_changes (que passam pela
-- RLS). Em vez de o site perguntar a cada poucos segundos, o banco empurra os
-- eventos por Realtime Broadcast num canal cujo nome é um hash do finder_token:
-- só quem tem o token sabe em que canal escutar, e o token em si nunca vira
-- nome de canal (não aparece em log).
create or replace function private.finder_topic(p_finder_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'found-achador-' || encode(pg_catalog.sha256(convert_to(p_finder_token, 'UTF8')), 'hex');
$$;

revoke execute on function private.finder_topic(text) from public, anon, authenticated;

-- Mensagem nova na conversa → evento "mensagem" para o site.
create or replace function private.broadcast_message_to_finder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select s.finder_token into v_token
    from public.tracking_sessions s
   where s.id = new.session_id;

  -- Falha no Realtime nunca pode impedir a mensagem de ser salva: o site
  -- ainda faz uma conferência periódica e a pega de lá.
  begin
    perform realtime.send(
      jsonb_build_object(
        'id', new.id,
        'sender', new.sender,
        'body', new.body,
        'created_at', new.created_at
      ),
      'mensagem',
      private.finder_topic(v_token),
      false
    );
  exception when others then
    raise warning 'Broadcast de mensagem falhou: %', sqlerrm;
  end;

  return null;
end;
$$;

create trigger session_messages_broadcast_finder
  after insert on public.session_messages
  for each row execute function private.broadcast_message_to_finder();

-- Status ou posição do responsável mudou → evento "sessao" para o site.
create or replace function private.broadcast_session_to_finder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object(
        'status', new.status,
        'responsible_lat', new.responsible_lat,
        'responsible_lng', new.responsible_lng,
        'responsible_recorded_at', new.responsible_recorded_at
      ),
      'sessao',
      private.finder_topic(new.finder_token),
      false
    );
  exception when others then
    raise warning 'Broadcast de sessão falhou: %', sqlerrm;
  end;

  return null;
end;
$$;

create trigger tracking_sessions_broadcast_finder
  after update on public.tracking_sessions
  for each row
  when (
    old.status is distinct from new.status
    or old.responsible_lat is distinct from new.responsible_lat
    or old.responsible_lng is distinct from new.responsible_lng
  )
  execute function private.broadcast_session_to_finder();
