import type { Expense, Leg } from '@/lib/types'

const DAY = 86400000

// Nombre de jours d'une étape (inclusif). Étape ouverte (pas de fin) → jusqu'à aujourd'hui.
export function legDays(leg: Leg, now: Date = new Date()): number {
  const start = new Date(leg.start_date)
  const end = leg.end_date ? new Date(leg.end_date) : now
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY) + 1)
}

// Dépenses (coût réel, frais inclus) dont la date tombe dans la plage de l'étape.
export function spentInLeg(leg: Leg, expenses: Expense[]): number {
  const s = leg.start_date
  const e = leg.end_date || '9999-12-31'
  return expenses
    .filter((x) => x.spent_at >= s && x.spent_at <= e)
    .reduce((sum, x) => sum + x.amount_base_with_fee, 0)
}

// Total de jours passés par pays (cumule les étapes d'un même pays).
export function daysPerCountry(legs: Leg[], now: Date = new Date()): Record<string, number> {
  const m: Record<string, number> = {}
  for (const l of legs) m[l.country] = (m[l.country] || 0) + legDays(l, now)
  return m
}
