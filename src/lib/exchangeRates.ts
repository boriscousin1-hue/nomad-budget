export type RatesResponse = {
  base: string
  rates: Record<string, number>
  updatedAt: string
}

export async function fetchRates(base: string): Promise<RatesResponse> {
  const res = await fetch(`/api/rates?base=${encodeURIComponent(base)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || 'Impossible de récupérer les taux de change')
  }
  return res.json()
}

// Taux multiplicateur pour convertir un montant en `localCurrency` vers la devise
// de base des `rates` (rates.rates[X] = combien de X pour 1 unité de base, donc
// on inverse pour aller de la devise locale VERS la base).
export function localToBaseRate(rates: RatesResponse, localCurrency: string): number {
  if (localCurrency === rates.base) return 1
  const r = rates.rates[localCurrency]
  if (!r) throw new Error(`Devise ${localCurrency} non supportée par la source de taux`)
  return 1 / r
}

export function convertToBase(amountLocal: number, rates: RatesResponse, localCurrency: string): number {
  return amountLocal * localToBaseRate(rates, localCurrency)
}

// Coût réel supporté après frais bancaires/carte cachés (ex: 3% de marge de change).
export function withBankFee(amountBase: number, feePct: number): number {
  return amountBase * (1 + feePct / 100)
}
