-- Migration 004 — Dépenses récurrentes (loyer, coworking, eSIM…)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).
--
-- Un modèle récurrent génère automatiquement une vraie dépense chaque mois
-- (au jour `day_of_month`). L'anti-doublon se fait via `last_generated_month` :
-- on ne régénère jamais un mois déjà matérialisé, même après suppression manuelle.

create table if not exists recurring_expenses (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references trips on delete cascade,
  user_id        uuid not null references auth.users on delete cascade,
  label          text not null,
  amount_local   numeric not null,
  currency_local text not null,
  bank_fee_pct   numeric not null default 0,
  category_id    uuid references categories on delete set null,
  payment_method text not null default 'card',
  day_of_month   int not null default 1,          -- jour du mois de génération (1-28)
  active         boolean not null default true,
  last_generated_month text,                       -- 'YYYY-MM' dernier mois généré (anti-doublon)
  created_at     timestamptz not null default now()
);
create index if not exists recurring_trip_idx on recurring_expenses (trip_id);

alter table recurring_expenses enable row level security;
drop policy if exists own_rows on recurring_expenses;
create policy own_rows on recurring_expenses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
