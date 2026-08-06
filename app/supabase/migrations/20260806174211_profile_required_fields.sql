-- =============================================================================
-- Perfil completo no cadastro
-- =============================================================================
-- Antes desta migration o banco inventava um nome de usuário a partir do e-mail
-- e seguia em frente. Agora nome de usuário, nome completo e telefone são
-- obrigatórios no ato do cadastro. A imagem continua opcional.

-- -----------------------------------------------------------------------------
-- Colunas novas
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column full_name text,
  add column phone     text;

-- Guarda: num banco recém-criado profiles está vazia e este bloco não faz nada.
-- Ele existe para o caso de alguém aplicar esta migration sobre um banco que já
-- tinha perfis (restauração de backup, por exemplo). Não dá para inventar o
-- telefone de ninguém, então a migration para com uma mensagem que diz o que
-- fazer, em vez de gravar dado falso ou falhar com um erro de NOT NULL sem
-- contexto.
do $$
declare
  v_incompletos integer;
begin
  select count(*) into v_incompletos from public.profiles;

  if v_incompletos > 0 then
    raise exception
      'Existem % perfis criados antes desta migration, sem nome completo e telefone. '
      'Preencha as duas colunas para essas linhas (ou apague os perfis órfãos) e rode de novo.',
      v_incompletos;
  end if;
end;
$$;

alter table public.profiles
  alter column full_name set not null,
  alter column phone     set not null;

alter table public.profiles
  add constraint profiles_full_name_length
    check (length(trim(full_name)) between 2 and 80);

-- E.164: sinal de mais, DDI, número. É o formato que qualquer gateway de SMS e
-- de WhatsApp espera.
--
-- A segunda metade do CHECK não é preciosismo. `authenticated` tem GRANT de
-- UPDATE nesta coluna, então a validação da função de cadastro não cobre quem
-- edita o perfil depois — aqui é o único ponto que pega os dois caminhos.
--
-- E ela é específica para o Brasil porque a regra genérica de E.164 aceita de 10
-- a 15 dígitos, e "+55" mais um número de 8 dígitos sem DDD dá exatamente 10:
-- passaria batido. Número brasileiro tem DDD (2) + 8 ou 9 dígitos, nada menos.
alter table public.profiles
  add constraint profiles_phone_format
    check (
      phone ~ '^\+[1-9][0-9]{9,14}$'
      and (phone !~ '^\+55' or phone ~ '^\+55[1-9][0-9]{9,10}$')
    );

comment on column public.profiles.full_name is
  'Nome do responsável, como aparece para os outros membros da família.';
comment on column public.profiles.phone is
  'Telefone em E.164 (+5581999998888). É o plano B da seção 4.3 do CONCEITO: quando o achador nega o GPS, sobra ligar.';

-- Sem índice único no telefone de propósito: casal que divide um número é um
-- caso real, e bloquear isso no cadastro cria um suporte que ninguém quer.

-- -----------------------------------------------------------------------------
-- O cadastro passa a exigir os três campos
-- -----------------------------------------------------------------------------
-- Substitui a versão que gerava username automático. Os dados chegam em
-- raw_user_meta_data, vindos do `options.data` do supabase.auth.signUp.
--
-- Atenção ao que isso significa: raw_user_meta_data é escrito pelo cliente, ou
-- seja, é dado que o usuário controla. Serve para preencher perfil (é o padrão
-- do Supabase) mas NUNCA para decidir permissão — por isso `role` continua fora
-- daqui, com valor default e sem GRANT de UPDATE para ninguém. E é justamente
-- por ser dado do cliente que toda a validação abaixo mora no banco, e não só
-- na tela: a tela é conveniência, esta função é a garantia.
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
  v_username  text := nullif(trim(p_meta ->> 'username'), '');
  v_full_name text := nullif(trim(p_meta ->> 'full_name'), '');
  v_phone     text := nullif(trim(p_meta ->> 'phone'), '');
