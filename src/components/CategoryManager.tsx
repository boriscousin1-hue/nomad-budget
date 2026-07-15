'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { easeApple } from '@/lib/motion'
import type { Category } from '@/lib/types'
import Button from '@/components/Button'

type Props = {
  tripId: string
  userId: string
  baseCurrency: string
  categories: Category[]
  onCreated: (cat: Category) => void
  onUpdated: (cat: Category) => void
  onDeleted: (id: string) => void
}

// Gestion des catégories d'un voyage : création, édition, suppression.
// Une seule instance de formulaire, basculée en mode édition au clic sur un chip.
export default function CategoryManager({ tripId, userId, baseCurrency, categories, onCreated, onUpdated, onDeleted }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetFields = () => { setName(''); setIcon(''); setBudget(''); setError(null) }

  const toggleCreateForm = () => {
    if (showForm && editingId === null) { setShowForm(false); return }
    setEditingId(null); resetFields(); setShowForm(true)
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setIcon(cat.icon || '')
    setBudget(cat.budget_amount != null ? String(cat.budget_amount) : '')
    setError(null)
    setShowForm(true)
  }

  const cancelForm = () => { setShowForm(false); setEditingId(null); resetFields() }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = { name: name.trim(), icon: icon.trim() || null, budget_amount: budget ? Number(budget) : null }

    if (editingId) {
      const { data, error } = await supabase.from('categories').update(payload).eq('id', editingId).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onUpdated(data as Category)
    } else {
      const { data, error } = await supabase.from('categories').insert({ trip_id: tripId, user_id: userId, ...payload }).select().single()
      setSaving(false)
      if (error) { setError(error.message); return }
      onCreated(data as Category)
    }
    cancelForm()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ? Les dépenses associées repasseront "sans catégorie".')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { alert(error.message); return }
    onDeleted(id)
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">Catégories</h2>
        <button
          onClick={toggleCreateForm}
          className="text-[13px] rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-ink px-3.5 py-1.5 font-medium transition-colors"
        >
          {showForm && editingId === null ? 'Annuler' : '+ Catégorie'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: easeApple }}
            className="overflow-hidden"
          >
            <div className="card p-4 flex flex-col gap-2.5">
              {editingId && <p className="text-[13px] text-muted">Modification de la catégorie</p>}
              <div className="grid grid-cols-[56px_1fr] gap-2.5">
                <input
                  type="text" placeholder="🍜" maxLength={4}
                  value={icon} onChange={(e) => setIcon(e.target.value)}
                  className="field text-center px-2"
                />
                <input
                  type="text" placeholder="Nom (ex : Nourriture)"
                  value={name} onChange={(e) => setName(e.target.value)} required className="field"
                />
              </div>
              <input
                type="number" step="0.01" min="0" placeholder={`Budget catégorie (optionnel, en ${baseCurrency})`}
                value={budget} onChange={(e) => setBudget(e.target.value)} className="field tnum"
              />
              {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" full disabled={saving}>
                  {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer la catégorie'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={cancelForm}>Annuler</Button>
                )}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {categories.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <motion.li
              key={cat.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 rounded-full bg-surface border border-[var(--color-line)] pl-3.5 pr-2.5 py-1.5 text-[13px] shadow-[var(--shadow-card)]"
            >
              <button onClick={() => startEdit(cat)} className="hover:text-accent transition-colors">
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </button>
              <button onClick={() => remove(cat.id)} className="text-faint hover:text-[var(--color-danger)] transition-colors leading-none">✕</button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
