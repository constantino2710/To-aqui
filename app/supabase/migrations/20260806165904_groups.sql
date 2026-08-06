-- =============================================================================
-- groups, group_members, group_invites — a família
-- =============================================================================

-- -----------------------------------------------------------------------------
-- groups
-- -----------------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint groups_name_length check (length(trim(name)) between 1 and 60)
);

comment on table public.groups is 'Grupo familiar. Recebe os alertas dos QR Codes vinculados a ele.';
comment on column public.groups.created_by is
  'Fato histórico: quem criou. Quem manda hoje é group_members.role = ''chefe'' — pode ser outra pessoa.';

create index groups_created_by_idx on public.groups (created_by);

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- group_members
-- -----------------------------------------------------------------------------
create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.group_member_role not null default 'membro',
  joined_at  timestamptz not null default now(),

  -- A chave composta é a regra "um usuário não entra duas vezes no mesmo grupo".
  primary key (group_id, user_id)
);

comment on table public.group_members is
  'N:N entre usuários e grupos. Todo grupo tem no mínimo um chefe (ver gatilho abaixo).';

-- A PK já cobre buscas por group_id. Falta o caminho inverso, que é o mais usado
-- pelo app: "quais grupos eu tenho".
create index group_members_user_id_idx on public.group_members (user_id);

-- Índice parcial: o gatilho de integridade só pergunta por chefes, e chefes são
-- a minoria das linhas.
create index group_members_chefe_idx on public.group_members (group_id) where role = 'chefe';

-- Agora que group_members existe, o gatilho de sucessão definido na migration
-- anterior pode ser registrado.
create trigger profiles_handle_deletion
  before delete on public.profiles
  for each row execute function private.handle_profile_deletion();

-- -----------------------------------------------------------------------------
-- Quem criou o grupo vira chefe
-- -----------------------------------------------------------------------------
-- Feito por gatilho, e não pelo app, por causa de um problema de ovo e galinha:
-- a política de RLS de group_members não deixa ninguém se inserir num grupo, e
-- num grupo recém-criado não existe chefe para autorizar a primeira entrada.
create or replace function private.add_group_creator_as_chefe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role)
    values (new.id, new.created_by, 'chefe')
    on conflict (group_id, user_id) do update set role = 'chefe';
  end if;
  return new;
end;
$$;

create trigger groups_add_creator_as_chefe
  after insert on public.groups
  for each row execute function private.add_group_creator_as_chefe();

-- -----------------------------------------------------------------------------
-- Todo grupo tem pelo menos um chefe
-- -----------------------------------------------------------------------------
-- Não dá para escrever isso como CHECK: a regra fala do conjunto de linhas do
-- grupo, não de uma linha isolada.
--
-- É um CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED de propósito. A checagem
-- só acontece no COMMIT, então "passar o bastão" numa transação só — rebaixar o
-- chefe atual e promover outro — funciona. Com um gatilho comum, a primeira das
-- duas linhas já estouraria.
create or replace function private.enforce_group_has_chefe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid := coalesce(new.group_id, old.group_id);
begin
  -- O grupo inteiro foi apagado e o CASCADE levou os membros junto. Não há
  -- grupo para ficar sem chefe.
  if not exists (select 1 from public.groups where id = v_group_id) then
    return null;
  end if;

  if not exists (
    select 1 from public.group_members
     where group_id = v_group_id and role = 'chefe'
  ) then
    raise exception 'O grupo % ficaria sem chefe. Promova outro membro antes.', v_group_id
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger group_members_require_chefe
  after delete or update on public.group_members
  deferrable initially deferred
  for each row execute function private.enforce_group_has_chefe();

