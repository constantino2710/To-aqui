-- =============================================================================
-- API do achador — as únicas funções chamáveis sem login
-- =============================================================================
-- Quem escaneia o QR não tem conta e não vai instalar nada. Ele chega pelo
-- navegador como `anon`, e `anon` não tem uma única política de RLS neste banco.
-- Tudo que esse lado faz passa por estas quatro funções.
--
-- Elas são SECURITY DEFINER e vivem em `public`, ou seja, são endpoints públicos
-- de verdade — é o desenho pretendido, não um descuido. A credencial que
-- substitui o login é a posse de um segredo de 122 bits: o `token` do QR para
-- abrir a sessão, e o `finder_token` devolvido na abertura para tudo depois.
--
-- Nenhuma delas devolve nome do dependente, nome do grupo ou qualquer dado dos
-- responsáveis. É a metade do "QR cego" que protege a criança: o achador ajuda
-- sem nunca saber quem ele está ajudando.

-- -----------------------------------------------------------------------------
-- 1. Escanear
-- -----------------------------------------------------------------------------
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

  -- Mensagem propositalmente vaga. Distinguir "não existe" de "existe mas está
  -- desativado" entregaria, para quem varre tokens, a informação de quais QRs
  -- são reais.
  if not found then
    raise exception 'QR Code inválido' using errcode = 'no_data_found';
  end if;

  -- A sessão nasce antes de qualquer pedido de permissão, e é isso que faz a
  -- escaneada aparecer no histórico mesmo quando o achador nega o GPS. Essas
  -- sessões sem consentimento são a métrica mais importante do produto: elas
  -- medem quanta gente escaneia e desiste.
  -- group_id e finder_token são preenchidos pelo gatilho BEFORE INSERT, que roda
  -- antes da checagem de NOT NULL. Omitir as duas colunas aqui é o que garante
  -- que nem esta função consegue escolher o token da sessão.
  insert into public.tracking_sessions (qr_code_id)
  values (v_qr.id)
  returning * into v_session;

  return query select v_session.id, v_session.finder_token;
end;
$$;

comment on function public.scan_qr_code(text) is
  'Abre uma sessão de rastreamento a partir do token do QR. Devolve o finder_token, credencial do achador daí em diante.';

-- -----------------------------------------------------------------------------
-- 2. Consentir
-- -----------------------------------------------------------------------------
create or replace function public.grant_tracking_consent(p_finder_token text)
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

  -- Já encerrada (o responsável achou, ou o tempo esgotou): devolve o estado e
  -- não reabre. A tela do achador usa isso para dizer "pode parar, já chegaram".
  if v_session.status = 'ended' then
    return v_session.status;
  end if;

  if v_session.status = 'active' then
    return v_session.status;  -- idempotente: recarregar a página não estraga nada
  end if;

  update public.tracking_sessions
     set status             = 'active',
         consent_granted_at = now()
   where id = v_session.id
  returning * into v_session;

  return v_session.status;
end;
$$;

comment on function public.grant_tracking_consent(text) is
  'Registra o consentimento do achador e libera o envio de coordenadas. Carimba a prova exigida pela LGPD.';

-- -----------------------------------------------------------------------------
-- 3. Mandar coordenada
-- -----------------------------------------------------------------------------
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
   where finder_token = p_finder_token;

  if not found then
    raise exception 'Sessão não encontrada' using errcode = 'no_data_found';
  end if;

  -- Devolver o status em vez de estourar erro é de propósito: o cliente descobre
  -- que acabou na mesma ida ao servidor em que tentou mandar a posição, sem
  -- precisar ficar consultando à parte. Ao ver 'ended', ele solta o
  -- watchPosition e o Wake Lock.
  if v_session.status <> 'active' then
    return v_session.status;
  end if;

  -- O horário vem do aparelho do achador, que pode estar errado ou mentindo.
  -- Prende entre o começo da sessão e agora: fora disso, o rastro desenharia
  -- uma linha para o passado ou para o futuro no mapa do responsável.
  v_recorded_at := least(coalesce(p_recorded_at, now()), now());
  v_recorded_at := greatest(v_recorded_at, v_session.started_at);

  insert into public.location_pings (
    session_id, group_id, lat, lng, accuracy_m, source, recorded_at
  )
  values (
    v_session.id, v_session.group_id, p_lat, p_lng, p_accuracy_m, p_source, v_recorded_at
  );

  update public.tracking_sessions
     set last_ping_at = greatest(coalesce(last_ping_at, v_recorded_at), v_recorded_at)
   where id = v_session.id;

  return v_session.status;
end;
$$;

comment on function public.record_location_ping(text, double precision, double precision, real, public.ping_source, timestamptz) is
  'Grava uma posição do achador. Devolve o status da sessão para o cliente saber quando parar.';

-- -----------------------------------------------------------------------------
-- 4. Parar
-- -----------------------------------------------------------------------------
-- O botão de parar precisa estar sempre visível na tela do achador, e precisa
-- funcionar. É o que faz um estranho aceitar compartilhar localização: ninguém
-- aceita sem saber quando aquilo acaba.
create or replace function public.end_tracking_session(p_finder_token text)
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

  if v_session.status = 'ended' then
    return v_session.status;
  end if;

  update public.tracking_sessions
     set status       = 'ended',
         ended_at     = now(),
         ended_reason = 'finder_stopped'
   where id = v_session.id
  returning * into v_session;

  return v_session.status;
end;
$$;

comment on function public.end_tracking_session(text) is
  'O achador para de compartilhar. ended_by fica nulo porque não há usuário do outro lado.';

-- -----------------------------------------------------------------------------
-- 5. Consultar o próprio estado
-- -----------------------------------------------------------------------------
create or replace function public.get_finder_session(p_finder_token text)
returns table (
  session_id    uuid,
  status        public.tracking_status,
  ended_reason  public.tracking_end_reason,
  started_at    timestamptz,
  last_ping_at  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.status, s.ended_reason, s.started_at, s.last_ping_at
    from public.tracking_sessions s
   where s.finder_token = p_finder_token;
$$;

comment on function public.get_finder_session(text) is
  'Estado da sessão na visão do achador. Não expõe grupo, dependente nem responsáveis.';

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
-- Revogar de PUBLIC antes de conceder: toda função nova nasce com EXECUTE para
-- PUBLIC, e anon/authenticated herdam de PUBLIC. Sem o revoke, o grant seguinte
-- seria decorativo e qualquer papel futuro entraria de carona.
revoke execute on function public.scan_qr_code(text)             from public;
revoke execute on function public.grant_tracking_consent(text)   from public;
revoke execute on function public.end_tracking_session(text)     from public;
revoke execute on function public.get_finder_session(text)       from public;
revoke execute on function public.record_location_ping(text, double precision, double precision, real, public.ping_source, timestamptz) from public;

-- authenticated também recebe: o achador pode muito bem ser um usuário do app
-- ajudando a criança de outra família.
grant execute on function public.scan_qr_code(text)             to anon, authenticated;
grant execute on function public.grant_tracking_consent(text)   to anon, authenticated;
grant execute on function public.end_tracking_session(text)     to anon, authenticated;
grant execute on function public.get_finder_session(text)       to anon, authenticated;
grant execute on function public.record_location_ping(text, double precision, double precision, real, public.ping_source, timestamptz) to anon, authenticated;
