'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { fetchRates, type RatesResponse } from '@/lib/exchangeRates'
import { downloadCsv } from '@/lib/csv'
import { fadeUp, stagger, easeApple } from '@/lib/motion'
import type { Trip, Category, Expense } from '@/lib/types'
import ExpenseForm from '@/components/ExpenseForm'
import CategoryManager from '@/components/CategoryManager'
import SpendingChart from '@/components/SpendingChart'
import AnimatedNumber from '@/components/AnimatedNumber'

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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🧭</div>
          <p className="text-muted mb-4">Voyage introuvable.</p>
          <Link href="/" className="text-accent text-sm hover:underline">Retour à l&apos;accueil</Link>
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
    <div className="min-h-screen">
      {/* Barre supérieure frostée */}
      <header className="glass sticky top-0 z-20 border-b border-[var(--color-line)]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="text-muted hover:text-ink transition-colors text-[15px] flex items-center gap-1 min-w-0">
            <span className="text-lg leading-none">‹</span>
            <span className="truncate">Voyages</span>
          </Link>
          <button onClick={deleteTrip} disabled={deleting} className="text-[13px] text-faint hover:text-[var(--color-danger)] transition-colors shrink-0">
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-8 pb-24">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          {/* En-tête voyage */}
          <motion.div variants={fadeUp} className="mb-6">
            <h1 className="text-[32px] leading-tight font-semibold tracking-tight">{trip.name}</h1>
            <p className="text-muted text-[15px] mt-1">
              {[
                trip.start_date && new Date(trip.start_date).toLocaleDateString('fr-FR'),
                trip.end_date && new Date(trip.end_date).toLocaleDateString('fr-FR'),
              ].filter(Boolean).join(' → ') || `Devise ${trip.base_currency}`}
            </p>
          </motion.div>

          {/* Carte budget — le héros de la page */}
          <motion.div variants={fadeUp} className="card p-7 mb-6 overflow-hidden">
            <span className="text-[13px] font-medium text-muted uppercase tracking-wide">Dépensé (frais inclus)</span>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[40px] leading-none font-semibold tracking-tight tnum">
                <AnimatedNumber value={totalSpent} />
              </span>
              <span className="text-xl text-muted font-medium">{trip.base_currency}</span>
            </div>

            {trip.total_budget != null && (
              <div className="mt-5">
                <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${remaining! < 0 ? 'bg-[var(--color-danger)]' : 'bg-accent'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalSpent / trip.total_budget) * 100)}%` }}
                    transition={{ duration: 0.7, ease: easeApple }}
                  />
                </div>
                <p className={`text-[13px] mt-2 ${remaining! < 0 ? 'text-[var(--color-danger)]' : 'text-muted'}`}>
                  {remaining! >= 0
                    ? <><span className="tnum font-medium text-ink">{remaining!.toFixed(2)} {trip.base_currency}</span> restants sur {trip.total_budget} {trip.base_currency}</>
                    : <>Dépassement de <span className="tnum font-medium">{Math.abs(remaining!).toFixed(2)} {trip.base_currency}</span></>}
                </p>
              </div>
            )}

            {totalFees > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warn)]/[0.1] text-[var(--color-warn)] px-3 py-1.5 text-[13px]">
                <span>👛</span>
                <span className="tnum">{totalFees.toFixed(2)} {trip.base_currency}</span> de frais bancaires cachés
              </div>
            )}

            {/* Répartition par catégorie */}
            {(categoryBreakdown.length > 0 || uncategorizedSpent > 0) && (
              <div className="mt-6 pt-6 border-t border-[var(--color-line)] flex flex-col gap-3.5">
                <span className="text-[13px] font-medium text-muted uppercase tracking-wide">Par catégorie</span>
                {categoryBreakdown.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between text-[15px]">
                      <span>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</span>
                      <span className="text-muted tnum">
                        {cat.spent.toFixed(2)} {trip.base_currency}
                        {cat.budget_amount != null && <span className="text-faint"> / {cat.budget_amount}</span>}
                      </span>
                    </div>
                    {cat.budget_amount != null && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${cat.spent > cat.budget_amount ? 'bg-[var(--color-danger)]' : 'bg-faint'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (cat.spent / cat.budget_amount) * 100)}%` }}
                          transition={{ duration: 0.6, ease: easeApple }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {uncategorizedSpent > 0 && (
                  <div className="flex items-center justify-between text-[15px] text-muted">
                    <span>Sans catégorie</span>
                    <span className="tnum">{uncategorizedSpent.toFixed(2)} {trip.base_currency}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>

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
        {loadingCategories && <p className="text-[13px] text-faint -mt-4 mb-6">Chargement des catégories…</p>}

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
          <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide flex-1">Dépenses</h2>
          <input
            type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
            className="text-[13px] rounded-lg border border-[var(--color-line)] bg-surface px-2.5 py-1.5 outline-none focus:border-accent"
          />
          <span className="text-xs text-faint">→</span>
          <input
            type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
            className="text-[13px] rounded-lg border border-[var(--color-line)] bg-surface px-2.5 py-1.5 outline-none focus:border-accent"
          />
          {(filterFrom || filterTo) && (
            <button onClick={() => { setFilterFrom(''); setFilterTo('') }} className="text-xs text-faint hover:text-ink transition-colors">
              ✕
            </button>
          )}
          <button
            onClick={exportCsv} disabled={filteredExpenses.length === 0}
            className="text-[13px] rounded-full bg-black/[0.05] hover:bg-black/[0.09] transition-colors px-3.5 py-1.5 disabled:opacity-40"
          >
            📥 CSV
          </button>
        </div>

        <SpendingChart expenses={filteredExpenses} baseCurrency={trip.base_currency} />

        {/* Liste des dépenses */}
        {loadingExpenses ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="card h-16 animate-pulse opacity-60" />)}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-muted text-sm">
              {expenses.length === 0 ? 'Aucune dépense pour l’instant.' : 'Aucune dépense sur cette période.'}
            </p>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {filteredExpenses.map((exp) => {
                const cat = exp.category_id ? categoriesById[exp.category_id] : null
                return (
                  <motion.li
                    key={exp.id}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: easeApple }}
                    className={`group rounded-2xl bg-surface border px-4 py-3.5 flex items-center justify-between shadow-[var(--shadow-card)] transition-colors ${editingExpense?.id === exp.id ? 'border-accent' : 'border-[var(--color-line)]'}`}
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium tnum">
                        {exp.amount_local} {exp.currency_local}
                        <span className="text-faint font-normal"> → {exp.amount_base_with_fee.toFixed(2)} {trip.base_currency}</span>
                      </div>
                      <div className="text-[13px] text-faint truncate">
                        {new Date(exp.spent_at).toLocaleDateString('fr-FR')}
                        {cat && ` · ${cat.icon ? `${cat.icon} ` : ''}${cat.name}`}
                        {exp.note && ` · ${exp.note}`}
                        {exp.bank_fee_pct > 0 && ` · frais ${exp.bank_fee_pct}%`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button onClick={() => startEditExpense(exp)} className="text-faint hover:text-ink transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sm">✏️</button>
                      <button onClick={() => deleteExpense(exp.id)} className="text-faint hover:text-[var(--color-danger)] transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center">✕</button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </main>
    </div>
  )
}
