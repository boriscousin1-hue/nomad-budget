'use client'

import { useEffect, useState } from 'react'

// Statut réseau du navigateur. SSR-safe : on suppose « en ligne » au rendu serveur,
// puis on s'aligne sur navigator.onLine au montage et on écoute les événements.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return online
}
