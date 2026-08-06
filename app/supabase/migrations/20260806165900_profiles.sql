-- =============================================================================
-- profiles — o usuário
-- =============================================================================
-- E-mail e senha NÃO moram aqui: ficam em auth.users, gerenciados pelo Supabase.
-- Duplicar e-mail nesta tabela é a origem clássica do cadastro que muda o e-mail
-- e fica dessincronizado para sempre.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  avatar_path  text,
  friend_code  text not null,
  role         public.user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_username_format
    check (username ~ '^[a-zA-Z0-9_.]{3,30}$'),

  -- Mesmo alfabeto de private.random_code: sem 0/O nem 1/I/L, sempre maiúsculo.
  -- Guardar já normalizado deixa a busca por código um lookup exato e indexado.
  constraint profiles_friend_code_format
    check (friend_code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'),

  constraint profiles_avatar_path_not_blank
    check (avatar_path is null or length(trim(avatar_path)) > 0)
);

comment on table public.profiles is
  'Dados públicos do usuário. Espelha auth.users 1:1, criado por gatilho no cadastro.';
comment on column public.profiles.avatar_path is
  'Caminho do arquivo no Supabase Storage, não a imagem nem uma URL assinada (que expira).';
comment on column public.profiles.friend_code is
  'Código que a pessoa dita para ser convidada a um grupo. Único e imutável pelo app.';
comment on column public.profiles.role is
  'Papel na plataforma. Só muda por SQL direto — o app não tem GRANT nesta coluna.';

