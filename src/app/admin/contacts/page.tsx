'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Loader2, Save, X, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'

const PLATFORMS = ['email', 'whatsapp', 'instagram', 'facebook', 'twitter', 'telegram', 'phone', 'website']
const PLATFORM_ICONS: Record<string, string> = {
  email: '✉️', whatsapp: '💬', instagram: '📸', facebook: '📘',
  twitter: '🐦', telegram: '✈️', phone: '📞', website: '🌐',
}

interface ContactForm { platform: string; label: string; value: string; icon: string; order: string }
const emptyForm = (): ContactForm => ({ platform: 'email', label: '', value: '', icon: '', order: '0' })

function FormFields({ f, set: s }: { f: ContactForm; set: (k: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="label">Platform</label>
        <select value={f.platform} onChange={e => s('platform', e.target.value)} className="input-field">
          {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Label</label>
        <input value={f.label} onChange={e => s('label', e.target.value)}
          className="input-field" placeholder="e.g. WhatsApp Business" required />
      </div>
      <div>
        <label className="label">Value / URL</label>
        <input value={f.value} onChange={e => s('value', e.target.value)}
          className="input-field" placeholder="e.g. +964 XXX XXX" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Icon (emoji)</label>
          <input value={f.icon} onChange={e => s('icon', e.target.value)}
            className="input-field" placeholder="auto" maxLength={4} />
        </div>
        <div>
          <label className="label">Order</label>
          <input type="number" min="0" value={f.order}
            onChange={e => s('order', e.target.value)} className="input-field" />
        </div>
      </div>
    </div>
  )
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing]   = useState<string | null>(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const [form, setForm]       = useState<ContactForm>(emptyForm())
  const [editForm, setEditForm] = useState<ContactForm>(emptyForm())

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('contacts').select('*').order('order', { ascending: true })
    setContacts((data as Contact[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const setF  = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const setEF = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim() || !form.value.trim()) { setError('Label and value are required.'); return }
    setSaving(true); setError(null)
    const supabase = createClient()
    const { data, error: dbErr } = await supabase.from('contacts').insert({
      platform: form.platform,
      label:    form.label.trim(),
      value:    form.value.trim(),
      icon:     form.icon.trim() || PLATFORM_ICONS[form.platform] || null,
      order:    parseInt(form.order) || 0,
    }).select().single()
    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    setContacts(prev => [...prev, data as Contact])
    setForm(emptyForm()); setShowAdd(false); setSaving(false)
  }

  const startEdit = (c: Contact) => {
    setEditing(c.id)
    setEditForm({ platform: c.platform, label: c.label, value: c.value, icon: c.icon ?? '', order: String(c.order) })
  }

  const handleEdit = async (id: string) => {
    if (!editForm.label.trim() || !editForm.value.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error: dbErr } = await supabase.from('contacts').update({
      platform: editForm.platform,
      label:    editForm.label.trim(),
      value:    editForm.value.trim(),
      icon:     editForm.icon.trim() || PLATFORM_ICONS[editForm.platform] || null,
      order:    parseInt(editForm.order) || 0,
    }).eq('id', id).select().single()
    if (!dbErr && data) setContacts(prev => prev.map(c => c.id === id ? data as Contact : c))
    setEditing(null); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 text-sm mt-1">{contacts.length} contact method{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null) }} className="btn-primary text-sm py-2">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-emerald-600 rounded-full" />
              <h2 className="font-semibold text-slate-900">New Contact Method</h2>
            </div>
            <button onClick={() => { setShowAdd(false); setError(null) }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <FormFields f={form} set={setF} />
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : contacts.length === 0 && !showAdd ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone size={28} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600 mb-1">No contacts yet</p>
          <p className="text-slate-400 text-sm mb-6">Add your first contact method to show on the website</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            <Plus size={16} /> Add Contact
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              {editing === c.id ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-1 h-5 bg-emerald-600 rounded-full" />
                    <h3 className="font-semibold text-slate-900 text-sm">Editing: {c.label}</h3>
                  </div>
                  <FormFields f={editForm} set={setEF} />
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(c.id)} disabled={saving} className="btn-primary text-sm py-2">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-sm py-2">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {c.icon || PLATFORM_ICONS[c.platform] || '📱'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{c.label}</p>
                      <p className="text-sm text-emerald-700 mt-0.5">{c.value}</p>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">{c.platform} · order {c.order}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                      {deleting === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
