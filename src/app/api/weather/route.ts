import { NextRequest, NextResponse } from 'next/server'

// Météo actuelle d'une ville via open-meteo (gratuit, sans clé) : géocodage + prévision.
// Mis en cache serveur (géocodage 24h, météo 30 min) pour limiter les appels.
const GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const WX = 'https://api.open-meteo.com/v1/forecast'

export async function GET(req: NextRequest) {
  const place = (req.nextUrl.searchParams.get('place') || '').trim()
  if (!place) return NextResponse.json({ error: 'place requis' }, { status: 400 })

  try {
    const geoRes = await fetch(`${GEO}?name=${encodeURIComponent(place)}&count=1&language=fr`, { next: { revalidate: 86400 } })
    const geo = await geoRes.json()
    const loc = geo.results?.[0]
    if (!loc) return NextResponse.json({ error: 'lieu introuvable' }, { status: 404 })

    const wxRes = await fetch(
      `${WX}?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code`,
      { next: { revalidate: 1800 } },
    )
    const wx = await wxRes.json()
    if (!wx.current) return NextResponse.json({ error: 'météo indisponible' }, { status: 502 })

    return NextResponse.json({
      city: loc.name as string,
      country: loc.country as string,
      temp: Math.round(wx.current.temperature_2m) as number,
      code: wx.current.weather_code as number,
    })
  } catch {
    return NextResponse.json({ error: 'météo indisponible' }, { status: 502 })
  }
}
