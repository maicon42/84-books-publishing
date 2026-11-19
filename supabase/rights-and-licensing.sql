-- 84 Books Publishing — controlo de direitos e licenças
-- Obras de terceiros só podem ser distribuídas após validação documental.
-- Referências externas podem aparecer no catálogo sem ficheiro, capa ou excerto.
alter table public.books
  add column if not exists publication_origin text not null default 'original',
  add column if not exists rights_status text not null default 'pending',
  add column if not exists rights_holder text not null default '',
  add column if not exists rights_evidence text not null default '',
  add column if not exists external_url text not null default '',
  add column if not exists isbn text not null default '',
  add column if not exists publisher text not null default '',
  add column if not exists edition text not null default '',
  add column if not exists publication_date date,
  add column if not exists page_count integer;
alter table public.books drop constraint if exists books_publication_origin_check;
alter table public.books add constraint books_publication_origin_check
  check (publication_origin in ('original','licensed','public_domain','external_reference'));
alter table public.books drop constraint if exists books_rights_status_check;
alter table public.books add constraint books_rights_status_check
  check (rights_status in ('pending','verified','not_required','rejected'));
alter table public.books drop constraint if exists books_page_count_check;
alter table public.books add constraint books_page_count_check
  check (page_count is null or page_count > 0);
create or replace function public.guard_84books_publication_rights()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.publication_origin = 'external_reference' then
    if new.book_type <> 'breve'
       or new.file_path is not null
       or new.cover_path is not null
       or nullif(btrim(new.preview_text), '') is not null
       or new.external_url !~ '^https://' then
      raise exception 'Uma referência externa só pode ser listada como Em preparação, sem capa, PDF ou excerto, e com ligação HTTPS oficial.';
    end if;
    return new;
  end if;
  if new.rights_status = 'rejected'
     and (new.status = 'published' or new.file_path is not null or new.cover_path is not null) then
    raise exception 'Esta obra tem direitos não autorizados. Não pode ser publicada nem receber ficheiros.';
  end if;
  if new.status = 'published' or new.file_path is not null or new.cover_path is not null then
    if new.publication_origin = 'licensed'
       and (new.rights_status <> 'verified' or nullif(btrim(new.rights_evidence), '') is null) then
      raise exception 'Uma obra licenciada exige direitos verificados e uma referência documental antes da publicação ou do envio de ficheiros.';
    elsif new.publication_origin = 'public_domain'
       and (new.rights_status <> 'not_required' or nullif(btrim(new.rights_evidence), '') is null) then
      raise exception 'Uma obra de domínio público exige verificação documentada do prazo de proteção antes da publicação ou do envio de ficheiros.';
    elsif new.publication_origin = 'original'
       and (new.rights_status <> 'verified' or nullif(btrim(new.rights_evidence), '') is null) then
      raise exception 'Uma obra original exige confirmação de titularidade e referência documental antes da publicação ou do envio de ficheiros.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_84books_publication_rights() from public, anon, authenticated;
-- Funções chamadas apenas por triggers/event triggers não precisam ser RPC públicas.
revoke execute on function public.handle_new_84books_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
drop trigger if exists guard_84books_publication_rights on public.books;
create trigger guard_84books_publication_rights
before insert or update on public.books
for each row execute function public.guard_84books_publication_rights();
-- Registo informativo sem capa, PDF ou excerto protegido.
insert into public.books (
  title, author, category, description, preview_text, book_type, price, status,
  cover_path, file_path, publication_origin, rights_status, rights_holder,
  rights_evidence, external_url, isbn, publisher, edition, publication_date, page_count
)
select
  'Pai Rico, Pai Pobre – Edição Atualizada 25 Anos',
  'Robert T. Kiyosaki', 'Economia',
  'Uma obra de educação financeira que apresenta reflexões sobre a forma como aprendemos a lidar com o dinheiro, a diferença entre ativos e passivos, o investimento e a construção de património. Esta ficha é informativa: a 84 Books Publishing não disponibiliza o conteúdo integral desta edição.',
  '', 'breve', 0, 'published', null, null,
  'external_reference', 'pending',
  'Titular dos direitos e editora da edição portuguesa — a confirmar para qualquer distribuição digital',
  'Referência bibliográfica consultada na página oficial da Penguin Livros. Não constitui licença de distribuição.',
  'https://penguinlivros.pt/loja/penguin/livro/pai-rico-pai-pobre-edicao-atualizada-25-anos-2/',
  '9789895896882', 'Penguin', '1.ª edição atualizada 25 anos', date '2026-01-01', 336
where not exists (
  select 1 from public.books
  where isbn = '9789895896882'
     or (title = 'Pai Rico, Pai Pobre – Edição Atualizada 25 Anos' and author = 'Robert T. Kiyosaki')
);
