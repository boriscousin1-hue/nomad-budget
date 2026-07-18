'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CURRENCIES } from '@/lib/currencies'
import { localToBaseRate, type RatesResponse } from '@/lib/exchangeRates'
import { easeApple } from '@/lib/motion'

type Props = {
  rates: RatesResponse | null
  baseCurrency: string
  defaultCurrency: string
}

// Marges de change indicatives (au-dessus du taux mid-market interbancaire).
// Valeurs typiques — à titre informatif, elles varient selon le plan et le moment.
const CARDS = [
  { name: 'Wise', markup: 0.5, emoji: '🟢' },
  { name: 'Revolut', markup: 1.0, emoji: '🔵' },
  { name: 'N26', markup: 1.7, emoji: '⚫' },
  { name: 'Banque classique', markup: 3.0, emoji: '🏦' },
]

// Comparateur : pour un montant en devise locale, estime le coût réel selon la carte
// (mid-market + marge de change indicative). Le même thème que les « frais cachés ».
export default function CardComparator({ rates, baseCurrency, defaultCurrency }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency || baseCurrency)

  const amountNum = parseFloat(amount) || 0
  let mid: number | null = null
  let error: string | null = null
  if (rates && amountNum > 0) {
    try {
      mid = amountNum * localToBaseRate(rates, currency)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Devise non supportée'
    }
  }

  const rows = mid != null ? CARDS.map((c) => ({ ...c, cost: mid! * (1 + c.markup / 100), fee: mid! * (c.markup / 100) })) : []
  const best = rows.length ? Math.min(...rows.map((r) => r.cost)) : 0

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full card px-5 py-3.5 flex items-center justify-between hover:shadow-[var(--shadow-lift)] transition-shadow"
      >
        <span className="text-[15px] font-medium">💳 Comparateur de cartes</span>
        <span className={`text-faint transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: easeApple }} className="overflow-hidden"
          >
            <div className="card p-5 mt-2 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" step="0.01" min="0" placeholder="Montant" autoFocus
                  value={amount} onChange={(e) => setAmount(e.target.value)} className="field tnum"
                />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="field">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>

              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

              {mid != null && !error && (
                <div className="flex flex-col gap-1.5">
                  {rows.map((r) => {
                    const isBest = Math.abs(r.cost - best) < 0.001
                    return (
                      <div key={r.name} className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${isBest ? 'bg-[#34c759]/[0.1] border border-[#34c759]/30' : 'bg-surface-2'}`}>
                        <span className="text-[15px]">
                          {r.emoji} {r.name}
                          {isBest && <span className="text-[#1f9d4d] text-[12px] font-medium ml-1.5">le moins cher</span>}
                        </span>
                        <span className="text-right">
                          <span className="tnum text-[15px] font-medium">{r.cost.toFixed(2)} {baseCurrency}</span>
                          <span className="tnum text-[12px] text-faint block">+{r.fee.toFixed(2)} de frais (~{r.markup}%)</span>
                        </span>
                      </div>
                    )
                  })}
                  <p className="text-[12px] text-faint mt-1">Marges de change indicatives — elles varient selon le plan et le jour (ex. week-end).</p>
                </div>
              )}
              {!rates && <p className="text-[13px] text-faint">Chargement des taux…</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
