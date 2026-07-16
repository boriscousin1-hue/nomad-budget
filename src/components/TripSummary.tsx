'use client'

import type { TripSummary } from '@/lib/summary'

type Props = {
  summary: TripSummary
  baseCurrency: string
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
const money = (n: number, cur: string) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${cur}`

// Rendu du bilan de voyage — présentation pure (aucun accès données). Réutilisé par
// la vue « Bilan » dans l'app et la page publique partageable.
export default function TripSummaryView({ summary: s, baseCurrency: cur }: Props) {
  const maxCat = Math.max(1, ...s.byCategory.map((c) => c.amount), s.uncategorized)

  return (
    <div className="flex flex-col gap-4">
      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="text-[13px] text-muted">Total dépensé</div>
          <div className="text-[24px] font-semibold tracking-tight tnum mt-0.5">{money(s.totalSpent, cur)}</div>
        </div>
        <div className="card p-5">
          <div className="text-[13px] text-muted">Moyenne / jour</div>
          <div className="text-[24px] font-semibold tracking-tight tnum mt-0.5">{money(s.avgPerDay, cur)}</div>
        </div>
        {s.totalIncome > 0 && (
          <div className="card p-5">
            <div className="text-[13px] text-muted">Solde net</div>
            <div className={`text-[24px] font-semibold tracking-tight tnum mt-0.5 ${s.netBalance < 0 ? 'text-[var(--color-danger)]' : 'text-[#1f9d4d]'}`}>
              {s.netBalance >= 0 ? '+' : ''}{money(s.netBalance, cur)}
            </div>
          </div>
        )}
        {s.totalFees > 0 && (
          <div className="card p-5">
            <div className="text-[13px] text-muted">Frais cachés</div>
            <div className="text-[24px] font-semibold tracking-tight tnum mt-0.5 text-[var(--color-warn)]">{money(s.totalFees, cur)}</div>
          </div>
        )}
      </div>

      {/* Méta */}
      <div className="flex flex-wrap gap-2">
        {[
          `${s.days} jour${s.days > 1 ? 's' : ''}`,
          s.countriesCount > 0 && `${s.countriesCount} pays`,
          `${s.expenseCount} dépense${s.expenseCount > 1 ? 's' : ''}`,
        ].filter(Boolean).map((x) => (
          <span key={x as string} className="rounded-full bg-surface-2 border border-[var(--color-line)] px-3 py-1.5 text-[13px]">{x}</span>
        ))}
      </div>

      {/* Faits marquants */}
      {(s.topDay || s.topCategory) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {s.topDay && (
            <div className="card p-4">
              <div className="text-[13px] text-muted">Jour le plus cher</div>
              <div className="text-[15px] font-medium mt-0.5">{fmtDate(s.topDay.date)} · <span className="tnum">{money(s.topDay.amount, cur)}</span></div>
            </div>
          )}
          {s.topCategory && (
            <div className="card p-4">
              <div className="text-[13px] text-muted">Poste le plus cher</div>
              <div className="text-[15px] font-medium mt-0.5">{s.topCategory.name} · <span className="tnum">{money(s.topCategory.amount, cur)}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Par pays */}
      {s.byCountry.length > 0 && (
        <div className="card p-5">
          <div className="text-[13px] font-medium text-muted uppercase tracking-wide mb-3">Par pays</div>
          <div className="flex flex-col gap-2">
            {s.byCountry.map((c) => (
              <div key={c.country} className="flex items-center justify-between text-[15px]">
                <span>📍 {c.country} <span className="text-faint text-[13px]">· {c.days} j</span></span>
                <span className="tnum text-muted">{money(c.amount, cur)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Par catégorie */}
      {(s.byCategory.length > 0 || s.uncategorized > 0) && (
        <div className="card p-5">
          <div className="text-[13px] font-medium text-muted uppercase tracking-wide mb-3">Par catégorie</div>
          <div className="flex flex-col gap-3">
            {s.byCategory.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-[15px]">
                  <span>{c.icon ? `${c.icon} ` : ''}{c.name}</span>
                  <span className="tnum text-muted">{money(c.amount, cur)}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
            {s.uncategorized > 0 && (
              <div className="flex items-center justify-between text-[15px] text-muted">
                <span>Sans catégorie</span>
                <span className="tnum">{money(s.uncategorized, cur)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
