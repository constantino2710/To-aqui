-- =============================================================================
-- Correção: grupo que perde todos os membros de uma vez
-- =============================================================================
-- A regra original era "todo grupo tem pelo menos um chefe". Ela quebra quando
-- várias contas do mesmo grupo são apagadas na mesma transação:
--
--   1. Apaga a conta da chefe. O gatilho de sucessão promove o membro mais
--      antigo — que, por azar, também está sendo apagado agora.
--   2. O CASCADE remove a linha do recém-promovido.
--   3. No COMMIT, o grupo existe e não tem chefe nenhum. Erro.
--
-- E o erro é enganoso: ninguém "ficou sem chefe", o grupo ficou sem ninguém.
--
-- A regra correta é "todo grupo COM MEMBROS tem pelo menos um chefe". Grupo sem
-- membro algum não é uma violação a impedir — é lixo a recolher, porque não
-- sobrou quem recebesse o alerta de uma criança perdida.

create or replace function private.enforce_group_has_chefe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid := coalesce(new.group_id, old.group_id);
  v_membros  integer;
begin
  -- O grupo já foi apagado e o CASCADE levou os membros junto.
  if not exists (select 1 from public.groups where id = v_group_id) then
    return null;
  end if;

  select count(*) into v_membros
    from public.group_members
   where group_id = v_group_id;

  -- Não sobrou ninguém: o grupo morre junto, em silêncio. Manter um grupo vazio
  -- só criaria uma família fantasma na tela de quem for convidado depois.
  if v_membros = 0 then
    delete from public.groups where id = v_group_id;
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
