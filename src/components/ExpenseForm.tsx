'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { localToBaseRate, withBankFee, type RatesResponse } from '@/lib/exchangeRates'
import type { Category, Expense } from '@/lib/types'

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
    <form id="expense-form" onSubmit={submit} className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-500">
          {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </h2>
        {editingExpense && (
          <button type="button" onClick={onCancelEdit} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
            Annuler
          </button>
        )}
      </div>

      {ratesError ? (
        <div className="text-xs text-red-600 flex items-center justify-between">
          <span>{ratesError}</span>
          <button type="button" onClick={onRetryRates} className="underline">Réessayer</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number" step="0.01" min="0" placeholder="Montant"
            value={amountLocal} onChange={(e) => setAmountLocal(e.target.value)} required
            className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
          />
          <select
            value={currencyLocal} onChange={(e) => setCurrencyLocal(e.target.value)}
            className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      )}

      {categories.length > 0 && (
        <select
          value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white"
        >
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number" step="0.1" min="0" max="100" placeholder="Frais banque (%)"
          value={bankFeePct} onChange={(e) => setBankFeePct(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
        <input
          type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)}
          className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <input
        type="text" placeholder="Note (optionnel)"
        value={note} onChange={(e) => setNote(e.target.value)}
        className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
      />

      {previewError && <p className="text-xs text-red-600">{previewError}</p>}
      {previewBase !== null && !previewError && (
        <div className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm">
          ≈ <strong>{previewBase.toFixed(2)} {baseCurrency}</strong>
          {feePctNum > 0 && (
            <span className="text-neutral-500"> · coût réel {previewWithFee!.toFixed(2)} {baseCurrency} (frais inclus)</span>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !rates || amountLocalNum <= 0}
        className="mt-1 rounded-xl bg-neutral-900 text-white py-2.5 font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : editingExpense ? 'Enregistrer les modifications' : 'Ajouter la dépense'}
      </button>
    </form>
  )
}
