// Codes météo WMO (open-meteo) → libellé FR + emoji.
export function weatherLabel(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Ciel dégagé', emoji: '☀️' }
  if (code <= 2) return { label: 'Peu nuageux', emoji: '🌤️' }
  if (code === 3) return { label: 'Couvert', emoji: '☁️' }
  if (code <= 48) return { label: 'Brouillard', emoji: '🌫️' }
  if (code <= 57) return { label: 'Bruine', emoji: '🌦️' }
  if (code <= 67) return { label: 'Pluie', emoji: '🌧️' }
  if (code <= 77) return { label: 'Neige', emoji: '🌨️' }
  if (code <= 82) return { label: 'Averses', emoji: '🌦️' }
  if (code <= 86) return { label: 'Averses de neige', emoji: '🌨️' }
  if (code <= 99) return { label: 'Orage', emoji: '⛈️' }
  return { label: '—', emoji: '🌡️' }
}
