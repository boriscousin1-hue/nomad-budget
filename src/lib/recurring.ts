import { localToBaseRate, withBankFee, type RatesResponse } from '@/lib/exchangeRates'
import type { Recurring } from '@/lib/types'

// Charge utile d'une dépense générée à insérer (mêmes colonnes que le formulaire).
export type GeneratedExpense = {
  trip_id: string
  user_id: string
  category_id: string | null
  amount_local: number
  currency_local: string
  exchange_rate: number
  bank_fee_pct: number
  amount_base: number
  amount_base_with_fee: number
  payment_method: string
  note: string
  spent_at: string
}

const ym = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, '0')}`
const monthAfter = (s: string) => {
  const [y, m] = s.split('-').map(Number)
  return m === 12 ? ym(y + 1, 0) : ym(y, m) // ym prend un mois 0-indexé
}

/**
 * Calcule, pour un ensemble de modèles récurrents, les dépenses à matérialiser
 * jusqu'à aujourd'hui, sans jamais régénérer un mois déjà fait (last_generated_month).
 * Fonction PURE (aucun accès réseau) → testable unitairement.
 *
 * Retourne les dépenses à insérer + les nouveaux last_generated_month à écrire.
 * Le taux de change appliqué est le taux courant (pas d'historique) — acceptable pour un MVP.
 */
export function dueRecurring(
  recurrings: Recurring[],
  rates: RatesResponse,
  tripId: string,
  userId: string,
  now: Date = new Date(),
): { toInsert: GeneratedExpense[]; updates: { id: string; last_generated_month: string }[] } {
  const toInsert: GeneratedExpense[] = []
  const updates: { id: string; last_generated_month: string }[] = []
  const todayStr = now.toISOString().slice(0, 10)
  const currentYM = ym(now.getFullYear(), now.getMonth())

  for (const r of recurrings) {
    if (!r.active) continue

    const createdD = new Date(r.created_at)
    const createdYM = ym(createdD.getFullYear(), createdD.getMonth())
    // Premier mois à considérer : le mois suivant le dernier généré, sinon le mois de création.
    let cursor = r.last_generated_month ? monthAfter(r.last_generated_month) : createdYM

    let lastGenerated: string | null = null
    const day = Math.min(Math.max(1, r.day_of_month || 1), 28)

    // Parcourt les mois de `cursor` jusqu'au mois courant inclus.
    while (cursor <= currentYM) {
      const scheduled = `${cursor}-${String(day).padStart(2, '0')}`
      if (scheduled <= todayStr) {
        try {
          const rate = localToBaseRate(rates, r.currency_local)
          const base = r.amount_local * rate
          toInsert.push({
            trip_id: tripId,
            user_id: userId,
            category_id: r.category_id,
            amount_local: r.amount_local,
            currency_local: r.currency_local,
            exchange_rate: rate,
            bank_fee_pct: r.bank_fee_pct,
            amount_base: base,
            amount_base_with_fee: withBankFee(base, r.bank_fee_pct),
            payment_method: r.payment_method,
            note: r.label,
            spent_at: scheduled,
          })
          lastGenerated = cursor
        } catch {
          // devise non supportée par la source → on saute ce modèle
        }
      }
      cursor = monthAfter(cursor)
    }

    if (lastGenerated) updates.push({ id: r.id, last_generated_month: lastGenerated })
  }

  return { toInsert, updates }
}
