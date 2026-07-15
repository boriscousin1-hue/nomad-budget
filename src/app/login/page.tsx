'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { fadeUp, stagger, easeApple } from '@/lib/motion'
import Button from '@/components/Button'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) { setError(error.message); return }
      setConfirmSent(true)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="w-full max-w-sm"
      >
        {/* Marque */}
        <motion.div variants={fadeUp} className="text-center mb-10">
          <div className="mx-auto mb-5 h-14 w-14 rounded-[18px] bg-ink flex items-center justify-center text-2xl shadow-[var(--shadow-pop)]">
            🧭
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">Nomad Budget</h1>
          <p className="text-muted text-[15px] mt-1.5 leading-snug">
            Tes dépenses de voyage, en devise locale.<br />Sans mauvaise surprise.
          </p>
        </motion.div>

        {confirmSent ? (
          <motion.div variants={fadeUp} className="card p-8 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <h2 className="text-lg font-semibold mb-1.5">Vérifie ta boîte mail</h2>
            <p className="text-muted text-sm leading-relaxed">
              Un lien de confirmation a été envoyé à <span className="text-ink font-medium">{email}</span>.
              Clique dessus pour activer ton compte.
            </p>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="card p-7">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required className="field"
              />
              <input
                type="password" placeholder="Mot de passe" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6} className="field"
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[var(--color-danger)] text-[13px] px-1"
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" size="lg" full disabled={loading} className="mt-1">
                {loading ? '…' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
              </Button>
            </form>

            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
              className="mt-5 text-[13px] text-muted hover:text-ink transition-colors w-full text-center"
            >
              {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
            </button>
          </motion.div>
        )}

        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.5, ease: easeApple }}
          className="text-center text-faint text-xs mt-8"
        >
          Chiffré et privé. Tes données n&apos;appartiennent qu&apos;à toi.
        </motion.p>
      </motion.div>
    </div>
  )
}
