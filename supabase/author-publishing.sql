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
  'https://github.com/maicon42/84-books-publishing/blob/main/docs/contracts/CONTRATO-PUBLICACAO-AUTORES-v1.0.md',
  '{"version":"1.0","stage":"provisional_editorial_review_acknowledgement","acknowledgement_only":true,"publication_contract_binding":false,"notice":"A minuta 1.0 é provisória e não autoriza a publicação nem substitui o contrato definitivo revisto juridicamente. Esta aceitação regista apenas a autorização para análise editorial.","document_url":"https://github.com/maicon42/84-books-publishing/blob/main/docs/contracts/CONTRATO-PUBLICACAO-AUTORES-v1.0.md","document_markdown":"# CONTRATO-MODELO DE PUBLICAÇÃO DIGITAL\n## 84 Books Publishing — minuta para revisão jurídica em Angola\n\n**Versão do modelo:** 1.0  \n**Estado:** minuta. Não utilizar para recolher assinaturas nem iniciar pagamentos antes da revisão por advogado habilitado em Angola e do preenchimento dos campos específicos.\n\n### 1. Identificação das partes\n\nEntre:\n\n**84 Books Publishing**, projeto/plataforma de publicação digital, com entidade jurídica, NIF, sede e representante a identificar no Anexo A, doravante **Plataforma**;\n\ne\n\n**Autor(a):** [NOME LEGAL COMPLETO], documento de identificação [TIPO/NÚMERO], endereço [ENDEREÇO], país [PAÍS], e-mail [E-MAIL], doravante **Autor**.\n\nAs partes acordam o seguinte:\n\n### 2. Obra abrangida\n\n- Título: [TÍTULO]\n- Nome público do autor: [NOME DE PUBLICAÇÃO]\n- Coautores e respetivas participações: [IDENTIFICAR OU INDICAR “NÃO EXISTEM”]\n- Idioma(s): [IDIOMAS]\n- Edição/versão: [EDIÇÃO]\n- ISBN, se existir: [ISBN]\n- Formatos autorizados: [PDF / EPUB / OUTROS]\n- Capa, ilustrações, fotografias, tradução e outros elementos: [IDENTIFICAR]\n\nEste contrato abrange apenas a obra e os elementos expressamente identificados. Outros livros do Autor exigem acordo próprio ou adenda.\n\n### 3. Titularidade e garantia de direitos\n\n3.1. O Autor declara que é titular dos direitos necessários sobre a obra ou que possui autorização escrita de todos os titulares e colaboradores para conceder a licença prevista neste contrato.\n\n3.2. O Autor declara que o texto, a capa, as imagens, as ilustrações, as fontes, a tradução e os demais elementos entregues não violam direitos de terceiros, salvo os elementos de terceiros identificados e licenciados no Anexo A.\n\n3.3. A titularidade dos direitos de autor não é transferida para a Plataforma. Os direitos morais permanecem com os respetivos titulares, nos termos da lei aplicável.\n\n3.4. Se houver coautores, o Autor que submete a obra deve apresentar prova de autorização e indicar por escrito a divisão interna dos valores. A Plataforma não decide conflitos entre coautores.\n\n### 4. Licença concedida à Plataforma\n\n4.1. O Autor concede à Plataforma uma licença **não exclusiva**, limitada ao prazo, território, idiomas, formatos e modalidades indicados no Anexo A, para:\n- reproduzir digitalmente a obra e armazená-la nos sistemas da Plataforma;\n- disponibilizar a leitura online e/ou o download, conforme o modelo de acesso escolhido;\n- vender a edição digital, quando classificada como paga;\n- apresentar título, sinopse, nome público do Autor e metadados;\n- divulgar a obra em canais próprios da Plataforma, usando apenas materiais e excertos autorizados no Anexo A;\n- realizar conversões técnicas necessárias à leitura, acessibilidade, segurança e compatibilidade, sem alterar o sentido da obra.\n\n4.2. A licença não autoriza a Plataforma a imprimir, traduzir, sublicenciar a terceiros, vender direitos audiovisuais, criar adaptações ou distribuir fora dos canais identificados, salvo autorização adicional escrita.\n\n4.3. O Autor pode publicar a mesma obra noutras plataformas, respeitando eventuais limitações expressamente identificadas no Anexo A. Não existe exclusividade por defeito.\n\n### 5. Modalidade comercial e remuneração\n\nA modalidade da obra deve ser assinalada no Anexo A. As percentagens não podem ser alteradas unilateralmente para uma obra já contratada.\n\n**5.1. Obra paga — 90% Autor / 10% Plataforma**\n\na) O Autor recebe 90% da receita líquida efetivamente recebida pela Plataforma em cada venda confirmada.  \nb) A Plataforma recebe 10% da mesma receita líquida.  \nc) Para este contrato, receita líquida significa o valor efetivamente recebido pela venda, deduzido de taxas do prestador de pagamento, impostos incidentes sobre a transação que devam ser entregues ao Estado, reembolsos, estornos e chargebacks.  \nd) Não são deduzidos custos gerais de operação, publicidade institucional ou salários da Plataforma, salvo adenda expressa.\n\n**5.2. Obra gratuita com anúncios recompensados — 70% Autor / 30% Plataforma**\n\na) O leitor não paga pelo acesso à obra gratuita.  \nb) O Autor recebe 70% da receita líquida de anúncios recompensados atribuída à sua obra; a Plataforma recebe 30%.  \nc) Receita líquida de anúncios significa o montante efetivamente creditado pelo fornecedor de publicidade para os eventos elegíveis, depois de ajustes, invalidações, estornos e impostos aplicáveis.  \nd) A atribuição será feita com base nos relatórios verificáveis do fornecedor. Se o fornecedor não discriminar receita por livro, a Plataforma deverá usar um método de repartição proporcional, documentado e consistente, baseado nos eventos recompensados válidos por livro no período, explicando o método no extrato.  \ne) A existência, duração, disponibilidade ou valor de anúncios não é garantida. A Plataforma não pode inventar visualizações, simular temporizadores ou declarar uma recompensa sem confirmação válida do fornecedor.\n\n**5.3. Obra gratuita sem publicidade**\n\nSe a obra for disponibilizada gratuitamente sem anúncios recompensados, não existe receita de publicidade a repartir e não é devida remuneração por leitura, salvo acordo escrito diferente.\n\n### 6. Experiência do leitor e anúncios\n\n6.1. Os anúncios recompensados só serão apresentados quando o leitor escolher expressamente uma ação de desbloqueio, como “Ler gratuitamente” ou “Descarregar livro”.\n\n6.2. A Plataforma não colocará anúncios constantes nem anúncios obrigatórios em cada página de leitura. O anúncio não deverá interromper a leitura já desbloqueada.\n\n6.3. O acesso protegido só será concedido depois de o servidor confirmar a recompensa junto do fornecedor de publicidade. A simples execução de um temporizador no navegador não constitui prova de visualização.\n\n6.4. Se não existir anúncio disponível ou se o fornecedor não confirmar a recompensa, o acesso recompensado não será registado como concluído; a Plataforma deverá informar o leitor de forma clara.\n\n### 7. Preço, relatórios e pagamentos\n\n7.1. O preço de venda, a moeda, eventuais campanhas e a data de início serão registados no Anexo A ou numa comunicação eletrónica aceite pelas partes.\n\n7.2. A Plataforma manterá registos das vendas, deduções, receita líquida, percentagem do Autor e valor da Plataforma.\n\n7.3. A Plataforma disponibilizará extratos ao Autor pelo menos semestralmente, com identificação da obra, período, origem da receita, montantes brutos, deduções, receita líquida, percentagens e valor devido.\n\n7.4. Periodicidade de pagamento, valor mínimo para transferência, método de pagamento, custos bancários e prazo de liquidação: [PREENCHER NO ANEXO A]. Não se presume qualquer dado bancário nem se recolhem palavras-passe ou códigos de segurança.\n\n7.5. O Autor é responsável pelos seus deveres fiscais pessoais ou empresariais. A Plataforma efetuará as retenções legalmente exigidas, quando aplicáveis, e identificará tais valores no extrato.\n\n7.6. Reembolsos, estornos, fraude comprovada e ajustes do fornecedor podem corrigir extratos futuros, com explicação e referência ao movimento original.\n\n### 8. Obrigações da Plataforma\n\nA Plataforma compromete-se a:\n- identificar o Autor na página da obra conforme os dados fornecidos;\n- não alterar o conteúdo substancial sem autorização, exceto correções técnicas previamente acordadas;\n- proteger os ficheiros e dados de acesso com medidas razoáveis de segurança;\n- não disponibilizar a obra antes da aprovação editorial e documental;\n- manter registos financeiros e fornecer extratos;\n- comunicar reclamações relevantes de direitos e permitir resposta do Autor;\n- retirar ou suspender preventivamente material quando exista fundamento sério de infração, fraude ou ordem legal.\n\n### 9. Obrigações do Autor\n\nO Autor compromete-se a:\n- entregar ficheiros completos, legíveis e finais;\n- fornecer metadados verdadeiros e documentos de titularidade/licença;\n- obter autorizações de coautores, tradutores, ilustradores, fotógrafos e demais titulares;\n- não submeter conteúdo plagiado, ilícito ou que viole direitos de terceiros;\n- manter os seus dados de contacto e pagamento atualizados;\n- informar a Plataforma sobre alterações de direitos, disputas ou licenças;\n- não manipular vendas, anúncios, leituras ou eventos de recompensa.\n\n### 10. Revisão editorial, aprovação e alterações\n\n10.1. A submissão não garante aceitação. A Plataforma pode pedir correções, recusar a obra ou suspender a análise, comunicando os motivos de forma razoável.\n\n10.2. A Plataforma só publicará a obra depois de confirmar os direitos, a aceitação contratual, os metadados e os ficheiros finais.\n\n10.3. Alterações relevantes de conteúdo, preço, modalidade gratuita/paga, percentagens, território ou prazo exigem aceitação escrita ou eletrónica de ambas as partes.\n\n### 11. Prazo, retirada e cessação\n\n11.1. Prazo inicial da licença: [PRAZO]. Data de início: [DATA]. Renovação: [REGRAS].\n\n11.2. O Autor pode solicitar a retirada da obra mediante aviso escrito com [PRAZO] de antecedência, sem prejuízo de vendas já confirmadas, reembolsos pendentes, obrigações legais e cópias técnicas de segurança que devam ser eliminadas segundo a política de retenção.\n\n11.3. A Plataforma pode suspender imediatamente a obra em caso de reclamação plausível de direitos, ordem de autoridade, fraude, risco de segurança ou violação grave do contrato.\n\n11.4. Após cessação, a Plataforma interromperá novas vendas e novos desbloqueios dentro de [PRAZO], prestará contas dos valores pendentes e removerá os ficheiros ativos, ressalvadas obrigações legais de conservação.\n\n### 12. Reclamações e responsabilidade\n\n12.1. A parte que receber uma reclamação deverá comunicá-la à outra sem demora e partilhar os elementos necessários, respeitando a proteção de dados.\n\n12.2. O Autor responde pela veracidade das declarações de titularidade e pelas autorizações que afirma possuir, nos limites previstos na lei.\n\n12.3. A Plataforma não garante um número mínimo de vendas, leituras, downloads, anúncios ou rendimentos.\n\n### 13. Dados pessoais e comunicações\n\nOs dados pessoais serão tratados apenas para gestão da conta, análise editorial, execução do contrato, segurança, pagamentos, prevenção de fraude e cumprimento de obrigações legais, conforme a política de privacidade da Plataforma. Os dados bancários completos devem ser recolhidos apenas por canal apropriado e nunca por campos públicos, comentários ou mensagens abertas.\n\n### 14. Lei aplicável e resolução de conflitos\n\nO contrato será interpretado segundo a lei de [JURISDIÇÃO A CONFIRMAR]. As partes procurarão resolver divergências por negociação de boa-fé. Foro competente: [PREENCHER APÓS REVISÃO JURÍDICA].\n\n### 15. Aceitação eletrónica\n\nAs partes podem aceitar este contrato por assinatura manuscrita ou por mecanismo eletrónico que permita identificar o Autor, a versão integral aceite, a data/hora e a manifestação expressa de vontade, desde que validado juridicamente para o caso concreto. A Plataforma conservará uma cópia da versão aceite e um registo de auditoria.\n\n---\n\n## ANEXO A — CONDIÇÕES ESPECÍFICAS DA OBRA\n\n| Campo | Condição acordada |\n|---|---|\n| Título e edição | [PREENCHER] |\n| Autor e coautores | [PREENCHER] |\n| Modalidade | [PAGA / GRATUITA COM ANÚNCIOS / GRATUITA SEM ANÚNCIOS] |\n| Percentagem do Autor | [90% líquida nas vendas / 70% líquida de anúncios elegíveis] |\n| Percentagem da Plataforma | [10% / 30%] |\n| Preço e moeda (se paga) | [PREENCHER] |\n| Território | [PREENCHER] |\n| Idiomas e formatos | [PREENCHER] |\n| Prazo da licença | [PREENCHER] |\n| Data de início | [PREENCHER] |\n| Prazo de retirada | [PREENCHER] |\n| Periodicidade e mínimo de pagamento | [PREENCHER] |\n| Método de pagamento | [PREENCHER] |\n| Direitos da capa e imagens | [PREENCHER] |\n| Excertos autorizados para divulgação | [PREENCHER] |\n\n**Pela Plataforma:** [NOME / CARGO / DATA / ASSINATURA]  \n**Pelo Autor:** [NOME LEGAL / DATA / ASSINATURA OU ACEITAÇÃO ELETRÓNICA]\n\n---\n\n**Nota jurídica:** minuta operacional. Deve ser revista por advogado em Angola, incluindo enquadramento da Lei n.º 15/14, de 31 de julho, regras de contratação eletrónica, fiscalidade, pagamentos, proteção de dados e eventuais regras aplicáveis à atividade editorial.","paid_sales":{"author_percent":90,"platform_percent":10,"basis":"net_revenue"},"rewarded_ads":{"author_percent":70,"platform_percent":30,"basis":"net_verified_ad_revenue"},"free_reading_ads":"only_on_explicit_read_or_download_action","no_intrusive_ads":true}'::jsonb,
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
