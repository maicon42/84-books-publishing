-- 84 Books Publishing: comentários e avaliações individuais por livro
create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Leitor',
  comment text not null default '',
  rating smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_reviews_rating_range check (rating is null or rating between 0 and 5),
  constraint book_reviews_comment_length check (char_length(comment) <= 2000),
  constraint book_reviews_author_name_length check (char_length(author_name) <= 80),
  constraint book_reviews_has_feedback check (length(btrim(comment)) > 0 or rating is not null),
  constraint book_reviews_one_per_user_per_book unique (book_id, user_id)
);

alter table public.book_reviews enable row level security;
grant select on public.book_reviews to anon, authenticated;
grant insert, update, delete on public.book_reviews to authenticated;

drop policy if exists "Published book feedback is public" on public.book_reviews;
create policy "Published book feedback is public"
on public.book_reviews for select to anon, authenticated
using (exists (select 1 from public.books b where b.id = book_reviews.book_id and b.status = 'published'));

drop policy if exists "Members can add their own book feedback" on public.book_reviews;
create policy "Members can add their own book feedback"
on public.book_reviews for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.books b where b.id = book_reviews.book_id and b.status = 'published'));

drop policy if exists "Members can edit their own book feedback" on public.book_reviews;
create policy "Members can edit their own book feedback"
on public.book_reviews for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (select 1 from public.books b where b.id = book_reviews.book_id and b.status = 'published'));

drop policy if exists "Members can delete their own book feedback" on public.book_reviews;
create policy "Members can delete their own book feedback"
on public.book_reviews for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function private.set_84books_review_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare profile_name text;
begin
  if auth.uid() is null or auth.uid() <> new.user_id then
    raise exception 'Sessão inválida para publicar esta opinião.';
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), ''), 'Leitor')
  into profile_name from public.profiles p where p.id = new.user_id;
  new.author_name := coalesce(profile_name, 'Leitor');
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_84books_review_author() from public, anon, authenticated;
drop trigger if exists set_84books_review_author on public.book_reviews;
create trigger set_84books_review_author before insert or update on public.book_reviews
for each row execute function private.set_84books_review_author();

create index if not exists book_reviews_book_created_idx on public.book_reviews (book_id, created_at desc);
