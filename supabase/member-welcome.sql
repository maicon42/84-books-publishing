-- Regista a primeira apresentação de boas-vindas de cada membro.
-- Perfis que já existiam são marcados como já apresentados; novos perfis ficam a NULL.
alter table public.profiles
  add column if not exists welcome_seen_at timestamptz;

update public.profiles
set welcome_seen_at = coalesce(created_at, now())
where welcome_seen_at is null;

grant select (welcome_seen_at), update (welcome_seen_at)
on public.profiles to authenticated;
