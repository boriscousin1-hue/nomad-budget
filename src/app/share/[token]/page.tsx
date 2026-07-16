import { notFound } from 'next/navigation'
import { getSharedBilan } from '@/lib/shareServer'
import TripSummaryView from '@/components/TripSummary'
import type { Metadata } from 'next'

// Page publique du bilan de voyage (aucune authentification). Non indexable.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const bilan = await getSharedBilan(token)
  if (!bilan) notFound()

  const dateStr = [bilan.startDate && fmt(bilan.startDate), bilan.endDate && fmt(bilan.endDate)]
    .filter(Boolean).join(' → ')

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-20 border-b border-[var(--color-line)]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center">
          <span className="font-semibold tracking-tight flex items-center gap-2">
            <span className="text-lg">🧭</span> Nomad Budget
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-8 pb-24">
        <div className="mb-6">
          <p className="text-[13px] font-medium text-accent uppercase tracking-wide">Bilan de voyage</p>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight mt-1">{bilan.tripName}</h1>
          {dateStr && <p className="text-muted text-[15px] mt-1">{dateStr}</p>}
        </div>

        <TripSummaryView summary={bilan.summary} baseCurrency={bilan.baseCurrency} />

        <div className="mt-10 text-center">
          <a href="/" className="text-[13px] text-muted hover:text-ink transition-colors">
            Créé avec <span className="font-medium">Nomad Budget</span> 🧭
          </a>
        </div>
      </main>
    </div>
  )
}
