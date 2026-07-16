'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/currencies'
import { easeApple } from '@/lib/motion'
import { BOOKING_KINDS, type Booking, type BookingKind } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  bookings: Booking[]
  onCreated: (b: Booking) => void
  onUpdated: (b: Booking) => void
  onDeleted: (id: string) => void
}

const KIND_ICON: Record<string, string> = Object.fromEntries(BOOKING_KINDS.map((k) => [k.value, k.icon]))
const todayISO = () => new Date().toISOString().slice(0, 10)

// Réservations du voyage (vols, hôtels, trains…) : référence de confirmation, dates,
// prix. Met en avant la prochaine réservation à venir (compte à rebours).
export default function BookingManager({ tripId, userId, baseCurrency, bookings, onCreated, onUpdated, onDeleted }: Props) {
  const [show, setShow] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [kind, setKind] = useState<BookingKind>('flight')
  const [title, setTitle] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState(baseCurrency)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setKind('flight'); setTitle(''); setConfirmation(''); setStartDate(todayISO()); setEndDate('')
    setPrice(''); setCurrency(baseCurrency); setError(null)
  }
  const toggleCreate = () => {
    if (show && editingId === null) { setShow(false); return }
    setEditingId(null); reset(); setShow(true)
  }
  const startEdit = (b: Booking) => {
    setEditingId(b.id)
    setKind(b.kind); setTitle(b.title); setConfirmation(b.confirmation || '')
    setStartDate(b.start_date); setEndDate(b.end_date || '')
    setPrice(b.price != null ? String(b.price) : ''); setCurrency(b.currency || baseCurrency)
    setError(null); setShow(true)
  }
  const cancel = () => { setShow(false); setEditingId(null); reset() }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSaving(true)
    const payload = {
      kind, title: title.trim(),
      confirmation: confirmation.trim() || null,
      start_date: startDate,
      end_date: endDate || null,
      price: price ? Number(price) : null,
      currency: price ? currency : null,
    }
    if (editingId) {
      const { data, error } = await supabase.from('bookings').update(payload).eq('id', editingId).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onUpdated(data as Booking)
    } else {
      const { data, error } = await supabase.from('bookings').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onCreated(data as Booking)
    }
    cancel()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette réservation ?')) return
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) { alert(error.message); return }
    onDeleted(id)
  }

  const sorted = [...bookings].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const today = todayISO()
  const next = sorted.find((b) => b.start_date >= today)
  const daysUntil = next ? Math.round((new Date(next.start_date).getTime() - new Date(today).getTime()) / 86400000) : null
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">Réservations</h2>
        <button onClick={toggleCreate} className="text-[13px] rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-ink px-3.5 py-1.5 font-medium transition-colors">
          {show && editingId === null ? 'Annuler' : '+ Réservation'}
        </button>
      </div>

      {/* Prochaine réservation à venir */}
      {next && daysUntil != null && (
        <div className="card p-4 mb-3 flex items-center gap-3 bg-accent/[0.04]">
          <span className="text-2xl">{KIND_ICON[next.kind]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium truncate">{next.title}</div>
            <div className="text-[13px] text-muted">{fmt(next.start_date)}</div>
          </div>
          <span className="text-[13px] font-medium text-accent shrink-0">
            {daysUntil === 0 ? "aujourd'hui" : daysUntil === 1 ? 'demain' : `dans ${daysUntil} j`}
          </span>
        </div>
      )}

      <AnimatePresence initial={false}>
        {show && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 12 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: easeApple }} className="overflow-hidden"
          >
            <div className="card p-5 flex flex-col gap-3">
              {editingId && <p className="text-[13px] text-muted">Modification de la réservation</p>}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
                {BOOKING_KINDS.slice(0, 3).map((k) => (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    className={`rounded-xl py-2 text-[13px] font-medium transition-colors ${kind === k.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted hover:text-ink'}`}>
                    {k.icon} {k.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
                {BOOKING_KINDS.slice(3).map((k) => (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    className={`rounded-xl py-2 text-[13px] font-medium transition-colors ${kind === k.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted hover:text-ink'}`}>
                    {k.icon} {k.label}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Intitulé (ex : Bangkok → Chiang Mai)" value={title} onChange={(e) => setTitle(e.target.value)} required className="field" />
              <input type="text" placeholder="N° de confirmation (optionnel)" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="field" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-faint block mb-1 ml-1">Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="field" />
                </div>
                <div>
                  <label className="text-[12px] text-faint block mb-1 ml-1">Fin (optionnel)</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" placeholder="Prix (optionnel)" value={price} onChange={(e) => setPrice(e.target.value)} className="field tnum" />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="field">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" full disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}</Button>
                {editingId && <Button type="button" variant="secondary" onClick={cancel}>Annuler</Button>}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sorted.map((b) => (
            <li key={b.id} className={`rounded-2xl bg-surface border px-4 py-3.5 flex items-center justify-between shadow-[var(--shadow-card)] ${b.start_date < today ? 'opacity-60' : ''}`}>
              <div className="min-w-0 flex items-center gap-3">
                <span className="text-xl shrink-0">{KIND_ICON[b.kind]}</span>
                <div className="min-w-0">
                  <div className="text-[15px] font-medium truncate">{b.title}</div>
                  <div className="text-[13px] text-faint truncate">
                    {fmt(b.start_date)}{b.end_date && ` → ${fmt(b.end_date)}`}
                    {b.confirmation && ` · ${b.confirmation}`}
                    {b.price != null && ` · ${b.price} ${b.currency || baseCurrency}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => startEdit(b)} className="text-faint hover:text-ink transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sm">✏️</button>
                <button onClick={() => remove(b.id)} className="text-faint hover:text-[var(--color-danger)] transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
