-- =============================================================================
-- tracking_sessions, location_pings — o rastro ao vivo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tracking_sessions
-- -----------------------------------------------------------------------------
create table public.tracking_sessions (
  id                  uuid primary key default gen_random_uuid(),
  qr_code_id          uuid not null references public.qr_codes (id) on delete cascade,

  -- Redundante de propósito (dá para chegar nele via qr_codes) e preenchido por
  -- gatilho, nunca pelo cliente. Dois motivos: a política de RLS resolve
  -- "sou deste grupo?" sem join, e o Realtime avalia RLS a cada mensagem
  -- entregue — com o join, cada ping do rastro pagaria por ele.
  -- É seguro desnormalizar porque um QR nunca troca de grupo.
  group_id            uuid not null references public.groups (id) on delete cascade,

  status              public.tracking_status not null default 'awaiting_consent',
  finder_token        text not null,

  -- Prova de consentimento da LGPD: o instante em que o achador aceitou
  -- compartilhar a localização. Nulo = escaneou e negou.
  consent_granted_at  timestamptz,

  started_at          timestamptz not null default now(),

  -- É o que sustenta o "última posição há 40s" da tela do achador. Sem isto a
  -- interface não sabe distinguir rastro vivo de rastro congelado, e um pin
  -- desatualizado que se apresenta como ao vivo manda o responsável para o
  -- lugar errado.
  last_ping_at        timestamptz,

  ended_at            timestamptz,
  ended_by            uuid references public.profiles (id) on delete set null,
  ended_reason        public.tracking_end_reason,

  constraint tracking_sessions_finder_token_format
    check (finder_token ~ '^[0-9a-f]{32}$'),

  constraint tracking_sessions_ended_fields check (
    (status = 'ended'  and ended_at is not null and ended_reason is not null)
    or
    (status <> 'ended' and ended_at is null     and ended_reason is null)
  ),

  -- Enquanto espera consentimento, não pode existir consentimento registrado.
  -- Depois disso pode ou não: uma sessão encerrada sem o achador nunca ter
  -- liberado o GPS é um caso real e precisa caber aqui.
  constraint tracking_sessions_consent_matches_status check (
    status <> 'awaiting_consent' or consent_granted_at is null
  )
);

comment on table public.tracking_sessions is
  'Uma sessão nasce a cada escaneada de QR, inclusive quando o achador nega a localização. Fica para sempre.';
comment on column public.tracking_sessions.finder_token is
  'Identifica o navegador anônimo do achador. É a credencial dele — não há login nesse lado.';
comment on column public.tracking_sessions.consent_granted_at is
  'Nulo enquanto o achador não libera o GPS. Sessão que fica nula para sempre é uma tentativa que falhou.';

-- Repare que NÃO existe finder_user_id. O achador é anônimo por desenho: o
-- responsável vê o ponto no mapa e nada além disso. É a outra metade do QR
-- cego — o achador também não vê nome nem foto da criança.

create unique index tracking_sessions_finder_token_key on public.tracking_sessions (finder_token);

create index tracking_sessions_qr_code_id_idx on public.tracking_sessions (qr_code_id);
create index tracking_sessions_ended_by_idx   on public.tracking_sessions (ended_by);

-- Histórico do grupo, do mais recente para o mais antigo.
create index tracking_sessions_group_started_idx
  on public.tracking_sessions (group_id, started_at desc);

-- Índice parcial para a consulta mais quente e mais rara ao mesmo tempo:
-- "tem alguém perdido agora?". Sessões ativas são um punhado; encerradas são
-- quase a tabela toda.
create index tracking_sessions_active_idx
  on public.tracking_sessions (group_id)
  where status = 'active';

-- Usado pela rotina que encerra sessão esquecida aberta.
create index tracking_sessions_open_idx
  on public.tracking_sessions (started_at)
  where status <> 'ended';

-- -----------------------------------------------------------------------------
-- Defaults da sessão, vindos do servidor
-- -----------------------------------------------------------------------------
create or replace function private.set_tracking_session_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- group_id vem do QR, sempre. Quem chama não opina.
  select q.group_id into new.group_id
    from public.qr_codes q
   where q.id = new.qr_code_id;

  if new.group_id is null then
    raise exception 'QR code % não existe', new.qr_code_id
      using errcode = 'foreign_key_violation';
  end if;

  new.finder_token := private.random_token();
  return new;
end;
$$;

create trigger tracking_sessions_set_defaults
  before insert on public.tracking_sessions
  for each row execute function private.set_tracking_session_defaults();

