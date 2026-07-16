-- Migration 006 — Réservations (vols, hôtels, trains, bus, voiture)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).

create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  kind         text not null default 'other',   -- flight|hotel|train|bus|car|other
  title        text not null,
  confirmation text,                              -- n° de confirmation / référence
  start_date   date not null,
  end_date     date,                              -- ex : date de départ d'un hôtel
  price        numeric,
  currency     text,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists bookings_trip_idx on bookings (trip_id, start_date);

alter table bookings enable row level security;
drop policy if exists own_rows on bookings;
create policy own_rows on bookings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
