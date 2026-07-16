'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CURRENCIES } from '@/lib/currencies'
import { localToBaseRate, type RatesResponse } from '@/lib/exchangeRates'
import { easeApple } from '@/lib/motion'

type Props = {
  rates: RatesResponse | null
  baseCurrency: string
}

// Convertisseur rapide : convertir un montant d'une devise à une autre sans créer
// de dépense. Passe par la devise de base (A → base → B) avec les taux déjà chargés.
export default function QuickConverter({ rates, baseCurrency }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(baseCurrency)

  const fromCur = from || baseCurrency
  const amountNum = parseFloat(amount) || 0
  let result: number | null = null
  let error: string | null = null
  if (rates && amountNum > 0) {
    try {
      const inBase = amountNum * localToBaseRate(rates, fromCur)
      result = inBase / localToBaseRate(rates, to)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Devise non supportée'
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full card px-5 py-3.5 flex items-center justify-between hover:shadow-[var(--shadow-lift)] transition-shadow"
      >
        <span className="text-[15px] font-medium">🔄 Convertisseur</span>
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
                <select value={fromCur} onChange={(e) => setFrom(e.target.value)} className="field">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--color-line)]" />
                <span className="text-faint text-sm">→</span>
                <select value={to} onChange={(e) => setTo(e.target.value)} className="field flex-1">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </div>

              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
              {result !== null && !error && (
                <div className="rounded-2xl bg-accent/[0.06] border border-accent/[0.12] px-4 py-3 text-center">
                  <span className="text-[22px] font-semibold tnum">{result.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>
                  <span className="text-muted font-medium ml-1.5">{to}</span>
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
