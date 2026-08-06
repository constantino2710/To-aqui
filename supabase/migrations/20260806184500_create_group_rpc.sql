-- Cria a família e devolve o id na mesma transação.
--
-- Fazer INSERT ... RETURNING diretamente pela Data API esbarra na política de
-- SELECT: o RETURNING é avaliado antes de a leitura enxergar o criador como
-- membro inserido pelo gatilho. Esta função mantém a RLS de leitura restrita e
-- expõe apenas o id do grupo que o próprio usuário acabou de criar.
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  insert into public.groups (name, created_by)
  values (trim(p_name), v_uid)
  returning id into v_group_id;

  return v_group_id;
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

comment on function public.create_group(text) is
  'Cria uma família para o usuário autenticado e devolve seu id sem ampliar a política de leitura de groups.';
