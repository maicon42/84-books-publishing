-- 84 Books Publishing — extensão do perfil dos membros
-- Executar uma única vez no SQL Editor do projeto Supabase da 84 Books.

alter table public.profiles
  add column if not exists display_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists country text not null default '',
  add column if not exists gender text not null default '',
  add column if not exists birth_date date,
  add column if not exists profile_type text not null default 'reader',
  add column if not exists bio text not null default '';

grant select, update on public.profiles to authenticated;

-- Os membros continuam a poder consultar e editar apenas o próprio perfil.
-- As políticas existentes da tabela profiles continuam em vigor.
