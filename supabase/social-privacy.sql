-- 84 Books Publishing — privacidade, comunidade, seguidores e identidade visual
-- Pré-requisito: supabase/admin-books.sql (papel admin e private.is_84books_admin()).
-- Executar uma vez no SQL Editor do projeto Supabase.

alter table public.profiles
  add column if not exists is_public boolean not null default true,
  add column if not exists show_full_name boolean not null default false,
  add column if not exists show_country boolean not null default true,
  add column if not exists show_phone boolean not null default false,
  add column if not exists show_birth_date boolean not null default false,
  add column if not exists show_gender boolean not null default false,
  add column if not exists show_followers boolean not null default true,
  add column if not exists show_following boolean not null default true,
  add column if not exists avatar_path text,
  add column if not exists avatar_public boolean not null default true;

grant update (
  full_name, display_name, phone, country, gender, birth_date, profile_type, bio,
  is_public, show_full_name, show_country, show_phone, show_birth_date,
  show_gender, show_followers, show_following, avatar_path, avatar_public, updated_at
) on public.profiles to authenticated;

drop policy if exists "84Books administrador consulta todos os perfis" on public.profiles;
create policy "84Books administrador consulta todos os perfis"
on public.profiles for select to authenticated
using (private.is_84books_admin());

-- Diretório público separado: contém apenas os campos autorizados pelo titular.
-- Os dados privados continuam na tabela profiles, protegidos pela RLS.
create table if not exists public.public_profile_directory (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null default '',
  full_name text,
  country text,
  phone text,
  birth_date date,
  gender text,
  profile_type text not null default 'reader',
  bio text not null default '',
  avatar_path text,
  created_at timestamptz not null,
  show_followers boolean not null default true,
  show_following boolean not null default true
);
alter table public.public_profile_directory enable row level security;
grant select on public.public_profile_directory to anon, authenticated;
drop policy if exists "84Books diretório público de perfis" on public.public_profile_directory;
create policy "84Books diretório público de perfis"
on public.public_profile_directory for select to anon, authenticated using (true);

create or replace function private.sync_84books_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_public then
    insert into public.public_profile_directory(
      id, display_name, full_name, country, phone, birth_date, gender,
      profile_type, bio, avatar_path, created_at, show_followers, show_following
    ) values (
      new.id,
      coalesce(new.display_name, ''),
      case when new.show_full_name then new.full_name else null end,
      case when new.show_country then new.country else null end,
      case when new.show_phone then new.phone else null end,
      case when new.show_birth_date then new.birth_date else null end,
      case when new.show_gender then new.gender else null end,
      coalesce(new.profile_type, 'reader'),
      coalesce(new.bio, ''),
      case when new.avatar_public then new.avatar_path else null end,
      new.created_at,
      new.show_followers,
      new.show_following
    )
    on conflict (id) do update set
      display_name=excluded.display_name,
      full_name=excluded.full_name,
      country=excluded.country,
      phone=excluded.phone,
      birth_date=excluded.birth_date,
      gender=excluded.gender,
      profile_type=excluded.profile_type,
      bio=excluded.bio,
      avatar_path=excluded.avatar_path,
      show_followers=excluded.show_followers,
      show_following=excluded.show_following;
  else
    delete from public.public_profile_directory where id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_84books_public_profile() from public, anon, authenticated;

drop trigger if exists sync_84books_public_profile on public.profiles;
create trigger sync_84books_public_profile
after insert or update of
  display_name, full_name, country, phone, birth_date, gender, profile_type, bio,
  is_public, show_full_name, show_country, show_phone, show_birth_date, show_gender,
  avatar_path, avatar_public, show_followers, show_following
on public.profiles
for each row execute procedure private.sync_84books_public_profile();

insert into public.public_profile_directory(
  id, display_name, full_name, country, phone, birth_date, gender,
  profile_type, bio, avatar_path, created_at, show_followers, show_following
)
select
  id, coalesce(display_name, ''),
  case when show_full_name then full_name end,
  case when show_country then country end,
  case when show_phone then phone end,
  case when show_birth_date then birth_date end,
  case when show_gender then gender end,
  coalesce(profile_type, 'reader'), coalesce(bio, ''),
  case when avatar_public then avatar_path end,
  created_at, show_followers, show_following
