'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { fetchRates, type RatesResponse } from '@/lib/exchangeRates'
import { downloadCsv } from '@/lib/csv'
import type { Trip, Category, Expense } from '@/lib/types'
import ExpenseForm from '@/components/ExpenseForm'
import CategoryManager from '@/components/CategoryManager'
import SpendingChart from '@/components/SpendingChart'

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined) // undefined = chargement, null = introuvable
  const [deleting, setDeleting] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const [rates, setRates] = useState<RatesResponse | null>(null)
  const [ratesError, setRatesError] = useState<string | null>(null)

  const [defaultCurrency, setDefaultCurrency] = useState('')
  const [defaultBankFeePct, setDefaultBankFeePct] = useState('')

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // Charge le voyage
  useEffect(() => {
    if (!user) return
    supabase.from('trips').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => setTrip((data as Trip) || null))
  }, [user, id])

  // Charge catégories + dépenses + taux + réglages une fois le voyage connu
  useEffect(() => {
    if (!trip || !user) return
    supabase.from('categories').select('*').eq('trip_id', trip.id).order('created_at')
      .then(({ data }) => {
        setCategories((data as Category[]) || [])
        setLoadingCategories(false)
      })
    supabase.from('expenses').select('*').eq('trip_id', trip.id)
      .order('spent_at', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data as Expense[]) || []
        setExpenses(rows)
        setLoadingExpenses(false)
        // Devise par défaut du formulaire : la dernière utilisée, sinon la devise de base.
        setDefaultCurrency(rows[0]?.currency_local || trip.base_currency)
      })
    supabase.from('user_settings').select('default_bank_fee_pct').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setDefaultBankFeePct(String(data?.default_bank_fee_pct ?? 0)))
    loadRates(trip.base_currency)
  }, [trip, user])

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
    if (editingExpense?.id === expenseId) setEditingExpense(null)
  }

  const handleExpenseSaved = (expense: Expense, isNew: boolean) => {
    setExpenses((prev) => (isNew ? [expense, ...prev] : prev.map((e) => (e.id === expense.id ? expense : e))))
  }

  const startEditExpense = (exp: Expense) => {
    setEditingExpense(exp)
    document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  )

  if (userLoading || trip === undefined) return null
  if (!user) return null // useUser() redirige déjà vers /login ; assertion pour TS ci-dessous

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

  // Le résumé budget (total, reste, répartition par catégorie) porte TOUJOURS sur
  // l'intégralité des dépenses, indépendamment du filtre de dates ci-dessous (c'est le
  // vrai suivi de budget). Le filtre ne restreint que la liste, le graphique et l'export.
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_base_with_fee, 0)
  const totalFees = expenses.reduce((sum, e) => sum + (e.amount_base_with_fee - e.amount_base), 0)
  const remaining = trip.total_budget != null ? trip.total_budget - totalSpent : null

  const categoryBreakdown = categories
    .map((cat) => ({
      ...cat,
      spent: expenses.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount_base_with_fee, 0),
    }))
    .filter((c) => c.spent > 0 || c.budget_amount != null)
  const uncategorizedSpent = expenses.filter((e) => !e.category_id).reduce((s, e) => s + e.amount_base_with_fee, 0)

  const filteredExpenses = expenses.filter(
    (e) => (!filterFrom || e.spent_at >= filterFrom) && (!filterTo || e.spent_at <= filterTo)
  )

  const exportCsv = () => {
    const headers = ['Date', 'Catégorie', 'Montant local', 'Devise', 'Taux', 'Frais %', `Montant (${trip.base_currency})`, `Coût réel (${trip.base_currency})`, 'Note']
    const rows = filteredExpenses.map((e) => [
      e.spent_at,
      e.category_id ? categoriesById[e.category_id]?.name || '' : '',
      e.amount_local, e.currency_local, e.exchange_rate.toFixed(6), e.bank_fee_pct,
      e.amount_base.toFixed(2), e.amount_base_with_fee.toFixed(2), e.note || '',
    ])
    downloadCsv(headers, rows, `depenses-${trip.name.replace(/[^a-z0-9]+/gi, '-')}.csv`)
  }

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

          {/* Répartition par catégorie */}
          {(categoryBreakdown.length > 0 || uncategorizedSpent > 0) && (
            <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
              <span className="text-xs font-medium text-neutral-500">Par catégorie</span>
              {categoryBreakdown.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</span>
                    <span className="text-neutral-500">
                      {cat.spent.toFixed(2)} {trip.base_currency}
                      {cat.budget_amount != null && ` / ${cat.budget_amount} ${trip.base_currency}`}
                    </span>
                  </div>
                  {cat.budget_amount != null && (
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full ${cat.spent > cat.budget_amount ? 'bg-red-500' : 'bg-neutral-400'}`}
                        style={{ width: `${Math.min(100, (cat.spent / cat.budget_amount) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {uncategorizedSpent > 0 && (
                <div className="flex items-center justify-between text-sm text-neutral-400">
                  <span>Sans catégorie</span>
                  <span>{uncategorizedSpent.toFixed(2)} {trip.base_currency}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <CategoryManager
          tripId={trip.id}
          userId={user.id}
          baseCurrency={trip.base_currency}
          categories={categories}
          onCreated={(c) => setCategories((prev) => [...prev, c])}
          onUpdated={(c) => setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
          onDeleted={(catId) => {
            setCategories((prev) => prev.filter((c) => c.id !== catId))
            setExpenses((prev) => prev.map((e) => (e.category_id === catId ? { ...e, category_id: null } : e)))
          }}
        />
        {loadingCategories && <p className="text-xs text-neutral-400 -mt-4 mb-6">Chargement des catégories...</p>}

        <ExpenseForm
          tripId={trip.id}
          userId={user.id}
          baseCurrency={trip.base_currency}
          categories={categories}
          rates={rates}
          ratesError={ratesError}
          onRetryRates={() => loadRates(trip.base_currency)}
          defaultCurrency={defaultCurrency}
          defaultBankFeePct={defaultBankFeePct}
          editingExpense={editingExpense}
          onSaved={handleExpenseSaved}
          onCancelEdit={() => setEditingExpense(null)}
        />

        {/* Filtre de dates + export CSV */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-medium text-neutral-500 flex-1">Dépenses</h2>
          <input
            type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
            className="text-xs rounded-lg border border-neutral-300 px-2 py-1 outline-none focus:border-neutral-500"
          />
          <span className="text-xs text-neutral-400">→</span>
          <input
            type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
            className="text-xs rounded-lg border border-neutral-300 px-2 py-1 outline-none focus:border-neutral-500"
          />
          {(filterFrom || filterTo) && (
            <button onClick={() => { setFilterFrom(''); setFilterTo('') }} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
              ✕
            </button>
          )}
          <button
            onClick={exportCsv} disabled={filteredExpenses.length === 0}
            className="text-xs rounded-full border border-neutral-300 px-3 py-1 hover:bg-neutral-50 disabled:opacity-40"
          >
            📥 CSV
          </button>
        </div>

        <SpendingChart expenses={filteredExpenses} baseCurrency={trip.base_currency} />

        {/* Liste des dépenses */}
        {loadingExpenses ? (
          <p className="text-sm text-neutral-400">Chargement...</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {expenses.length === 0 ? 'Aucune dépense pour l’instant.' : 'Aucune dépense sur cette période.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredExpenses.map((exp) => {
              const cat = exp.category_id ? categoriesById[exp.category_id] : null
              return (
                <li
                  key={exp.id}
                  className={`rounded-xl border bg-white px-4 py-3 flex items-center justify-between ${editingExpense?.id === exp.id ? 'border-neutral-900' : 'border-neutral-200'}`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {exp.amount_local} {exp.currency_local}
                      <span className="text-neutral-400 font-normal"> → {exp.amount_base_with_fee.toFixed(2)} {trip.base_currency}</span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {new Date(exp.spent_at).toLocaleDateString('fr-FR')}
                      {cat && ` · ${cat.icon ? `${cat.icon} ` : ''}${cat.name}`}
                      {exp.note && ` · ${exp.note}`}
                      {exp.bank_fee_pct > 0 && ` · frais ${exp.bank_fee_pct}%`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEditExpense(exp)} className="text-xs text-neutral-400 hover:text-neutral-800">✏️</button>
                    <button onClick={() => deleteExpense(exp.id)} className="text-xs text-neutral-400 hover:text-red-600">✕</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
