'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      setLoading(false)
    })
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <h1 className="text-xl font-semibold">Nomad Budget</h1>
          <button onClick={signOut} className="text-sm text-neutral-500 hover:text-neutral-800 underline">
            Se déconnecter
          </button>
        </header>
        <p className="text-neutral-500 text-sm">Connecté en tant que {user?.email}. Tes voyages arrivent bientôt ici.</p>
      </div>
    </div>
  )
}
