-- =============================================================================
-- Usuários de teste — To Aqui
-- =============================================================================
-- Cria usuários JÁ CONFIRMADOS (dá para logar no app) e mostra o friend_code
-- de cada um no final.
--
-- COMO RODAR: Supabase Dashboard > SQL Editor > cole tudo > Run.
-- (O SQL Editor roda com privilégio total, então não esbarra em RLS nem em
--  confirmação de e-mail.)
--
-- Senha de todos: Teste@123456
-- É idempotente: rodar de novo não duplica (pula quem já existe).
-- =============================================================================

do $$
declare
  u       record;
  v_id    uuid;
  v_senha text := 'Teste@123456';
begin
  for u in
    select * from (values
      ('ana_teste',    'Ana Teste',    '+5581991110001', 'ana.teste@toaqui.test'),
      ('bruno_teste',  'Bruno Teste',  '+5581991110002', 'bruno.teste@toaqui.test'),
      ('carla_teste',  'Carla Teste',  '+5581991110003', 'carla.teste@toaqui.test'),
      ('diego_teste',  'Diego Teste',  '+5581991110004', 'diego.teste@toaqui.test'),
      ('elena_teste',  'Elena Teste',  '+5581991110005', 'elena.teste@toaqui.test'),
      ('felipe_teste', 'Felipe Teste', '+5581991110006', 'felipe.teste@toaqui.test')
    ) as t(username, full_name, phone, email)
  loop
    if exists (select 1 from auth.users where email = u.email) then
      continue;
    end if;

    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      u.email, extensions.crypt(v_senha, extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', u.username, 'full_name', u.full_name, 'phone', u.phone),
      now(), now(),
      '', '', '', ''
    );

    -- Sem a identidade, o login por e-mail/senha não funciona no GoTrue.
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', u.email),
      'email', now(), now(), now()
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Os códigos de amigo (é isto que você usa na Comunidade para adicionar)
-- -----------------------------------------------------------------------------
select p.friend_code as codigo_amigo,
       '@' || p.username as usuario,
       u.email,
       p.full_name
  from public.profiles p
  join auth.users u on u.id = p.id
 where u.email like '%@toaqui.test'
 order by p.username;
