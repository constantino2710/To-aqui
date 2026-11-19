-- =============================================================================
-- session_messages — conversa entre quem encontrou e a família
-- =============================================================================
-- O chat existe só dentro de uma sessão de rastreamento: nasce com ela e só
-- aceita mensagens novas enquanto ela está ativa. Segue o QR cego dos dois
-- lados:
--   - o achador vê as mensagens da família assinadas só como "família", nunca
--     com nome de responsável;
--   - a família vê as mensagens do achador como "quem encontrou", sem
--     identidade nenhuma (não existe finder_user_id em lugar algum).

create type public.message_sender as enum ('finder', 'family');

create table public.session_messages (
  -- bigint identity: só cresce, e o achador pede "o que chegou depois do id X".
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.tracking_sessions (id) on delete cascade,

  -- Desnormalizado pelo mesmo motivo de location_pings.group_id: a RLS do
  -- Realtime resolve "sou deste grupo?" sem join a cada mensagem entregue.
  group_id    uuid not null references public.groups (id) on delete cascade,

  sender      public.message_sender not null,
  -- Só para mensagens da família: quem do grupo escreveu. Nunca vai para o
  -- achador (as funções dele não devolvem esta coluna).
  sender_id   uuid references public.profiles (id) on delete set null,

  body        text not null,
  created_at  timestamptz not null default now(),

  constraint session_messages_body_length check (char_length(body) between 1 and 500),
  constraint session_messages_sender_id check (
    (sender = 'finder' and sender_id is null) or sender = 'family'
  )
);

comment on table public.session_messages is
  'Chat de uma sessão de rastreamento. Apagado 90 dias após o envio, como o rastro.';

create index session_messages_session_id_idx on public.session_messages (session_id, id);
create index session_messages_group_id_idx   on public.session_messages (group_id);
create index session_messages_sender_id_idx  on public.session_messages (sender_id);
create index session_messages_created_at_idx on public.session_messages (created_at);

-- -----------------------------------------------------------------------------
-- RLS: família lê; ninguém escreve direto
-- -----------------------------------------------------------------------------
alter table public.session_messages enable row level security;

create policy "session_messages: membros do grupo veem"
  on public.session_messages for select
  to authenticated
  using ((select private.is_group_member(group_id)));

revoke all on public.session_messages from anon, authenticated;
grant select on public.session_messages to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.session_messages;
  else
    raise notice 'Publicação supabase_realtime ausente — Realtime não ativado em session_messages.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Limite de envio
-- -----------------------------------------------------------------------------
-- O lado do achador é público: quem tiver uma foto do QR pode abrir sessão e
-- escrever. 10 mensagens por minuto por lado é muito para uma conversa de
-- verdade e pouco para inundar o celular da família.
create or replace function private.assert_message_rate(
  p_session_id uuid,
  p_sender     public.message_sender
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*)
      from public.session_messages
     where session_id = p_session_id
       and sender = p_sender
       and created_at > now() - interval '1 minute'
  ) >= 10 then
    raise exception 'Muitas mensagens em pouco tempo. Aguarde um instante.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function private.assert_message_rate(uuid, public.message_sender)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Achador: enviar e ler
-- -----------------------------------------------------------------------------
create or replace function public.send_finder_message(p_finder_token text, p_body text)
returns public.tracking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.tracking_sessions;
  v_body    text := btrim(p_body);
begin
  select * into v_session
    from public.tracking_sessions
   where finder_token = p_finder_token;

  if not found then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  -- Mesmo contrato de record_location_ping: devolve o status em vez de erro,
  -- e o site descobre que acabou na mesma ida ao servidor.
  if v_session.status <> 'active' then
    return v_session.status;
  end if;

  if v_body is null or v_body = '' then
    raise exception 'Mensagem vazia' using errcode = 'check_violation';
  end if;

  perform private.assert_message_rate(v_session.id, 'finder');

  insert into public.session_messages (session_id, group_id, sender, body)
  values (v_session.id, v_session.group_id, 'finder', v_body);

  return v_session.status;
end;
$$;

comment on function public.send_finder_message(text, text) is
  'O achador manda uma mensagem para a família. Só com a sessão ativa.';

-- Só id, lado, texto e hora. sender_id nunca sai daqui.
create or replace function public.get_finder_messages(p_finder_token text, p_after_id bigint default 0)
returns table (id bigint, sender public.message_sender, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.sender, m.body, m.created_at
    from public.session_messages m
    join public.tracking_sessions s on s.id = m.session_id
   where s.finder_token = p_finder_token
     and m.id > coalesce(p_after_id, 0)
   order by m.id
   limit 200;
$$;

comment on function public.get_finder_messages(text, bigint) is
  'Mensagens da sessão na visão do achador, a partir de um id. Não expõe quem da família escreveu.';

-- -----------------------------------------------------------------------------
-- Família: enviar
-- -----------------------------------------------------------------------------
create or replace function public.send_family_message(p_session_id uuid, p_body text)
returns public.session_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_session public.tracking_sessions;
  v_body    text := btrim(p_body);
  v_message public.session_messages;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select * into v_session
    from public.tracking_sessions
   where id = p_session_id;

  if not found or not private.is_group_member(v_session.group_id) then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  if v_session.status <> 'active' then
    raise exception 'Este atendimento já foi encerrado.' using errcode = 'P0001';
  end if;

  if v_body is null or v_body = '' then
    raise exception 'Mensagem vazia' using errcode = 'check_violation';
  end if;

  perform private.assert_message_rate(v_session.id, 'family');

  insert into public.session_messages (session_id, group_id, sender, sender_id, body)
  values (v_session.id, v_session.group_id, 'family', v_uid, v_body)
  returning * into v_message;

  return v_message;
end;
$$;

comment on function public.send_family_message(uuid, text) is
  'Um responsável manda mensagem para quem encontrou. Só membros do grupo, só com a sessão ativa.';

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke execute on function public.send_finder_message(text, text)        from public;
revoke execute on function public.get_finder_messages(text, bigint)      from public;
revoke execute on function public.send_family_message(uuid, text)        from public, anon;

grant execute on function public.send_finder_message(text, text)         to anon, authenticated;
grant execute on function public.get_finder_messages(text, bigint)       to anon, authenticated;
grant execute on function public.send_family_message(uuid, text)         to authenticated;

-- -----------------------------------------------------------------------------
-- Retenção: a conversa some junto com o rastro, em 90 dias
-- -----------------------------------------------------------------------------
create or replace function private.purge_expired_messages()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removidas as (
    delete from public.session_messages
     where created_at < now() - interval '90 days'
    returning 1
  )
  select count(*) from removidas;
$$;

revoke execute on function private.purge_expired_messages()
  from public, anon, authenticated, service_role;

do $do$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'purge-expired-messages',
    '22 4 * * *',
    $job$ select private.purge_expired_messages(); $job$
  );
exception
  when others then
    raise notice 'pg_cron indisponível (%). private.purge_expired_messages() pode ser agendada depois.', sqlerrm;
end;
$do$;