-- Nome de usuário é comparado sem diferenciar maiúscula: "Joao" e "joao" são a
-- mesma pessoa para efeito de colisão.
create unique index profiles_username_lower_key on public.profiles (lower(username));
create unique index profiles_friend_code_key    on public.profiles (friend_code);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Criação automática do perfil no cadastro
-- -----------------------------------------------------------------------------
-- Roda como SECURITY DEFINER porque insere em public.profiles no contexto de um
-- INSERT em auth.users, onde o usuário ainda nem tem sessão.
--
-- Regra de ouro desta função: ela NÃO PODE lançar exceção por motivo cosmético.
-- Qualquer erro aqui aborta o cadastro inteiro do usuário. Por isso o nome de
-- usuário tem três níveis de fallback em vez de simplesmente falhar em colisão.
-- A lógica vive numa função separada, e não dentro do gatilho, porque ela precisa
-- ser chamada em dois momentos: no cadastro (gatilho) e no backfill lá embaixo,
-- para as contas que já existiam antes desta migration.
create or replace function private.create_profile_for_user(
  p_user_id uuid,
  p_email   text,
  p_meta    jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base     text;
  v_username text;
  v_attempts integer := 0;
begin
  v_base := coalesce(
    nullif(trim(p_meta ->> 'username'), ''),
    nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
    'user'
  );

  -- Deixa só o que o CHECK aceita e garante o tamanho mínimo de 3.
  v_base := regexp_replace(v_base, '[^a-zA-Z0-9_.]', '', 'g');
  if length(v_base) < 3 then
    v_base := 'user' || v_base;
  end if;
  v_base := substr(v_base, 1, 24);

  v_username := v_base;
  while exists (
    select 1 from public.profiles where lower(username) = lower(v_username)
  ) loop
    v_attempts := v_attempts + 1;

    if v_attempts > 20 then
      -- Desiste do nome bonito. O usuário troca depois; o cadastro não pode cair.
      v_username := substr('user_' || replace(p_user_id::text, '-', ''), 1, 30);
      exit;
    end if;

    v_username := v_base || v_attempts::text;
  end loop;

  insert into public.profiles (id, username, friend_code)
  values (
    p_user_id,
    v_username,
    private.generate_unique_code('profiles', 'friend_code', 6)
  )
  on conflict (id) do nothing;
end;
$$;

revoke execute on function private.create_profile_for_user(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.create_profile_for_user(new.id, new.email, new.raw_user_meta_data);
  return new;
end;
$$;

-- Função de gatilho não é chamável via Data API (o PostgREST não expõe retorno
-- `trigger`), mas o Postgres concede EXECUTE a PUBLIC por padrão em toda função
-- nova. Revogar é higiene, não paranoia.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Backfill
-- -----------------------------------------------------------------------------
-- Contas criadas ANTES desta migration nunca passaram pelo gatilho e ficariam
-- sem perfil — o app quebraria para elas no primeiro login, e o dono do projeto
-- só descobriria testando com a própria conta antiga.
do $$
declare
  v_user record;
  v_total integer := 0;
begin
  for v_user in
    select u.id, u.email, u.raw_user_meta_data
      from auth.users u
     where not exists (select 1 from public.profiles p where p.id = u.id)
     order by u.created_at
  loop
    perform private.create_profile_for_user(
      v_user.id, v_user.email, v_user.raw_user_meta_data
    );
    v_total := v_total + 1;
  end loop;

  if v_total > 0 then
    raise notice 'Backfill: % perfil(is) criado(s) para contas que já existiam.', v_total;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sucessão quando um usuário some
-- -----------------------------------------------------------------------------
-- Sem isto, apagar uma conta que era a única chefe de um grupo esbarra no
-- gatilho "todo grupo tem um chefe" e a exclusão falha — o usuário não
-- conseguiria deletar a própria conta.
create or replace function private.handle_profile_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  for v_group_id in
    select group_id from public.group_members
     where user_id = old.id and role = 'chefe'
  loop
    -- Sobrou outro chefe? Nada a fazer.
    if exists (
      select 1 from public.group_members
       where group_id = v_group_id and role = 'chefe' and user_id <> old.id
    ) then
      continue;
    end if;

    -- Promove o membro mais antigo do grupo.
    update public.group_members
       set role = 'chefe'
     where (group_id, user_id) = (
       select group_id, user_id
         from public.group_members
        where group_id = v_group_id and user_id <> old.id
        order by joined_at, user_id
        limit 1
     );

    -- Não havia mais ninguém: o grupo morre junto. Grupo sem membro não tem
    -- quem receba o alerta, então é só lixo ocupando espaço.
    if not found then
      delete from public.groups where id = v_group_id;
    end if;
  end loop;

  return old;
end;
$$;

-- O gatilho é criado aqui, mas depende de public.group_members, que só nasce na
-- próxima migration. Por isso ele é registrado lá, não aqui.

-- -----------------------------------------------------------------------------
-- Quem é admin
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER e no schema privado: se fosse uma consulta direta a
-- public.profiles dentro da política de public.profiles, seria recursão.
create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function private.is_platform_admin()
  from public, anon, authenticated, service_role;

-- Devolvido só para authenticated, porque as políticas "admin vê tudo" precisam
-- resolver esta função no contexto do próprio usuário. anon não tem nenhuma
-- política neste banco, então não recebe nada.
grant execute on function private.is_platform_admin() to authenticated;

-- Duas pessoas do mesmo grupo se enxergam. É plpgsql, e não sql, de propósito:
-- corpo de função sql é validado na criação, e public.group_members só nasce na
-- migration seguinte. plpgsql resolve o nome na primeira chamada, quando a
-- tabela já existe.
create or replace function private.shares_group_with(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
      from public.group_members eu
      join public.group_members outro on outro.group_id = eu.group_id
     where eu.user_id = (select auth.uid())
       and outro.user_id = p_user_id
  );
end;
$$;

revoke execute on function private.shares_group_with(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.shares_group_with(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Busca por código de amizade
-- -----------------------------------------------------------------------------
-- Precisa ser SECURITY DEFINER: você procura alguém que, por definição, ainda
-- não está em nenhum grupo seu, então a política de SELECT não alcançaria.
--
-- Devolve só id, username e avatar. Não devolve o friend_code de volta, nem
-- nada que permita varrer a base: sem o código exato, não retorna nada.
create or replace function public.find_profile_by_friend_code(p_code text)
returns table (id uuid, username text, avatar_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.avatar_path
    from public.profiles p
   where (select auth.uid()) is not null
     and p.friend_code = upper(trim(p_code))
     and p.id <> (select auth.uid());
$$;

revoke execute on function public.find_profile_by_friend_code(text) from public, anon;
grant execute on function public.find_profile_by_friend_code(text) to authenticated;

comment on function public.find_profile_by_friend_code(text) is
  'Procura uma pessoa pelo código de amizade para convidá-la a um grupo.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Uma política só, com OR, em vez de três empilhadas. Políticas permissivas se
-- somam com OR de qualquer jeito, mas o Postgres avalia TODAS elas; num OR único
-- ele para na primeira que der verdadeiro. Na prática: o usuário comum nunca
-- paga a consulta de "será que sou admin?".
create policy "profiles: você, quem divide grupo com você, e o admin"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select private.shares_group_with(id))
    or (select private.is_platform_admin())
  );

create policy "profiles: edita o próprio perfil"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
-- Aqui está a trava mais importante da tabela. RLS decide QUAIS LINHAS você
-- alcança; ela não decide QUAIS COLUNAS você pode escrever.
--
-- Sem o GRANT por coluna abaixo, a política "edita o próprio perfil" permitiria
-- que qualquer usuário rodasse `update profiles set role = 'admin'` na própria
-- linha — o WITH CHECK continuaria satisfeito, porque a linha ainda é dele.
-- Concedendo UPDATE só em (username, avatar_path), a escalada de privilégio
-- para de existir no nível do Postgres.
revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (username, avatar_path) on public.profiles to authenticated;

-- Sem INSERT: perfil nasce pelo gatilho on_auth_user_created.
-- Sem DELETE: perfil morre junto com auth.users, por CASCADE.