-- -----------------------------------------------------------------------------
-- group_invites
-- -----------------------------------------------------------------------------
-- Por que não adicionar direto pelo código de amizade: o código circula (a
-- pessoa dita em voz alta, manda no WhatsApp, alguém tira print). Se digitar o
-- código bastasse para te colocar num grupo, qualquer um passaria a te mandar
-- push de criança perdida sem você aceitar nada. Num app cujo push diz "uma
-- criança sumiu", notificação de estranho é desinstalação na hora.
create table public.group_invites (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups (id) on delete cascade,
  invited_by       uuid references public.profiles (id) on delete set null,
  invited_user_id  uuid not null references public.profiles (id) on delete cascade,
  status           public.invite_status not null default 'pendente',
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '7 days',
  responded_at     timestamptz,

  constraint group_invites_no_self_invite
    check (invited_by is distinct from invited_user_id),

  -- 'expirado' não tem responded_at porque ninguém respondeu: o prazo venceu.
  constraint group_invites_responded_at_matches_status check (
    (status in ('pendente', 'expirado') and responded_at is null)
    or (status in ('aceito', 'recusado') and responded_at is not null)
  )
);

comment on table public.group_invites is
  'Convite para entrar num grupo. Entrar em group_members só acontece via public.respond_to_group_invite.';

-- Um convite pendente por pessoa por grupo. Índice único parcial: convites já
-- respondidos podem se repetir à vontade (a pessoa saiu e foi convidada de novo).
create unique index group_invites_one_pending_key
  on public.group_invites (group_id, invited_user_id)
  where status = 'pendente';

-- "Meus convites pendentes" — a tela que abre quando o app inicia.
create index group_invites_pending_for_user_idx
  on public.group_invites (invited_user_id)
  where status = 'pendente';

-- FKs indexadas: sem isto o CASCADE de um grupo ou de um perfil varre a tabela.
create index group_invites_group_id_idx   on public.group_invites (group_id);
create index group_invites_invited_by_idx on public.group_invites (invited_by);

-- Usado pela rotina de expurgo.
create index group_invites_expiring_idx
  on public.group_invites (expires_at)
  where status = 'pendente';

-- -----------------------------------------------------------------------------
-- Funções de RLS para grupos
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER e no schema privado. Sem isto, a política de SELECT de
-- group_members consultaria group_members e o Postgres entraria em recursão.
-- A checagem de identidade — `user_id = auth.uid()` — está DENTRO da função:
-- ela nunca responde sobre outra pessoa, só sobre quem está chamando.
create or replace function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
     where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_group_chefe(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
     where group_id = p_group_id
       and user_id = (select auth.uid())
       and role = 'chefe'
  );
$$;

