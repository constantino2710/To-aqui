-- =============================================================================
-- Base: schema privado, tipos e funções auxiliares
-- =============================================================================
-- Nada aqui cria tabela. É o alicerce que as próximas migrations usam.

-- -----------------------------------------------------------------------------
-- Schema privado
-- -----------------------------------------------------------------------------
-- Guarda as funções que rodam com SECURITY DEFINER, ou seja, que ignoram RLS.
-- Elas existem para as próprias políticas de RLS poderem consultar tabelas sem
-- cair em recursão infinita (a política de `group_members` precisa ler
-- `group_members`).
--
-- O schema NÃO é exposto na Data API e ninguém além do dono do banco recebe
-- USAGE. Isso importa: uma função SECURITY DEFINER acessível pelo app é um
-- bypass de RLS com URL pública.
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- USAGE para authenticated, e é obrigatório: uma política de RLS é avaliada com
-- os privilégios de QUEM CONSULTA, não com os de quem criou a política. Sem
-- USAGE no schema, toda consulta a uma tabela protegida morre em
-- "permission denied for function is_group_member".
--
-- Isso não abre o schema para o app: o PostgREST só roteia para os schemas
-- listados em [api].schemas no config.toml (public e graphql_public). E o EXECUTE
-- continua revogado função a função — só as três usadas dentro das políticas o
-- recebem de volta, nas migrations em que nascem.
grant usage on schema private to authenticated;

comment on schema private is
  'Funções internas de RLS. Fora dos schemas expostos na Data API — inalcançável pelo PostgREST.';

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
-- Enum em vez de text + CHECK porque o `supabase gen types` transforma enum em
-- union de string no TypeScript, e o app pega valor errado em tempo de
-- compilação. O custo é que remover um valor depois dá trabalho — adicionar é
-- uma linha.

-- Papel na plataforma inteira. `admin` enxerga tudo; é atribuído na mão, direto
-- no banco, e nunca pela aplicação (ver os GRANTs por coluna em `profiles`).
create type public.user_role as enum ('user', 'admin');

-- Papel dentro de um grupo. Todo grupo tem no mínimo um `chefe`, garantido por
-- gatilho na migration de grupos.
create type public.group_member_role as enum ('chefe', 'membro');

create type public.invite_status as enum ('pendente', 'aceito', 'recusado', 'expirado');

-- Ciclo de vida de uma sessão de rastreamento:
--   awaiting_consent -> o QR foi escaneado, o achador ainda não liberou o GPS
--   active           -> liberou, as coordenadas estão chegando
--   ended            -> acabou (achado, o achador parou, ou tempo esgotado)
create type public.tracking_status as enum ('awaiting_consent', 'active', 'ended');

create type public.tracking_end_reason as enum ('found', 'finder_stopped', 'timeout');

-- De onde veio a coordenada. Não é detalhe cosmético: `ip` erra por
-- quilômetros e a tela precisa dizer isso em vez de fingir precisão.
--   gps    -> navigator.geolocation, o caso bom
--   beacon -> sendBeacon disparado quando a aba foi pro background
--   ip     -> plano B quando o usuário negou a permissão de localização
create type public.ping_source as enum ('gps', 'beacon', 'ip');

create type public.device_platform as enum ('ios', 'android', 'web');

-- -----------------------------------------------------------------------------
-- Geração de códigos
-- -----------------------------------------------------------------------------
create or replace function private.random_code(p_length integer)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- Sem 0/O e sem 1/I/L. Esse código é ditado em voz alta e digitado à mão por
  -- alguém apressado; caractere ambíguo aqui vira suporte depois.
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_size     constant integer := length(v_alphabet);
  v_bytes    bytea;
  v_out      text := '';
  i          integer;
begin
  -- Limite de 6 porque um UUID só tem 16 bytes e os bytes 6 e 8 carregam os bits
  -- fixos de versão/variante do UUIDv4. Os 6 primeiros são aleatórios de verdade.
  if p_length < 1 or p_length > 6 then
    raise exception 'random_code aceita de 1 a 6 caracteres, recebeu %', p_length;
  end if;

  -- gen_random_uuid() usa o gerador criptográfico do Postgres e é núcleo desde a
  -- versão 13. Evita depender do pgcrypto estar instalado neste ou naquele schema.
  v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');

  for i in 0 .. p_length - 1 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % v_size) + 1, 1);
  end loop;

  return v_out;
end;
$$;

comment on function private.random_code(integer) is
  'Código curto legível por humano, sem caracteres ambíguos. 6 caracteres = ~887 milhões de combinações.';

-- Mesma coisa, mas repetindo até achar um código livre na tabela alvo.
create or replace function private.generate_unique_code(
  p_table   text,
  p_column  text,
  p_length  integer
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code     text;
  v_taken    boolean;
  v_attempts integer := 0;
begin
  loop
    v_code := private.random_code(p_length);

    -- %I escapa o identificador: p_table/p_column nunca vêm do usuário final,
    -- mas esta função é SECURITY DEFINER e não custa fechar a porta.
    execute format('select exists (select 1 from public.%I where %I = $1)', p_table, p_column)
      into v_taken
      using v_code;

    exit when not v_taken;

    v_attempts := v_attempts + 1;
    if v_attempts >= 10 then
      raise exception 'Não foi possível gerar código único para public.%.% em % tentativas',
        p_table, p_column, v_attempts;
    end if;
  end loop;

  return v_code;
end;
$$;

revoke execute on function private.generate_unique_code(text, text, integer)
  from public, anon, authenticated, service_role;

-- Token longo para a URL do QR e para identificar o navegador do achador.
-- 122 bits de entropia: não se adivinha por força bruta, e ninguém digita isso
-- à mão (vai dentro do QR Code).
create or replace function private.random_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '');
$$;

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
