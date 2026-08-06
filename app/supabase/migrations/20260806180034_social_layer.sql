-- =============================================================================
-- Amizade — a camada que faltava entre "conhecer alguém" e "entrar na família"
-- =============================================================================
-- Até agora o `friend_code` só servia de atalho: você achava a pessoa e já
-- convidava direto para um grupo. Agora existe um passo antes — virar amigo — e
-- convidar para a família passa a exigir que essa amizade exista.

create type public.friendship_status as enum ('pendente', 'aceito', 'recusado');

-- -----------------------------------------------------------------------------
-- friendships
-- -----------------------------------------------------------------------------
-- Uma linha por par de pessoas, não duas. `requester_id` e `addressee_id`
-- guardam quem pediu (importa enquanto está pendente); depois de aceito a
-- relação é simétrica e a direção vira só histórico.
create table public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  addressee_id  uuid not null references public.profiles (id) on delete cascade,
  status        public.friendship_status not null default 'pendente',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,

  -- Par canônico: o menor id sempre em user_a. É o que permite um índice único
  -- de verdade — sem isso, A→B e B→A entrariam como duas amizades diferentes e
  -- a tela mostraria a mesma pessoa duas vezes.
  user_a uuid generated always as (least(requester_id, addressee_id))    stored,
  user_b uuid generated always as (greatest(requester_id, addressee_id)) stored,

  constraint friendships_no_self check (requester_id <> addressee_id),

  constraint friendships_responded_matches_status check (
    (status = 'pendente'  and responded_at is null)
    or (status <> 'pendente' and responded_at is not null)
  )
);

comment on table public.friendships is
  'Amizade entre dois perfis. Uma linha por par, em qualquer estado. Só quem é amigo pode ser convidado para uma família.';

create unique index friendships_pair_key on public.friendships (user_a, user_b);

create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

-- "Tenho pedido esperando resposta?" — a consulta que abre a aba Comunidade.
create index friendships_pendentes_para_mim_idx
  on public.friendships (addressee_id)
  where status = 'pendente';

-- -----------------------------------------------------------------------------
-- Funções de apoio
-- -----------------------------------------------------------------------------
create or replace function private.are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
     where status = 'aceito'
       and user_a = least(p_user_a, p_user_b)
       and user_b = greatest(p_user_a, p_user_b)
  );
$$;

-- Existe QUALQUER vínculo entre mim e essa pessoa, inclusive pedido pendente.
-- É mais amplo que `are_friends` de propósito: quem me mandou um pedido precisa
-- aparecer com nome e foto na minha tela, senão eu decidiria no escuro.
create or replace function private.tenho_vinculo_com(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
     where user_a = least((select auth.uid()), p_user_id)
       and user_b = greatest((select auth.uid()), p_user_id)
  );
$$;

revoke execute on function private.are_friends(uuid, uuid)   from public, anon, authenticated, service_role;
revoke execute on function private.tenho_vinculo_com(uuid)   from public, anon, authenticated, service_role;
grant  execute on function private.are_friends(uuid, uuid)   to authenticated;
grant  execute on function private.tenho_vinculo_com(uuid)   to authenticated;

-- -----------------------------------------------------------------------------
-- Perfis passam a ser visíveis para amigos
-- -----------------------------------------------------------------------------
-- Recriada, e não somada: uma política permissiva a mais custa uma avaliação a
-- mais em toda leitura da tabela, e o linter do Supabase reclama disso. Um OR na
-- mesma política ainda faz curto-circuito.
drop policy "profiles: você, quem divide grupo com você, e o admin" on public.profiles;

create policy "profiles: você, seus vínculos e o admin"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select private.tenho_vinculo_com(id))
    or (select private.shares_group_with(id))
    or (select private.is_platform_admin())
  );

-- -----------------------------------------------------------------------------
-- Convite de família agora exige amizade
-- -----------------------------------------------------------------------------
drop policy "group_invites: só o chefe convida" on public.group_invites;

create policy "group_invites: chefe convida, e só quem é amigo"
  on public.group_invites for insert
  to authenticated
  with check (
    (select private.is_group_chefe(group_id))
    and invited_by = (select auth.uid())
    and (select private.are_friends((select auth.uid()), invited_user_id))
  );

-- -----------------------------------------------------------------------------
-- RLS de friendships
-- -----------------------------------------------------------------------------
alter table public.friendships enable row level security;

create policy "friendships: cada um vê os próprios vínculos"
  on public.friendships for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
    or (select private.is_platform_admin())
  );

-- Desfazer amizade, cancelar pedido que eu mandei, ou apagar um que recusei:
-- os três são o mesmo DELETE, e qualquer um dos dois lados pode.
create policy "friendships: qualquer um dos dois desfaz"
  on public.friendships for delete
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