from public.profiles
where is_public=true
on conflict (id) do update set
  display_name=excluded.display_name, full_name=excluded.full_name,
  country=excluded.country, phone=excluded.phone, birth_date=excluded.birth_date,
  gender=excluded.gender, profile_type=excluded.profile_type, bio=excluded.bio,
  avatar_path=excluded.avatar_path, show_followers=excluded.show_followers,
  show_following=excluded.show_following;

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_no_self check (follower_id <> followed_id),
  constraint follows_unique unique (follower_id, followed_id)
);
create index if not exists follows_followed_idx on public.follows(followed_id, created_at desc);
create index if not exists follows_follower_idx on public.follows(follower_id, created_at desc);
alter table public.follows enable row level security;
grant select, insert, delete on public.follows to anon, authenticated;


create or replace view public.public_profiles
with (security_invoker = true, security_barrier = true)
as
select
  d.id, d.display_name, d.full_name, d.country, d.phone, d.birth_date, d.gender,
  d.profile_type, d.bio, d.avatar_path, d.created_at, d.show_followers, d.show_following,
  case when d.show_followers then
    (select count(*)::integer from public.follows f where f.followed_id=d.id)
    else null end as follower_count,
  case when d.show_following then
    (select count(*)::integer from public.follows f where f.follower_id=d.id)
    else null end as following_count
from public.public_profile_directory d;
grant select on public.public_profiles to anon, authenticated;


drop policy if exists "84Books ver seguidores de perfis públicos" on public.follows;
create policy "84Books ver seguidores de perfis públicos"
on public.follows for select to anon, authenticated
using (
  (follower_id=(select auth.uid()))
  or exists(select 1 from public.public_profile_directory d where d.id=follows.followed_id and d.show_followers=true)
  or exists(select 1 from public.public_profile_directory d where d.id=follows.follower_id and d.show_following=true)
);
drop policy if exists "84Books seguir perfis públicos" on public.follows;
create policy "84Books seguir perfis públicos"
on public.follows for insert to authenticated
with check (
  follower_id=(select auth.uid())
  and exists(select 1 from public.public_profile_directory d where d.id=followed_id)
);
drop policy if exists "84Books deixar de seguir" on public.follows;
create policy "84Books deixar de seguir"
on public.follows for delete to authenticated
using (follower_id=(select auth.uid()));

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint private_messages_no_self check (sender_id <> recipient_id)
);
create index if not exists private_messages_pair_idx
  on public.private_messages(sender_id, recipient_id, created_at desc);
create index if not exists private_messages_recipient_idx
  on public.private_messages(recipient_id, created_at desc);
alter table public.private_messages enable row level security;
grant select, insert on public.private_messages to authenticated;
grant update(read_at) on public.private_messages to authenticated;

drop policy if exists "84Books participantes leem mensagens" on public.private_messages;
create policy "84Books participantes leem mensagens"
on public.private_messages for select to authenticated
using ((select auth.uid())=sender_id or (select auth.uid())=recipient_id);
drop policy if exists "84Books enviar mensagem a perfil público" on public.private_messages;
create policy "84Books enviar mensagem a perfil público"
on public.private_messages for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and recipient_id<>(select auth.uid())
  and exists(select 1 from public.public_profile_directory d where d.id=recipient_id)
);
drop policy if exists "84Books destinatário marca mensagem lida" on public.private_messages;
create policy "84Books destinatário marca mensagem lida"
on public.private_messages for update to authenticated
using ((select auth.uid())=recipient_id)
with check ((select auth.uid())=recipient_id);

