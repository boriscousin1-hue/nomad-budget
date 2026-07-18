'use client'

import { useEffect, useState } from 'react'
import { weatherLabel } from '@/lib/weather'

type Wx = { city: string; country: string; temp: number; code: number }

// Météo actuelle du lieu de l'étape en cours. Discret : ne s'affiche que si l'API répond.
export default function CurrentWeather({ place }: { place: string }) {
  const [wx, setWx] = useState<Wx | null>(null)

  useEffect(() => {
    if (!place) return
    let alive = true
    fetch(`/api/weather?place=${encodeURIComponent(place)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && !d.error) setWx(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [place])

  if (!wx) return null
  const { label, emoji } = weatherLabel(wx.code)

  return (
    <div className="card px-5 py-3.5 mb-6 flex items-center gap-3">
      <span className="text-3xl">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">{wx.city}</div>
        <div className="text-[13px] text-muted">{label}</div>
      </div>
      <span className="text-[24px] font-semibold tracking-tight tnum">{wx.temp}°</span>
    </div>
  )
}
