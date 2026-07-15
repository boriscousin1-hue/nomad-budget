'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'

type Trip = {
  id: string
  name: string
  base_currency: string
  total_budget: number | null
  start_date: string | null
  end_date: string | null
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined) // undefined = chargement, null = introuvable
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setTrip((data as Trip) || null))
  }, [user, id])

  const deleteTrip = async () => {
    if (!confirm('Supprimer ce voyage et toutes ses dépenses ? Action irréversible.')) return
    setDeleting(true)
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) { alert(error.message); setDeleting(false); return }
    router.push('/')
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

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800 underline mb-6 inline-block">
          ← Tous les voyages
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-semibold">{trip.name}</h1>
            <button
              onClick={deleteTrip}
              disabled={deleting}
              className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Devise de base : <strong>{trip.base_currency}</strong>
            {trip.total_budget && <> · Budget : <strong>{trip.total_budget} {trip.base_currency}</strong></>}
          </p>
          {(trip.start_date || trip.end_date) && (
            <p className="text-sm text-neutral-500">
              {trip.start_date && new Date(trip.start_date).toLocaleDateString('fr-FR')}
              {trip.start_date && trip.end_date && ' → '}
              {trip.end_date && new Date(trip.end_date).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>

        <p className="text-sm text-neutral-400">Catégories et dépenses arrivent à la prochaine étape.</p>
      </div>
    </div>
  )
}