revoke execute on function private.is_group_member(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.is_group_chefe(uuid)  from public, anon, authenticated, service_role;

-- E devolvido só para authenticated: as políticas abaixo são avaliadas com os
-- privilégios de quem consulta. Ver a explicação em 20260806165857_base_helpers.sql.
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.is_group_chefe(uuid)  to authenticated;

-- -----------------------------------------------------------------------------
-- Aceitar ou recusar um convite
-- -----------------------------------------------------------------------------
-- É uma função, e não um UPDATE direto, porque aceitar são duas escritas que
-- precisam acontecer juntas: marcar o convite e inserir em group_members. Fazer
-- isso pelo app deixaria uma janela em que o convite está aceito e a pessoa não
-- entrou — ou pior, uma política de INSERT em group_members aberta o bastante
-- para alguém se colocar em qualquer grupo.
create or replace function public.respond_to_group_invite(
  p_invite_id uuid,
  p_accept    boolean
)
returns public.group_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites;
  v_uid    uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select * into v_invite
    from public.group_invites
   where id = p_invite_id
   for update;

  -- Mesma mensagem para "não existe" e "não é seu": responder coisas diferentes
  -- deixaria alguém descobrir quais ids de convite existem.
  if not found or v_invite.invited_user_id <> v_uid then
    raise exception 'Convite não encontrado' using errcode = 'no_data_found';
  end if;

  if v_invite.status <> 'pendente' then
    raise exception 'Este convite já foi respondido' using errcode = 'check_violation';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Este convite expirou' using errcode = 'check_violation';
  end if;

  update public.group_invites
     set status       = (case when p_accept then 'aceito' else 'recusado' end)::public.invite_status,
         responded_at = now()
   where id = p_invite_id
  returning * into v_invite;

  if p_accept then
    insert into public.group_members (group_id, user_id, role)
    values (v_invite.group_id, v_uid, 'membro')
    on conflict (group_id, user_id) do nothing;
  end if;

  return v_invite;
end;
$$;

revoke execute on function public.respond_to_group_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_to_group_invite(uuid, boolean) to authenticated;

comment on function public.respond_to_group_invite(uuid, boolean) is
  'Aceita (true) ou recusa (false) um convite. Aceitar insere o usuário em group_members na mesma transação.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_invites  enable row level security;

-- groups ----------------------------------------------------------------------
-- O admin entra por OR na mesma política, e não numa política separada: assim o
-- Postgres para de avaliar assim que a primeira condição é verdadeira, e o
-- usuário comum não paga a consulta de "sou admin?" em toda leitura.
create policy "groups: membros veem o grupo, admin vê todos"
  on public.groups for select
  to authenticated
  using (
    (select private.is_group_member(id))
    or (select private.is_platform_admin())
  );

-- created_by obrigatoriamente igual a quem chama: é o que faz o gatilho
-- add_group_creator_as_chefe colocar a pessoa certa como chefe.
create policy "groups: qualquer um cria o próprio grupo"
  on public.groups for insert
  to authenticated
  with check ( (select auth.uid()) = created_by );

create policy "groups: chefe edita"
  on public.groups for update
  to authenticated
  using ( (select private.is_group_chefe(id)) )
  with check ( (select private.is_group_chefe(id)) );

create policy "groups: chefe apaga"
  on public.groups for delete
  to authenticated
  using ( (select private.is_group_chefe(id)) );

-- group_members ---------------------------------------------------------------
create policy "group_members: membros do grupo e admin veem"
  on public.group_members for select
  to authenticated
  using (
    (select private.is_group_member(group_id))
    or (select private.is_platform_admin())
  );

create policy "group_members: chefe muda papéis"
  on public.group_members for update
  to authenticated
  using ( (select private.is_group_chefe(group_id)) )
  with check ( (select private.is_group_chefe(group_id)) );

create policy "group_members: chefe remove, e qualquer um sai"
  on public.group_members for delete
  to authenticated
  using (
    (select private.is_group_chefe(group_id))
    or user_id = (select auth.uid())
  );

-- Sem política de INSERT, e é intencional: a única porta de entrada num grupo é
-- public.respond_to_group_invite (mais o gatilho que cria o primeiro chefe).

-- group_invites ---------------------------------------------------------------
create policy "group_invites: convidado, membros do grupo e admin veem"
  on public.group_invites for select
  to authenticated
  using (
    invited_user_id = (select auth.uid())
    or (select private.is_group_member(group_id))
    or (select private.is_platform_admin())
  );

create policy "group_invites: só o chefe convida"
  on public.group_invites for insert
  to authenticated
  with check (
    (select private.is_group_chefe(group_id))
    and invited_by = (select auth.uid())
  );

create policy "group_invites: chefe cancela, convidado descarta"
  on public.group_invites for delete
  to authenticated
  using (
    (select private.is_group_chefe(group_id))
    or invited_user_id = (select auth.uid())
  );

-- Sem UPDATE: responder é via public.respond_to_group_invite.

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.groups        from anon, authenticated;
revoke all on public.group_members from anon, authenticated;
revoke all on public.group_invites from anon, authenticated;

grant select, delete           on public.groups to authenticated;
grant insert (name, created_by) on public.groups to authenticated;
grant update (name)             on public.groups to authenticated;

grant select, delete on public.group_members to authenticated;
grant update (role)  on public.group_members to authenticated;

-- expires_at fica de fora do INSERT: quem convida não escolhe o prazo.
grant select, delete                                    on public.group_invites to authenticated;
grant insert (group_id, invited_by, invited_user_id)    on public.group_invites to authenticated;
