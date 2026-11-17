-- 84 Books Publishing — administração e catálogo de livros
-- Execute este ficheiro UMA VEZ no SQL Editor do Supabase.
-- A primeira conta registada no projeto recebe o papel de administrador.

-- 1. Papel de cada conta. Os membros comuns nunca podem alterar esta coluna.
alter table public.profiles
  add column if not exists role text not null default 'reader';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('reader', 'admin'));

-- Promove a primeira conta registada. Confirme que esta é a conta do proprietário.
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  order by created_at asc, id asc
  limit 1
);

-- Retira a permissão geral de atualização e devolve apenas as colunas do perfil.
-- Assim, um utilizador não consegue promover a própria conta através do navegador.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name,
  display_name,
  phone,
  country,
  gender,
  birth_date,
  profile_type,
  bio,
  updated_at
) on public.profiles to authenticated;

-- 2. Função segura usada pelas políticas RLS para confirmar o papel de administrador.
create or replace function public.is_84books_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_84books_admin() from public;
grant execute on function public.is_84books_admin() to anon, authenticated;

-- 3. Catálogo de livros.
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null default 'Geral',
  description text not null default '',
  preview_text text not null default '',
  book_type text not null default 'gratuito'
    check (book_type in ('gratuito', 'pago', 'breve')),
  price numeric(12,2) not null default 0 check (price >= 0),
  status text not null default 'published'
    check (status in ('published', 'draft')),
  cover_path text,
  file_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_status_created_at_idx
  on public.books (status, created_at desc);

alter table public.books enable row level security;

grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;

drop policy if exists "84Books livros publicados visíveis" on public.books;
create policy "84Books livros publicados visíveis"
on public.books
for select
to anon, authenticated
using (status = 'published' or public.is_84books_admin());

drop policy if exists "84Books administrador gere livros" on public.books;
create policy "84Books administrador gere livros"
on public.books
for all
to authenticated
using (public.is_84books_admin())
with check (public.is_84books_admin());

-- 4. Armazenamento das capas (públicas) e dos PDFs (privados).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('84books-covers', '84books-covers', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('84books-files', '84books-files', false, 31457280, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "84Books leitura pública das capas" on storage.objects;
create policy "84Books leitura pública das capas"
on storage.objects
for select
to public
using (bucket_id = '84books-covers');

drop policy if exists "84Books administrador gere capas" on storage.objects;
create policy "84Books administrador gere capas"
on storage.objects
for all
to authenticated
using (bucket_id = '84books-covers' and public.is_84books_admin())
with check (bucket_id = '84books-covers' and public.is_84books_admin());

drop policy if exists "84Books administrador gere PDFs" on storage.objects;
create policy "84Books administrador gere PDFs"
on storage.objects
for all
to authenticated
using (bucket_id = '84books-files' and public.is_84books_admin())
with check (bucket_id = '84books-files' and public.is_84books_admin());

drop policy if exists "84Books PDFs gratuitos para membros" on storage.objects;
create policy "84Books PDFs gratuitos para membros"
on storage.objects
for select
to authenticated
using (
  bucket_id = '84books-files'
  and exists (
    select 1
    from public.books
    where books.file_path = storage.objects.name
      and books.status = 'published'
      and books.book_type = 'gratuito'
  )
);

-- Fim da configuração de administração.
