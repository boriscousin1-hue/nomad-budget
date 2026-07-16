'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { easeApple } from '@/lib/motion'
import { PAYMENT_METHODS, type Category, type Recurring, type PaymentMethod } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  defaultCurrency: string
  categories: Category[]
  recurrings: Recurring[]
  onCreated: (r: Recurring) => void
  onUpdated: (r: Recurring) => void
  onDeleted: (id: string) => void
}

// Modèles de dépenses récurrentes (loyer, coworking…). La génération automatique
// des dépenses est gérée par la page voyage (lib/recurring). Ici : le CRUD des modèles.
export default function RecurringManager({
  tripId, userId, baseCurrency, defaultCurrency, categories, recurrings, onCreated, onUpdated, onDeleted,
}: Props) {
  const [show, setShow] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency || baseCurrency)
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setLabel(''); setAmount(''); setCurrency(defaultCurrency || baseCurrency)
    setCategoryId(''); setPaymentMethod('transfer'); setDayOfMonth('1'); setError(null)
  }

  const toggleCreate = () => {
    if (show && editingId === null) { setShow(false); return }
    setEditingId(null); reset(); setShow(true)
  }

  const startEdit = (r: Recurring) => {
    setEditingId(r.id)
    setLabel(r.label); setAmount(String(r.amount_local)); setCurrency(r.currency_local)
    setCategoryId(r.category_id || ''); setPaymentMethod(r.payment_method)
    setDayOfMonth(String(r.day_of_month)); setError(null); setShow(true)
  }

  const cancel = () => { setShow(false); setEditingId(null); reset() }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSaving(true)
    const payload = {
      label: label.trim(),
      amount_local: parseFloat(amount) || 0,
      currency_local: currency,
      category_id: categoryId || null,
      payment_method: paymentMethod,
      day_of_month: Math.min(Math.max(1, parseInt(dayOfMonth) || 1), 28),
    }
    if (editingId) {
      const { data, error } = await supabase.from('recurring_expenses').update(payload).eq('id', editingId).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onUpdated(data as Recurring)
    } else {
      const { data, error } = await supabase.from('recurring_expenses').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onCreated(data as Recurring)
    }
    cancel()
  }

  const toggleActive = async (r: Recurring) => {
    const { data, error } = await supabase.from('recurring_expenses').update({ active: !r.active }).eq('id', r.id).select().single()
    if (error) { alert(error.message); return }
    onUpdated(data as Recurring)
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce modèle récurrent ? Les dépenses déjà générées sont conservées.')) return
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
    if (error) { alert(error.message); return }
    onDeleted(id)
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">Dépenses récurrentes</h2>
        <button onClick={toggleCreate} className="text-[13px] rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-ink px-3.5 py-1.5 font-medium transition-colors">
          {show && editingId === null ? 'Annuler' : '+ Récurrente'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {show && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 12 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: easeApple }} className="overflow-hidden"
          >
            <div className="card p-5 flex flex-col gap-3">
              {editingId && <p className="text-[13px] text-muted">Modification du modèle</p>}
              <input
                type="text" placeholder="Libellé (ex : Loyer Airbnb)"
                value={label} onChange={(e) => setLabel(e.target.value)} required className="field"
              />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} required className="field tnum" />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="field">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {categories.length > 0 ? (
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
                    <option value="">Sans catégorie</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
                  </select>
                ) : <div />}
                <div className="relative">
                  <input type="number" min="1" max="28" placeholder="Jour" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className="field pr-16 tnum" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-[13px]">du mois</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    className={`rounded-xl py-2 text-[13px] font-medium transition-colors ${paymentMethod === m.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted hover:text-ink'}`}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" full disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer le modèle'}</Button>
                {editingId && <Button type="button" variant="secondary" onClick={cancel}>Annuler</Button>}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {recurrings.length > 0 && (
        <ul className="flex flex-col gap-2">
          {recurrings.map((r) => (
            <li key={r.id} className={`rounded-2xl bg-surface border px-4 py-3.5 flex items-center justify-between shadow-[var(--shadow-card)] ${r.active ? 'border-[var(--color-line)]' : 'border-[var(--color-line)] opacity-55'}`}>
              <div className="min-w-0">
                <div className="text-[15px] font-medium tnum">
                  🔁 {r.amount_local} {r.currency_local}
                  <span className="text-faint font-normal"> · {r.label}</span>
                </div>
                <div className="text-[13px] text-faint truncate">
                  Le {r.day_of_month} de chaque mois{!r.active && ' · en pause'}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => toggleActive(r)} title={r.active ? 'Mettre en pause' : 'Réactiver'} className="text-faint hover:text-ink transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sm">{r.active ? '⏸' : '▶'}</button>
                <button onClick={() => startEdit(r)} className="text-faint hover:text-ink transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sm">✏️</button>
                <button onClick={() => remove(r.id)} className="text-faint hover:text-[var(--color-danger)] transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
