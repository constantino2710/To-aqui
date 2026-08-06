-- =============================================================================
-- qr_codes — o QR do dependente
-- =============================================================================
-- Um QR pertence a exatamente um grupo; um grupo tem quantos QRs quiser.
-- Não há dono individual: quem recebe o alerta é o grupo inteiro, e é isso que
-- diferencia o produto de um contato único que pode não atender.

create table public.qr_codes (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  created_by      uuid references public.profiles (id) on delete set null,
  dependent_name  text not null,
  token           text not null,
  short_code      text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint qr_codes_dependent_name_length
    check (length(trim(dependent_name)) between 1 and 60),

  constraint qr_codes_token_format
    check (token ~ '^[0-9a-f]{32}$'),

  constraint qr_codes_short_code_format
    check (short_code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$')
);

comment on table public.qr_codes is
  'QR Code vinculado a um grupo. O achador que escaneia nunca vê nada desta tabela.';
comment on column public.qr_codes.dependent_name is
  'Nome do dependente. Visível só para os membros do grupo — nunca para quem escaneia.';
comment on column public.qr_codes.token is
  'Segredo que vai dentro do QR Code, na URL. 122 bits: não se adivinha por força bruta.';
comment on column public.qr_codes.short_code is
  'Código curto do fallback por SMS. Curto o bastante para ser ditado, e por isso NÃO abre sessão sozinho.';
comment on column public.qr_codes.is_active is
  'Desliga o QR sem apagá-lo — é o "modo evento": ativo no carnaval, inerte no resto do ano.';

create unique index qr_codes_token_key      on public.qr_codes (token);
create unique index qr_codes_short_code_key on public.qr_codes (short_code);

create index qr_codes_group_id_idx   on public.qr_codes (group_id);
create index qr_codes_created_by_idx on public.qr_codes (created_by);

create trigger qr_codes_set_updated_at
  before update on public.qr_codes
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Os dois códigos nascem no banco
-- -----------------------------------------------------------------------------
-- O cliente não escolhe nem sugere: um token previsível é um rastreador aberto
-- para qualquer um que saiba adivinhar. O GRANT de INSERT lá embaixo já não
-- inclui estas colunas; o gatilho é a segunda tranca, para o caso de a primeira
-- ser afrouxada um dia sem ninguém lembrar do porquê.
create or replace function private.set_qr_code_secrets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.token      := private.random_token();
  new.short_code := private.generate_unique_code('qr_codes', 'short_code', 6);
  return new;
end;
$$;

create trigger qr_codes_set_secrets
  before insert on public.qr_codes
  for each row execute function private.set_qr_code_secrets();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.qr_codes enable row level security;

create policy "qr_codes: membros do grupo veem, admin vê todos"
  on public.qr_codes for select
  to authenticated
  using (
    (select private.is_group_member(group_id))
    or (select private.is_platform_admin())
  );

create policy "qr_codes: qualquer membro cria"
  on public.qr_codes for insert
  to authenticated
  with check (
    (select private.is_group_member(group_id))
    and created_by = (select auth.uid())
  );

create policy "qr_codes: qualquer membro edita"
  on public.qr_codes for update
  to authenticated
  using ( (select private.is_group_member(group_id)) )
  with check ( (select private.is_group_member(group_id)) );

-- Apagar é só do chefe. Um QR já impresso numa pulseira não volta atrás:
-- desativar (is_active = false) é a operação reversível e está liberada para
-- qualquer membro logo acima.
create policy "qr_codes: só o chefe apaga"
  on public.qr_codes for delete
  to authenticated
  using ( (select private.is_group_chefe(group_id)) );

-- Nenhuma política para `anon`. O achador não lê esta tabela: ele chama
-- public.scan_qr_code, que devolve só o necessário para iniciar o rastreamento.

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.qr_codes from anon, authenticated;

grant select, delete on public.qr_codes to authenticated;
grant insert (group_id, created_by, dependent_name) on public.qr_codes to authenticated;
grant update (dependent_name, is_active)           on public.qr_codes to authenticated;
