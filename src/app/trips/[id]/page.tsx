'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { CURRENCIES } from '@/lib/currencies'
import { fetchRates, localToBaseRate, withBankFee, type RatesResponse } from '@/lib/exchangeRates'

type Trip = {
  id: string
  name: string
  base_currency: string
  total_budget: number | null
  start_date: string | null
  end_date: string | null
}

type Expense = {
  id: string
  amount_local: number
  currency_local: string
  exchange_rate: number
  bank_fee_pct: number
  amount_base: number
  amount_base_with_fee: number
  note: string | null
  spent_at: string
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined) // undefined = chargement, null = introuvable
  const [deleting, setDeleting] = useState(false)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)

  const [rates, setRates] = useState<RatesResponse | null>(null)
  const [ratesError, setRatesError] = useState<string | null>(null)

  const [amountLocal, setAmountLocal] = useState('')
  const [currencyLocal, setCurrencyLocal] = useState('')
  const [bankFeePct, setBankFeePct] = useState('0')
  const [note, setNote] = useState('')
  const [spentAt, setSpentAt] = useState(todayISO())
  const [savingExpense, setSavingExpense] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)

  // Charge le voyage
  useEffect(() => {
    if (!user) return
    supabase.from('trips').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => setTrip((data as Trip) || null))
  }, [user, id])

  // Charge les dépenses + taux une fois le voyage connu
  useEffect(() => {
    if (!trip) return
    supabase.from('expenses').select('*').eq('trip_id', trip.id)
      .order('spent_at', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data as Expense[]) || []
        setExpenses(rows)
        setLoadingExpenses(false)
        // Devise par défaut du formulaire : la dernière utilisée, sinon la devise de base.
        setCurrencyLocal((prev) => prev || rows[0]?.currency_local || trip.base_currency)
      })
    loadRates(trip.base_currency)
  }, [trip])

  const loadRates = async (base: string) => {
    setRatesError(null)
    try {
      const r = await fetchRates(base)
      setRates(r)
    } catch (e) {
      setRatesError(e instanceof Error ? e.message : 'Erreur de chargement des taux')
    }
  }

  const deleteTrip = async () => {
    if (!confirm('Supprimer ce voyage et toutes ses dépenses ? Action irréversible.')) return
    setDeleting(true)
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) { alert(error.message); setDeleting(false); return }
    router.push('/')
  }

  const deleteExpense = async (expenseId: string) => {
    if (!confirm('Supprimer cette dépense ?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) { alert(error.message); return }
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
  }

  // Aperçu temps réel (avant soumission) — recalculé à chaque frappe, aucun appel réseau
  // supplémentaire : `rates` couvre déjà toutes les devises pour la base du voyage.
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

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !trip || !rates) return
    setExpenseError(null)

    let rate: number
    try {
      rate = localToBaseRate(rates, currencyLocal)
    } catch (err) {
      setExpenseError(err instanceof Error ? err.message : 'Devise non supportée')
      return
    }
    const amountBase = amountLocalNum * rate
    const amountBaseWithFee = withBankFee(amountBase, feePctNum)

    setSavingExpense(true)
    const { data, error } = await supabase.from('expenses').insert({
      trip_id: trip.id,
      user_id: user.id,
      amount_local: amountLocalNum,
      currency_local: currencyLocal,
      exchange_rate: rate,
      bank_fee_pct: feePctNum,
      amount_base: amountBase,
      amount_base_with_fee: amountBaseWithFee,
      note: note.trim() || null,
      spent_at: spentAt,
    }).select().single()

    setSavingExpense(false)
    if (error) { setExpenseError(error.message); return }

    setExpenses((prev) => [data as Expense, ...prev])
    // Reset : montant et note repartent à vide, devise/frais/date restent (saisies répétées).
    setAmountLocal('')
    setNote('')
  }

  if (userLoading || trip === undefined) return null

  if (trip === null) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">Voyage introuvable.</p>
          <Link href="/" className="text-sm underline">Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_base_with_fee, 0)
  const totalFees = expenses.reduce((sum, e) => sum + (e.amount_base_with_fee - e.amount_base), 0)
  const remaining = trip.total_budget != null ? trip.total_budget - totalSpent : null

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800 underline mb-6 inline-block">
          ← Tous les voyages
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-semibold">{trip.name}</h1>
            <button onClick={deleteTrip} disabled={deleting} className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50">
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
          <p className="text-sm text-neutral-500 mt-2">Devise de base : <strong>{trip.base_currency}</strong></p>

          {/* Résumé budget temps réel */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-neutral-500">Dépensé (frais inclus)</span>
              <span className="text-lg font-semibold">{totalSpent.toFixed(2)} {trip.base_currency}</span>
            </div>
            {trip.total_budget != null && (
              <>
                <div className="mt-2 h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className={`h-full ${remaining! < 0 ? 'bg-red-500' : 'bg-neutral-900'}`}
                    style={{ width: `${Math.min(100, (totalSpent / trip.total_budget) * 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${remaining! < 0 ? 'text-red-600' : 'text-neutral-400'}`}>
                  {remaining! >= 0
                    ? `${remaining!.toFixed(2)} ${trip.base_currency} restants sur ${trip.total_budget} ${trip.base_currency}`
                    : `Dépassement de ${Math.abs(remaining!).toFixed(2)} ${trip.base_currency}`}
                </p>
              </>
            )}
            {totalFees > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                dont {totalFees.toFixed(2)} {trip.base_currency} de frais bancaires cachés
              </p>
            )}
          </div>
        </div>

        {/* Formulaire de saisie */}
        <form onSubmit={addExpense} className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-500">Nouvelle dépense</h2>

          {ratesError ? (
            <div className="text-xs text-red-600 flex items-center justify-between">
              <span>{ratesError}</span>
              <button type="button" onClick={() => loadRates(trip.base_currency)} className="underline">Réessayer</button>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number" step="0.1" min="0" max="100" placeholder="Frais banque (%)"
                value={bankFeePct} onChange={(e) => setBankFeePct(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
              />
            </div>
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

          {/* Aperçu conversion temps réel */}
          {previewError && <p className="text-xs text-red-600">{previewError}</p>}
          {previewBase !== null && !previewError && (
            <div className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm">
              ≈ <strong>{previewBase.toFixed(2)} {trip.base_currency}</strong>
              {feePctNum > 0 && (
                <span className="text-neutral-500"> · coût réel {previewWithFee!.toFixed(2)} {trip.base_currency} (frais inclus)</span>
              )}
            </div>
          )}

          {expenseError && <p className="text-xs text-red-600">{expenseError}</p>}

          <button
            type="submit"
            disabled={savingExpense || !rates || amountLocalNum <= 0}
            className="mt-1 rounded-xl bg-neutral-900 text-white py-2.5 font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {savingExpense ? 'Ajout...' : 'Ajouter la dépense'}
          </button>
        </form>

        {/* Liste des dépenses */}
        <h2 className="text-sm font-medium text-neutral-500 mb-3">Dépenses</h2>
        {loadingExpenses ? (
          <p className="text-sm text-neutral-400">Chargement...</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucune dépense pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {expenses.map((exp) => (
              <li key={exp.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {exp.amount_local} {exp.currency_local}
                    <span className="text-neutral-400 font-normal"> → {exp.amount_base_with_fee.toFixed(2)} {trip.base_currency}</span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {new Date(exp.spent_at).toLocaleDateString('fr-FR')}
                    {exp.note && ` · ${exp.note}`}
                    {exp.bank_fee_pct > 0 && ` · frais ${exp.bank_fee_pct}%`}
                  </div>
                </div>
                <button onClick={() => deleteExpense(exp.id)} className="text-xs text-neutral-400 hover:text-red-600">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
