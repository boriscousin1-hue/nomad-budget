-- Migration 002 — Revenus + méthode de paiement (cash / carte)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).

-- 1. Méthode de paiement sur chaque dépense : 'card' | 'cash' | 'transfer'
alter table expenses add column if not exists payment_method text not null default 'card';

-- 2. Revenus (pour les nomades qui travaillent) → permet un solde net
create table if not exists incomes (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references trips on delete cascade,
  user_id        uuid not null references auth.users on delete cascade,
  amount_local   numeric not null,
  currency_local text not null,
  exchange_rate  numeric not null,   -- taux local→base figé au moment de la saisie
  amount_base    numeric not null,   -- converti en devise de base du voyage
  source         text,               -- ex : « Freelance », « Salaire », « Remboursement »
  received_at    date not null default current_date,
  created_at     timestamptz not null default now()
);
create index if not exists incomes_trip_idx on incomes (trip_id, received_at desc);

alter table incomes enable row level security;
drop policy if exists own_rows on incomes;
create policy own_rows on incomes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
