// Types partagés entre la page voyage et ses composants.
export type Trip = {
  id: string
  name: string
  base_currency: string
  total_budget: number | null
  start_date: string | null
  end_date: string | null
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