begin
  if v_username is null or v_full_name is null or v_phone is null then
    raise exception 'PERFIL_INCOMPLETO: nome de usuário, nome completo e telefone são obrigatórios'
      using errcode = 'not_null_violation';
  end if;

  if v_username !~ '^[a-zA-Z0-9_.]{3,30}$' then
    raise exception 'USERNAME_INVALIDO: use de 3 a 30 caracteres, apenas letras, números, ponto e underline'
      using errcode = 'check_violation';
  end if;

  if length(v_full_name) < 2 or length(v_full_name) > 80 then
    raise exception 'NOME_INVALIDO: o nome completo precisa ter de 2 a 80 caracteres'
      using errcode = 'check_violation';
  end if;

  -- A pessoa digita "(81) 99999-8888". Guardar exatamente como veio significa o
  -- mesmo número entrando de cinco jeitos diferentes e nenhuma busca casando.
  v_phone := regexp_replace(v_phone, '[^0-9+]', '', 'g');

  if left(v_phone, 1) <> '+' then
    -- Sem DDI: assume Brasil, mas só depois de conferir que tem DDD. Validar
    -- antes de colar o "+55" é o que impede um número de 8 dígitos virar um
    -- E.164 de tamanho aceitável e passar despercebido.
    if v_phone !~ '^[1-9][0-9]{9,10}$' then
      raise exception 'TELEFONE_INVALIDO: informe DDD e número, por exemplo (81) 99999-8888'
        using errcode = 'check_violation';
    end if;
    v_phone := '+55' || v_phone;
  end if;

  if v_phone !~ '^\+[1-9][0-9]{9,14}$'
     or (v_phone ~ '^\+55' and v_phone !~ '^\+55[1-9][0-9]{9,10}$') then
    raise exception 'TELEFONE_INVALIDO: informe DDD e número, por exemplo (81) 99999-8888'
      using errcode = 'check_violation';
  end if;

  -- Checado aqui, e não só pelo índice único, para a mensagem chegar nomeada.
  -- Corrida entre dois cadastros simultâneos ainda existe e cai no índice único
  -- — que é o que de fato garante a unicidade; isto aqui é só a mensagem boa.
  if exists (
    select 1 from public.profiles where lower(username) = lower(v_username)
  ) then
    raise exception 'USERNAME_EM_USO: esse nome de usuário já está sendo usado'
      using errcode = 'unique_violation';
  end if;

  insert into public.profiles (id, username, full_name, phone, friend_code)
  values (
    p_user_id,
    v_username,
    v_full_name,
    v_phone,
    private.generate_unique_code('profiles', 'friend_code', 6)
  )
  on conflict (id) do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Conferir o nome de usuário antes de tentar cadastrar
-- -----------------------------------------------------------------------------
-- Sem isto, escolher um nome já usado só falha depois de enviar o formulário
-- inteiro, e o GoTrue transforma a exceção do gatilho num opaco "Database error
-- saving new user". A tela chama esta função enquanto a pessoa digita.
--
-- Sim, ela permite descobrir quais nomes de usuário existem. É o mesmo que
-- qualquer app com @ na internet expõe, e o alternativa é um cadastro que falha
-- sem dizer por quê.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    trim(coalesce(p_username, '')) ~ '^[a-zA-Z0-9_.]{3,30}$'
    and not exists (
      select 1 from public.profiles
       where lower(username) = lower(trim(p_username))
    );
$$;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

comment on function public.is_username_available(text) is
  'Verdadeiro se o nome de usuário tem formato válido e ainda está livre. Usado pela tela de cadastro.';

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
-- As colunas novas entram no GRANT de UPDATE. `friend_code` e `role` continuam
-- de fora: são os dois campos que o usuário não pode mexer.
grant update (username, avatar_path, full_name, phone) on public.profiles to authenticated;
