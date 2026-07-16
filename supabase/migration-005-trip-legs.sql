-- Migration 005 — Étapes du voyage (itinéraire : pays/villes, dates, budget, visa)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).
--
-- Une étape = un séjour dans un pays/ville sur une plage de dates. Sert de socle à :
--   • budget par étape (budget) ;
--   • dépenses par étape (dérivées : dépenses dont la date tombe dans la plage) ;
--   • compteur jours par pays + alerte visa (visa_days).

create table if not exists trip_legs (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  country     text not null,
  city        text,
  start_date  date not null,
  end_date    date,
  budget      numeric,
  visa_days   int,                 -- limite de jours autorisés (ex : 90 Schengen) → alerte
  created_at  timestamptz not null default now()
);
create index if not exists trip_legs_trip_idx on trip_legs (trip_id, start_date);

alter table trip_legs enable row level security;
drop policy if exists own_rows on trip_legs;
create policy own_rows on trip_legs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
