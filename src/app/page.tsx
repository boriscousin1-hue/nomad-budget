'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { CURRENCIES } from '@/lib/currencies'

type Trip = {
  id: string
  name: string
  base_currency: string
  total_budget: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
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
    // Devise préférée des réglages -> défaut du formulaire nouveau voyage.
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
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <h1 className="text-xl font-semibold">Nomad Budget</h1>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-sm text-neutral-500 hover:text-neutral-800 underline">
              Réglages
            </Link>
            <button onClick={signOut} className="text-sm text-neutral-500 hover:text-neutral-800 underline">
              Se déconnecter
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-neutral-500">Tes voyages</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm rounded-full bg-neutral-900 text-white px-4 py-1.5 font-medium hover:bg-neutral-800 transition"
          >
            {showForm ? 'Annuler' : '+ Nouveau voyage'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createTrip} className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nom du voyage (ex: Asie du Sud-Est 2026)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Budget total (optionnel)"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
              />
            </div>

            {error && <p className="text-red-600 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded-xl bg-neutral-900 text-white py-2.5 font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer le voyage'}
            </button>
          </form>
        )}

        {loadingTrips ? (
          <p className="text-sm text-neutral-400">Chargement...</p>
        ) : trips.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucun voyage pour l&apos;instant. Crée le premier !</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}`}
                  className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{trip.name}</span>
                    <span className="text-xs text-neutral-400">{trip.base_currency}</span>
                  </div>
                  {(trip.start_date || trip.total_budget) && (
                    <p className="text-xs text-neutral-500 mt-1">
                      {trip.start_date && new Date(trip.start_date).toLocaleDateString('fr-FR')}
                      {trip.start_date && trip.end_date && ' → '}
                      {trip.end_date && new Date(trip.end_date).toLocaleDateString('fr-FR')}
                      {trip.total_budget && ` · Budget ${trip.total_budget} ${trip.base_currency}`}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
