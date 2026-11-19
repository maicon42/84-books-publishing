-- 84 Books Publishing — submissões de autores, contratos e royalties
-- Versão inicial: 1.0 | Política aprovada: 90/10 vendas líquidas; 70/30 anúncios recompensados.
-- Executar no projeto Supabase exclusivo da 84 Books Publishing.
-- Não ativa pagamentos nem anúncios: prepara o registo seguro para integrações futuras.

begin;

-- 1. Associação do autor ao livro e divisão fixa por tipo de acesso.
alter table public.books
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists author_share_percent numeric(5,2) not null default 90,
  add column if not exists platform_share_percent numeric(5,2) not null default 10;

update public.books
set author_share_percent = case
      when book_type = 'gratuito' then 70
      when book_type = 'pago' then 90
      else 0
    end,
    platform_share_percent = case
      when book_type = 'gratuito' then 30
      when book_type = 'pago' then 10
      else 100
    end;

alter table public.books
  drop constraint if exists books_revenue_share_sum_check;
alter table public.books
  add constraint books_revenue_share_sum_check
  check (
    author_share_percent between 0 and 100
    and platform_share_percent between 0 and 100
    and author_share_percent + platform_share_percent = 100
  );

create or replace function public.set_84books_revenue_split()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.book_type = 'pago' then
    new.author_share_percent := 90;
    new.platform_share_percent := 10;
  elsif new.book_type = 'gratuito' then
    new.author_share_percent := 70;
    new.platform_share_percent := 30;
  else
    new.author_share_percent := 0;
    new.platform_share_percent := 100;
  end if;
  return new;
end;
$$;

revoke all on function public.set_84books_revenue_split() from public, anon, authenticated;
drop trigger if exists set_84books_revenue_split on public.books;
create trigger set_84books_revenue_split
before insert or update of book_type, author_share_percent, platform_share_percent
on public.books
for each row execute function public.set_84books_revenue_split();

drop policy if exists "84Books autores veem os próprios livros" on public.books;
create policy "84Books autores veem os próprios livros"
on public.books for select to authenticated
using (author_user_id = (select auth.uid()));

-- 2. Submissões privadas de manuscritos.
create table if not exists public.author_submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 180),
  author_display_name text not null default '' check (char_length(author_display_name) <= 120),
  category text not null default 'Geral' check (char_length(category) <= 80),
  synopsis text not null default '' check (char_length(synopsis) <= 3000),
  manuscript_path text,
  cover_path text,
  rights_declaration boolean not null default false,
  coauthors text not null default '' check (char_length(coauthors) <= 1000),
  status text not null default 'draft'
    check (status in ('draft','submitted','under_review','changes_requested','approved','rejected','withdrawn')),
  admin_notes text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  linked_book_id uuid references public.books(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (manuscript_path is null or manuscript_path like author_id::text || '/%'),
  check (cover_path is null or cover_path like author_id::text || '/%'),
  check (status <> 'submitted' or (rights_declaration = true and manuscript_path is not null))
);

create index if not exists author_submissions_author_created_idx
  on public.author_submissions(author_id, created_at desc);
create index if not exists author_submissions_status_created_idx
  on public.author_submissions(status, created_at desc);

alter table public.author_submissions enable row level security;
grant select, insert, update on public.author_submissions to authenticated;

drop policy if exists "Autores consultam as próprias submissões" on public.author_submissions;
create policy "Autores consultam as próprias submissões"
on public.author_submissions for select to authenticated
using (author_id = (select auth.uid()) or private.is_84books_admin());

drop policy if exists "Autores criam submissões próprias" on public.author_submissions;
create policy "Autores criam submissões próprias"
on public.author_submissions for insert to authenticated
with check (
  author_id = (select auth.uid())
  and status in ('draft','submitted')
  and (status <> 'submitted' or (rights_declaration and manuscript_path is not null))
);

drop policy if exists "Autores editam rascunhos ou correções" on public.author_submissions;
create policy "Autores editam rascunhos ou correções"
on public.author_submissions for update to authenticated
using (
  author_id = (select auth.uid())
  and status in ('draft','changes_requested')
)
with check (
  author_id = (select auth.uid())
  and status in ('draft','submitted','changes_requested')
  and (status <> 'submitted' or (rights_declaration and manuscript_path is not null))
);

drop policy if exists "Administradores gerem submissões" on public.author_submissions;
create policy "Administradores gerem submissões"
on public.author_submissions for all to authenticated
using (private.is_84books_admin())
with check (private.is_84books_admin());

-- 3. Aceitação eletrónica do contrato: registo imutável para o autor.
create table if not exists public.author_contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.author_submissions(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  contract_version text not null,
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 180),
  accepted_terms jsonb not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.author_contract_acceptances enable row level security;
