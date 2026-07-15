-- Nomad Budget — schéma initial (multi-voyages, catégories, dépenses multidevises)
-- À exécuter dans Supabase > SQL Editor après avoir créé le projet.
-- Sécurité : RLS activée partout, chaque utilisateur ne voit que ses propres données.

-- ── Réglages utilisateur ──────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id              uuid primary key references auth.users on delete cascade,
  home_currency        text not null default 'EUR',   -- devise de référence par défaut
  default_bank_fee_pct numeric not null default 0,     -- marge banque/carte par défaut (%)
  created_at           timestamptz not null default now()
);

-- ── Voyages ───────────────────────────────────────────────────────────────────
create table if not exists trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  base_currency text not null default 'EUR',  -- devise du budget global de ce voyage
  total_budget  numeric,                        -- budget global (optionnel)
  start_date    date,
  end_date      date,
  created_at    timestamptz not null default now()
);
create index if not exists trips_user_idx on trips (user_id, created_at desc);

-- ── Catégories (par voyage) ───────────────────────────────────────────────────
create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  icon          text,                            -- emoji ou nom d'icône
  budget_amount numeric,                          -- budget de catégorie (dans base_currency), optionnel
  created_at    timestamptz not null default now()
);
create index if not exists categories_trip_idx on categories (trip_id);

-- ── Dépenses ──────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references trips on delete cascade,
  user_id              uuid not null references auth.users on delete cascade,
  category_id          uuid references categories on delete set null,
  amount_local         numeric not null,          -- montant saisi en devise locale
  currency_local       text not null,             -- devise locale (ex: THB)
  exchange_rate        numeric not null,          -- taux local→base figé au moment de la saisie
  bank_fee_pct         numeric not null default 0,-- marge banque appliquée à cette dépense
  amount_base          numeric not null,          -- converti en devise de base (hors frais)
  amount_base_with_fee numeric not null,          -- coût réel supporté (frais inclus)
  note                 text,
  spent_at             date not null default current_date,
  created_at           timestamptz not null default now()
);
create index if not exists expenses_trip_idx on expenses (trip_id, spent_at desc);

-- ── RLS : chacun ne voit/écrit que ses propres lignes ─────────────────────────
alter table user_settings enable row level security;
alter table trips         enable row level security;
alter table categories    enable row level security;
alter table expenses      enable row level security;

-- Politique générique (SELECT/INSERT/UPDATE/DELETE) : user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array['user_settings','trips','categories','expenses'] loop
    execute format('drop policy if exists own_rows on %I', t);
    execute format(
      'create policy own_rows on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