-- -----------------------------------------------------------------------------
-- location_pings
-- -----------------------------------------------------------------------------
create table public.location_pings (
  -- bigint identity, e não uuid: é a tabela que mais cresce, e UUID aleatório
  -- como chave primária espalha as escritas pelo índice inteiro. Aqui o id
  -- também nunca aparece numa URL, então não há o que esconder.
  id           bigint generated always as identity primary key,

  session_id   uuid not null references public.tracking_sessions (id) on delete cascade,

  -- Copiado da sessão pela RPC que insere. Mesma justificativa do group_id em
  -- tracking_sessions: deixa a RLS do Realtime resolver sem join, e um ping
  -- nunca muda de sessão.
  group_id     uuid not null references public.groups (id) on delete cascade,

  lat          double precision not null,
  lng          double precision not null,

  -- Raio de erro em metros, como o navegador reporta. Junto com `source`, é o
  -- que permite a tela dizer "aproximadamente nesta região" em vez de cravar um
  -- pin de 5 metros em cima de um dado de IP que erra por quilômetros.
  accuracy_m   real,
  source       public.ping_source not null default 'gps',

  -- recorded_at é o relógio do aparelho do achador; received_at é o do servidor.
  -- Guardar os dois porque celular com hora errada existe, e é o received_at que
  -- manda na retenção — senão bastaria um relógio adiantado para o dado nunca
  -- ser expurgado.
  recorded_at  timestamptz not null,
  received_at  timestamptz not null default now(),

  constraint location_pings_lat_range check (lat between -90 and 90),
  constraint location_pings_lng_range check (lng between -180 and 180),
  constraint location_pings_accuracy_positive check (accuracy_m is null or accuracy_m >= 0)
);

comment on table public.location_pings is
  'O rastro. Apagado 90 dias após a chegada — ver private.purge_expired_data.';

create index location_pings_session_recorded_idx
  on public.location_pings (session_id, recorded_at desc);

create index location_pings_group_id_idx on public.location_pings (group_id);

-- Usado pelo expurgo dos 90 dias.
create index location_pings_received_at_idx on public.location_pings (received_at);

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
-- É o que faz o ponto se mexer no mapa do responsável sem ele dar refresh.
-- O DO block existe porque a publicação supabase_realtime é criada pela
-- plataforma: num Postgres cru ela não existe e a migration quebraria.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tracking_sessions;
    alter publication supabase_realtime add table public.location_pings;
  else
    raise notice 'Publicação supabase_realtime ausente — Realtime não ativado nestas tabelas.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Encerrar como responsável ("encontrei")
-- -----------------------------------------------------------------------------
-- É função em vez de UPDATE direto porque status, ended_at, ended_by e
-- ended_reason precisam mudar juntos e coerentes — a CHECK acima recusa qualquer
-- combinação torta, e é melhor ter um lugar só que sabe montar a combinação
-- certa do que espalhar isso pelo app.
create or replace function public.resolve_tracking_session(p_session_id uuid)
returns public.tracking_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.tracking_sessions;
  v_uid     uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select * into v_session
    from public.tracking_sessions
   where id = p_session_id
   for update;

  if not found or not private.is_group_member(v_session.group_id) then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  if v_session.status = 'ended' then
    return v_session;  -- idempotente: dois responsáveis apertam "encontrei" juntos
  end if;

  update public.tracking_sessions
     set status       = 'ended',
         ended_at     = now(),
         ended_by     = v_uid,
         ended_reason = 'found'
   where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

revoke execute on function public.resolve_tracking_session(uuid) from public, anon;
grant execute on function public.resolve_tracking_session(uuid) to authenticated;

comment on function public.resolve_tracking_session(uuid) is
  'Responsável marca "encontrei" e encerra o rastreamento. Idempotente.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.tracking_sessions enable row level security;
alter table public.location_pings    enable row level security;

create policy "tracking_sessions: membros do grupo veem, admin vê todas"
  on public.tracking_sessions for select
  to authenticated
  using (
    (select private.is_group_member(group_id))
    or (select private.is_platform_admin())
  );

create policy "location_pings: membros do grupo veem, admin vê todos"
  on public.location_pings for select
  to authenticated
  using (
    (select private.is_group_member(group_id))
    or (select private.is_platform_admin())
  );

-- Nenhuma política de INSERT/UPDATE/DELETE em nenhuma das duas, para nenhum
-- papel. Sessão e ping só entram pelas funções da próxima migration. Isso é o
-- que impede um membro do grupo de forjar um rastro — e impede o achador
-- anônimo de tocar em qualquer outra coisa.

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.tracking_sessions from anon, authenticated;
revoke all on public.location_pings    from anon, authenticated;

grant select on public.tracking_sessions to authenticated;
grant select on public.location_pings    to authenticated;
