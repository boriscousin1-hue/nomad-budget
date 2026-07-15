import { NextRequest, NextResponse } from 'next/server'

// Proxy vers l'API de taux de change (gratuite, sans clé, ~166 devises, MAJ quotidienne).
// On passe par notre propre route pour : mettre en cache côté serveur (revalidate),
// éviter d'exposer l'URL tierce au client, et uniformiser la gestion d'erreur.
const SOURCE = 'https://open.er-api.com/v6/latest'

export async function GET(req: NextRequest) {
  const base = (req.nextUrl.searchParams.get('base') || 'EUR').toUpperCase()

  try {
    // revalidate 6h : les taux ne changent qu'une fois par jour côté source,
    // pas besoin de re-fetch à chaque saisie de dépense.
    const res = await fetch(`${SOURCE}/${base}`, { next: { revalidate: 21600 } })
    if (!res.ok) throw new Error(`Source HTTP ${res.status}`)
    const data = await res.json()
    if (data.result !== 'success') throw new Error('Réponse invalide de la source de taux')

    return NextResponse.json({
      base: data.base_code as string,
      rates: data.rates as Record<string, number>,
      updatedAt: data.time_last_update_utc as string,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Impossible de récupérer les taux de change' },
      { status: 502 }
    )
  }
}
