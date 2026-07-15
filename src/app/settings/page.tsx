'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { CURRENCIES } from '@/lib/currencies'

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
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800 underline mb-6 inline-block">
          ← Retour
        </Link>

        <h1 className="text-xl font-semibold mb-1">Réglages</h1>
        <p className="text-sm text-neutral-500 mb-8">Ces valeurs servent de défaut pour tes nouveaux voyages et dépenses.</p>

        <form onSubmit={save} className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Devise préférée</label>
            <select
              value={homeCurrency} onChange={(e) => setHomeCurrency(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <p className="text-xs text-neutral-400 mt-1">Utilisée par défaut comme devise de base d&apos;un nouveau voyage.</p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Frais bancaire/carte par défaut (%)</label>
            <input
              type="number" step="0.1" min="0" max="100"
              value={defaultBankFeePct} onChange={(e) => setDefaultBankFeePct(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
            />
            <p className="text-xs text-neutral-400 mt-1">Pré-rempli à chaque nouvelle dépense (modifiable au cas par cas).</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit" disabled={saving}
            className="rounded-xl bg-neutral-900 text-white py-2.5 font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
