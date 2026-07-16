# Nomad Budget — feuille de route (v2)

Objectif : passer d'un tracker de dépenses à un **compagnon de voyage complet**.
On construit par phases, une fonctionnalité à la fois : build → test réel contre
Supabase → déploiement Vercel. Chaque case cochée = en prod et vérifiée.

Légende : ⬜ à faire · 🔨 en cours · ✅ fait

---

## Phase 1 — Enrichir le suivi financier
*(prolonge le modèle de dépenses existant — valeur rapide, risque faible)*
- ⬜ **Revenus** — entrées d'argent (pour nomades qui bossent) → solde net. Table `incomes` ou champ `kind` sur expenses.
- ✅ **Cash vs carte** — champ `payment_method` (`card` | `cash` | `transfer`) sur chaque dépense.
- ✅ **Frais de retrait DAB** — saisie « retrait » : montant + frais, alimente le portefeuille cash.
- ✅ **Convertisseur rapide** — widget « X THB = ? EUR » sans créer de dépense.
- ✅ **Portefeuille multi-devises** — solde de cash restant par devise (retraits − dépenses cash).
- ✅ **Dépenses récurrentes** — table `recurring_expenses`, génération auto (backfill + anti-doublon).
- ✅ **Burn rate & projection** — dépense moyenne/jour + « budget épuisé le … ».

## Phase 2 — Structure « voyage » (itinéraire & logistique) ✅ (hors fuseaux)
- ✅ **Étapes / pays** — table `trip_legs` + timeline.
- ✅ **Budget par étape/pays** — dépenses de la période (dérivées des dates) vs budget d'étape.
- ✅ **Compteur jours par pays** — cumul + alerte visa (approche/dépassement).
- ✅ **Réservations** — table `bookings` + prochaine à venir (compte à rebours).
- ⬜ **Fuseaux horaires** — heure locale de l'étape en cours. *(reporté, valeur faible)*

## Phase 3 — Documents & sécurité
- ⬜ **Coffre à documents** — passeport, visa, assurance, permis (Supabase Storage, fichiers chiffrés/privés).
- ⬜ **Alertes d'expiration** — passeport / visa / assurance qui arrivent à échéance.
- ⬜ **Fiche urgence par pays** — ambassade, n° à bloquer en cas de perte de carte, contacts.

## Phase 4 — Vie de nomade
- ⬜ **Infos par pays** — eSIM/data, spots coworking/wifi, prises électriques, pourboires d'usage.
- ⬜ **Météo** de l'étape en cours (API météo gratuite).
- ⬜ **Comparateur de cartes** (Wise / Revolut / N26) — meilleur taux du jour (+ affiliation possible).

## Phase 5 — Bilans & stats ✅
- ✅ **Bilan de fin de voyage** — total, par pays/catégorie, jour le plus cher, frais cachés — **partageable** (lien public read-only `/share/<token>`).
- ✅ **Stats avancées** — moyenne/jour, poste le plus cher. *(comparaison entre voyages : à venir)*

## Phase 6 — Confort produit
- 🔨 **PWA installable** — icône sur l'écran d'accueil, plein écran (manifest + icônes). *Rapide, gros effet.*
- ⬜ **Mode hors-ligne** — saisir une dépense sans réseau, file d'attente locale (IndexedDB), synchro au retour du wifi. *Le plus complexe — phase dédiée.*
- ⬜ **Notifications** — dépassement de budget, visa qui expire, relance.
- ⬜ **Import CSV bancaire** — récupérer les dépenses depuis un relevé.
- ⬜ **Multi-langue** — EN d'abord (audience nomade internationale).

---

## Notes techniques
- **Hors-ligne** : Supabase JS n'a pas d'offline natif. Plan : cache lecture + file d'écriture locale (IndexedDB) vidée à la reconnexion. Le plus dur du lot → phase 6, pas bloquant pour le reste. PWA install (facile) peut venir bien avant.
- **Modèle de données** : chaque nouvelle table suit le même patron RLS que l'existant (`user_id` + policy `own_rows`). Migrations dans `supabase/`.
- **Devise** : tout converti vers `trips.base_currency` avec taux figé, comme les dépenses.

## Ordre de construction recommandé
Phase 1 (financier) → Phase 2 (itinéraire) → Phase 5 (bilans, une fois qu'il y a de la data riche) → Phase 3 (documents) → Phase 4 (nomade) → Phase 6 (PWA puis offline). PWA install peut être glissé tôt car très rapide.