-- Sem INSERT nem UPDATE: pedir e responder são as funções abaixo. O motivo é o
-- mesmo do convite de grupo — o estado tem regras (par canônico, reabrir recusa,
-- aceitar automaticamente quando os dois se pedem) que não cabem numa política.

revoke all on public.friendships from anon, authenticated;
grant select, delete on public.friendships to authenticated;

-- -----------------------------------------------------------------------------
-- Pedir amizade
-- -----------------------------------------------------------------------------
create or replace function public.send_friend_request(p_user_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_existe public.friendships;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  if p_user_id = v_uid then
    raise exception 'AMIZADE_CONSIGO: você não pode adicionar a si mesmo'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'PESSOA_NAO_ENCONTRADA: essa pessoa não existe'
      using errcode = 'no_data_found';
  end if;

  select * into v_existe
    from public.friendships
   where user_a = least(v_uid, p_user_id)
     and user_b = greatest(v_uid, p_user_id)
   for update;

  if found then
    if v_existe.status = 'aceito' then
      raise exception 'JA_SAO_AMIGOS: vocês já são amigos'
        using errcode = 'unique_violation';
    end if;

    -- Já pedi e ainda não responderam: nada a fazer, devolve o mesmo pedido.
    if v_existe.status = 'pendente' and v_existe.requester_id = v_uid then
      return v_existe;
    end if;

    -- A pessoa já tinha me pedido e agora eu peço de volta. Isso é um "sim" dos
    -- dois lados: aceita direto em vez de criar um segundo pedido cruzado que
    -- nenhum dos dois entenderia.
    if v_existe.status = 'pendente' and v_existe.addressee_id = v_uid then
      update public.friendships
         set status = 'aceito', responded_at = now()
       where id = v_existe.id
      returning * into v_existe;
      return v_existe;
    end if;

    -- Estava recusado: reabre com quem está pedindo agora.
    update public.friendships
       set requester_id = v_uid,
           addressee_id = p_user_id,
           status       = 'pendente',
           responded_at = null,
           created_at   = now()
     where id = v_existe.id
    returning * into v_existe;
    return v_existe;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (v_uid, p_user_id)
  returning * into v_existe;

  return v_existe;
end;
$$;

-- -----------------------------------------------------------------------------
-- Responder pedido
-- -----------------------------------------------------------------------------
create or replace function public.respond_to_friend_request(
  p_friendship_id uuid,
  p_accept        boolean
)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_pedido public.friendships;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select * into v_pedido
    from public.friendships
   where id = p_friendship_id
   for update;

  -- Mesma mensagem para "não existe" e "não é para você", para não confirmar
  -- quais ids existem.
  if not found or v_pedido.addressee_id <> v_uid then
    raise exception 'PEDIDO_NAO_ENCONTRADO: pedido não encontrado'
      using errcode = 'no_data_found';
  end if;

  if v_pedido.status <> 'pendente' then
    raise exception 'PEDIDO_JA_RESPONDIDO: esse pedido já foi respondido'
      using errcode = 'check_violation';
  end if;

  update public.friendships
     set status       = (case when p_accept then 'aceito' else 'recusado' end)::public.friendship_status,
         responded_at = now()
   where id = p_friendship_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

-- -----------------------------------------------------------------------------
-- Buscar pessoas
-- -----------------------------------------------------------------------------
-- Por código de amizade (exato) ou por início do nome de usuário. SECURITY
-- DEFINER porque, por definição, você está procurando quem ainda não tem
-- vínculo nenhum com você — nenhuma política de leitura alcançaria.
--
-- Mínimo de 3 caracteres e teto de 20 resultados para não virar um despejo da
-- base inteira. Ainda dá para varrer por prefixo, como em qualquer app com @;
-- o que não dá é listar todo mundo de uma vez.
create or replace function public.search_people(p_query text)
returns table (
  id                 uuid,
  username           text,
  full_name          text,
  avatar_path        text,
  friendship_id      uuid,
  friendship_status  public.friendship_status,
  sou_o_solicitante  boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with eu as (select (select auth.uid()) as uid),
       termo as (select trim(coalesce(p_query, '')) as q)
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_path,
    f.id,
    f.status,
    case when f.id is null then null else f.requester_id = (select uid from eu) end
  from public.profiles p
  left join public.friendships f
    on f.user_a = least(p.id, (select uid from eu))
   and f.user_b = greatest(p.id, (select uid from eu))
  where (select uid from eu) is not null
    and p.id <> (select uid from eu)
    and length((select q from termo)) >= 3
    and (
      p.friend_code = upper((select q from termo))
      or p.username ilike (select q from termo) || '%'
    )
  order by (p.friend_code = upper((select q from termo))) desc, p.username
  limit 20;
$$;

comment on function public.search_people(text) is
  'Procura pessoas pelo código de amizade (exato) ou pelo início do nome de usuário. Devolve o estado da amizade junto.';

-- -----------------------------------------------------------------------------
-- Listagens das telas
-- -----------------------------------------------------------------------------
-- Estas são SECURITY INVOKER (o padrão): a RLS já responde exatamente o que cada
-- uma precisa devolver, então não há motivo para contorná-la. Elas existem para
-- poupar a tela de montar join e contagem no cliente, não para furar permissão.

create or replace function public.list_friendships()
returns table (
  friendship_id      uuid,
  profile_id         uuid,
  username           text,
  full_name          text,
  avatar_path        text,
  status             public.friendship_status,
  sou_o_solicitante  boolean,
  created_at         timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    f.id,
    p.id,
    p.username,
    p.full_name,
    p.avatar_path,
    f.status,
    f.requester_id = (select auth.uid()),
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid())
                   then f.addressee_id else f.requester_id end
  where f.status <> 'recusado'
  order by f.status, p.full_name;
$$;

create or replace function public.list_my_groups()
returns table (
  group_id      uuid,
  name          text,
  meu_papel     public.group_member_role,
  membros       bigint,
  qr_codes      bigint,
  created_at    timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    g.id,
    g.name,
    eu.role,
    (select count(*) from public.group_members m where m.group_id = g.id),
    (select count(*) from public.qr_codes q where q.group_id = g.id),
    g.created_at
  from public.groups g
  join public.group_members eu
    on eu.group_id = g.id and eu.user_id = (select auth.uid())
  order by g.created_at;
$$;

create or replace function public.list_group_members(p_group_id uuid)
returns table (
  profile_id   uuid,
  username     text,
  full_name    text,
  avatar_path  text,
  papel        public.group_member_role,
  joined_at    timestamptz
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.full_name, p.avatar_path, m.role, m.joined_at
    from public.group_members m
    join public.profiles p on p.id = m.user_id
   where m.group_id = p_group_id
   order by m.role, p.full_name;
$$;

-- Amigos que ainda não estão no grupo e não têm convite pendente para ele. É
-- exatamente a lista que a tela de adicionar membro mostra — sem isso, ela
-- exibiria gente que já está lá dentro.
create or replace function public.list_invitable_friends(p_group_id uuid)
returns table (
  profile_id   uuid,
  username     text,
  full_name    text,
  avatar_path  text
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.full_name, p.avatar_path
    from public.friendships f
    join public.profiles p
      on p.id = case when f.requester_id = (select auth.uid())
                     then f.addressee_id else f.requester_id end
   where f.status = 'aceito'
     and not exists (
       select 1 from public.group_members m
        where m.group_id = p_group_id and m.user_id = p.id
     )
     and not exists (
       select 1 from public.group_invites i
        where i.group_id = p_group_id
          and i.invited_user_id = p.id
          and i.status = 'pendente'
     )
   order by p.full_name;
$$;

-- Esta precisa ser DEFINER: você ainda não é membro do grupo que te convidou,
-- então a RLS de `groups` não te deixaria ler nem o nome dele — e um convite que
-- não diz para qual família é não serve para nada.
create or replace function public.list_my_group_invites()
returns table (
  invite_id      uuid,
  group_id       uuid,
  group_name     text,
  convidou       text,
  created_at     timestamptz,
  expires_at     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, g.id, g.name, coalesce(quem.full_name, 'alguém'), i.created_at, i.expires_at
    from public.group_invites i
    join public.groups g on g.id = i.group_id
    left join public.profiles quem on quem.id = i.invited_by
   where i.invited_user_id = (select auth.uid())
     and i.status = 'pendente'
     and i.expires_at > now()
   order by i.created_at desc;
$$;

-- -----------------------------------------------------------------------------
-- Privilégios das funções
-- -----------------------------------------------------------------------------
revoke execute on function public.send_friend_request(uuid)              from public, anon;
revoke execute on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.search_people(text)                    from public, anon;
revoke execute on function public.list_friendships()                     from public, anon;
revoke execute on function public.list_my_groups()                       from public, anon;
revoke execute on function public.list_group_members(uuid)               from public, anon;
revoke execute on function public.list_invitable_friends(uuid)           from public, anon;
revoke execute on function public.list_my_group_invites()                from public, anon;

grant execute on function public.send_friend_request(uuid)               to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.search_people(text)                     to authenticated;
grant execute on function public.list_friendships()                      to authenticated;
grant execute on function public.list_my_groups()                        to authenticated;
grant execute on function public.list_group_members(uuid)                to authenticated;
grant execute on function public.list_invitable_friends(uuid)            to authenticated;
grant execute on function public.list_my_group_invites()                 to authenticated;
