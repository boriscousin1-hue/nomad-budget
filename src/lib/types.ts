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

export type Expense = {
  id: string
  category_id: string | null
  amount_local: number
  currency_local: string
  exchange_rate: number
  bank_fee_pct: number
  amount_base: number
  amount_base_with_fee: number
  note: string | null
  spent_at: string
}

export type UserSettings = {
  home_currency: string
  default_bank_fee_pct: number
}
