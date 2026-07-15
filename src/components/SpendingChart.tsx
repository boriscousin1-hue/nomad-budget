'use client'

import type { Expense } from '@/lib/types'

type Props = {
  expenses: Expense[] // déjà filtrées par date si un filtre est actif
  baseCurrency: string
}

// Barres simples (pas de librairie de graphes) : une barre par jour ayant une dépense,
// hauteur proportionnelle au max de la période affichée. Défilement horizontal si besoin.
export default function SpendingChart({ expenses, baseCurrency }: Props) {
  if (expenses.length === 0) return null

  const byDay = new Map<string, number>()
  for (const e of expenses) {
    byDay.set(e.spent_at, (byDay.get(e.spent_at) || 0) + e.amount_base_with_fee)
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  const max = Math.max(...days.map(([, v]) => v))

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
      <h2 className="text-sm font-medium text-neutral-500 mb-4">Dépenses par jour</h2>
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
        {days.map(([day, amount]) => (
          <div key={day} className="flex flex-col items-center gap-1 shrink-0" style={{ width: 24 }}>
            <div
              className="w-full rounded-t bg-neutral-900"
              style={{ height: Math.max(4, (amount / max) * 96) }}
              title={`${new Date(day).toLocaleDateString('fr-FR')} : ${amount.toFixed(2)} ${baseCurrency}`}
            />
            <span className="text-[9px] text-neutral-400">{new Date(day).getDate()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
