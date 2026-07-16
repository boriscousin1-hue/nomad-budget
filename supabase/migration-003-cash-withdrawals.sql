-- Migration 003 — Retraits DAB (portefeuille cash multi-devises)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).
--
-- Un retrait = du liquide reçu (amount_local) + des frais DAB/banque (fee_local).
-- Le portefeuille cash d'une devise = Σ retraits − Σ dépenses payées en espèces.
-- Les frais de retrait sont un coût caché supplémentaire (fee_base), affiché à part.

create table if not exists cash_withdrawals (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references trips on delete cascade,
  user_id        uuid not null references auth.users on delete cascade,
  amount_local   numeric not null,            -- liquide reçu
  currency_local text not null,
  fee_local      numeric not null default 0,  -- frais DAB/banque en devise locale
  exchange_rate  numeric not null,            -- taux local→base figé
  amount_base    numeric not null,            -- valeur du liquide en devise de base
  fee_base       numeric not null default 0,  -- coût des frais en devise de base
  withdrawn_at   date not null default current_date,
  created_at     timestamptz not null default now()
);
create index if not exists cash_withdrawals_trip_idx on cash_withdrawals (trip_id, withdrawn_at desc);

alter table cash_withdrawals enable row level security;
drop policy if exists own_rows on cash_withdrawals;
create policy own_rows on cash_withdrawals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
