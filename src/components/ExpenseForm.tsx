'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { localToBaseRate, withBankFee, type RatesResponse } from '@/lib/exchangeRates'
import type { Category, Expense } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  categories: Category[]
  rates: RatesResponse | null
  ratesError: string | null
  onRetryRates: () => void
  defaultCurrency: string
  defaultBankFeePct: string
  editingExpense: Expense | null
  onSaved: (expense: Expense, isNew: boolean) => void
  onCancelEdit: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// Formulaire à double usage : création d'une nouvelle dépense (editingExpense=null) ou
// édition d'une dépense existante (editingExpense fourni par le parent). Une seule instance
// vit sur la page voyage — cliquer "✏️" sur une ligne bascule ce même formulaire en mode édition.
export default function ExpenseForm({
  tripId, userId, baseCurrency, categories, rates, ratesError, onRetryRates,
  defaultCurrency, defaultBankFeePct, editingExpense, onSaved, onCancelEdit,
}: Props) {
  const [amountLocal, setAmountLocal] = useState('')
  const [currencyLocal, setCurrencyLocal] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [bankFeePct, setBankFeePct] = useState('')
  const [note, setNote] = useState('')
  const [spentAt, setSpentAt] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Synchronise les défauts (devise/frais issus des réglages ou de la dernière saisie)
  // une fois chargés, uniquement si le champ n'a pas déjà été touché.
  useEffect(() => {
    if (!editingExpense && defaultCurrency) setCurrencyLocal((prev) => prev || defaultCurrency)
  }, [defaultCurrency, editingExpense])
  useEffect(() => {
    if (!editingExpense && defaultBankFeePct !== '') setBankFeePct((prev) => (prev === '' ? defaultBankFeePct : prev))
  }, [defaultBankFeePct, editingExpense])

  // Bascule en mode édition (ou retour en mode création lors de l'annulation).
  useEffect(() => {
    if (editingExpense) {
      setAmountLocal(String(editingExpense.amount_local))
      setCurrencyLocal(editingExpense.currency_local)
      setCategoryId(editingExpense.category_id || '')
      setBankFeePct(String(editingExpense.bank_fee_pct))
      setNote(editingExpense.note || '')
      setSpentAt(editingExpense.spent_at)
      setError(null)
    } else {
      setAmountLocal('')
      setCategoryId('')
      setNote('')
      setError(null)
    }
  }, [editingExpense])

  const amountLocalNum = parseFloat(amountLocal) || 0
  const feePctNum = parseFloat(bankFeePct) || 0
  let previewBase: number | null = null
  let previewWithFee: number | null = null
  let previewError: string | null = null
  if (rates && currencyLocal && amountLocalNum > 0) {
    try {
      const rate = localToBaseRate(rates, currencyLocal)
      previewBase = amountLocalNum * rate
      previewWithFee = withBankFee(previewBase, feePctNum)
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
    const amountBase = amountLocalNum * rate
    const amountBaseWithFee = withBankFee(amountBase, feePctNum)
    const payload = {
      category_id: categoryId || null,
      amount_local: amountLocalNum,
      currency_local: currencyLocal,
      exchange_rate: rate,
      bank_fee_pct: feePctNum,
      amount_base: amountBase,
      amount_base_with_fee: amountBaseWithFee,
      note: note.trim() || null,
      spent_at: spentAt,
    }

    setSaving(true)
    if (editingExpense) {
      const { data, error } = await supabase.from('expenses').update(payload).eq('id', editingExpense.id).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onSaved(data as Expense, false)
      onCancelEdit()
    } else {
      const { data, error } = await supabase.from('expenses').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onSaved(data as Expense, true)
      setAmountLocal('')
      setNote('')
    }
  }

  return (
    <form id="expense-form" onSubmit={submit} className="card p-6 mb-8 flex flex-col gap-3 scroll-mt-20">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">
          {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </h2>
        {editingExpense && (
          <button type="button" onClick={onCancelEdit} className="text-[13px] text-faint hover:text-ink transition-colors">
            Annuler
          </button>
        )}
      </div>

      {ratesError ? (
        <div className="text-[13px] text-[var(--color-danger)] flex items-center justify-between rounded-xl bg-[var(--color-danger)]/[0.06] px-4 py-3">
          <span>{ratesError}</span>
          <button type="button" onClick={onRetryRates} className="underline shrink-0 ml-3">Réessayer</button>
        </div>
      ) : (
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
      )}

      {categories.length > 0 && (
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <input
            type="number" step="0.1" min="0" max="100" placeholder="Frais banque"
            value={bankFeePct} onChange={(e) => setBankFeePct(e.target.value)} className="field pr-8 tnum"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
        </div>
        <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} className="field" />
      </div>

      <input
        type="text" placeholder="Note (optionnel)"
        value={note} onChange={(e) => setNote(e.target.value)} className="field"
      />

      {previewError && <p className="text-[13px] text-[var(--color-danger)]">{previewError}</p>}
      {previewBase !== null && !previewError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-accent/[0.06] border border-accent/[0.12] px-4 py-3 text-[15px]"
        >
          ≈ <strong className="tnum">{previewBase.toFixed(2)} {baseCurrency}</strong>
          {feePctNum > 0 && (
            <span className="text-muted"> · coût réel <span className="tnum">{previewWithFee!.toFixed(2)} {baseCurrency}</span> (frais inclus)</span>
          )}
        </motion.div>
      )}

      {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

      <Button type="submit" size="lg" full disabled={saving || !rates || amountLocalNum <= 0} className="mt-1">
        {saving ? 'Enregistrement…' : editingExpense ? 'Enregistrer les modifications' : 'Ajouter la dépense'}
      </Button>
    </form>
  )
}
