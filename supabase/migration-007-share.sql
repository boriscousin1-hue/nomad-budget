-- Migration 007 — Partage public du bilan de voyage (jeton unique par voyage)
-- À exécuter dans Supabase > SQL Editor (projet nomad-budget).
--
-- Le propriétaire génère un share_token ; la page publique /share/<token> lit le
-- bilan via la clé service (service_role) sans exposer le reste des données.

alter table trips add column if not exists share_token text unique;

NOTIFY pgrst, 'reload schema';
