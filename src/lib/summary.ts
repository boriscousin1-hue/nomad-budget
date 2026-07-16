import type { Category, Expense, Income, Leg, Withdrawal } from '@/lib/types'
import { spentInLeg, legDays } from '@/lib/legs'

const DAY = 86400000

export type TripSummary = {
  totalSpent: number
  totalIncome: number
  netBalance: number
  totalFees: number // frais bancaires (dépenses) + frais de retrait DAB
  days: number
  avgPerDay: number
  expenseCount: number
  byCategory: { id: string; name: string; icon: string | null; amount: number }[]
  uncategorized: number
  byCountry: { country: string; amount: number; days: number }[]
  topDay: { date: string; amount: number } | null
  topCategory: { name: string; amount: number } | null
  countriesCount: number
}

// Bilan agrégé d'un voyage (fonction pure, testable). Sert à la fois à la vue « Bilan »
// dans l'app et à la page publique partageable.
export function buildSummary(
  trip: { base_currency: string; start_date: string | null; end_date: string | null },
  expenses: Expense[],
  incomes: Income[],
  withdrawals: Withdrawal[],
  categories: Category[],
  legs: Leg[],
  now: Date = new Date(),
): TripSummary {
  const totalSpent = expenses.reduce((s, e) => s + e.amount_base_with_fee, 0)
  const totalIncome = incomes.reduce((s, i) => s + i.amount_base, 0)
  const bankFees = expenses.reduce((s, e) => s + (e.amount_base_with_fee - e.amount_base), 0)
  const atmFees = withdrawals.reduce((s, w) => s + w.fee_base, 0)
  const totalFees = bankFees + atmFees

  // Durée : dates du voyage si fournies, sinon 1re → dernière dépense, sinon 1 jour.
  let days = 1
  if (trip.start_date) {
    const end = trip.end_date ? new Date(trip.end_date) : now
    days = Math.max(1, Math.floor((end.getTime() - new Date(trip.start_date).getTime()) / DAY) + 1)
  } else if (expenses.length) {
    const ds = expenses.map((e) => e.spent_at).sort()
    days = Math.max(1, Math.floor((new Date(ds[ds.length - 1]).getTime() - new Date(ds[0]).getTime()) / DAY) + 1)
  }

  // Par catégorie
  const byCategory = categories
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon, amount: expenses.filter((e) => e.category_id === c.id).reduce((s, e) => s + e.amount_base_with_fee, 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const uncategorized = expenses.filter((e) => !e.category_id).reduce((s, e) => s + e.amount_base_with_fee, 0)

  // Par pays (depuis les étapes)
  const countryMap: Record<string, { amount: number; days: number }> = {}
  for (const l of legs) {
    const c = (countryMap[l.country] ||= { amount: 0, days: 0 })
    c.amount += spentInLeg(l, expenses)
    c.days += legDays(l, now)
  }
  const byCountry = Object.entries(countryMap)
    .map(([country, v]) => ({ country, ...v }))
    .sort((a, b) => b.amount - a.amount)

  // Jour le plus cher
  const byDay: Record<string, number> = {}
  for (const e of expenses) byDay[e.spent_at] = (byDay[e.spent_at] || 0) + e.amount_base_with_fee
  let topDay: { date: string; amount: number } | null = null
  for (const [date, amount] of Object.entries(byDay)) {
    if (!topDay || amount > topDay.amount) topDay = { date, amount }
  }

  return {
    totalSpent, totalIncome, netBalance: totalIncome - totalSpent, totalFees,
    days, avgPerDay: totalSpent / days, expenseCount: expenses.length,
    byCategory, uncategorized, byCountry,
    topDay,
    topCategory: byCategory[0] ? { name: byCategory[0].name, amount: byCategory[0].amount } : null,
    countriesCount: byCountry.length,
  }
}