grant select, insert on public.author_contract_acceptances to authenticated;

drop policy if exists "Autores consultam as próprias aceitações" on public.author_contract_acceptances;
create policy "Autores consultam as próprias aceitações"
on public.author_contract_acceptances for select to authenticated
using (author_id = (select auth.uid()) or private.is_84books_admin());

drop policy if exists "Autores registam a própria aceitação" on public.author_contract_acceptances;
create policy "Autores registam a própria aceitação"
on public.author_contract_acceptances for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.author_submissions s
    where s.id = submission_id
      and s.author_id = (select auth.uid())
      and s.status in ('draft','submitted','changes_requested')
  )
);

-- 4. Eventos de acesso recompensado. Só um backend/verificador poderá escrever.
create table if not exists public.rewarded_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  action text not null check (action in ('read','download')),
  provider text not null,
  provider_event_id text not null unique,
  status text not null default 'pending'
    check (status in ('pending','verified','consumed','rejected','expired')),
  verified_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rewarded_access_user_created_idx
  on public.rewarded_access_events(user_id, created_at desc);
create index if not exists rewarded_access_book_created_idx
  on public.rewarded_access_events(book_id, created_at desc);

alter table public.rewarded_access_events enable row level security;
grant select on public.rewarded_access_events to authenticated;

drop policy if exists "Leitores consultam os próprios desbloqueios" on public.rewarded_access_events;
create policy "Leitores consultam os próprios desbloqueios"
on public.rewarded_access_events for select to authenticated
using (user_id = (select auth.uid()) or private.is_84books_admin());

