'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { easeApple } from '@/lib/motion'
import { DOCUMENT_KINDS, type TravelDocument, type DocumentKind } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  userId: string
  documents: TravelDocument[]
  onCreated: (d: TravelDocument) => void
  onDeleted: (d: TravelDocument) => void
}

const KIND_ICON: Record<string, string> = Object.fromEntries(DOCUMENT_KINDS.map((k) => [k.value, k.icon]))
const DAY = 86400000

// Coffre à documents (passeport, visa, assurance…). Fichiers dans un bucket privé,
// rangés sous {user_id}/… ; consultation via URL signée courte durée. Alerte d'expiration.
export default function DocumentManager({ userId, documents, onCreated, onDeleted }: Props) {
  const [show, setShow] = useState(false)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<DocumentKind>('passport')
  const [expiry, setExpiry] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  const reset = () => { setLabel(''); setKind('passport'); setExpiry(''); setFile(null); setError(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSaving(true)
    let file_path: string | null = null
    let file_name: string | null = null
    if (file) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${userId}/${crypto.randomUUID?.() || Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      file_path = path
      file_name = file.name
    }
    const { data, error } = await supabase.from('documents').insert({
      user_id: userId, label: label.trim(), kind, expiry_date: expiry || null, file_path, file_name,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated(data as TravelDocument)
    reset(); setShow(false)
  }

  const view = async (d: TravelDocument) => {
    if (!d.file_path) return
    setOpening(d.id)
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 120)
    setOpening(null)
    if (error) { alert(error.message); return }
    window.open(data.signedUrl, '_blank')
  }

  const remove = async (d: TravelDocument) => {
    if (!confirm('Supprimer ce document (et son fichier) ?')) return
    if (d.file_path) await supabase.storage.from('documents').remove([d.file_path])
    const { error } = await supabase.from('documents').delete().eq('id', d.id)
    if (error) { alert(error.message); return }
    onDeleted(d)
  }

  const today = new Date()
  const expiryState = (d: TravelDocument): 'expired' | 'soon' | null => {
    if (!d.expiry_date) return null
    const days = Math.floor((new Date(d.expiry_date).getTime() - today.getTime()) / DAY)
    if (days < 0) return 'expired'
    if (days <= 60) return 'soon'
    return null
  }
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">Documents</h2>
        <button onClick={() => { setShow((v) => !v); reset() }} className="text-[13px] rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-ink px-3.5 py-1.5 font-medium transition-colors">
          {show ? 'Annuler' : '+ Document'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {show && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 12 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: easeApple }} className="overflow-hidden"
          >
            <div className="card p-5 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
                {DOCUMENT_KINDS.slice(0, 3).map((k) => (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    className={`rounded-xl py-2 text-[12px] font-medium transition-colors ${kind === k.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted hover:text-ink'}`}>
                    {k.icon} {k.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/[0.04] p-1">
                {DOCUMENT_KINDS.slice(3).map((k) => (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    className={`rounded-xl py-2 text-[12px] font-medium transition-colors ${kind === k.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-muted hover:text-ink'}`}>
                    {k.icon} {k.label}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Libellé (ex : Passeport – Boris)" value={label} onChange={(e) => setLabel(e.target.value)} required className="field" />
              <div>
                <label className="text-[12px] text-faint block mb-1 ml-1">Date d’expiration (optionnel)</label>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="field" />
              </div>
              <div>
                <label className="text-[12px] text-faint block mb-1 ml-1">Fichier (image ou PDF, max 10 Mo)</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-[13px] text-muted file:mr-3 file:rounded-full file:border-0 file:bg-black/[0.06] file:px-4 file:py-2 file:text-ink file:font-medium" />
              </div>
              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
              <Button type="submit" full disabled={saving}>{saving ? 'Envoi…' : 'Ajouter au coffre'}</Button>
              <p className="text-[12px] text-faint text-center">🔒 Privé — chiffré et accessible uniquement par toi.</p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {documents.length > 0 && (
        <ul className="flex flex-col gap-2">
          {documents.map((d) => {
            const st = expiryState(d)
            return (
              <li key={d.id} className={`rounded-2xl bg-surface border px-4 py-3.5 flex items-center justify-between shadow-[var(--shadow-card)] ${st === 'expired' ? 'border-[var(--color-danger)]/40' : 'border-[var(--color-line)]'}`}>
                <div className="min-w-0 flex items-center gap-3">
                  <span className="text-xl shrink-0">{KIND_ICON[d.kind]}</span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium truncate">{d.label}</div>
                    <div className="text-[13px] text-faint truncate">
                      {d.file_name || 'Sans fichier'}
                      {d.expiry_date && (
                        <span className={st === 'expired' ? 'text-[var(--color-danger)] font-medium' : st === 'soon' ? 'text-[var(--color-warn)] font-medium' : ''}>
                          {' · '}exp. {fmt(d.expiry_date)}{st === 'expired' ? ' ⚠️ expiré' : st === 'soon' ? ' ⚠️' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {d.file_path && (
                    <button onClick={() => view(d)} disabled={opening === d.id} className="text-faint hover:text-ink transition-colors h-8 px-2 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-[13px]">
                      {opening === d.id ? '…' : 'Voir'}
                    </button>
                  )}
                  <button onClick={() => remove(d)} className="text-faint hover:text-[var(--color-danger)] transition-colors h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center">✕</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
