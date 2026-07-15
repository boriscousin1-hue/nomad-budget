'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { CURRENCIES } from '@/lib/currencies'
import { fadeUp, stagger } from '@/lib/motion'
import Button from '@/components/Button'

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser()
  const [homeCurrency, setHomeCurrency] = useState('EUR')
  const [defaultBankFeePct, setDefaultBankFeePct] = useState('0')
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('user_settings').select('home_currency, default_bank_fee_pct').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHomeCurrency(data.home_currency)
          setDefaultBankFeePct(String(data.default_bank_fee_pct))
        }
        setLoadingSettings(false)
      })
  }, [user])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      home_currency: homeCurrency,
      default_bank_fee_pct: Number(defaultBankFeePct) || 0,
    }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (userLoading || loadingSettings) return null

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-20 border-b border-[var(--color-line)]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-ink transition-colors text-[15px] flex items-center gap-1">
            <span className="text-lg leading-none">‹</span> Voyages
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-10 pb-24">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-[34px] leading-none font-semibold tracking-tight">Réglages</h1>
            <p className="text-muted text-[15px] mt-2">Valeurs par défaut pour tes nouveaux voyages et dépenses.</p>
          </motion.div>

          <motion.form variants={fadeUp} onSubmit={save} className="card p-7 flex flex-col gap-6">
            <div>
              <label className="text-[15px] font-medium block mb-2">Devise préférée</label>
              <select value={homeCurrency} onChange={(e) => setHomeCurrency(e.target.value)} className="field">
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
              <p className="text-[13px] text-faint mt-2">Devise de base proposée par défaut pour un nouveau voyage.</p>
            </div>

            <div className="h-px bg-[var(--color-line)]" />

            <div>
              <label className="text-[15px] font-medium block mb-2">Frais bancaire / carte par défaut</label>
              <div className="relative">
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={defaultBankFeePct} onChange={(e) => setDefaultBankFeePct(e.target.value)}
                  className="field pr-9"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
              </div>
              <p className="text-[13px] text-faint mt-2">Pré-rempli à chaque nouvelle dépense (modifiable au cas par cas).</p>
            </div>

            {error && <p className="text-[var(--color-danger)] text-[13px]">{error}</p>}

            <Button type="submit" size="lg" disabled={saving} className="self-start">
              {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}
            </Button>
          </motion.form>
        </motion.div>
      </main>
    </div>
  )
}
