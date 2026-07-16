'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { localToBaseRate, type RatesResponse } from '@/lib/exchangeRates'
import type { Income } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  rates: RatesResponse | null
  defaultCurrency: string
  editingIncome: Income | null
  onSaved: (income: Income, isNew: boolean) => void
  onCancelEdit: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// Formulaire de revenu (double usage création / édition). Un revenu n'a ni frais
// bancaires ni catégorie : juste un montant en devise locale, converti vers la base.
export default function IncomeForm({
  tripId, userId, baseCurrency, rates, defaultCurrency, editingIncome, onSaved, onCancelEdit,
}: Props) {
  const [amountLocal, setAmountLocal] = useState('')
  const [currencyLocal, setCurrencyLocal] = useState('')
  const [source, setSource] = useState('')
  const [receivedAt, setReceivedAt] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingIncome && defaultCurrency) setCurrencyLocal((prev) => prev || defaultCurrency)
  }, [defaultCurrency, editingIncome])

  useEffect(() => {
    if (editingIncome) {
      setAmountLocal(String(editingIncome.amount_local))
      setCurrencyLocal(editingIncome.currency_local)
      setSource(editingIncome.source || '')
      setReceivedAt(editingIncome.received_at)
      setError(null)
    } else {
      setAmountLocal('')
      setSource('')
      setError(null)
    }
  }, [editingIncome])

  const amountLocalNum = parseFloat(amountLocal) || 0
  let previewBase: number | null = null
  let previewError: string | null = null
  if (rates && currencyLocal && amountLocalNum > 0) {
    try {
      previewBase = amountLocalNum * localToBaseRate(rates, currencyLocal)
    } catch (e) {
      previewError = e instanceof Error ? e.message : 'Devise non supportée'
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rates) return
    setError(null)
    let rate: number
    try {
      rate = localToBaseRate(rates, currencyLocal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Devise non supportée')
      return
    }
    const payload = {
      amount_local: amountLocalNum,
      currency_local: currencyLocal,
      exchange_rate: rate,
      amount_base: amountLocalNum * rate,
      source: source.trim() || null,
      received_at: receivedAt,
    }

    setSaving(true)
    if (editingIncome) {
      const { data, error } = await supabase.from('incomes').update(payload).eq('id', editingIncome.id).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onSaved(data as Income, false)
      onCancelEdit()
    } else {
      const { data, error } = await supabase.from('incomes').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onSaved(data as Income, true)
      setAmountLocal('')
      setSource('')
    }
  }

  return (
    <form id="income-form" onSubmit={submit} className="card p-6 mb-4 flex flex-col gap-3 scroll-mt-20">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">
          {editingIncome ? 'Modifier le revenu' : 'Nouveau revenu'}
        </h2>
        {editingIncome && (
          <button type="button" onClick={onCancelEdit} className="text-[13px] text-faint hover:text-ink transition-colors">
            Annuler
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number" step="0.01" min="0" placeholder="Montant"
          value={amountLocal} onChange={(e) => setAmountLocal(e.target.value)} required className="field tnum"
        />
        <select value={currencyLocal} onChange={(e) => setCurrencyLocal(e.target.value)} className="field">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text" placeholder="Source (ex : Freelance)"
          value={source} onChange={(e) => setSource(e.target.value)} className="field"
        />
        <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="field" />
      </div>

      {previewError && <p className="text-[13px] text-[var(--color-danger)]">{previewError}</p>}
      {previewBase !== null && !previewError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#34c759]/[0.08] border border-[#34c759]/[0.2] px-4 py-3 text-[15px]"
        >
          + <strong className="tnum">{previewBase.toFixed(2)} {baseCurrency}</strong>
        </motion.div>
      )}

      {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

      <Button type="submit" size="lg" full disabled={saving || !rates || amountLocalNum <= 0} className="mt-1">
        {saving ? 'Enregistrement…' : editingIncome ? 'Enregistrer les modifications' : 'Ajouter le revenu'}
      </Button>
    </form>
  )
}
