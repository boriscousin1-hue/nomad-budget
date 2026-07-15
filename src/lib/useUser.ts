'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Protège une page cliente : redirige vers /login si pas connecté.
// Réutilisé par toutes les pages (accueil, détail voyage, etc.).
export function useUser() {
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

  return { user, loading }
}
