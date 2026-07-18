// Types partagés entre la page voyage et ses composants.
export type Trip = {
  id: string
  name: string
  base_currency: string
  total_budget: number | null
  start_date: string | null
  end_date: string | null
  share_token?: string | null
}

export type Category = {
  id: string
  name: string
  icon: string | null
  budget_amount: number | null
}

export type PaymentMethod = 'card' | 'cash' | 'transfer'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'card', label: 'Carte', icon: '💳' },
  { value: 'cash', label: 'Espèces', icon: '💵' },
  { value: 'transfer', label: 'Virement', icon: '🏦' },
]

export type Expense = {
  id: string
  category_id: string | null
  amount_local: number
  currency_local: string
  exchange_rate: number
  bank_fee_pct: number
  amount_base: number
  amount_base_with_fee: number
  payment_method: PaymentMethod
  note: string | null
  spent_at: string
}

export type Income = {
  id: string
  amount_local: number
  currency_local: string
  exchange_rate: number
  amount_base: number
  source: string | null
  received_at: string
}

export type Withdrawal = {
  id: string
  amount_local: number
  currency_local: string
  fee_local: number
  exchange_rate: number
  amount_base: number
  fee_base: number
  withdrawn_at: string
}

export type DocumentKind = 'passport' | 'visa' | 'insurance' | 'id' | 'ticket' | 'other'

export const DOCUMENT_KINDS: { value: DocumentKind; label: string; icon: string }[] = [
  { value: 'passport', label: 'Passeport', icon: '🛂' },
  { value: 'visa', label: 'Visa', icon: '📄' },
  { value: 'insurance', label: 'Assurance', icon: '🏥' },
  { value: 'id', label: 'Pièce d’identité', icon: '🪪' },
  { value: 'ticket', label: 'Billet', icon: '🎫' },
  { value: 'other', label: 'Autre', icon: '📎' },
]

export type TravelDocument = {
  id: string
  label: string
  kind: DocumentKind
  expiry_date: string | null
  file_path: string | null
  file_name: string | null
  note: string | null
  created_at: string
}

export type BookingKind = 'flight' | 'hotel' | 'train' | 'bus' | 'car' | 'other'

export const BOOKING_KINDS: { value: BookingKind; label: string; icon: string }[] = [
  { value: 'flight', label: 'Vol', icon: '✈️' },
  { value: 'hotel', label: 'Hôtel', icon: '🏨' },
  { value: 'train', label: 'Train', icon: '🚆' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'car', label: 'Voiture', icon: '🚗' },
  { value: 'other', label: 'Autre', icon: '📋' },
]

export type Booking = {
  id: string
  kind: BookingKind
  title: string
  confirmation: string | null
  start_date: string
  end_date: string | null
  price: number | null
  currency: string | null
  note: string | null
  created_at: string
}

export type Leg = {
  id: string
  country: string
  city: string | null
  start_date: string
  end_date: string | null
  budget: number | null
  visa_days: number | null
  created_at: string
}

export type Recurring = {
  id: string
  label: string
  amount_local: number
  currency_local: string
  bank_fee_pct: number
  category_id: string | null
  payment_method: PaymentMethod
  day_of_month: number
  active: boolean
  last_generated_month: string | null
  created_at: string
}

export type UserSettings = {
  home_currency: string
  default_bank_fee_pct: number
}
