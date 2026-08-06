-- =============================================================================
-- devices — para onde vai o push
-- =============================================================================
-- Tabela separada, e não uma coluna em profiles, porque uma pessoa tem celular
-- e tablet e os dois precisam tocar. O push é o coração do produto: se só um
-- aparelho recebe, o responsável que estava com o outro na mão não fica sabendo.

create table public.devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  push_token    text not null,
  platform      public.device_platform not null,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  constraint devices_push_token_not_blank check (length(trim(push_token)) > 0)
);

comment on table public.devices is 'Tokens de push notification. Um usuário pode ter vários aparelhos.';
comment on column public.devices.last_seen_at is
  'Última vez que o app confirmou este token. Serve para descartar aparelho abandonado antes de gastar envio nele.';

-- Reinstalar o app gera um token novo; abrir o mesmo app de novo repete o token.
-- O índice único deixa o app usar upsert sem se preocupar com duplicata, e já
-- serve de índice da FK (user_id é a primeira coluna).
create unique index devices_user_id_push_token_key on public.devices (user_id, push_token);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.devices enable row level security;

create policy "devices: cada um vê os próprios aparelhos, admin vê todos"
  on public.devices for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_platform_admin())
  );

create policy "devices: cada um registra os próprios aparelhos"
  on public.devices for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

-- O WITH CHECK não é redundante com o USING. Sem ele, um usuário poderia rodar
-- `update devices set user_id = <outra pessoa>` numa linha que é dele: o USING
-- aprovaria (a linha era dele antes) e o token de push migraria para a conta de
-- outro. É o erro clássico de política de UPDATE.
create policy "devices: cada um atualiza os próprios aparelhos"
  on public.devices for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "devices: cada um remove os próprios aparelhos"
  on public.devices for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.devices from anon, authenticated;

grant select, insert, delete on public.devices to authenticated;
grant update (push_token, platform, last_seen_at) on public.devices to authenticated;
