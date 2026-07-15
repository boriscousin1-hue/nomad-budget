'use client'

import { motion } from 'framer-motion'
import { easeApple } from '@/lib/motion'
import type { Expense } from '@/lib/types'

type Props = {
  expenses: Expense[] // déjà filtrées par date si un filtre est actif
  baseCurrency: string
}

// Barres par jour (sans librairie de graphes) : hauteur proportionnelle au max de
// la période, dégradé bleu, apparition animée depuis le bas.
export default function SpendingChart({ expenses, baseCurrency }: Props) {
  if (expenses.length === 0) return null

  const byDay = new Map<string, number>()
  for (const e of expenses) {
    byDay.set(e.spent_at, (byDay.get(e.spent_at) || 0) + e.amount_base_with_fee)
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  const max = Math.max(...days.map(([, v]) => v))

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-[13px] font-medium text-muted mb-5 uppercase tracking-wide">Dépenses par jour</h2>
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height: 128 }}>
        {days.map(([day, amount], i) => (
          <div key={day} className="flex flex-col items-center gap-1.5 shrink-0 justify-end h-full" style={{ width: 26 }}>
            <motion.div
              className="w-full rounded-full"
              style={{ background: 'linear-gradient(to top, #0071e3, #4aa3ff)' }}
              initial={{ height: 4 }}
              animate={{ height: Math.max(6, (amount / max) * 96) }}
              transition={{ duration: 0.6, ease: easeApple, delay: i * 0.02 }}
              title={`${new Date(day).toLocaleDateString('fr-FR')} : ${amount.toFixed(2)} ${baseCurrency}`}
            />
            <span className="text-[10px] text-faint tabular-nums">{new Date(day).getDate()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
