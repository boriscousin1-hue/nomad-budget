'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { CURRENCIES } from '@/lib/currencies'
import { fadeUp, stagger, easeApple } from '@/lib/motion'
import Button from '@/components/Button'

type Trip = {
  id: string
  name: string
  base_currency: string
  total_budget: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

// Dégradé doux et déterministe par voyage (à partir du nom) pour la vignette.
function gradientFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${(h + 40) % 360} 72% 54%))`
}

export default function Home() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('EUR')
  const [totalBudget, setTotalBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTrips((data as Trip[]) || [])
        setLoadingTrips(false)
      })
    supabase.from('user_settings').select('home_currency').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.home_currency) setBaseCurrency(data.home_currency) })
  }, [user])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        name: name.trim(),
        base_currency: baseCurrency,
        total_budget: totalBudget ? Number(totalBudget) : null,
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .select()
      .single()

    setSaving(false)
    if (error) { setError(error.message); return }

    setTrips((prev) => [data as Trip, ...prev])
    setName(''); setTotalBudget(''); setStartDate(''); setEndDate('')
    setShowForm(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen">
      {/* Barre supérieure frostée, collante */}
      <header className="glass sticky top-0 z-20 border-b border-[var(--color-line)]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight flex items-center gap-2">
            <span className="text-lg">🧭</span> Nomad Budget
          </span>
          <div className="flex items-center gap-1">
            <Link href="/settings" className="text-[13px] text-muted hover:text-ink transition-colors px-3 py-1.5 rounded-full hover:bg-black/[0.04]">
              Réglages
            </Link>
            <button onClick={signOut} className="text-[13px] text-muted hover:text-ink transition-colors px-3 py-1.5 rounded-full hover:bg-black/[0.04]">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-10 pb-24">
        {/* Titre + CTA */}
        <motion.div
          initial="hidden" animate="show" variants={stagger}
          className="flex items-end justify-between mb-8"
        >
          <motion.div variants={fadeUp}>
            <h1 className="text-[34px] leading-none font-semibold tracking-tight">Voyages</h1>
            <p className="text-muted text-[15px] mt-2">
              {trips.length > 0 ? `${trips.length} voyage${trips.length > 1 ? 's' : ''}` : 'Commence ton premier voyage'}
            </p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'secondary' : 'primary'}>
              {showForm ? 'Annuler' : '+ Nouveau'}
            </Button>
          </motion.div>
        </motion.div>

        {/* Formulaire création */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.form
              onSubmit={createTrip}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.4, ease: easeApple }}
              className="overflow-hidden"
            >
              <div className="card p-6 flex flex-col gap-3">
                <input
                  type="text" placeholder="Nom du voyage (ex : Asie du Sud-Est 2026)"
                  value={name} onChange={(e) => setName(e.target.value)} required className="field"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} className="field">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                  <input
                    type="number" step="0.01" min="0" placeholder="Budget total (optionnel)"
                    value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} className="field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field" />
                </div>
                {error && <p className="text-[var(--color-danger)] text-[13px]">{error}</p>}
                <Button type="submit" size="lg" full disabled={saving} className="mt-1">
                  {saving ? 'Création…' : 'Créer le voyage'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Liste des voyages */}
        {loadingTrips ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="card p-5 h-[92px] animate-pulse opacity-60" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeApple }}
            className="card p-12 text-center"
          >
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-ink font-medium">Aucun voyage pour l&apos;instant</p>
            <p className="text-muted text-sm mt-1">Crée ton premier voyage pour commencer à suivre tes dépenses.</p>
          </motion.div>
        ) : (
          <motion.ul
            initial="hidden" animate="show" variants={stagger}
            className="flex flex-col gap-3"
          >
            {trips.map((trip) => (
              <motion.li key={trip.id} variants={fadeUp}>
                <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: easeApple }}>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="card group flex items-center gap-4 p-4 hover:shadow-[var(--shadow-lift)] transition-shadow"
                  >
                    <div
                      className="h-12 w-12 rounded-2xl shrink-0 flex items-center justify-center text-white text-lg shadow-[var(--shadow-pop)]"
                      style={{ background: gradientFor(trip.name) }}
                    >
                      {trip.name.trim().charAt(0).toUpperCase() || '✈️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{trip.name}</div>
                      <p className="text-[13px] text-muted mt-0.5 truncate">
                        {trip.start_date && new Date(trip.start_date).toLocaleDateString('fr-FR')}
                        {trip.start_date && trip.end_date && ' → '}
                        {trip.end_date && new Date(trip.end_date).toLocaleDateString('fr-FR')}
                        {trip.total_budget != null && `${trip.start_date ? ' · ' : ''}Budget ${trip.total_budget} ${trip.base_currency}`}
                        {!trip.start_date && trip.total_budget == null && trip.base_currency}
                      </p>
                    </div>
                    <span className="text-faint group-hover:text-muted transition-colors text-lg shrink-0">›</span>
                  </Link>
                </motion.div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </main>
    </div>
  )
}
