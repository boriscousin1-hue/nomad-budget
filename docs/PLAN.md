# Nomad Budget — plan de route

Tracker de budget de voyage multidevise pour nomades digitaux : saisir des dépenses
en devise locale, voir l'impact temps réel sur le budget global, frais bancaires cachés inclus.

## Décisions (Boris, session initiale)
- **Périmètre v1** : multi-voyages + catégories.
- **Données** : Supabase + compte (synchro multi-appareils).
- **Taux de change** : API live gratuite + marge banque/carte paramétrable (le différenciateur).

## Stack
- Next.js 16 (App Router, TS, Tailwind, src/) — projet **totalement séparé** d'UGC.Prospect.
- Supabase (Postgres + Auth + RLS).
- Taux : API gratuite sans clé (ex. open.er-api.com), taux **figé** au moment de chaque dépense.

## Modèle de données (`supabase/schema.sql`)
- `user_settings` — devise de référence, marge banque par défaut.
- `trips` — un voyage (devise de base, budget global, dates).
- `categories` — par voyage (nom, icône, budget optionnel).
- `expenses` — montant local + taux figé + frais → montant réel en devise de base.

## Étapes
- [x] 0. Scaffold Next.js + Supabase client + schéma + plan.
- [ ] 1. **Boris** : créer le projet Supabase, exécuter `schema.sql`, remplir `.env.local`.
- [ ] 2. Auth (connexion / inscription email).
- [ ] 3. CRUD voyages (créer, lister, ouvrir un voyage).
- [ ] 4. Taux de change : service de fetch + cache + conversion.
- [ ] 5. Saisie de dépense (devise locale → conversion temps réel + frais).
- [ ] 6. Tableau de bord voyage : total dépensé, reste du budget, par catégorie.
- [ ] 7. Catégories (gestion + budgets par catégorie).
- [ ] 8. Responsive / mobile (usage terrain).
- [ ] 9. Déploiement Vercel.

## Ce qu'il reste à toi
1. Créer un **nouveau projet Supabase** (supabase.com → New project).
2. SQL Editor → coller le contenu de `supabase/schema.sql` → Run.
3. Project Settings → API → me donner `URL`, `anon key`, `service_role key` (je remplis `.env.local`).
