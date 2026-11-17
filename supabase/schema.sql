-- 84 Books Publishing: perfis dos leitores
-- Executar no SQL Editor do projeto Supabase da 84 Books.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

drop policy if exists "Leitores podem ver o próprio perfil" on public.profiles;
create policy "Leitores podem ver o próprio perfil"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Leitores podem atualizar o próprio perfil" on public.profiles;
create policy "Leitores podem atualizar o próprio perfil"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_84books_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_84books on auth.users;
create trigger on_auth_user_created_84books
after insert on auth.users
for each row execute procedure public.handle_new_84books_user();
