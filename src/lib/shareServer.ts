// Accès serveur au bilan public d'un voyage (clé service). NE PAS importer côté client.
import { createClient } from '@supabase/supabase-js'
import { buildSummary, type TripSummary } from '@/lib/summary'
import type { Category, Expense, Income, Leg, Withdrawal } from '@/lib/types'

export type SharedBilan = {
  tripName: string
  baseCurrency: string
  startDate: string | null
  endDate: string | null
  summary: TripSummary
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Renvoie le bilan agrégé d'un voyage partagé via son share_token, ou null.
// N'expose que des agrégats (jamais les lignes brutes).
export async function getSharedBilan(token: string): Promise<SharedBilan | null> {
  if (!token) return null
  const sb = admin()
  const { data: trip } = await sb
    .from('trips')
    .select('id, name, base_currency, start_date, end_date, share_token')
    .eq('share_token', token)
    .maybeSingle()
  if (!trip) return null

  const [{ data: expenses }, { data: incomes }, { data: withdrawals }, { data: categories }, { data: legs }] = await Promise.all([
    sb.from('expenses').select('*').eq('trip_id', trip.id),
    sb.from('incomes').select('*').eq('trip_id', trip.id),
    sb.from('cash_withdrawals').select('*').eq('trip_id', trip.id),
    sb.from('categories').select('*').eq('trip_id', trip.id).order('created_at'),
    sb.from('trip_legs').select('*').eq('trip_id', trip.id).order('start_date'),
  ])

  const summary = buildSummary(
    { base_currency: trip.base_currency, start_date: trip.start_date, end_date: trip.end_date },
    (expenses as Expense[]) || [],
    (incomes as Income[]) || [],
    (withdrawals as Withdrawal[]) || [],
    (categories as Category[]) || [],
    (legs as Leg[]) || [],
  )

  return {
    tripName: trip.name,
    baseCurrency: trip.base_currency,
    startDate: trip.start_date,
    endDate: trip.end_date,
    summary,
  }
}
