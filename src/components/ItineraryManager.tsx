'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { easeApple } from '@/lib/motion'
import { legDays, spentInLeg, daysPerCountry } from '@/lib/legs'
import type { Expense, Leg } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  legs: Leg[]
  expenses: Expense[]
  onCreated: (l: Leg) => void
  onUpdated: (l: Leg) => void
  onDeleted: (id: string) => void
}

// Itinéraire : étapes du voyage (pays/ville, dates), avec budget par étape, dépenses
// de la période, jours écoulés + alerte visa, et un récap jours par pays.
export default function ItineraryManager({
  tripId, userId, baseCurrency, legs, expenses, onCreated, onUpdated, onDeleted,
}: Props) {
  const [show, setShow] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [visaDays, setVisaDays] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCountry(''); setCity(''); setStartDate(''); setEndDate(''); setBudget(''); setVisaDays(''); setError(null)
  }
  const toggleCreate = () => {
    if (show && editingId === null) { setShow(false); return }
    setEditingId(null); reset(); setShow(true)
  }
  const startEdit = (l: Leg) => {
    setEditingId(l.id)
    setCountry(l.country); setCity(l.city || ''); setStartDate(l.start_date); setEndDate(l.end_date || '')
    setBudget(l.budget != null ? String(l.budget) : ''); setVisaDays(l.visa_days != null ? String(l.visa_days) : '')
    setError(null); setShow(true)
  }
  const cancel = () => { setShow(false); setEditingId(null); reset() }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) { setError('Date de début requise'); return }
    setError(null); setSaving(true)
    const payload = {
      country: country.trim(),
      city: city.trim() || null,
      start_date: startDate,
      end_date: endDate || null,
      budget: budget ? Number(budget) : null,
      visa_days: visaDays ? parseInt(visaDays) : null,
    }
    if (editingId) {
      const { data, error } = await supabase.from('trip_legs').update(payload).eq('id', editingId).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onUpdated(data as Leg)
    } else {
      const { data, error } = await supabase.from('trip_legs').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onCreated(data as Leg)
    }
    cancel()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette étape ? Les dépenses ne sont pas affectées.')) return
    const { error } = await supabase.from('trip_legs').delete().eq('id', id)
    if (error) { alert(error.message); return }
    onDeleted(id)
  }

  const sorted = [...legs].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const perCountry = Object.entries(daysPerCountry(legs)).sort(([, a], [, b]) => b - a)
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">Itinéraire</h2>
        <button onClick={toggleCreate} className="text-[13px] rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-ink px-3.5 py-1.5 font-medium transition-colors">
          {show && editingId === null ? 'Annuler' : '+ Étape'}
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
              {editingId && <p className="text-[13px] text-muted">Modification de l&apos;étape</p>}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Pays (ex : Thaïlande)" value={country} onChange={(e) => setCountry(e.target.value)} required className="field" />
                <input type="text" placeholder="Ville (optionnel)" value={city} onChange={(e) => setCity(e.target.value)} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-faint block mb-1 ml-1">Arrivée</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="field" />
                </div>
                <div>
                  <label className="text-[12px] text-faint block mb-1 ml-1">Départ (optionnel)</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" placeholder={`Budget étape (${baseCurrency})`} value={budget} onChange={(e) => setBudget(e.target.value)} className="field tnum" />
                <div className="relative">
                  <input type="number" min="1" placeholder="Limite visa" value={visaDays} onChange={(e) => setVisaDays(e.target.value)} className="field pr-10 tnum" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-[13px]">j</span>
                </div>
              </div>
              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" full disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter l’étape'}</Button>
                {editingId && <Button type="button" variant="secondary" onClick={cancel}>Annuler</Button>}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Récap jours par pays */}
      {perCountry.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {perCountry.map(([c, d]) => (
            <span key={c} className="rounded-full bg-surface-2 border border-[var(--color-line)] px-3 py-1.5 text-[13px]">
              {c} · <span className="tnum font-medium">{d}</span> j
            </span>
          ))}
        </div>
      )}

      {/* Timeline des étapes */}
      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sorted.map((l) => {
            const days = legDays(l)
            const spent = spentInLeg(l, expenses)
            const visaExceeded = l.visa_days != null && days > l.visa_days
            const visaClose = l.visa_days != null && !visaExceeded && days >= l.visa_days - 7
            const overBudget = l.budget != null && spent > l.budget
            return (
              <li key={l.id} className="rounded-2xl bg-surface border border-[var(--color-line)] px-4 py-3.5 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium">
                      📍 {l.country}{l.city && <span className="text-muted font-normal"> · {l.city}</span>}
                    </div>
                    <div className="text-[13px] text-faint">
                      {fmt(l.start_date)}{l.end_date ? ` → ${fmt(l.end_date)}` : ' → …'} · <span className="tnum">{days}</span> j
                      {l.visa_days != null && (
                        <span className={visaExceeded ? 'text-[var(--color-danger)] font-medium' : visaClose ? 'text-[var(--color-warn)] font-medium' : ''}>
                          {' '}/ visa {l.visa_days} j{visaExceeded ? ' ⚠️ dépassé' : visaClose ? ' ⚠️' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => startEdit(l)} className="text-faint hover:text-ink transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sm">✏️</button>
                    <button onClick={() => remove(l.id)} className="text-faint hover:text-[var(--color-danger)] transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center">✕</button>
                  </div>
                </div>
                {(l.budget != null || spent > 0) && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-muted">Dépensé</span>
                      <span className={`tnum ${overBudget ? 'text-[var(--color-danger)]' : 'text-ink'}`}>
                        {spent.toFixed(2)} {baseCurrency}{l.budget != null && <span className="text-faint"> / {l.budget}</span>}
                      </span>
                    </div>
                    {l.budget != null && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${overBudget ? 'bg-[var(--color-danger)]' : 'bg-accent'}`}
                          initial={{ width: 0 }} animate={{ width: `${Math.min(100, (spent / l.budget) * 100)}%` }}
                          transition={{ duration: 0.6, ease: easeApple }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
