'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { localToBaseRate, type RatesResponse } from '@/lib/exchangeRates'
import type { Withdrawal } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  rates: RatesResponse | null
  defaultCurrency: string
  editingWithdrawal: Withdrawal | null
  onSaved: (w: Withdrawal, isNew: boolean) => void
  onCancelEdit: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// Retrait DAB : liquide reçu (amount_local) + frais de retrait (fee_local), le tout
// dans une devise locale, converti vers la base au taux figé.
export default function WithdrawalForm({
  tripId, userId, baseCurrency, rates, defaultCurrency, editingWithdrawal, onSaved, onCancelEdit,
}: Props) {
  const [amountLocal, setAmountLocal] = useState('')
  const [currencyLocal, setCurrencyLocal] = useState('')
  const [feeLocal, setFeeLocal] = useState('')
  const [withdrawnAt, setWithdrawnAt] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingWithdrawal && defaultCurrency) setCurrencyLocal((prev) => prev || defaultCurrency)
  }, [defaultCurrency, editingWithdrawal])

  useEffect(() => {
    if (editingWithdrawal) {
      setAmountLocal(String(editingWithdrawal.amount_local))
      setCurrencyLocal(editingWithdrawal.currency_local)
      setFeeLocal(editingWithdrawal.fee_local ? String(editingWithdrawal.fee_local) : '')
      setWithdrawnAt(editingWithdrawal.withdrawn_at)
      setError(null)
    } else {
      setAmountLocal('')
      setFeeLocal('')
      setError(null)
    }
  }, [editingWithdrawal])

  const amountLocalNum = parseFloat(amountLocal) || 0
  const feeLocalNum = parseFloat(feeLocal) || 0
  let previewFeeBase: number | null = null
  let previewError: string | null = null
  if (rates && currencyLocal && feeLocalNum > 0) {
    try {
      previewFeeBase = feeLocalNum * localToBaseRate(rates, currencyLocal)
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
      fee_local: feeLocalNum,
      exchange_rate: rate,
      amount_base: amountLocalNum * rate,
      fee_base: feeLocalNum * rate,
      withdrawn_at: withdrawnAt,
    }

    setSaving(true)
    if (editingWithdrawal) {
      const { data, error } = await supabase.from('cash_withdrawals').update(payload).eq('id', editingWithdrawal.id).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onSaved(data as Withdrawal, false)
      onCancelEdit()
    } else {
      const { data, error } = await supabase.from('cash_withdrawals').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onSaved(data as Withdrawal, true)
      setAmountLocal('')
      setFeeLocal('')
    }
  }

  return (
    <form id="withdrawal-form" onSubmit={submit} className="card p-6 mb-4 flex flex-col gap-3 scroll-mt-20">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">
          {editingWithdrawal ? 'Modifier le retrait' : 'Nouveau retrait'}
        </h2>
        {editingWithdrawal && (
          <button type="button" onClick={onCancelEdit} className="text-[13px] text-faint hover:text-ink transition-colors">
            Annuler
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number" step="0.01" min="0" placeholder="Liquide reçu"
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
          type="number" step="0.01" min="0" placeholder="Frais de retrait"
          value={feeLocal} onChange={(e) => setFeeLocal(e.target.value)} className="field tnum"
        />
        <input type="date" value={withdrawnAt} onChange={(e) => setWithdrawnAt(e.target.value)} className="field" />
      </div>

      {previewError && <p className="text-[13px] text-[var(--color-danger)]">{previewError}</p>}
      {previewFeeBase !== null && !previewError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[var(--color-warn)]/[0.08] border border-[var(--color-warn)]/[0.2] px-4 py-3 text-[15px]"
        >
          🏧 Frais : <strong className="tnum">{previewFeeBase.toFixed(2)} {baseCurrency}</strong>
        </motion.div>
      )}

      {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

      <Button type="submit" size="lg" full disabled={saving || !rates || amountLocalNum <= 0} className="mt-1">
        {saving ? 'Enregistrement…' : editingWithdrawal ? 'Enregistrer les modifications' : 'Ajouter le retrait'}
      </Button>
    </form>
  )
}