create table if not exists public.site_settings (
  setting_key text primary key check (setting_key='branding'),
  logo_path text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.site_settings(setting_key) values ('branding') on conflict do nothing;
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant update(logo_path, updated_by, updated_at) on public.site_settings to authenticated;
drop policy if exists "84Books identidade visual pública" on public.site_settings;
create policy "84Books identidade visual pública"
on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "84Books administrador altera identidade visual" on public.site_settings;
create policy "84Books administrador altera identidade visual"
on public.site_settings for update to authenticated
using (private.is_84books_admin())
with check (private.is_84books_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
 ('84books-avatars','84books-avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('84books-brand','84books-brand',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "84Books leitura pública de fotos de perfil" on storage.objects;
create policy "84Books leitura pública de fotos de perfil"
on storage.objects for select to anon
using (
  bucket_id='84books-avatars'
  and exists(select 1 from public.public_profile_directory d where d.avatar_path=storage.objects.name)
);
drop policy if exists "84Books leitura autenticada de fotos de perfil" on storage.objects;
create policy "84Books leitura autenticada de fotos de perfil"
on storage.objects for select to authenticated
using (
  bucket_id='84books-avatars'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or private.is_84books_admin()
    or exists(select 1 from public.public_profile_directory d where d.avatar_path=storage.objects.name)
  )
);
drop policy if exists "84Books utilizador carrega a própria foto" on storage.objects;
create policy "84Books utilizador carrega a própria foto"
on storage.objects for insert to authenticated
with check (bucket_id='84books-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "84Books utilizador atualiza a própria foto" on storage.objects;
create policy "84Books utilizador atualiza a própria foto"
on storage.objects for update to authenticated
using (bucket_id='84books-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='84books-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "84Books utilizador remove a própria foto" on storage.objects;
create policy "84Books utilizador remove a própria foto"
on storage.objects for delete to authenticated
using (bucket_id='84books-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "84Books logotipo público" on storage.objects;
create policy "84Books logotipo público"
on storage.objects for select to public using(bucket_id='84books-brand');
drop policy if exists "84Books administrador gere logotipo" on storage.objects;
create policy "84Books administrador gere logotipo"
on storage.objects for all to authenticated
using(bucket_id='84books-brand' and private.is_84books_admin())
with check(bucket_id='84books-brand' and private.is_84books_admin());

alter table public.books add column if not exists is_public boolean not null default true;
drop policy if exists "84Books livros publicados visíveis" on public.books;
create policy "84Books livros publicados visíveis"
on public.books for select to anon, authenticated
using ((status='published' and is_public=true) or private.is_84books_admin());
drop policy if exists "84Books autor consulta as próprias obras" on public.books;
create policy "84Books autor consulta as próprias obras"
on public.books for select to authenticated
using (author_user_id=(select auth.uid()));
grant update(is_public) on public.books to authenticated;
drop policy if exists "84Books autor controla privacidade da obra" on public.books;
create policy "84Books autor controla privacidade da obra"
on public.books for update to authenticated
using (author_user_id=(select auth.uid()))
with check (author_user_id=(select auth.uid()));

-- Atualiza o trigger já existente: cada nova conta segue o administrador principal.
create or replace function public.handle_new_84books_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin_id uuid;
begin
  insert into public.profiles(id,full_name,display_name,country,phone,birth_date,profile_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    coalesce(new.raw_user_meta_data ->> 'display_name',''),
    coalesce(new.raw_user_meta_data ->> 'country',''),
    coalesce(new.raw_user_meta_data ->> 'phone',''),
    nullif(new.raw_user_meta_data ->> 'birth_date','')::date,
    coalesce(new.raw_user_meta_data ->> 'profile_type','reader')
  )
  on conflict(id) do nothing;

  select id into v_admin_id
  from public.profiles
  where role='admin' and id<>new.id
  order by created_at asc
  limit 1;

  if v_admin_id is not null then
    insert into public.follows(follower_id,followed_id)
    values(new.id,v_admin_id)
    on conflict(follower_id,followed_id) do nothing;
  end if;
  return new;
end;
$;
revoke all on function public.handle_new_84books_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_84books on auth.users;
create trigger on_auth_user_created_84books
after insert on auth.users
for each row execute procedure public.handle_new_84books_user();

-- Contas que já existiam passam a seguir o administrador principal.
insert into public.follows(follower_id,followed_id)
select p.id,a.id
from public.profiles p
cross join lateral (
  select id from public.profiles where role='admin' order by created_at asc limit 1
) a
where p.id<>a.id
on conflict(follower_id,followed_id) do nothing;