-- 5. Registo financeiro de vendas pagas. Inserção/alteração apenas por backend/admin.
create table if not exists public.book_sales (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  buyer_id uuid references auth.users(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  provider text not null,
  provider_transaction_id text not null unique,
  currency char(3) not null default 'AOA',
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  payment_fee numeric(14,2) not null default 0 check (payment_fee >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  refund_amount numeric(14,2) not null default 0 check (refund_amount >= 0),
  net_revenue numeric(14,2) not null check (net_revenue >= 0),
  author_share_percent numeric(5,2) not null default 90 check (author_share_percent = 90),
  platform_share_percent numeric(5,2) not null default 10 check (platform_share_percent = 10),
  author_amount numeric(14,2) not null check (author_amount >= 0),
  platform_amount numeric(14,2) not null check (platform_amount >= 0),
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','refunded','disputed','cancelled')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (payment_fee + tax_amount + refund_amount <= gross_amount),
  check (net_revenue = gross_amount - payment_fee - tax_amount - refund_amount),
  check (author_amount + platform_amount = net_revenue)
);

create index if not exists book_sales_author_created_idx
  on public.book_sales(author_id, created_at desc);
create index if not exists book_sales_buyer_created_idx
  on public.book_sales(buyer_id, created_at desc);

alter table public.book_sales enable row level security;
grant select on public.book_sales to authenticated;

drop policy if exists "Compradores consultam as próprias compras" on public.book_sales;
create policy "Compradores consultam as próprias compras"
on public.book_sales for select to authenticated
using (buyer_id = (select auth.uid()) or private.is_84books_admin());

drop policy if exists "Autores consultam vendas das próprias obras" on public.book_sales;
create policy "Autores consultam vendas das próprias obras"
on public.book_sales for select to authenticated
using (author_id = (select auth.uid()) or private.is_84books_admin());

-- 6. Extratos agregados de royalties por livro e período.
create table if not exists public.author_royalty_statements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  book_id uuid not null references public.books(id) on delete restrict,
  revenue_source text not null check (revenue_source in ('paid_sale','rewarded_ads')),
  period_start date not null,
  period_end date not null,
  currency char(3) not null default 'AOA',
  gross_revenue numeric(14,2) not null default 0 check (gross_revenue >= 0),
  deductions numeric(14,2) not null default 0 check (deductions >= 0),
  net_revenue numeric(14,2) not null check (net_revenue >= 0),
  author_share_percent numeric(5,2) not null,
  platform_share_percent numeric(5,2) not null,
  author_amount numeric(14,2) not null check (author_amount >= 0),
  platform_amount numeric(14,2) not null check (platform_amount >= 0),
  status text not null default 'draft' check (status in ('draft','confirmed','paid','adjusted')),
  statement_reference text not null default '',
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (author_share_percent + platform_share_percent = 100),
  check (author_amount + platform_amount = net_revenue),
  check (
    (revenue_source = 'paid_sale' and author_share_percent = 90 and platform_share_percent = 10)
    or
    (revenue_source = 'rewarded_ads' and author_share_percent = 70 and platform_share_percent = 30)
  )
);

create index if not exists author_royalty_author_period_idx
  on public.author_royalty_statements(author_id, period_start desc);

alter table public.author_royalty_statements enable row level security;
grant select on public.author_royalty_statements to authenticated;

drop policy if exists "Autores consultam os próprios extratos" on public.author_royalty_statements;
create policy "Autores consultam os próprios extratos"
on public.author_royalty_statements for select to authenticated
using (author_id = (select auth.uid()) or private.is_84books_admin());

-- 7. Pagamentos feitos aos autores; dados bancários completos não são guardados nesta tabela.
create table if not exists public.author_payouts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'AOA',
  status text not null default 'pending'
    check (status in ('pending','processing','paid','failed','cancelled')),
  payment_method text not null default '',
  payment_reference text not null default '',
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists author_payouts_author_created_idx
  on public.author_payouts(author_id, created_at desc);

alter table public.author_payouts enable row level security;
grant select on public.author_payouts to authenticated;

drop policy if exists "Autores consultam os próprios pagamentos" on public.author_payouts;
create policy "Autores consultam os próprios pagamentos"
on public.author_payouts for select to authenticated
using (author_id = (select auth.uid()) or private.is_84books_admin());

-- 8. Buckets privados para manuscritos e capas submetidas por autores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('84books-manuscripts','84books-manuscripts',false,52428800,
   array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/vnd.oasis.opendocument.text']),
  ('84books-author-covers','84books-author-covers',false,8388608,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Autores enviam os próprios manuscritos" on storage.objects;
create policy "Autores enviam os próprios manuscritos"
on storage.objects for insert to authenticated
with check (
  bucket_id = '84books-manuscripts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Autores consultam os próprios manuscritos" on storage.objects;
create policy "Autores consultam os próprios manuscritos"
on storage.objects for select to authenticated
using (
  bucket_id = '84books-manuscripts'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.is_84books_admin()
  )
);

drop policy if exists "Administradores gerem manuscritos" on storage.objects;
create policy "Administradores gerem manuscritos"
on storage.objects for all to authenticated
using (bucket_id = '84books-manuscripts' and private.is_84books_admin())
with check (bucket_id = '84books-manuscripts' and private.is_84books_admin());

drop policy if exists "Autores enviam as próprias capas" on storage.objects;
create policy "Autores enviam as próprias capas"
on storage.objects for insert to authenticated
with check (
  bucket_id = '84books-author-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Autores consultam as próprias capas" on storage.objects;
create policy "Autores consultam as próprias capas"
on storage.objects for select to authenticated
using (
  bucket_id = '84books-author-covers'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.is_84books_admin()
  )
);

drop policy if exists "Administradores gerem capas submetidas" on storage.objects;
create policy "Administradores gerem capas submetidas"
on storage.objects for all to authenticated
using (bucket_id = '84books-author-covers' and private.is_84books_admin())
with check (bucket_id = '84books-author-covers' and private.is_84books_admin());

-- 9. Proteção dos campos administrativos das submissões.
-- O autor não pode aprovar a própria obra, escrever notas internas nem definir o livro publicado.
create or replace function public.guard_84books_author_submission()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  if not private.is_84books_admin() then
    if tg_op = 'INSERT' then
      if coalesce(new.admin_notes,'') <> ''
         or new.reviewed_by is not null
         or new.reviewed_at is not null
         or new.linked_book_id is not null then
        raise exception 'Os campos de revisão são exclusivos da equipa editorial.';
      end if;
      new.created_at := now();
      new.updated_at := now();
    else
      if new.author_id is distinct from old.author_id
         or new.admin_notes is distinct from old.admin_notes
         or new.reviewed_by is distinct from old.reviewed_by
         or new.reviewed_at is distinct from old.reviewed_at
         or new.linked_book_id is distinct from old.linked_book_id
         or new.created_at is distinct from old.created_at then
        raise exception 'Não pode alterar os campos internos da revisão editorial.';
      end if;
      if new.status not in ('draft','submitted','changes_requested') then
        raise exception 'Só a equipa editorial pode aprovar ou recusar uma submissão.';
      end if;
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$;
revoke all on function public.guard_84books_author_submission() from public, anon, authenticated;
drop trigger if exists guard_84books_author_submission on public.author_submissions;
create trigger guard_84books_author_submission
before insert or update on public.author_submissions
for each row execute function public.guard_84books_author_submission();

-- 10. A data da aceitação é definida pelo servidor, nunca pelo relógio do navegador.
create or replace function public.stamp_84books_contract_acceptance()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  if not private.is_84books_admin() then
    new.accepted_at := now();
    new.created_at := now();
  end if;
  return new;
end;
$;
revoke all on function public.stamp_84books_contract_acceptance() from public, anon, authenticated;
drop trigger if exists stamp_84books_contract_acceptance on public.author_contract_acceptances;
create trigger stamp_84books_contract_acceptance
before insert on public.author_contract_acceptances
for each row execute function public.stamp_84books_contract_acceptance();

-- 11. Privilégios explícitos: o navegador nunca escreve dados financeiros ou eventos de recompensa.
revoke all on public.author_submissions from anon;
revoke delete on public.author_submissions from authenticated;
grant select, insert, update on public.author_submissions to authenticated;

revoke all on public.author_contract_acceptances from anon;
revoke update, delete on public.author_contract_acceptances from authenticated;
grant select, insert on public.author_contract_acceptances to authenticated;

revoke all on public.rewarded_access_events from anon, authenticated;
grant select on public.rewarded_access_events to authenticated;

revoke all on public.book_sales from anon, authenticated;
grant select on public.book_sales to authenticated;

revoke all on public.author_royalty_statements from anon, authenticated;
grant select on public.author_royalty_statements to authenticated;

revoke all on public.author_payouts from anon, authenticated;
grant select on public.author_payouts to authenticated;

grant all on public.author_submissions to service_role;
grant all on public.author_contract_acceptances to service_role;
grant all on public.rewarded_access_events to service_role;
grant all on public.book_sales to service_role;
grant all on public.author_royalty_statements to service_role;
grant all on public.author_payouts to service_role;

-- 12. Versões oficiais do contrato. O servidor fixa o snapshot aceite.
create table if not exists public.author_contract_versions (
  version text primary key,
  document_url text not null,
  terms_snapshot jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.author_contract_versions enable row level security;
grant select on public.author_contract_versions to anon, authenticated;
revoke insert, update, delete on public.author_contract_versions from anon, authenticated;
grant all on public.author_contract_versions to service_role;

drop policy if exists "Versões ativas do contrato são consultáveis" on public.author_contract_versions;
create policy "Versões ativas do contrato são consultáveis"
on public.author_contract_versions for select to anon, authenticated
using (is_active or private.is_84books_admin());

drop policy if exists "Administradores gerem versões do contrato" on public.author_contract_versions;
create policy "Administradores gerem versões do contrato"
on public.author_contract_versions for all to authenticated
using (private.is_84books_admin())
with check (private.is_84books_admin());

insert into public.author_contract_versions (version, document_url, terms_snapshot, is_active)
values (
  '1.0',
  'https://github.com/maicon42/84-books-publishing/blob/main/CONTRATO-PUBLICACAO-AUTORES.md',
  '{"version":"1.0","license":"non_exclusive","paid_sales":{"author_percent":90,"platform_percent":10,"basis":"net_revenue"},"rewarded_ads":{"author_percent":70,"platform_percent":30,"basis":"net_verified_ad_revenue"},"free_reading_ads":"only_on_explicit_read_or_download_action","no_intrusive_ads":true}'::jsonb,
  true
)
on conflict (version) do update
set document_url = excluded.document_url,
    terms_snapshot = excluded.terms_snapshot,
    is_active = excluded.is_active;

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'author_contract_acceptances_version_fkey'
      and conrelid = 'public.author_contract_acceptances'::regclass
  ) then
    alter table public.author_contract_acceptances
      add constraint author_contract_acceptances_version_fkey
      foreign key (contract_version)
      references public.author_contract_versions(version)
      on delete restrict;
  end if;
end;
$;

create or replace function public.stamp_84books_contract_acceptance()
returns trigger
language plpgsql
set search_path = ''
as $
declare
  canonical_terms jsonb;
begin
  select v.terms_snapshot
    into canonical_terms
  from public.author_contract_versions v
  where v.version = new.contract_version
    and v.is_active = true;

  if canonical_terms is null then
    raise exception 'Esta versão do contrato não está ativa para novas aceitações.';
  end if;

  new.accepted_terms := canonical_terms;
  if not private.is_84books_admin() then
    new.accepted_at := now();
    new.created_at := now();
  end if;
  return new;
end;
$;
revoke all on function public.stamp_84books_contract_acceptance() from public, anon, authenticated;
drop trigger if exists stamp_84books_contract_acceptance on public.author_contract_acceptances;
create trigger stamp_84books_contract_acceptance
before insert on public.author_contract_acceptances
for each row execute function public.stamp_84books_contract_acceptance();

commit;

-- Verificação rápida após execução:
-- select table_name from information_schema.tables
-- where table_schema='public' and table_name in
-- ('author_submissions','author_contract_acceptances','rewarded_access_events',
--  'book_sales','author_royalty_statements','author_payouts');
