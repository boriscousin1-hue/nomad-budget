'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'

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
        <h2 className="text-sm font-medium text-neutral-500">Catégories</h2>
        <button onClick={toggleCreateForm} className="text-xs rounded-full bg-neutral-900 text-white px-3 py-1 font-medium hover:bg-neutral-800 transition">
          {showForm && editingId === null ? 'Annuler' : '+ Catégorie'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-2.5">
          {editingId && <p className="text-xs text-neutral-500">Modification de la catégorie</p>}
          <div className="grid grid-cols-[56px_1fr] gap-2.5">
            <input
              type="text" placeholder="🍜" maxLength={4}
              value={icon} onChange={(e) => setIcon(e.target.value)}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-center outline-none focus:border-neutral-500"
            />
            <input
              type="text" placeholder="Nom (ex: Nourriture)"
              value={name} onChange={(e) => setName(e.target.value)} required
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <input
            type="number" step="0.01" min="0" placeholder={`Budget catégorie (optionnel, en ${baseCurrency})`}
            value={budget} onChange={(e) => setBudget(e.target.value)}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-neutral-900 text-white py-2 font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50">
              {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer la catégorie'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelForm} className="rounded-xl border border-neutral-300 px-4 text-sm text-neutral-600 hover:bg-neutral-50">
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      {categories.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs">
              <button onClick={() => startEdit(cat)} className="hover:underline">{cat.icon ? `${cat.icon} ` : ''}{cat.name}</button>
              <button onClick={() => remove(cat.id)} className="text-neutral-400 hover:text-red-600">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
