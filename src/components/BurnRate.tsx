'use client'

import type { Expense, Trip } from '@/lib/types'

type Props = {
  trip: Trip
  expenses: Expense[]
  totalSpent: number
}

const DAY = 86400000

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY))
}

// « Burn rate » : rythme de dépense moyen par jour + projection de fin de budget.
// Le point de départ = date de début du voyage si passée, sinon la 1re dépense.
export default function BurnRate({ trip, expenses, totalSpent }: Props) {
  if (expenses.length === 0) return null

  const today = new Date()
  const dates = expenses.map((e) => new Date(e.spent_at))
  const firstExpense = new Date(Math.min(...dates.map((d) => d.getTime())))
  const tripStart = trip.start_date ? new Date(trip.start_date) : null
  const start = tripStart && tripStart < today ? tripStart : firstExpense
  const elapsed = daysBetween(start, today)
  const perDay = totalSpent / elapsed

  const cur = trip.base_currency
  const remaining = trip.total_budget != null ? trip.total_budget - totalSpent : null

  // Projection : à ce rythme, combien de jours de budget restent et à quelle date.
  let projection: { daysLeft: number; endDate: Date; overshoot: boolean } | null = null
  if (remaining != null && perDay > 0) {
    const daysLeft = Math.floor(remaining / perDay)
    const endDate = new Date(today.getTime() + daysLeft * DAY)
    const tripEnd = trip.end_date ? new Date(trip.end_date) : null
    const overshoot = remaining < 0 || (tripEnd ? endDate < tripEnd : false)
    projection = { daysLeft, endDate, overshoot }
  }

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted uppercase tracking-wide">Rythme de dépense</span>
        <span className="text-[13px] text-faint">{elapsed} j</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[28px] leading-none font-semibold tracking-tight tnum">{perDay.toFixed(2)}</span>
        <span className="text-muted font-medium">{cur} / jour</span>
      </div>

      {projection && remaining! >= 0 && (
        <p className={`text-[13px] mt-3 ${projection.overshoot ? 'text-[var(--color-danger)]' : 'text-muted'}`}>
          {projection.overshoot ? '⚠️ ' : ''}À ce rythme, ton budget est épuisé le{' '}
          <span className="font-medium text-ink">
            {projection.endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>{' '}
          (encore <span className="tnum">{projection.daysLeft}</span> j)
          {trip.end_date && projection.overshoot && ' — avant la fin du voyage.'}
        </p>
      )}
      {remaining != null && remaining < 0 && (
        <p className="text-[13px] mt-3 text-[var(--color-danger)]">⚠️ Budget déjà dépassé.</p>
      )}
    </div>
  )
}
