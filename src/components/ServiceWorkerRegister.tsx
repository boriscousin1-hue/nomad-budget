'use client'

import { useEffect } from 'react'

// Enregistre le service worker (public/sw.js) pour l'ouverture hors-ligne.
// Silencieux : n'affiche rien, échoue proprement sur navigateur non compatible.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
