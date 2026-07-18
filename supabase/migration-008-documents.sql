-- Migration 008 — Coffre à documents (passeport, visa, assurance…)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).
-- Prérequis : bucket privé 'documents' déjà créé (fait côté service).

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  label       text not null,
  kind        text not null default 'other',   -- passport|visa|insurance|id|ticket|other
  expiry_date date,
  file_path   text,                              -- chemin dans le bucket 'documents'
  file_name   text,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists documents_user_idx on documents (user_id, created_at desc);

alter table documents enable row level security;
drop policy if exists own_rows on documents;
create policy own_rows on documents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sécurité du STOCKAGE : chaque utilisateur ne touche que ses fichiers, rangés
-- sous un dossier = son user_id (ex : "<uid>/passport.pdf").
drop policy if exists "docs_own_insert" on storage.objects;
create policy "docs_own_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "docs_own_select" on storage.objects;
create policy "docs_own_select" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "docs_own_delete" on storage.objects;
create policy "docs_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

NOTIFY pgrst, 'reload schema';
